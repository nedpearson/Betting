"""Chrome DevTools Protocol (CDP) Automation for Kalshi API Key Setup.

Connects to Chrome on port 9222, finds or navigates to https://kalshi.com/account/api,
locates the API Key creation controls, creates an API key, extracts Key ID and PEM,
and binds the credentials to Betting Intelligence OS.
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
import time
from pathlib import Path

import httpx
import websockets

CDP_BASE = "http://127.0.0.1:9222"
API_URL = "http://127.0.0.1:8000/api/settings/kalshi"
PROJECT_DIR = Path(__file__).resolve().parent.parent
DOWNLOADS_DIR = Path.home() / "Downloads"
UUID_REGEX = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")


async def get_cdp_targets() -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{CDP_BASE}/json")
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        print(f"[-] Could not connect to CDP on {CDP_BASE}: {e}")
    return []


async def eval_js(ws, expression: str) -> dict:
    msg_id = int(time.time() * 1000) % 100000
    req = {
        "id": msg_id,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True,
        },
    }
    await ws.send(json.dumps(req))
    while True:
        raw = await ws.recv()
        data = json.loads(raw)
        if data.get("id") == msg_id:
            return data.get("result", {}).get("result", {}).get("value", {})


async def automate():
    print("[*] Checking for Chrome CDP targets on port 9222...")
    targets = await get_cdp_targets()
    if not targets:
        print("[-] No CDP targets found. Chrome must be running with --remote-debugging-port=9222")
        return False

    kalshi_target = None
    for t in targets:
        if "kalshi.com" in t.get("url", ""):
            kalshi_target = t
            break

    if not kalshi_target:
        # Pick the first page target and navigate
        page_targets = [t for t in targets if t.get("type") == "page"]
        if page_targets:
            kalshi_target = page_targets[0]

    if not kalshi_target:
        print("[-] No suitable Chrome tab found.")
        return False

    ws_url = kalshi_target.get("webSocketDebuggerUrl")
    print(f"[+] Attaching to tab: {kalshi_target.get('title')} ({kalshi_target.get('url')})")

    async with websockets.connect(ws_url) as ws:
        # Step 1: Ensure we are on https://kalshi.com/account/api
        current_url = await eval_js(ws, "window.location.href")
        print(f"[*] Current URL: {current_url}")
        if "account/api" not in str(current_url):
            print("[*] Navigating to https://kalshi.com/account/api...")
            await eval_js(ws, "window.location.href = 'https://kalshi.com/account/api'")
            await asyncio.sleep(3.0)

        # Step 2: Inspect page and look for Create API Key button
        js_find_and_click = """
        (() => {
            const allElements = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
            const btn = allElements.find(el => {
                const txt = (el.innerText || el.textContent || '').trim();
                return txt.includes('Create API Key') || txt.includes('Create New API Key') || txt.includes('Create Key') || txt === 'Create';
            });
            if (btn) {
                btn.click();
                return { status: 'clicked', text: btn.innerText };
            }
            return { 
                status: 'not_found', 
                sample_buttons: allElements.map(e => (e.innerText || '').trim()).filter(Boolean).slice(0, 15),
                body_snippet: document.body.innerText.slice(0, 300)
            };
        })()
        """
        res = await eval_js(ws, js_find_and_click)
        print(f"[*] Step 2 result: {res}")

        await asyncio.sleep(2.0)

        # Step 3: Check if modal appeared, input name, or extract Key ID
        js_modal_flow = """
        (() => {
            // Check for input fields in modal
            const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
            const nameInput = inputs.find(i => i.placeholder?.toLowerCase().includes('name') || i.name?.toLowerCase().includes('name') || true);
            if (nameInput && !nameInput.value) {
                nameInput.value = 'BettingOS';
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                nameInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Look for confirm/create button in modal
            const modalBtns = Array.from(document.querySelectorAll('button, div[role="button"]'));
            const confirmBtn = modalBtns.find(b => {
                const txt = (b.innerText || '').trim().toLowerCase();
                return txt === 'create' || txt === 'generate' || txt === 'create key' || txt.includes('download');
            });
            if (confirmBtn) {
                confirmBtn.click();
                return { modal: 'confirm_clicked', btn: confirmBtn.innerText };
            }

            // Search for UUID on the page
            const text = document.body.innerText;
            const uuidMatch = text.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
            return {
                modal: 'searching_uuid',
                uuid: uuidMatch ? uuidMatch[0] : null
            };
        })()
        """
        res_modal = await eval_js(ws, js_modal_flow)
        print(f"[*] Step 3 result: {res_modal}")

        await asyncio.sleep(2.0)

        # Step 4: Extract Key ID and verify
        js_extract_uuid = """
        (() => {
            const text = document.body.innerText;
            const uuidMatch = text.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
            return uuidMatch ? uuidMatch[0] : null;
        })()
        """
        key_id = await eval_js(ws, js_extract_uuid)
        print(f"[*] Extracted Key ID: {key_id}")

        if key_id:
            pem_path = PROJECT_DIR / "kalshi_key.pem"
            if pem_path.exists():
                pem_content = pem_path.read_text(encoding="utf-8")
                print(f"[*] Submitting Key ID {key_id} and local private key to API...")
                async with httpx.AsyncClient(timeout=10.0) as client:
                    auth_resp = await client.post(API_URL, json={"key_id": key_id, "private_key": pem_content})
                    auth_data = auth_resp.json()
                    if auth_data.get("success"):
                        print(f"[SUCCESS!] Kalshi account linked! Cash Balance: ${auth_data.get('balance_dollars')}")
                        return True
                    else:
                        print(f"[!] Authentication rejected: {auth_data.get('message')}")
        return False


if __name__ == "__main__":
    asyncio.run(automate())

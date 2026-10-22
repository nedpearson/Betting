"""Automated Kalshi API Key & PEM File Linker.

Continuously watches the user's Downloads folder and project root for Kalshi API key files (.pem / .key),
extracts Key IDs, auto-configures the local environment, and binds credentials with live signature verification.
"""

from __future__ import annotations

import os
import re
import sys
import time
from pathlib import Path
import httpx

DOWNLOADS_DIR = Path(os.environ.get("USERPROFILE", "")) / "Downloads"
PROJECT_DIR = Path(__file__).resolve().parent.parent
TARGET_KEY_PATH = PROJECT_DIR / "kalshi_key.pem"
ENV_PATH = PROJECT_DIR / ".env"
API_URL = "http://127.0.0.1:8000/api/settings/kalshi"
UUID_REGEX = re.compile(r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")


def get_current_env_key_id() -> str:
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            if line.startswith("BOI_KALSHI_KEY_ID=") or line.startswith("KALSHI_API_KEY_ID="):
                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                if val:
                    return val
    return ""


def find_key_id_in_downloads() -> str:
    if not DOWNLOADS_DIR.exists():
        return ""
    now = time.time()
    recent_cutoff = now - 7200  # last 2 hours
    # Check recent text/pem/key files
    for ext in ["*.pem", "*.key", "*.txt", "*.json"]:
        for f in DOWNLOADS_DIR.glob(ext):
            try:
                if f.stat().st_mtime < recent_cutoff:
                    continue
                match = UUID_REGEX.search(f.name)
                if match:
                    return match.group(0)
                content = f.read_text(encoding="utf-8", errors="ignore")[:2000]
                match = UUID_REGEX.search(content)
                if match:
                    return match.group(0)
            except Exception:
                pass
    return ""


def find_latest_pem() -> tuple[Path | None, str]:
    candidates = []
    for search_dir in [PROJECT_DIR, DOWNLOADS_DIR]:
        if not search_dir.exists():
            continue
        for ext in ["*.pem", "*.key"]:
            for f in search_dir.glob(ext):
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore")
                    if "PRIVATE KEY" in content:
                        candidates.append((f.stat().st_mtime, f, content))
                except Exception:
                    pass
    if candidates:
        candidates.sort(reverse=True, key=lambda x: x[0])
        return candidates[0][1], candidates[0][2]
    return None, ""


def link_credentials(key_id: str, private_key_pem: str) -> bool:
    print(f"[*] Attempting to link credentials with Key ID: {key_id[:8]}...")
    try:
        resp = httpx.post(API_URL, json={"key_id": key_id, "private_key": private_key_pem}, timeout=10.0)
        data = resp.json()
        if data.get("success"):
            print(f"[SUCCESS] Connected to Kalshi! Balance: ${data.get('balance_dollars')}")
            return True
        else:
            print(f"[!] Authentication rejected: {data.get('message')}")
    except Exception as e:
        print(f"[!] Connection failed: {e}")
    return False


def main():
    loop_mode = "--loop" in sys.argv
    cli_key_id = next((arg for arg in sys.argv[1:] if UUID_REGEX.match(arg)), "")
    print(f"[*] Starting Kalshi Key Auto-Linker (loop={loop_mode}, cli_key={bool(cli_key_id)})...")

    while True:
        key_id = cli_key_id or get_current_env_key_id() or find_key_id_in_downloads()
        pem_path, pem_content = find_latest_pem()

        if pem_path and pem_content:
            if not TARGET_KEY_PATH.exists() or TARGET_KEY_PATH.read_text(encoding="utf-8").strip() != pem_content.strip():
                TARGET_KEY_PATH.write_text(pem_content.strip() + "\n", encoding="utf-8")
                print(f"[+] Saved latest private key to {TARGET_KEY_PATH}")

        if key_id and pem_content:
            success = link_credentials(key_id, pem_content)
            if success:
                print("[*] Kalshi account is now active and synchronized!")
                if not loop_mode:
                    break
        else:
            status = []
            if not pem_content:
                status.append("waiting for .pem key")
            if not key_id:
                status.append("waiting for Key ID")
            print(f"[*] Auto-Linker status: {', '.join(status)}")

        if not loop_mode:
            break
        time.sleep(3)


if __name__ == "__main__":
    main()

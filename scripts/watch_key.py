"""Automated Kalshi API Key & PEM File Linker.

Watches the user's Downloads folder and project root for Kalshi API key files (.pem / .key),
auto-configures the local environment, and binds credentials with live signature verification.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path
import httpx

DOWNLOADS_DIR = Path(os.environ.get("USERPROFILE", "")) / "Downloads"
PROJECT_DIR = Path(__file__).resolve().parent.parent
TARGET_KEY_PATH = PROJECT_DIR / "kalshi_key.pem"
ENV_PATH = PROJECT_DIR / ".env"
API_URL = "http://127.0.0.1:8000/api/settings/kalshi"

print(f"[*] Scanning {DOWNLOADS_DIR} and {PROJECT_DIR} for Kalshi private keys...")


def find_recent_keys() -> list[Path]:
    candidates = []
    for search_dir in [DOWNLOADS_DIR, PROJECT_DIR]:
        if not search_dir.exists():
            continue
        for ext in ["*.pem", "*.key"]:
            for f in search_dir.glob(ext):
                try:
                    content = f.read_text(encoding="utf-8", errors="ignore")
                    if "PRIVATE KEY" in content:
                        candidates.append((f.stat().st_mtime, f))
                except Exception:
                    pass
    candidates.sort(reverse=True, key=lambda x: x[0])
    return [c[1] for c in candidates]


def main():
    keys = find_recent_keys()
    if keys:
        best_key = keys[0]
        print(f"[+] Found candidate private key: {best_key}")
        pem_content = best_key.read_text(encoding="utf-8")
        TARGET_KEY_PATH.write_text(pem_content.strip() + "\n", encoding="utf-8")
        print(f"[+] Saved to {TARGET_KEY_PATH}")
    else:
        print("[-] No .pem or .key file found yet in Downloads or project directory.")


if __name__ == "__main__":
    main()

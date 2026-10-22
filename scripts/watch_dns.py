import time
import subprocess
import httpx

print("Watching for betting.bridgebox.ai DNS propagation...")
while True:
    try:
        res = subprocess.run(["nslookup", "betting.bridgebox.ai"], capture_state=True, capture_output=True, text=True)
        if "Address" in res.stdout and "NXDOMAIN" not in res.stdout:
            print("DNS RECORD DETECTED! Verifying HTTP status...")
            try:
                r = httpx.get("https://betting.bridgebox.ai", timeout=5.0)
                print(f"betting.bridgebox.ai is LIVE with HTTP status {r.status_code}!")
                break
            except Exception as e:
                print(f"DNS resolved, SSL handshake pending: {e}")
    except Exception as e:
        print(f"Error checking DNS: {e}")
    time.sleep(10)

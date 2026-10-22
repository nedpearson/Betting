import httpx
import json

m = httpx.get("http://127.0.0.1:8000/api/markets").json()
o = httpx.get("http://127.0.0.1:8000/api/opportunities").json()
b = httpx.get("http://127.0.0.1:8000/api/best_trade").json()
a = httpx.get("http://127.0.0.1:8000/api/agents").json()

print(f"=== PIPELINE AUDIT ===")
print(f"Markets Indexed: {m.get('count', 0)}")
print(f"Opportunities Found: {o.get('count', 0)}")
print(f"Best Trade Available: {b.get('available', False)}")
if b.get('available'):
    print(f"  Top Pick: {b.get('ticker')} | Action: {b.get('action')} | Net ROI: {b.get('net_roi')}")
else:
    print(f"  Reason: {b.get('reason')}")
print(f"Active Agents: {sum(1 for ag in a.get('agents', []) if ag['status'] == 'ACTIVE')} / {len(a.get('agents', []))}")
for ag in a.get('agents', []):
    print(f"  [{ag['status']}] {ag['name']}: {ag['decisions_count']} decisions")

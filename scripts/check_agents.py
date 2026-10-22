import httpx

r = httpx.get("http://127.0.0.1:8000/api/agents")
data = r.json()
agents = data["agents"]
active = [a for a in agents if a["status"] == "ACTIVE"]

print(f"=== AGENT INTELLIGENCE SWARM STATUS ===")
print(f"ACTIVE AGENTS: {len(active)} / {len(agents)}\n")
for a in agents:
    print(f"[{a['status']}] {a['name']:<35} | Decisions: {a['decisions_count']:<3} | Last Active: {a['last_active_utc']}")

import json
import os
import requests

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://bnxnrorurmqcqqonkams.supabase.co")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueG5yb3J1cm1xY3Fxb25rYW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDYyNjQsImV4cCI6MjA5NDkyMjI2NH0.FMFcLF5wkWjs0JCNIrqcP_UPXKpTq9HS7xEXo0Z3k9A")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

with open("data.json", "r", encoding="utf-8") as f:
    machines = json.load(f)

print(f" Migrando {len(machines)} máquinas vía API REST...")
success = 0
for m in machines:
    payload = {
        "id_maquina": m.get("id", "").strip(),
        "fabricante_modelo": m.get("modelo", "").strip(),
        "numero_serial": m.get("serial", "").strip(),
        "juego": m.get("juego", "").strip(),
        "sector": m.get("sector", "A").strip(),
        "nodo": m.get("nodo", "N/A").strip(),
        "proveedor": m.get("provedor", "").strip(),
        "estado": m.get("status", "ACTIVA").strip(),
        "coordenadas_x": int(m.get("x", 0)),
        "coordenadas_y": int(m.get("y", 0))
    }
    res = requests.post(f"{SUPABASE_URL}/rest/v1/maquinas", headers=HEADERS, json=payload)
    if res.status_code in [200, 201, 204]:
        success += 1
        print(f"✅ {payload['id_maquina']}")
    else:
        print(f"❌ {payload['id_maquina']} | {res.text}")

print(f"\n🎉 Completado: {success}/{len(machines)}")
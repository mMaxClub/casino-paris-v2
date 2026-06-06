# migrate_native.py
import json
import urllib.request
import urllib.error

# ⚠️ REEMPLAZA ESTOS VALORES CON TUS DATOS REALES DE SUPABASE
SUPABASE_URL = "https://bnxnrorurmqcqqonkams.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueG5yb3J1cm1xY3Fxb25rYW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDYyNjQsImV4cCI6MjA5NDkyMjI2NH0.FMFcLF5wkWjs0JCNIrqcP_UPXKpTq9HS7xEXo0Z3k9A"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def main():
    if not SUPABASE_URL.startswith("https://") or "TU_ID" in SUPABASE_URL:
        print("❌ Error: Configura SUPABASE_URL y SUPABASE_KEY en el script antes de ejecutar.")
        return

    try:
        with open("data.json", "r", encoding="utf-8") as f:
            machines = json.load(f)
    except FileNotFoundError:
        print("❌ No se encontró data.json. Asegúrate de que esté en la misma carpeta.")
        return

    print(f" Migrando {len(machines)} máquinas a Supabase vía REST API nativa...")
    
    success = 0
    errors = 0

    for m in machines:
        # Tu JSON tiene claves con espacios ("id ", "modelo "). Las limpiamos automáticamente:
        clean_m = {k.strip(): v for k, v in m.items()}
        
        payload = {
            "id_maquina": str(clean_m.get("id", "")).strip(),
            "fabricante_modelo": str(clean_m.get("modelo", "")).strip(),
            "numero_serial": str(clean_m.get("serial", "")).strip(),
            "juego": str(clean_m.get("juego", "")).strip(),
            "sector": str(clean_m.get("sector", "A")).strip().upper(),
            "nodo": str(clean_m.get("nodo", "N/A")).strip(),
            "proveedor": str(clean_m.get("provedor", "")).strip(),
            "estado": str(clean_m.get("status", "ACTIVA")).strip(),
            "coordenadas_x": int(clean_m.get("x", 0)),
            "coordenadas_y": int(clean_m.get("y", 0)),
            "fila": int(clean_m.get("fila", 0)),
            "columna": int(clean_m.get("columna", 0)),
            "referencia": str(clean_m.get("referencia", "")).strip()
        }
        
        # on_conflict=id_maquina evita errores si el registro ya existe
        url = f"{SUPABASE_URL}/rest/v1/maquinas?on_conflict=id_maquina"
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode("utf-8"), 
            headers=HEADERS, 
            method="POST"
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                success += 1
                print(f"✅ {payload['id_maquina']}")
        except urllib.error.HTTPError as e:
            errors += 1
            print(f"❌ {payload['id_maquina']} | HTTP {e.code}")
        except Exception as e:
            errors += 1
            print(f"❌ {payload['id_maquina']} | {e}")

    print(f"\n🎉 MIGRACIÓN FINALIZADA")
    print(f"   ✅ Exitosas: {success}")
    print(f"   ❌ Errores: {errors}")

if __name__ == "__main__":
    main()
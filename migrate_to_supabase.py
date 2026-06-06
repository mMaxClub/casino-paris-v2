# migrate_to_supabase.py
import json
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ Error: No se encontraron VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env")
    exit()

supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_value(data, key):
    """Busca una clave ignorando espacios al final"""
    for k, v in data.items():
        if k.strip() == key:
            return str(v).strip()
    return ""

def migrate_machines():
    if not os.path.exists('data.json'):
        print("❌ No se encontró data.json")
        return

    with open('data.json', 'r', encoding='utf-8') as f:
        machines = json.load(f)

    print(f"📦 Migrando {len(machines)} máquinas a Supabase...")
    
    successes = 0
    errors = 0

    for machine in machines:
        try:
            # Mapear campos del JSON a la estructura de Supabase
            # Usamos get_value para manejar los espacios en las claves originales
            data = {
                'id_maquina': get_value(machine, 'id'),
                'fabricante_modelo': get_value(machine, 'modelo'),
                'numero_serial': get_value(machine, 'serial'),
                'juego': get_value(machine, 'juego'),
                'sector': get_value(machine, 'sector'),
                'nodo': get_value(machine, 'nodo'),
                'proveedor': get_value(machine, 'provedor'),
                'estado': get_value(machine, 'status'),
                'coordenadas_x': int(get_value(machine, 'x') or 0),
                'coordenadas_y': int(get_value(machine, 'y') or 0),
                'fila': int(get_value(machine, 'fila') or 0),
                'columna': int(get_value(machine, 'columna') or 0),
                'referencia': get_value(machine, 'referencia')
            }

            # Insertar o actualizar (upsert)
            result = supabase.table('maquinas').upsert(data).execute()
            successes += 1
            print(f"✅ {data['id_maquina']} migrada")
            
        except Exception as e:
            errors += 1
            print(f"❌ Error con {get_value(machine, 'id')}: {e}")

    print(f"\n🎉 Migración completada: {successes} exitosas, {errors} errores")

if __name__ == "__main__":
    migrate_machines()
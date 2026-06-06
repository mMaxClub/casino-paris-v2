# migrate_data.py
import json
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def migrar_maquinas():
    """Migra data.json a la tabla 'maquinas' en Supabase"""
    
    if not os.path.exists('data.json'):
        print("❌ No se encontró data.json")
        return
    
    with open('data.json', 'r', encoding='utf-8') as f:
        maquinas_old = json.load(f)
    
    print(f"📦 Migrando {len(maquinas_old)} máquinas a Supabase...")
    
    exitosas = 0
    errores = 0
    
    for machine in maquinas_old:
        try:
            # Mapear campos antiguos a nuevos
            data = {
                'id_maquina': machine.get('id', '').strip(),
                'fabricante_modelo': machine.get('modelo', '').strip(),
                'numero_serial': machine.get('serial', '').strip(),
                'juego': machine.get('juego', '').strip(),
                'sector': machine.get('sector', 'A').strip().upper(),
                'nodo': machine.get('nodo', 'N/A').strip(),
                'proveedor': machine.get('provedor', '').strip(),
                'estado': machine.get('status', 'ACTIVA').strip().upper(),
                'coordenadas_x': machine.get('x', 0),
                'coordenadas_y': machine.get('y', 0),
                'fila': machine.get('fila', 0),
                'columna': machine.get('columna', 0),
                'referencia': machine.get('referencia', '').strip()
            }
            
            # Insertar o actualizar (upsert)
            result = supabase.table('maquinas').upsert(data).execute()
            exitosas += 1
            print(f"✅ {data['id_maquina']} migrada")
            
        except Exception as e:
            errores += 1
            print(f"❌ Error con {machine.get('id', 'N/A')}: {e}")
    
    print(f"\n🎉 Migración completada: {exitosas} exitosas, {errores} errores")

def extraer_nodos_unicos():
    """Extrae nodos únicos de las máquinas y crea la tabla de red"""
    
    result = supabase.table('maquinas').select('nodo').execute()
    
    nodos_unicos = set()
    for row in result.data:
        if row['nodo'] and row['nodo'] != 'N/A':
            nodos_unicos.add(row['nodo'])
    
    print(f"\n🔌 Creando {len(nodos_unicos)} nodos de red...")
    
    for nodo in sorted(nodos_unicos):
        try:
            data = {
                'nombre_nodo': nodo,
                'tipo': 'SWITCH',
                'ubicacion_fisica': f"Auto-detectado desde máquinas - Sector {nodo.split('-')[1] if '-' in nodo else 'N/A'}",
                'puertos_totales': 24,
                'estado': 'ACTIVO'
            }
            supabase.table('nodos_red').upsert(data).execute()
            print(f"✅ Nodo {nodo} creado")
        except Exception as e:
            print(f"⚠️ Nodo {nodo}: {e}")

if __name__ == "__main__":
    migrar_maquinas()
    extraer_nodos_unicos()
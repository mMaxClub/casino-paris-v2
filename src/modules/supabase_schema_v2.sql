-- ==========================================
-- 🎰 CASINO PARIS - ESQUEMA SUPABASE v2.0
-- Arquitectura: Offline-First + OCC + Modular
-- ==========================================

-- 1. LIMPIEZA (️ Ejecutar solo en desarrollo o tras backup)
DROP TABLE IF EXISTS premios CASCADE;
DROP TABLE IF EXISTS banca CASCADE;
DROP TABLE IF EXISTS mantenimientos CASCADE;
DROP TABLE IF EXISTS calibracion CASCADE;
DROP TABLE IF EXISTS maquinas CASCADE;
DROP TABLE IF EXISTS logs CASCADE;

-- 2. TABLA PRINCIPAL: MÁQUINAS
CREATE TABLE maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_maquina TEXT UNIQUE NOT NULL, -- Clave de negocio (compatible con tu Excel/CSV)
  fabricante_modelo TEXT,
  numero_serial TEXT,
  juego TEXT,
  sector TEXT DEFAULT 'A',
  nodo TEXT DEFAULT 'N/A',
  proveedor TEXT,
  estado TEXT DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA', 'MANTENIMIENTO', 'BAJA', 'FUERA_SERVICIO')),
  coordenadas_x INTEGER,
  coordenadas_y INTEGER,
  fecha_de_baja DATE,
  version INT DEFAULT 1,              -- 🔑 Control de concurrencia optimista
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: CALIBRACIÓN (Coordenadas del plano interactivo)
CREATE TABLE calibracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
  coordenada_x INTEGER NOT NULL,
  coordenada_y INTEGER NOT NULL,
  clicks_count INTEGER DEFAULT 1,
  precision TEXT DEFAULT 'high',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: MANTENIMIENTOS (Expande tu tabla 'logs' tipo maint)
CREATE TABLE mantenimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('PREVENTIVO', 'CORRECTIVO')),
  descripcion TEXT,
  evidencia_url TEXT,
  tecnico TEXT,
  estado TEXT DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'EN_TRANSITO', 'CERRADO')),
  version INT DEFAULT 1,              -- 🔑 OCC para evitar sobreescrituras
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: BANCA / ARQUEOS
CREATE TABLE banca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id),
  sector TEXT,
  responsable TEXT,
  monto DECIMAL(10,2) NOT NULL,
  estado TEXT DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'REVISADO', 'CERRADO')),
  fecha DATE DEFAULT CURRENT_DATE,
  version INT DEFAULT 1,              -- 🔑 OCC
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: PREMIOS / JACKPOTS
CREATE TABLE premios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id),
  monto DECIMAL(12,2) NOT NULL,
  evidencia_url TEXT,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: LOGS GENERALES (Auditoría histórica)
CREATE TABLE logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT CHECK (tipo IN ('MANTENIMIENTO', 'INCIDENCIA', 'BANCA', 'PREMIO', 'SISTEMA')),
  maquina_id UUID REFERENCES maquinas(id),
  subtipo TEXT,
  descripcion TEXT,
  tecnico_usuario TEXT,
  estado TEXT CHECK (estado IN ('ABIERTO', 'EN_PROGRESO', 'RESUELTO')),
  metadata JSONB,                     -- 📦 Almacena datos extra sin alterar schema
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ⚙️ CONFIGURACIÓN AVANZADA
-- ==========================================

-- Trigger para actualizar 'updated_at' automáticamente en cada UPDATE
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_maquinas_updated_at BEFORE UPDATE ON maquinas FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_mantenimientos_updated_at BEFORE UPDATE ON mantenimientos FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trigger_banca_updated_at BEFORE UPDATE ON banca FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- Habilitar Realtime para sincronización en vivo
ALTER PUBLICATION supabase_realtime ADD TABLE maquinas, calibracion, mantenimientos, banca, premios, logs;

-- ==========================================
-- 🔒 ROW LEVEL SECURITY (RLS)
-- ==========================================
-- (Políticas abiertas como en tu versión original. 
--  Listas para restringir por auth.roles en producción)

ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_publico_maquinas" ON maquinas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE calibracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_publico_calibracion" ON calibracion FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE mantenimientos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_publico_mantenimientos" ON mantenimientos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE banca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_publico_banca" ON banca FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE premios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_publico_premios" ON premios FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acceso_publico_logs" ON logs FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 📈 ÍNDICES DE RENDIMIENTO
-- ==========================================
CREATE INDEX idx_maquinas_sector ON maquinas(sector);
CREATE INDEX idx_maquinas_estado ON maquinas(estado);
CREATE INDEX idx_maquinas_id_maquina ON maquinas(id_maquina);
CREATE INDEX idx_mantenimientos_maquina ON mantenimientos(maquina_id);
CREATE INDEX idx_mantenimientos_estado ON mantenimientos(estado);
CREATE INDEX idx_banca_maquina ON banca(maquina_id);
CREATE INDEX idx_banca_fecha ON banca(fecha);
CREATE INDEX idx_premios_maquina ON premios(maquina_id);
CREATE INDEX idx_logs_maquina ON logs(maquina_id);
CREATE INDEX idx_logs_tipo ON logs(tipo);

-- ==========================================
-- 🔄 MIGRACIÓN DESDE TU ESQUEMA ANTIGUO (Opcional)
-- ==========================================
/*
-- Si ya tienes datos en la tabla 'machines', descomenta esto para migrarlos:
INSERT INTO maquinas (id_maquina, fabricante_modelo, numero_serial, juego, sector, nodo, proveedor, estado, fecha_de_baja)
SELECT "ID_MAQUINA", "FABRICANTE_MODELO", "NUMERO_SERIAL", "JUEGO", "SECTOR", "NODO", "PROVEDOR", "STATUS", "FECHA DE BAJA"
FROM machines
WHERE "ID_MAQUINA" IS NOT NULL;
*/
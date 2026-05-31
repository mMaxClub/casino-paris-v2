// Configuración de Supabase
export const SUPABASE_CONFIG = {
  url: 'https://bnxnrorurmqcqqonkams.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueG5yb3J1cm1xY3Fxb25rYW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDYyNjQsImV4cCI6MjA5NDkyMjI2NH0.FMFcLF5wkWjs0JCNIrqcP_UPXKpTq9HS7xEXo0Z3k9A',
};

// Tablas y sus campos de control de versión
export const TABLES = {
  MAQUINAS: 'maquinas',
  MANTENIMIENTOS: 'mantenimientos',
  BANCA: 'banca',
  PREMIOS: 'premios',
  CALIBRACION: 'calibracion',
};

export const SYNC_CONFIG = {
  MAX_RETRY_TIME: 24 * 60, // 24 horas en minutos
  SYNC_INTERVAL: 30000,    // Intentar sync cada 30 segundos
  BATCH_SIZE: 10,          // Enviar cambios en lotes de 10
};

// Inicializar cliente de Supabase
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
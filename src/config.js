// src/config.js
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://bnxnrorurmqcqqonkams.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJueG5yb3J1cm1xY3Fxb25rYW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNDYyNjQsImV4cCI6MjA5NDkyMjI2NH0.FMFcLF5wkWjs0JCNIrqcP_UPXKpTq9HS7xEXo0Z3k9A'
};

export const TABLES = {
  MAQUINAS: 'maquinas',
  CALIBRACION: 'calibracion',
  NODOS_RED: 'nodos_red',
  CONEXIONES_RED: 'conexiones_red',
  MANTENIMIENTOS: 'mantenimientos',
  BANCA: 'banca',
  PREMIOS: 'premios'
};

export const SYNC_CONFIG = {
  SYNC_INTERVAL: 30000,
  MAX_RETRY: 5,
  BATCH_SIZE: 10
};

export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    realtime: {
      params: { eventsPerSecond: 10 }
    }
  }
);
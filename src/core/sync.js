// src/core/sync.js
// ✅ Guardar este archivo como UTF-8 SIN BOM

import { openDB } from 'idb';
import { supabase, TABLES, SYNC_CONFIG } from '../config.js';
import { isOnline, generateId, formatDate } from './utils.js';

const DB_NAME = 'casino-paris-db';
const DB_VERSION = 1;

// Inicializar IndexedDB
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Cola de mutaciones
      if (!db.objectStoreNames.contains('mutation_queue')) {
        const store = db.createObjectStore('mutation_queue', { keyPath: 'id' });
        store.createIndex('by_table', 'table');
        store.createIndex('by_timestamp', 'timestamp');
      }
      // Cache simple
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' });
      }
    },
  });
}

// Encolar mutación para sync offline
export async function enqueueMutation(mutation) {
  const db = await initDB();
  const item = {
    id: generateId(),
    ...mutation,
    timestamp: Date.now(),
    synced: false,
    retry_count: 0,
  };
  await db.put('mutation_queue', item);
  console.log('📝 Mutación encolada:', item.id);
  
  if (isOnline()) processQueue();
  return item.id;
}

// Procesar cola de mutaciones (versión simplificada)
export async function processQueue() {
  if (!isOnline()) return;
  
  const db = await initDB();
  const all = await db.getAll('mutation_queue');
  const pending = all.filter(m => !m.synced);
  
  if (pending.length === 0) return;
  
  console.log(`🔄 Procesando ${pending.length} mutaciones...`);
  
  for (const mutation of pending) {
    try {
      await executeMutation(mutation);
      await db.delete('mutation_queue', mutation.id);
      console.log('✅ Mutación sincronizada:', mutation.id);
    } catch (error) {
      console.error('❌ Error en mutación:', error);
      mutation.retry_count += 1;
      if (mutation.retry_count < 5) {
        await db.put('mutation_queue', mutation);
      }
    }
  }
}

// Ejecutar mutación en Supabase
async function executeMutation(mutation) {
  const { table, type, payload, id, version } = mutation;
  
  if (type === 'INSERT') {
    const { data, error } = await supabase
      .from(table)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  if (type === 'UPDATE') {
    const { data, error } = await supabase
      .from(table)
      .update({ ...payload, version: (version || 0) + 1, updated_at: formatDate(new Date()) })
      .eq('id', id)
      .eq('version', version)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  if (type === 'DELETE') {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  }
}

// Stats de sync (simplificado)
export async function getSyncStats() {
  const db = await initDB();
  const all = await db.getAll('mutation_queue');
  const pending = all.filter(m => !m.synced);
  return { pending: pending.length, last_sync: pending[0]?.timestamp || null };
}

// Auto-sync cada 30s
export function startAutoSync() {
  setInterval(() => { if (isOnline()) processQueue(); }, SYNC_CONFIG?.SYNC_INTERVAL || 30000);
}

// Helpers de cache
export async function getFromCache(table, id) {
  const db = await initDB();
  const item = await db.get('cache', `${table}:${id}`);
  return item?.data || null;
}

export async function getAllFromCache(table) {
  const db = await initDB();
  const all = await db.getAll('cache');
  return all.filter(i => i.key.startsWith(`${table}:`)).map(i => i.data);
}
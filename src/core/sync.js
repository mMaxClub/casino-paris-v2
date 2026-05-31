import { openDB } from 'idb';
import { supabase, TABLES, SYNC_CONFIG } from '../config.js';
import { isOnline, generateId, formatDate } from './utils.js';

const DB_NAME = 'casino-paris-db';
const DB_VERSION = 1;

// Inicializar IndexedDB
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Cola de mutaciones pendientes
      if (!db.objectStoreNames.contains('mutation_queue')) {
        const queueStore = db.createObjectStore('mutation_queue', { 
          keyPath: 'id',
          autoIncrement: false 
        });
        queueStore.createIndex('timestamp', 'timestamp');
        queueStore.createIndex('table', 'table');
        queueStore.createIndex('synced', 'synced');
      }
      
      // Cache local de datos
      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
        cacheStore.createIndex('table', 'table');
        cacheStore.createIndex('updated_at', 'updated_at');
      }
      
      // Conflictos pendientes de resolución
      if (!db.objectStoreNames.contains('conflicts')) {
        const conflictStore = db.createObjectStore('conflicts', { 
          keyPath: 'id',
          autoIncrement: false 
        });
        conflictStore.createIndex('table', 'table');
        conflictStore.createIndex('created_at', 'created_at');
      }
    },
  });
}

// Agregar mutación a la cola
export async function enqueueMutation(mutation) {
  const db = await initDB();
  const mutationWithMeta = {
    id: generateId(),
    ...mutation,
    timestamp: Date.now(),
    synced: false,
    retry_count: 0,
  };
  
  await db.put('mutation_queue', mutationWithMeta);
  console.log('📝 Mutación encolada:', mutationWithMeta);
  
  // Intentar sincronizar inmediatamente si hay conexión
  if (isOnline()) {
    processQueue();
  }
  
  return mutationWithMeta.id;
}

// Procesar cola de mutaciones
export async function processQueue() {
  if (!isOnline()) {
    console.log('📴 Sin conexión, esperando...');
    return;
  }
  
  const db = await initDB();
  const pendingMutations = await db.getAllFromIndex(
    'mutation_queue',
    'synced',
    false
  );
  
  if (pendingMutations.length === 0) {
    console.log('✅ Cola vacía');
    return;
  }
  
  console.log(`🔄 Procesando ${pendingMutations.length} mutaciones pendientes...`);
  
  const successful = [];
  const conflicts = [];
  const failed = [];
  
  for (const mutation of pendingMutations) {
    try {
      const result = await executeMutation(mutation);
      
      if (result.conflict) {
        conflicts.push({ mutation, local: mutation.payload, remote: result.remote });
        await saveConflict(mutation, result.remote);
      } else {
        successful.push(mutation);
        await db.delete('mutation_queue', mutation.id);
        
        // Actualizar cache local
        if (result.data) {
          await updateCache(mutation.table, result.data);
        }
      }
    } catch (error) {
      console.error('❌ Error en mutación:', error);
      
      // Reintentar si no ha excedido el límite
      if (mutation.retry_count < 5) {
        mutation.retry_count += 1;
        await db.put('mutation_queue', mutation);
        failed.push(mutation);
      } else {
        // Marcar como fallida permanentemente
        mutation.error = error.message;
        await db.put('mutation_queue', mutation);
        failed.push(mutation);
      }
    }
  }
  
  console.log(`✅ ${successful.length} exitosas, ⚠️ ${conflicts.length} conflictos, ❌ ${failed.length} fallidas`);
  
  return { successful, conflicts, failed };
}

// Ejecutar mutación individual en Supabase
async function executeMutation(mutation) {
  const { table, type, payload, id, version } = mutation;
  
  switch (type) {
    case 'INSERT': {
      const { data, error } = await supabase
        .from(table)
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    case 'UPDATE': {
      // Optimistic Concurrency Control
      const { data, error } = await supabase
        .from(table)
        .update({
          ...payload,
          version: version + 1,
          updated_at: formatDate(new Date()),
        })
        .eq('id', id)
        .eq('version', version) // Solo actualiza si la versión coincide
        .select()
        .single();
      
      if (error) {
        // Verificar si es conflicto de versión
        if (error.code === 'PGRST116' || error.message.includes('version')) {
          // Obtener versión remota
          const { data: remote } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .single();
          
          return { conflict: true, remote };
        }
        throw error;
      }
      
      return { data };
    }
    
    case 'DELETE': {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('version', version);
      
      if (error) throw error;
      return {};
    }
    
    default:
      throw new Error(`Tipo de mutación desconocido: ${type}`);
  }
}

// Guardar conflicto para resolución manual
async function saveConflict(mutation, remoteData) {
  const db = await initDB();
  const conflict = {
    id: generateId(),
    mutation,
    local: mutation.payload,
    remote: remoteData,
    created_at: formatDate(new Date()),
    resolved: false,
  };
  
  await db.put('conflicts', conflict);
  console.warn('⚠️ Conflicto guardado:', conflict);
  
  // Disparar evento personalizado
  window.dispatchEvent(new CustomEvent('sync-conflict', { detail: conflict }));
}

// Actualizar cache local
async function updateCache(table, data) {
  const db = await initDB();
  const key = `${table}:${data.id}`;
  
  await db.put('cache', {
    key,
    table,
    data,
    updated_at: formatDate(new Date()),
  });
}

// Obtener datos del cache
export async function getFromCache(table, id) {
  const db = await initDB();
  const key = `${table}:${id}`;
  const cached = await db.get('cache', key);
  return cached?.data || null;
}

// Obtener todos los datos de una tabla del cache
export async function getAllFromCache(table) {
  const db = await initDB();
  const all = await db.getAllFromIndex('cache', 'table', table);
  return all.map(item => item.data);
}

// Obtener conflictos pendientes
export async function getConflicts() {
  const db = await initDB();
  return await db.getAllFromIndex('conflicts', 'resolved', false);
}

// Resolver conflicto (elegir local, remoto o merge)
export async function resolveConflict(conflictId, resolution) {
  const db = await initDB();
  const conflict = await db.get('conflicts', conflictId);
  
  if (!conflict) throw new Error('Conflicto no encontrado');
  
  let finalData;
  
  switch (resolution) {
    case 'local':
      finalData = { ...conflict.remote, ...conflict.local };
      break;
    case 'remote':
      finalData = conflict.remote;
      break;
    case 'merge':
      // Merge inteligente por campos
      finalData = { ...conflict.remote };
      for (const [key, value] of Object.entries(conflict.local)) {
        if (value !== undefined && !['version', 'updated_at'].includes(key)) {
          finalData[key] = value;
        }
      }
      break;
    default:
      throw new Error('Resolución desconocida');
  }
  
  // Actualizar en Supabase
  const { error } = await supabase
    .from(conflict.mutation.table)
    .update({
      ...finalData,
      version: conflict.remote.version + 1,
      updated_at: formatDate(new Date()),
    })
    .eq('id', conflict.mutation.id);
  
  if (error) throw error;
  
  // Marcar como resuelto
  conflict.resolved = true;
  conflict.resolved_at = formatDate(new Date());
  await db.put('conflicts', conflict);
  
  // Eliminar de la cola
  await db.delete('mutation_queue', conflict.mutation.id);
  
  console.log('✅ Conflicto resuelto:', resolution);
}

// Sync periódico
export function startAutoSync() {
  setInterval(() => {
    if (isOnline()) {
      processQueue();
    }
  }, SYNC_CONFIG.SYNC_INTERVAL);
  
  console.log('🔄 Auto-sync iniciado (cada 30s)');
}

// Obtener estadísticas de sync
export async function getSyncStats() {
  const db = await initDB();
  const pending = await db.getAllFromIndex('mutation_queue', 'synced', false);
  const conflicts = await getConflicts();
  
  return {
    pending: pending.length,
    conflicts: conflicts.length,
    last_sync: pending.length > 0 
      ? new Date(Math.max(...pending.map(p => p.timestamp))).toISOString()
      : null,
  };
}

export { initDB };
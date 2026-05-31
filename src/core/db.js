import { supabase, TABLES } from '../config.js';
import { enqueueMutation, getFromCache, getAllFromCache, processQueue } from './sync.js';
import { isOnline } from './utils.js';

// ==================== MÁQUINAS ====================

export async function getMaquinas() {
  if (isOnline()) {
    const { data, error } = await supabase
      .from(TABLES.MAQUINAS)
      .select('*')
      .order('id_maquina');
    
    if (error) throw error;
    return data;
  } else {
    return await getAllFromCache(TABLES.MAQUINAS);
  }
}

export async function getMaquinaById(id) {
  if (isOnline()) {
    const { data, error } = await supabase
      .from(TABLES.MAQUINAS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } else {
    return await getFromCache(TABLES.MAQUINAS, id);
  }
}

export async function updateMaquina(id, payload, version) {
  await enqueueMutation({
    table: TABLES.MAQUINAS,
    type: 'UPDATE',
    id,
    payload,
    version,
  });
}

export async function updateMaquinaCoordinates(id, x, y, version) {
  await updateMaquina(id, { coordenadas_x: x, coordenadas_y: y }, version);
}

// ==================== CALIBRACIÓN ====================

export async function saveCalibracion(maquinaId, x, y, metadata = {}) {
  const payload = {
    maquina_id: maquinaId,
    coordenada_x: x,
    coordenada_y: y,
    ...metadata,
  };
  
  await enqueueMutation({
    table: TABLES.CALIBRACION,
    type: 'INSERT',
    payload,
    version: 0,
  });
  
  // Actualizar también la máquina
  const maquina = await getMaquinaById(maquinaId);
  if (maquina) {
    await updateMaquinaCoordinates(maquinaId, x, y, maquina.version);
  }
}

export async function getCalibracionByMaquina(maquinaId) {
  const { data, error } = await supabase
    .from(TABLES.CALIBRACION)
    .select('*')
    .eq('maquina_id', maquinaId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ==================== MANTENIMIENTOS ====================

export async function createMantenimiento(payload) {
  await enqueueMutation({
    table: TABLES.MANTENIMIENTOS,
    type: 'INSERT',
    payload: {
      ...payload,
      estado: 'ABIERTO',
      created_at: new Date().toISOString(),
    },
    version: 0,
  });
}

export async function updateMantenimiento(id, payload, version) {
  await enqueueMutation({
    table: TABLES.MANTENIMIENTOS,
    type: 'UPDATE',
    id,
    payload,
    version,
  });
}

export async function getMantenimientos(filters = {}) {
  let query = supabase.from(TABLES.MANTENIMIENTOS).select('*');
  
  if (filters.estado) {
    query = query.eq('estado', filters.estado);
  }
  
  if (filters.maquina_id) {
    query = query.eq('maquina_id', filters.maquina_id);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ==================== BANCA ====================

export async function createArqueo(payload) {
  await enqueueMutation({
    table: TABLES.BANCA,
    type: 'INSERT',
    payload: {
      ...payload,
      estado: 'ABIERTO',
      created_at: new Date().toISOString(),
    },
    version: 0,
  });
}

export async function updateArqueo(id, payload, version) {
  await enqueueMutation({
    table: TABLES.BANCA,
    type: 'UPDATE',
    id,
    payload,
    version,
  });
}

export async function getArqueos(filters = {}) {
  let query = supabase.from(TABLES.BANCA).select('*');
  
  if (filters.maquina_id) {
    query = query.eq('maquina_id', filters.maquina_id);
  }
  
  if (filters.fecha) {
    query = query.gte('fecha', filters.fecha);
  }
  
  const { data, error } = await query.order('fecha', { ascending: false });
  if (error) throw error;
  return data;
}

// ==================== PREMIOS ====================

export async function registrarPremio(payload) {
  await enqueueMutation({
    table: TABLES.PREMIOS,
    type: 'INSERT',
    payload: {
      ...payload,
      created_at: new Date().toISOString(),
    },
    version: 0,
  });
}

export async function getPremios(filters = {}) {
  let query = supabase.from(TABLES.PREMIOS).select('*');
  
  if (filters.maquina_id) {
    query = query.eq('maquina_id', filters.maquina_id);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ==================== SYNC MANUAL ====================

export async function forceSync() {
  console.log('🔄 Forzando sincronización...');
  return await processQueue();
}
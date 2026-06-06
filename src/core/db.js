// src/core/db.js
import { supabase, TABLES } from '../config.js';

/**
 * Obtiene todas las máquinas ordenadas por sector/fila/columna
 */
export async function getMaquinas() {
  const { data, error } = await supabase
    .from(TABLES.MAQUINAS)
    .select('*')
    .order('sector', { ascending: true })
    .order('fila', { ascending: true })
    .order('columna', { ascending: true });

  if (error) {
    console.error('❌ Error al obtener máquinas:', error);
    return [];
  }
  return data || [];
}

/**
 * Actualiza coordenadas X,Y de una máquina
 */
export async function updateMaquinaCoordinates(id, x, y) {
  const { error } = await supabase
    .from(TABLES.MAQUINAS)
    .update({ 
      coordenadas_x: x, 
      coordenadas_y: y, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id);

  if (error) console.error('❌ Error actualizando coordenadas:', error);
  return !error;
}

/**
 * Obtiene estadísticas rápidas por estado
 */
export async function getMaquinasStats() {
  const { data, error } = await supabase
    .from(TABLES.MAQUINAS)
    .select('estado')
    .neq('estado', null);

  if (error) return { ACTIVA: 0, MANTENIMIENTO: 0, BAJA: 0, FUERA_SERVICIO: 0 };

  const stats = { ACTIVA: 0, MANTENIMIENTO: 0, BAJA: 0, FUERA_SERVICIO: 0 };
  data.forEach(m => {
    const e = m.estado?.trim().toUpperCase();
    if (stats.hasOwnProperty(e)) stats[e]++;
  });
  return stats;
}

/**
 * ✅ NUEVO: Obtiene estadísticas de sincronización
 */
export async function getSyncStats() {
  try {
    // Contar máquinas totales
    const { count: totalMaquinas } = await supabase
      .from(TABLES.MAQUINAS)
      .select('*', { count: 'exact', head: true });

    // Contar máquinas activas
    const { count: activas } = await supabase
      .from(TABLES.MAQUINAS)
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'ACTIVA');

    // Contar en mantenimiento
    const { count: mantenimiento } = await supabase
      .from(TABLES.MAQUINAS)
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'MANTENIMIENTO');

    // Contar de baja
    const { count: baja } = await supabase
      .from(TABLES.MAQUINAS)
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'BAJA');

    return {
      total: totalMaquinas || 0,
      activas: activas || 0,
      mantenimiento: mantenimiento || 0,
      baja: baja || 0,
      last_sync: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Error obteniendo stats de sync:', error);
    return {
      total: 0,
      activas: 0,
      mantenimiento: 0,
      baja: 0,
      last_sync: null
    };
  }
}

/**
 * ✅ NUEVO: Fuerza sincronización manual
 */
export async function forceSync() {
  console.log('🔄 Forzando sincronización...');
  try {
    // Recargar datos desde Supabase
    const maquinas = await getMaquinas();
    console.log(`✅ Sincronizadas ${maquinas.length} máquinas`);
    return { success: true, count: maquinas.length };
  } catch (error) {
    console.error('❌ Error en forceSync:', error);
    return { success: false, error: error.message };
  }
}
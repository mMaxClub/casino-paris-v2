// Generar ID único
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Verificar si hay conexión a internet
export function isOnline() {
  return navigator.onLine;
}

// Escuchar cambios de conexión
export function onConnectionChange(callback) {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}

// Formatear fecha
export function formatDate(date) {
  return new Date(date).toISOString();
}

// Deep clone
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Merge de objetos (para resolución de conflictos)
export function mergeObjects(target, source, fieldsToMerge = []) {
  const merged = { ...target };
  
  for (const field of fieldsToMerge) {
    if (source[field] !== undefined && source[field] !== null) {
      merged[field] = source[field];
    }
  }
  
  return merged;
}

// Validar coordenadas
export function isValidCoordinates(x, y) {
  return typeof x === 'number' && typeof y === 'number' && 
         x >= 0 && y >= 0 && x <= 10000 && y <= 10000;
}
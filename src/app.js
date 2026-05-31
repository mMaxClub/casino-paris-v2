import { supabase } from './config.js';
import { initDB, startAutoSync, getSyncStats, processQueue } from './core/sync.js';
import { forceSync } from './core/db.js';
import { onConnectionChange, isOnline } from './core/utils.js';

class CasinoParisApp {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
  }
  
  async init() {
    if (this.initialized) return;
    
    console.log('🎰 Inicializando Casino Paris v2.0...');
    
    try {
      // 1. Inicializar IndexedDB
      await initDB();
      console.log('✅ IndexedDB listo');
      
      // 2. Verificar sesión
      await this.checkSession();
      
      // 3. Configurar listeners de conexión
      this.setupConnectionListeners();
      
      // 4. Iniciar auto-sync
      startAutoSync();
      
      // 5. Registrar Service Worker
      await this.registerServiceWorker();
      
      // 6. Mostrar estadísticas de sync
      await this.showSyncStats();
      
      // 7. Escuchar eventos de conflicto
      this.setupConflictListeners();
      
      this.initialized = true;
      console.log('✅ App inicializada correctamente');
      
      // Actualizar UI
      this.updateOnlineStatus();
      
    } catch (error) {
      console.error('❌ Error inicializando:', error);
      alert('Error inicializando la aplicación. Recarga la página.');
    }
  }
  
  async checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    this.currentUser = session?.user || null;
    
    if (!this.currentUser) {
      console.log('⚠️ Sin sesión activa');
      // Redirigir a login si es necesario
      // window.location.href = '/login.html';
    }
  }
  
  setupConnectionListeners() {
    onConnectionChange((online) => {
      console.log(online ? '🟢 Online' : '🔴 Offline');
      this.updateOnlineStatus();
      
      if (online) {
        // Intentar sync automático al recuperar conexión
        setTimeout(() => {
          processQueue();
        }, 2000);
      }
    });
  }
  
  updateOnlineStatus() {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;
    
    const online = isOnline();
    statusEl.textContent = online ? '🟢 En línea' : '🔴 Sin conexión';
    statusEl.className = online ? 'status-online' : 'status-offline';
    
    // Actualizar en todas las páginas
    document.body.classList.toggle('offline', !online);
  }
  
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        
        console.log('✅ SW registrado:', registration.scope);
        
        // Escuchar actualizaciones
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Hay actualización disponible
              if (confirm('Nueva versión disponible. ¿Recargar?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
        
        // Escuchar mensajes del SW
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_REQUESTED') {
            console.log('🔄 Sync solicitado por SW');
            processQueue();
          }
        });
        
      } catch (error) {
        console.error('❌ Error registrando SW:', error);
      }
    }
  }
  
  async showSyncStats() {
    const stats = await getSyncStats();
    console.log('📊 Sync Stats:', stats);
    
    const statsEl = document.getElementById('syncStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span title="Pendientes: ${stats.pending}, Conflictos: ${stats.conflicts}">
          ${stats.pending > 0 ? `⏳ ${stats.pending} pendientes` : '✅ Sync OK'}
        </span>
      `;
    }
    
    // Actualizar cada 30 segundos
    setTimeout(() => this.showSyncStats(), 30000);
  }
  
  setupConflictListeners() {
    window.addEventListener('sync-conflict', (event) => {
      const conflict = event.detail;
      console.warn('⚠️ Conflicto detectado:', conflict);
      
      // Mostrar notificación
      this.showConflictNotification(conflict);
    });
  }
  
  showConflictNotification(conflict) {
    // Crear notificación UI
    const notification = document.createElement('div');
    notification.className = 'conflict-notification';
    notification.innerHTML = `
      <div class="conflict-content">
        <h4>⚠️ Conflicto de Sincronización</h4>
        <p>Hay cambios conflictivos en ${conflict.mutation.table}</p>
        <div class="conflict-actions">
          <button onclick="window.resolveConflict('${conflict.id}', 'local')">
            Usar Mis Cambios
          </button>
          <button onclick="window.resolveConflict('${conflict.id}', 'remote')">
            Usar Servidor
          </button>
          <button onclick="window.resolveConflict('${conflict.id}', 'merge')">
            Combinar
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-ocultar después de 10 segundos
    setTimeout(() => {
      notification.remove();
    }, 10000);
  }
  
  // Forzar sync manual
  async manualSync() {
    const btn = document.getElementById('syncButton');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '🔄 Sincronizando...';
    }
    
    try {
      const result = await forceSync();
      console.log('Sync manual completado:', result);
      await this.showSyncStats();
    } catch (error) {
      console.error('Error en sync manual:', error);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Sincronizar Ahora';
      }
    }
  }
}

// Exponer funciones globales necesarias
window.resolveConflict = async (conflictId, resolution) => {
  const { resolveConflict } = await import('./core/sync.js');
  try {
    await resolveConflict(conflictId, resolution);
    alert('✅ Conflicto resuelto');
    // Remover notificación
    document.querySelector('.conflict-notification')?.remove();
  } catch (error) {
    alert('Error resolviendo conflicto: ' + error.message);
  }
};

// Inicializar app
const app = new CasinoParisApp();
window.casinoApp = app;

document.addEventListener('DOMContentLoaded', () => {
  app.init();
  
  // Botón de sync manual
  const syncBtn = document.getElementById('syncButton');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => app.manualSync());
  }
});

export default app;
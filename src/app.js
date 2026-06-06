// src/app.js
import { getSyncStats, forceSync } from './core/db.js';
import { renderDashboard } from './modules/dashboard.js';
import { PlanoInteractivo } from './modules/plano.js';

class CasinoApp {
  constructor() {
    this.initialized = false;
    this.currentView = 'dashboard';
    this.planoModule = null;
  }

  async init() {
    try {
      console.log('🎰 Inicializando Casino Paris v2.0...');
      
      // Configurar navegación
      this.setupNavigation();
      
      // Actualizar estado de conexión
      this.updateOnlineStatus();
      window.addEventListener('online', () => this.updateOnlineStatus());
      window.addEventListener('offline', () => this.updateOnlineStatus());
      
      // Cargar vista inicial (Dashboard)
      await renderDashboard();
      
      this.initialized = true;
      console.log('✅ App inicializada correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando:', error);
      const appDiv = document.getElementById('app');
      if (appDiv) {
        appDiv.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: #ef4444;">
            <h2>❌ Error al iniciar la aplicación</h2>
            <p>${error.message}</p>
            <button onclick="location.reload()" style="margin-top: 1rem; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Reintentar</button>
          </div>
        `;
      }
    }
  }

  setupNavigation() {
    // Event listeners para botones de navegación
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
        
        // Actualizar botón activo
        document.querySelectorAll('[data-view]').forEach(b => {
          b.classList.remove('active');
          b.style.background = '#1e293b';
        });
        e.currentTarget.classList.add('active');
        e.currentTarget.style.background = '#3b82f6';
      });
    });
    
    // Botón de sincronización manual
    document.getElementById('btnSync')?.addEventListener('click', async () => {
      const btn = document.getElementById('btnSync');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳</span><span>Sincronizando...</span>';
      }
      
      const result = await forceSync();
      
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span>🔄</span><span>Sincronizar</span>';
      }
      
      if (result.success) {
        this.showNotification(`✅ Sincronizado: ${result.count} registros`);
        if (this.currentView === 'dashboard') {
          await renderDashboard();
        }
      } else {
        this.showNotification('❌ Error al sincronizar', 'error');
      }
    });
  }

  async switchView(view) {
    this.currentView = view;
    
    switch(view) {
      case 'dashboard':
        await renderDashboard();
        break;
        
      case 'plano':
        if (!this.planoModule) {
          this.planoModule = new PlanoInteractivo();
        }
        await this.planoModule.init();
        break;
        
      case 'inventario':
        await renderDashboard(); // Por ahora muestra el dashboard
        this.showNotification('📋 Módulo de Inventario - Próximamente');
        break;
        
      case 'red':
        const appDiv = document.getElementById('app');
        if (appDiv) {
          appDiv.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: white;">
              <h2>🌐 Módulo de Red</h2>
              <p style="color: #94a3b8; margin-top: 1rem;">Gestión de nodos, switches y conexiones</p>
              <p style="color: #64748b; margin-top: 2rem;">Próximamente disponible</p>
            </div>
          `;
        }
        break;
        
      case 'mantenimiento':
        const appDiv2 = document.getElementById('app');
        if (appDiv2) {
          appDiv2.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: white;">
              <h2>🔧 Módulo de Mantenimiento</h2>
              <p style="color: #94a3b8; margin-top: 1rem;">Registro de fallas y reparaciones</p>
              <p style="color: #64748b; margin-top: 2rem;">Próximamente disponible</p>
            </div>
          `;
        }
        break;
        
      default:
        await renderDashboard();
    }
  }

  updateOnlineStatus() {
    const statusEl = document.getElementById('onlineStatus');
    if (statusEl) {
      const isOnline = navigator.onLine;
      statusEl.innerHTML = `
        <span style="width: 8px; height: 8px; background: ${isOnline ? '#22c55e' : '#ef4444'}; border-radius: 50%; display: inline-block; animation: ${isOnline ? 'none' : 'pulse 2s infinite'};"></span>
        <span>${isOnline ? 'En línea' : 'Sin conexión'}</span>
      `;
      statusEl.style.color = isOnline ? '#22c55e' : '#ef4444';
    }
  }

  showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: ${type === 'success' ? '#22c55e' : '#ef4444'};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }
}

// Inicializar app
const app = new CasinoApp();
app.init();

// Estilos para animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;
document.head.appendChild(style);
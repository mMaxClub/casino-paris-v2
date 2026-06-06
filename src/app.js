// src/app.js
import { initDB, startAutoSync, getSyncStats, processQueue, forceSync } from './core/db.js';
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
      // 1. Inicializar IndexedDB
      await initDB();
      console.log('✅ IndexedDB listo');
      
      // 2. Iniciar auto-sync
      startAutoSync();
      console.log('🔄 Auto-sync iniciado');
      
      // 3. Actualizar UI inicial
      this.updateOnlineStatus();
      
      // 4. Configurar navegación
      this.setupNavigation();
      
      // 5. Cargar vista inicial (Dashboard)
      await renderDashboard();
      
      this.initialized = true;
      console.log('✅ App inicializada correctamente');
      
    } catch (error) {
      console.error('❌ Error inicializando:', error);
      this.showError('Error inicializando la aplicación. Recarga la página.');
    }
  }

  setupNavigation() {
    // Agregar event listeners a los botones de navegación
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        this.switchView(view);
      });
    });
  }

  async switchView(view) {
    const container = document.getElementById('app');
    
    // Actualizar botón activo
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
    
    this.currentView = view;
    
    switch(view) {
      case 'dashboard':
        await renderDashboard();
        break;
        
      case 'plano':
        if (!this.planoModule) {
          this.planoModule = new PlanoInteractivo();
          window.planoModule = this.planoModule; // Hacer global
        }
        await this.planoModule.init();
        break;
        
      case 'inventario':
        // TODO: Implementar módulo de inventario
        container.innerHTML = '<div style="padding: 2rem; color: white;">📋 Módulo de Inventario - Próximamente</div>';
        break;
        
      case 'red':
        // TODO: Implementar módulo de red
        container.innerHTML = '<div style="padding: 2rem; color: white;">🌐 Módulo de Red - Próximamente</div>';
        break;
        
      case 'mantenimiento':
        // TODO: Implementar módulo de mantenimiento
        container.innerHTML = '<div style="padding: 2rem; color: white;">🔧 Módulo de Mantenimiento - Próximamente</div>';
        break;
        
      default:
        await renderDashboard();
    }
  }

  updateOnlineStatus() {
    const statusEl = document.getElementById('onlineStatus');
    if (statusEl) {
      statusEl.textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
      statusEl.style.color = navigator.onLine ? '#22c55e' : '#ef4444';
    }
  }

  showError(message) {
    alert(message);
  }
}

// Inicializar app
const app = new CasinoApp();
app.init();
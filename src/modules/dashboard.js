// src/modules/dashboard.js
import { getMaquinas, getMaquinasStats } from '../core/db.js';

export async function renderDashboard() {
  const appDiv = document.getElementById('app');
  if (!appDiv) return;

  // 1. Mostrar estado de carga
  appDiv.innerHTML = `
    <div style="text-align: center; padding: 3rem; color: #94a3b8;">
      <div class="loader" style="width: 40px; height: 40px; border: 3px solid #334155; border-top: 3px solid #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
      <p>🔄 Cargando inventario desde Supabase...</p>
    </div>
    <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
  `;

  try {
    // 2. Obtener datos en paralelo
    const [maquinas, stats] = await Promise.all([
      getMaquinas(),
      getMaquinasStats()
    ]);

    console.log(`📊 Inventario cargado: ${maquinas.length} máquinas`);
    console.log('📈 Estadísticas:', stats);

    // 3. Generar HTML
    appDiv.innerHTML = `
      <div style="padding: 1.5rem; max-width: 1400px; margin: 0 auto;">
        <!-- Stats Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div class="stat-card" style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 4px solid #22c55e;">
            <h4 style="color: #94a3b8; margin: 0;">✅ Activas</h4>
            <p style="font-size: 2rem; font-weight: bold; color: #fff; margin: 0.5rem 0 0;">${stats.ACTIVA}</p>
          </div>
          <div class="stat-card" style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h4 style="color: #94a3b8; margin: 0;">🔧 Mantenimiento</h4>
            <p style="font-size: 2rem; font-weight: bold; color: #fff; margin: 0.5rem 0 0;">${stats.MANTENIMIENTO}</p>
          </div>
          <div class="stat-card" style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 4px solid #ef4444;">
            <h4 style="color: #94a3b8; margin: 0;">🔴 Baja</h4>
            <p style="font-size: 2rem; font-weight: bold; color: #fff; margin: 0.5rem 0 0;">${stats.BAJA}</p>
          </div>
          <div class="stat-card" style="background: #1e293b; padding: 1rem; border-radius: 8px; border-left: 4px solid #64748b;">
            <h4 style="color: #94a3b8; margin: 0;">⚪ Fuera Servicio</h4>
            <p style="font-size: 2rem; font-weight: bold; color: #fff; margin: 0.5rem 0 0;">${stats.FUERA_SERVICIO}</p>
          </div>
        </div>

        <!-- Tabla -->
        <div style="background: #1e293b; border-radius: 8px; padding: 1rem; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; color: #e2e8f0; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid #334155;">
                <th style="padding: 12px;">ID</th>
                <th style="padding: 12px;">Juego</th>
                <th style="padding: 12px;">Modelo</th>
                <th style="padding: 12px;">Sector</th>
                <th style="padding: 12px;">Nodo</th>
                <th style="padding: 12px;">Estado</th>
                <th style="padding: 12px;">Coordenadas</th>
              </tr>
            </thead>
            <tbody>
              ${maquinas.map(m => `
                <tr style="border-bottom: 1px solid #334155; transition: background 0.2s;" 
                    onmouseover="this.style.background='#334155'" 
                    onmouseout="this.style.background='transparent'">
                  <td style="padding: 12px; font-weight: bold;">${m.id_maquina || '-'}</td>
                  <td style="padding: 12px;">${m.juego || '-'}</td>
                  <td style="padding: 12px; color: #94a3b8;">${m.fabricante_modelo || '-'}</td>
                  <td style="padding: 12px;">${m.sector}</td>
                  <td style="padding: 12px;">${m.nodo || '-'}</td>
                  <td style="padding: 12px;">
                    <span style="
                      padding: 4px 8px; border-radius: 12px; font-size: 0.85em; font-weight: 600;
                      background: ${getStatusColor(m.estado)}; color: white;
                    ">${m.estado || 'N/A'}</span>
                  </td>
                  <td style="padding: 12px; font-family: monospace; color: #64748b;">
                    ${m.coordenadas_x !== null ? `X:${m.coordenadas_x} Y:${m.coordenadas_y}` : 'Sin calibrar'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p style="margin-top: 1rem; color: #64748b; font-size: 0.9em;">
          Mostrando ${maquinas.length} registros | <span style="color: #22c55e;">● Sincronizado con Supabase</span>
        </p>
      </div>
    `;

  } catch (error) {
    console.error('❌ Error renderizando dashboard:', error);
    appDiv.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #ef4444;">
        <p> Error al cargar datos desde Supabase.</p>
        <p style="font-size: 0.9em; color: #94a3b8;">${error.message}</p>
        <button onclick="location.reload()" style="margin-top: 1rem; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Reintentar</button>
      </div>
    `;
  }
}

function getStatusColor(status) {
  switch (status?.trim().toUpperCase()) {
    case 'ACTIVA': return '#22c55e';
    case 'MANTENIMIENTO': return '#f59e0b';
    case 'BAJA': return '#ef4444';
    case 'FUERA_SERVICIO': return '#64748b';
    default: return '#3b82f6';
  }
}
// src/modules/dashboard.js
import { getMaquinas } from '../core/db.js';

export async function renderDashboard() {
  const appDiv = document.getElementById('app');
  if (!appDiv) return;

  try {
    // 1. Mostrar spinner de carga
    appDiv.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #94a3b8;">
        <p>🔄 Cargando inventario...</p>
      </div>`;

    // 2. Obtener datos (Supabase o Cache)
    const maquinas = await getMaquinas();
    
    console.log(`📊 Se cargaron ${maquinas.length} máquinas`);

    // 3. Generar HTML de la tabla
    if (maquinas.length === 0) {
      appDiv.innerHTML = `<p style="padding: 2rem; color: #f59e0b;">⚠️ No hay máquinas registradas. Usa el script SQL de Seed Data.</p>`;
      return;
    }

    let html = `
      <div style="padding: 1rem;">
        <h2 style="color: #38bdf8; margin-bottom: 1rem;"> Inventario de Máquinas</h2>
        <div style="overflow-x: auto; background: #1e293b; border-radius: 8px; padding: 1rem;">
          <table style="width: 100%; border-collapse: collapse; color: #e2e8f0; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid #334155;">
                <th style="padding: 12px;">ID</th>
                <th style="padding: 12px;">Juego</th>
                <th style="padding: 12px;">Sector</th>
                <th style="padding: 12px;">Nodo</th>
                <th style="padding: 12px;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${maquinas.map(m => `
                <tr style="border-bottom: 1px solid #334155; transition: background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">
                  <td style="padding: 12px; font-weight: bold;">${m.id_maquina}</td>
                  <td style="padding: 12px;">${m.juego || '-'}</td>
                  <td style="padding: 12px;">${m.sector}</td>
                  <td style="padding: 12px;">${m.nodo || '-'}</td>
                  <td style="padding: 12px;">
                    <span style="
                      padding: 4px 8px; 
                      border-radius: 12px; 
                      font-size: 0.85em; 
                      font-weight: 600;
                      background: ${getStatusColor(m.estado)}; 
                      color: white;
                    ">
                      ${m.estado}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p style="margin-top: 1rem; color: #64748b; font-size: 0.9em;">
          Mostrando ${maquinas.length} registros | <span style="color: #22c55e;">● En línea</span>
        </p>
      </div>
    `;

    // 4. Insertar en el DOM
    appDiv.innerHTML = html;

  } catch (error) {
    console.error('❌ Error renderizando dashboard:', error);
    appDiv.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #ef4444;">
        <p>❌ Error al cargar datos.</p>
        <p style="font-size: 0.9em;">${error.message}</p>
      </div>
    `;
  }
}

// Helper para colores de estado
function getStatusColor(status) {
  switch (status?.toUpperCase()) {
    case 'ACTIVA': return '#22c55e'; // Verde
    case 'MANTENIMIENTO': return '#f59e0b'; // Naranja
    case 'BAJA': return '#ef4444'; // Rojo
    case 'FUERA_SERVICIO': return '#64748b'; // Gris
    default: return '#3b82f6'; // Azul
  }
}
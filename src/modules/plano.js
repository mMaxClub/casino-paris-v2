// src/modules/plano.js
import { supabase, TABLES } from '../config.js';

export class PlanoInteractivo {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.maquinas = [];
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.planoImage = null;
  }

  async init() {
    const container = document.getElementById('app');
    if (!container) return;

    container.innerHTML = `
      <div style="position: relative; width: 100%; height: calc(100vh - 80px); background: #0f172a; overflow: hidden;">
        <canvas id="planoCanvas" style="display: block; cursor: grab;"></canvas>
        
        <div style="position: absolute; bottom: 20px; right: 20px; display: flex; gap: 8px; z-index: 100;">
          <button id="zoomIn" style="width: 40px; height: 40px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 8px; font-size: 18px; cursor: pointer;">+</button>
          <button id="zoomOut" style="width: 40px; height: 40px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 8px; font-size: 18px; cursor: pointer;">−</button>
          <button id="zoomReset" style="width: 40px; height: 40px; background: #1e293b; color: white; border: 1px solid #334155; border-radius: 8px; font-size: 12px; cursor: pointer;">⌂</button>
        </div>
        
        <div style="position: absolute; top: 20px; left: 20px; background: rgba(15, 23, 42, 0.9); padding: 12px 16px; border-radius: 8px; border: 1px solid #334155; color: white; font-size: 12px; z-index: 100;">
          <div style="margin-bottom: 4px;"><span style="color: #22c55e;">●</span> Activas: <strong id="countActivas">0</strong></div>
          <div style="margin-bottom: 4px;"><span style="color: #f59e0b;">●</span> Mantenimiento: <strong id="countMantenimiento">0</strong></div>
          <div><span style="color: #ef4444;">●</span> Baja: <strong id="countBaja">0</strong></div>
        </div>
        
        <div id="planoLoading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #94a3b8;">
          <div style="width: 40px; height: 40px; border: 3px solid #334155; border-top: 3px solid #38bdf8; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
          <p>Cargando plano...</p>
        </div>
      </div>
      <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
    `;

    this.canvas = document.getElementById('planoCanvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    await this.loadData();
    this.setupEvents();
    this.render();
    
    const loading = document.getElementById('planoLoading');
    if (loading) loading.style.display = 'none';
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.render();
  }

  async loadData() {
    const { data, error } = await supabase
      .from(TABLES.MAQUINAS)
      .select('*')
      .order('sector')
      .order('fila')
      .order('columna');

    if (error) {
      console.error('Error cargando máquinas:', error);
      return;
    }
    
    this.maquinas = data || [];
    this.updateStats();
  }

  updateStats() {
    const stats = { ACTIVA: 0, MANTENIMIENTO: 0, BAJA: 0 };
    this.maquinas.forEach(m => {
      const e = m.estado?.trim().toUpperCase();
      if (stats.hasOwnProperty(e)) stats[e]++;
    });
    
    document.getElementById('countActivas').textContent = stats.ACTIVA;
    document.getElementById('countMantenimiento').textContent = stats.MANTENIMIENTO;
    document.getElementById('countBaja').textContent = stats.BAJA;
  }

  setupEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.max(0.2, Math.min(this.scale * delta, 5));
      this.render();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.offsetX += e.clientX - this.lastX;
      this.offsetY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    });

    document.getElementById('zoomIn')?.addEventListener('click', () => {
      this.scale = Math.min(this.scale * 1.2, 5);
      this.render();
    });
    
    document.getElementById('zoomOut')?.addEventListener('click', () => {
      this.scale = Math.max(this.scale * 0.8, 0.2);
      this.render();
    });
    
    document.getElementById('zoomReset')?.addEventListener('click', () => {
      this.scale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.render();
    });
  }

  render() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Grid de fondo
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 1;
    const gridSize = 50 * this.scale;
    const offsetX = this.offsetX % gridSize;
    const offsetY = this.offsetY % gridSize;
    
    for (let x = offsetX; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = offsetY; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
    
    // Dibujar máquinas
    const statusColors = {
      'ACTIVA': '#22c55e',
      'MANTENIMIENTO': '#f59e0b',
      'BAJA': '#ef4444',
      'FUERA_SERVICIO': '#64748b'
    };
    
    this.maquinas.forEach(m => {
      if (!m.coordenadas_x || !m.coordenadas_y) return;
      
      const x = m.coordenadas_x * this.scale + this.offsetX;
      const y = m.coordenadas_y * this.scale + this.offsetY;
      
      if (x < -50 || x > this.canvas.width + 50 || y < -50 || y > this.canvas.height + 50) return;
      
      const color = statusColors[m.estado?.trim().toUpperCase()] || '#3b82f6';
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      if (this.scale > 0.8) {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(m.id_maquina, x, y - 12);
      }
    });
  }
}
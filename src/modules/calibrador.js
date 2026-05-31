import { saveCalibracion, getMaquinas, getCalibracionByMaquina } from '../core/db.js';
import { isValidCoordinates } from '../core/utils.js';

class CalibradorManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.image = null;
    this.maquinas = [];
    this.selectedMaquina = null;
    this.clicks = [];
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    
    this.init();
  }
  
  init() {
    this.canvas = document.getElementById('calibradorCanvas');
    if (!this.canvas) {
      console.error('❌ Canvas no encontrado');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.setupEventListeners();
    this.loadMaquinas();
  }
  
  setupEventListeners() {
    // Carga de imagen
    const fileInput = document.getElementById('imageInput');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.loadImage(e));
    }
    
    // Click en canvas
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    
    // Botones
    const downloadBtn = document.getElementById('downloadJsonBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadJSON());
    }
    
    const copyBtn = document.getElementById('copyTextBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }
    
    const saveAllBtn = document.getElementById('saveAllBtn');
    if (saveAllBtn) {
      saveAllBtn.addEventListener('click', () => this.saveAllCalibrations());
    }
    
    // Zoom y pan
    this.canvas.addEventListener('wheel', (e) => this.handleZoom(e));
    
    // Resize
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  async loadMaquinas() {
    try {
      this.maquinas = await getMaquinas();
      this.updateMaquinaList();
      console.log(`✅ ${this.maquinas.length} máquinas cargadas`);
    } catch (error) {
      console.error('❌ Error cargando máquinas:', error);
      alert('Error cargando máquinas. Verifica la conexión.');
    }
  }
  
  updateMaquinaList() {
    const select = document.getElementById('maquinaSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecciona una máquina...</option>';
    
    this.maquinas.forEach(maquina => {
      const option = document.createElement('option');
      option.value = maquina.id;
      option.textContent = `${maquina.id_maquina} - ${maquina.juego} (${maquina.sector})`;
      select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => this.selectMaquina(e.target.value));
  }
  
  async selectMaquina(maquinaId) {
    if (!maquinaId) {
      this.selectedMaquina = null;
      this.clicks = [];
      this.draw();
      return;
    }
    
    this.selectedMaquina = this.maquinas.find(m => m.id === maquinaId);
    this.clicks = [];
    
    // Cargar calibración existente si hay
    try {
      const existing = await getCalibracionByMaquina(maquinaId);
      if (existing) {
        this.clicks = [{
          x: existing.coordenada_x,
          y: existing.coordenada_y,
          timestamp: existing.created_at,
        }];
        console.log('📍 Calibración existente cargada');
      }
    } catch (error) {
      console.warn('No se pudo cargar calibración existente:', error);
    }
    
    this.draw();
    this.updateInfo();
  }
  
  loadImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.image = new Image();
      this.image.onload = () => {
        this.resizeCanvas();
        this.draw();
        document.getElementById('imageInfo').textContent = 
          `Imagen cargada: ${this.image.width}x${this.image.height}px`;
      };
      this.image.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  resizeCanvas() {
    if (!this.image || !this.canvas) return;
    
    const container = this.canvas.parentElement;
    const maxWidth = container.clientWidth;
    const maxHeight = window.innerHeight - 200;
    
    const scale = Math.min(maxWidth / this.image.width, maxHeight / this.image.height, 1);
    
    this.canvas.width = this.image.width * scale;
    this.canvas.height = this.image.height * scale;
    this.scale = scale;
    
    this.draw();
  }
  
  handleCanvasClick(event) {
    if (!this.selectedMaquina || !this.image) {
      alert('Primero selecciona una máquina y carga una imagen');
      return;
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scale;
    const y = (event.clientY - rect.top) / this.scale;
    
    if (!isValidCoordinates(x, y)) {
      console.warn('Coordenadas inválidas:', x, y);
      return;
    }
    
    this.clicks.push({
      x: Math.round(x),
      y: Math.round(y),
      timestamp: new Date().toISOString(),
    });
    
    this.draw();
    this.updateInfo();
    
    // Auto-guardar después de 3 clicks (promedio)
    if (this.clicks.length >= 3) {
      console.log('📍 Múltiples puntos capturados. Promediando...');
    }
  }
  
  handleZoom(event) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    this.scale *= delta;
    this.scale = Math.max(0.1, Math.min(this.scale, 5));
    this.draw();
  }
  
  draw() {
    if (!this.ctx) return;
    
    // Limpiar
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (!this.image) {
      this.ctx.fillStyle = '#666';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Sube una imagen del plano', this.canvas.width / 2, this.canvas.height / 2);
      return;
    }
    
    // Dibujar imagen
    this.ctx.drawImage(
      this.image,
      0, 0,
      this.image.width * this.scale,
      this.image.height * this.scale
    );
    
    // Dibujar puntos de calibración
    this.clicks.forEach((click, index) => {
      const screenX = click.x * this.scale;
      const screenY = click.y * this.scale;
      
      // Círculo
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = index === this.clicks.length - 1 ? '#ff0000' : '#00ff00';
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Número
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(index + 1, screenX, screenY - 12);
    });
    
    // Dibujar línea entre puntos
    if (this.clicks.length > 1) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
      this.ctx.lineWidth = 2;
      
      for (let i = 0; i < this.clicks.length - 1; i++) {
        const p1 = this.clicks[i];
        const p2 = this.clicks[i + 1];
        this.ctx.moveTo(p1.x * this.scale, p1.y * this.scale);
        this.ctx.lineTo(p2.x * this.scale, p2.y * this.scale);
      }
      
      this.ctx.stroke();
    }
  }
  
  getAverageCoordinates() {
    if (this.clicks.length === 0) return null;
    
    const avgX = Math.round(this.clicks.reduce((sum, c) => sum + c.x, 0) / this.clicks.length);
    const avgY = Math.round(this.clicks.reduce((sum, c) => sum + c.y, 0) / this.clicks.length);
    
    return { x: avgX, y: avgY };
  }
  
  updateInfo() {
    const infoDiv = document.getElementById('calibrationInfo');
    if (!infoDiv || !this.selectedMaquina) return;
    
    const coords = this.getAverageCoordinates();
    
    infoDiv.innerHTML = `
      <div class="info-section">
        <h4>Máquina: ${this.selectedMaquina.id_maquina}</h4>
        <p>Juego: ${this.selectedMaquina.juego}</p>
        <p>Sector: ${this.selectedMaquina.sector}</p>
        <p>Puntos capturados: ${this.clicks.length}</p>
        ${coords ? `
          <p class="coords">
            Coordenadas promedio: <strong>X: ${coords.x}, Y: ${coords.y}</strong>
          </p>
        ` : ''}
      </div>
    `;
  }
  
  async saveAllCalibrations() {
    if (!this.selectedMaquina || this.clicks.length === 0) {
      alert('Selecciona una máquina y captura al menos un punto');
      return;
    }
    
    const coords = this.getAverageCoordinates();
    if (!coords) return;
    
    try {
      const btn = document.getElementById('saveAllBtn');
      btn.disabled = true;
      btn.textContent = 'Guardando...';
      
      await saveCalibracion(
        this.selectedMaquina.id,
        coords.x,
        coords.y,
        {
          clicks_count: this.clicks.length,
          precision: 'high',
        }
      );
      
      alert('✅ Calibración guardada y sincronizada');
      this.clicks = [];
      this.draw();
      this.updateInfo();
      
    } catch (error) {
      console.error('❌ Error guardando:', error);
      alert('Error guardando calibración. Se guardará offline y se sincronizará después.');
    } finally {
      const btn = document.getElementById('saveAllBtn');
      btn.disabled = false;
      btn.textContent = '💾 Guardar Calibración';
    }
  }
  
  downloadJSON() {
    const coords = this.getAverageCoordinates();
    if (!coords || !this.selectedMaquina) {
      alert('No hay coordenadas para descargar');
      return;
    }
    
    const data = {
      maquina_id: this.selectedMaquina.id,
      id_maquina: this.selectedMaquina.id_maquina,
      coordenadas: coords,
      clicks: this.clicks,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calibracion_${this.selectedMaquina.id_maquina}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async copyToClipboard() {
    const coords = this.getAverageCoordinates();
    if (!coords || !this.selectedMaquina) {
      alert('No hay coordenadas para copiar');
      return;
    }
    
    const text = `${this.selectedMaquina.id_maquina}: X=${coords.x}, Y=${coords.y}`;
    await navigator.clipboard.writeText(text);
    alert('✅ Coordenadas copiadas al portapapeles');
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.calibrador = new CalibradorManager();
});

export default CalibradorManager;
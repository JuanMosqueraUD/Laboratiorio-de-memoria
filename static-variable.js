// Simulador de Particiones Estáticas Variables
// Basado en la tabla: SO=1024KB, y particiones de 512KB, 1024KB, 2048KB, 4096KB

// Configuración según la tabla de la imagen
const PREDEFINED_PARTITIONS = [
    { id: 'SO', size: 1024, baseHex: '000000', reserved: true, name: 'Sistema Operativo' },
    { id: 0, size: 512, baseHex: '100000' },
    { id: 1, size: 512, baseHex: '180000' },
    { id: 2, size: 1024, baseHex: '200000' },
    { id: 3, size: 1024, baseHex: '300000' },
    { id: 4, size: 2048, baseHex: '400000' },
    { id: 5, size: 2048, baseHex: '600000' },
    { id: 6, size: 4096, baseHex: '800000' },
    { id: 7, size: 4096, baseHex: 'C00000' }
];

// Partición de memoria variable
class VariablePartition {
    constructor(config) {
        this.id = config.id;
        this.size = config.size; // KB
        this.baseAddress = parseInt(config.baseHex, 16);
        this.isOccupied = false;
        this.process = null;
        this.reserved = config.reserved || false;
        this.name = config.name || null;
    }

    allocate(process) {
        if (!this.reserved) {
            this.isOccupied = true;
            this.process = process;
        }
    }

    deallocate() {
        if (!this.reserved) {
            this.isOccupied = false;
            this.process = null;
        }
    }

    getAddressHex() {
        return `0x${this.baseAddress.toString(16).toUpperCase().padStart(6, '0')}`;
    }

    canFit(processSize) {
        return !this.reserved && !this.isOccupied && this.size >= processSize;
    }
}

// Proceso (misma clase que antes)
class Process {
    constructor(id, name, size, segments) {
        this.id = id;
        this.name = name;
        this.size = size; // KB
        this.segments = segments;
        this.isRunning = false;
        this.partition = null;
    }

    start() {
        if (!this.isRunning && this.partition) {
            this.isRunning = true;
            return true;
        }
        return false;
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            return true;
        }
        return false;
    }
}

// Simulador de particiones estáticas variables
class StaticVariableMemorySimulator {
    constructor() {
        this.partitions = [];
        this.processes = [];
        this.currentAlgorithm = 'best'; // best, first, worst
        this.init();
    }

    init() {
        // Crear particiones según la tabla predefinida
        this.partitions = PREDEFINED_PARTITIONS.map(config => new VariablePartition(config));

        // Crear procesos predeterminados
        this.processes = [
            new Process(1, "Editor de Texto", 512, ["Código: 256KB", "Datos: 128KB", "Buffer: 128KB"]),
            new Process(2, "Navegador Web", 800, ["Motor JS: 300KB", "Renderizado: 250KB", "Cache: 150KB"]),
            new Process(3, "Base de Datos", 600, ["Engine: 200KB", "Índices: 150KB", "Buffer: 200KB"]),
            new Process(4, "Compilador", 400, ["Parser: 120KB", "Optimizador: 150KB", "Generador: 100KB"]),
            new Process(5, "Sistema Gráfico", 900, ["Drivers: 200KB", "OpenGL: 300KB", "Texturas: 250KB"]),
            new Process(6, "Servidor Grande", 1500, ["Sistema: 500KB", "Cache: 600KB", "Buffers: 400KB"]),
            new Process(7, "Sistema Masivo", 3500, ["Kernel: 1000KB", "Drivers: 1500KB", "Buffers: 1000KB"]),
            new Process(8, "Aplicación Enorme", 5000, ["Framework: 2000KB", "Datos: 2000KB", "Cache: 1000KB"])
        ];

        this.setupUI();
        this.updateDisplay();
    }

    setupUI() {
        this.memoryContainer = document.getElementById('memoryContainer');
        this.processList = document.getElementById('processList');
        this.freeMemory = document.getElementById('freeMemory');
        this.usedMemory = document.getElementById('usedMemory');
        this.currentAlgorithmSpan = document.getElementById('currentAlgorithm');
    }

    setAlgorithm(algorithm) {
        this.currentAlgorithm = algorithm;
        
        // Actualizar botones activos
        document.querySelectorAll('.algorithm-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-algorithm="${algorithm}"]`).classList.add('active');
        
        // Actualizar texto del algoritmo
        const algorithmNames = {
            'best': 'Mejor Ajuste',
            'first': 'Primer Ajuste', 
            'worst': 'Peor Ajuste'
        };
        this.currentAlgorithmSpan.textContent = algorithmNames[algorithm];
    }

    updateDisplay() {
        this.renderMemory();
        this.renderProcesses();
        this.updateStats();
    }

    renderMemory() {
        this.memoryContainer.innerHTML = '';
        
        this.partitions.forEach(partition => {
            const div = document.createElement('div');
            
            // Calcular altura dinámica más proporcionada y aumentada
            const totalAvailableMemory = 12800; // Reducido para hacer particiones más grandes
            const heightPercent = Math.max((partition.size / totalAvailableMemory) * 100, 12);
            
            let className = 'variable-partition';
            if (partition.reserved) {
                className += ' reserved';
            } else if (partition.isOccupied) {
                className += ' occupied';
            } else {
                className += ' free';
            }
            
            div.className = className;
            div.style.height = `${heightPercent}%`;
            div.style.maxHeight = '120px'; // Aumentado de 80px a 120px
            div.style.minHeight = '60px';  // Aumentado de 45px a 60px
            
            div.innerHTML = `
                <div class="partition-size-label">${partition.size} KB</div>
                <div class="partition-id">${partition.id === 'SO' ? 'SO' : `P${partition.id}`}</div>
                <div class="partition-address">${partition.getAddressHex()}</div>
                ${partition.reserved ? 
                    `<div class="partition-name">${partition.name}</div>` :
                    partition.process ? 
                        `<div class="partition-process">${partition.process.name}</div>` : 
                        '<div class="partition-free">Libre</div>'
                }
            `;
            
            div.onclick = () => this.showPartitionInfo(partition);
            this.memoryContainer.appendChild(div);
        });
    }

    renderProcesses() {
        this.processList.innerHTML = '';
        
        this.processes.forEach(process => {
            const div = document.createElement('div');
            div.className = 'process-item';
            div.innerHTML = `
                <div class="process-header">
                    <div class="process-name">${process.name}</div>
                    <div class="process-status ${process.isRunning ? 'running' : 'stopped'}">
                        ${process.isRunning ? 'EJECUTANDO' : 'DETENIDO'}
                    </div>
                </div>
                <div class="process-details">
                    <div><strong>Tamaño:</strong> ${process.size} KB</div>
                    <div><strong>Partición:</strong> ${process.partition ? 
                        `${process.partition.id === 'SO' ? 'SO' : `P${process.partition.id}`} (${process.partition.size}KB)` : 
                        'Ninguna'}</div>
                    <div style="grid-column: span 2"><strong>Segmentos:</strong> ${process.segments.join(', ')}</div>
                </div>
                <div class="process-controls">
                    <button class="btn start" onclick="simulator.startProcess(${process.id})" 
                            ${process.isRunning ? 'disabled' : ''}>
                        Iniciar
                    </button>
                    <button class="btn stop" onclick="simulator.stopProcess(${process.id})"
                            ${!process.isRunning ? 'disabled' : ''}>
                        Detener
                    </button>
                </div>
            `;
            this.processList.appendChild(div);
        });
    }

    // Algoritmo de asignación según selección
    findPartition(processSize) {
        const availablePartitions = this.partitions.filter(p => p.canFit(processSize));
        
        if (availablePartitions.length === 0) {
            return null;
        }

        switch (this.currentAlgorithm) {
            case 'best':
                // Best Fit: la partición más pequeña que quepa
                return availablePartitions.sort((a, b) => a.size - b.size)[0];
                
            case 'first':
                // First Fit: la primera partición que quepa
                return availablePartitions[0];
                
            case 'worst':
                // Worst Fit: la partición más grande que quepa
                return availablePartitions.sort((a, b) => b.size - a.size)[0];
                
            default:
                return availablePartitions[0];
        }
    }

    allocateProcess(processId) {
        const process = this.processes.find(p => p.id === processId);
        if (!process) return false;

        const partition = this.findPartition(process.size);
        
        if (!partition) {
            const algorithmNames = {
                'best': 'Mejor Ajuste',
                'first': 'Primer Ajuste',
                'worst': 'Peor Ajuste'
            };
            
            alert(`Error (${algorithmNames[this.currentAlgorithm]}): No hay particiones disponibles para "${process.name}" (${process.size} KB)\n\nParticiones libres:\n${this.getAvailablePartitionsInfo()}`);
            return false;
        }

        partition.allocate(process);
        process.partition = partition;
        return true;
    }

    getAvailablePartitionsInfo() {
        const available = this.partitions.filter(p => !p.reserved && !p.isOccupied);
        if (available.length === 0) {
            return "• Ninguna partición libre";
        }
        return available.map(p => `• P${p.id}: ${p.size} KB`).join('\n');
    }

    startProcess(processId) {
        const process = this.processes.find(p => p.id === processId);
        
        if (!process.partition) {
            if (!this.allocateProcess(processId)) {
                return;
            }
        }
        
        if (process.start()) {
            this.updateDisplay();
        }
    }

    stopProcess(processId) {
        const process = this.processes.find(p => p.id === processId);
        
        if (process && process.stop()) {
            if (process.partition) {
                process.partition.deallocate();
                process.partition = null;
            }
            this.updateDisplay();
        }
    }

    updateStats() {
        const availablePartitions = this.partitions.filter(p => !p.reserved);
        const occupiedMemory = availablePartitions
            .filter(p => p.isOccupied)
            .reduce((total, p) => total + p.size, 0);
        
        const totalAvailableMemory = availablePartitions
            .reduce((total, p) => total + p.size, 0);
        
        const freeMemory = totalAvailableMemory - occupiedMemory;
        
        this.freeMemory.textContent = `${(freeMemory / 1024).toFixed(1)} MiB`;
        this.usedMemory.textContent = `${(occupiedMemory / 1024).toFixed(1)} MiB`;
    }

    showPartitionInfo(partition) {
        let info = `${partition.id === 'SO' ? 'Sistema Operativo' : `Partición ${partition.id}`}\n`;
        info += `Dirección: ${partition.getAddressHex()}\n`;
        info += `Tamaño: ${partition.size} KB\n`;
        
        if (partition.reserved) {
            info += `Estado: Reservada para ${partition.name}\n`;
        } else {
            info += `Estado: ${partition.isOccupied ? 'Ocupada' : 'Libre'}\n`;
            
            if (partition.process) {
                info += `\nProceso: ${partition.process.name}\n`;
                info += `Tamaño del Proceso: ${partition.process.size} KB\n`;
                info += `Fragmentación Interna: ${partition.size - partition.process.size} KB\n`;
                info += `Eficiencia: ${((partition.process.size / partition.size) * 100).toFixed(1)}%\n`;
                info += `Estado: ${partition.process.isRunning ? 'EJECUTANDO' : 'DETENIDO'}\n`;
                info += `Segmentos:\n${partition.process.segments.map(s => `  • ${s}`).join('\n')}`;
            }
        }
        
        alert(info);
    }

    reset() {
        // Detener todos los procesos y liberar particiones (excepto reservadas)
        this.processes.forEach(process => {
            if (process.isRunning) {
                process.stop();
            }
            if (process.partition && !process.partition.reserved) {
                process.partition.deallocate();
                process.partition = null;
            }
        });
        this.updateDisplay();
    }
}

// Inicializar
let simulator;
document.addEventListener('DOMContentLoaded', () => {
    simulator = new StaticVariableMemorySimulator();
});
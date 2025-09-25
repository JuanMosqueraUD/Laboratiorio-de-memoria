// Simulador de Memoria Simple
const MEMORY_SIZE = 16; // 16 MiB
const PARTITION_SIZE = 1; // 1 MiB
const NUM_PARTITIONS = 16;

// Partición de memoria
class MemoryPartition {
    constructor(id) {
        this.id = id;
        this.startAddress = id * 0x100000; // 1 MiB por partición
        this.endAddress = this.startAddress + 0xFFFFFF;
        this.isOccupied = false;
        this.process = null;
    }

    allocate(process) {
        this.isOccupied = true;
        this.process = process;
    }

    deallocate() {
        this.isOccupied = false;
        this.process = null;
    }

    getAddressHex() {
        return `0x${this.startAddress.toString(16).toUpperCase().padStart(6, '0')}`;
    }
}

// Proceso
class Process {
    constructor(id, name, size, segments) {
        this.id = id;
        this.name = name;
        this.size = size; // KB
        this.segments = segments;
        this.status = 'ready'; // ready, running, stopped
        this.partition = null;
    }

    start() {
        if (this.status === 'ready' && this.partition) {
            this.status = 'running';
            return true;
        }
        return false;
    }

    stop() {
        if (this.status === 'running') {
            this.status = 'stopped';
            return true;
        }
        return false;
    }
}

// Simulador principal
class MemorySimulator {
    constructor() {
        this.partitions = [];
        this.processes = [];
        this.init();
    }

    init() {
        // Crear particiones
        for (let i = 0; i < NUM_PARTITIONS; i++) {
            this.partitions.push(new MemoryPartition(i));
        }

        // Crear procesos predeterminados
        this.processes = [
            new Process(1, "Editor de Texto", 512, ["Código: 256KB", "Datos: 128KB", "Buffer: 128KB"]),
            new Process(2, "Navegador Web", 800, ["Motor JS: 300KB", "Renderizado: 250KB", "Cache: 150KB"]),
            new Process(3, "Base de Datos", 600, ["Engine: 200KB", "Índices: 150KB", "Buffer: 200KB"]),
            new Process(4, "Compilador", 400, ["Parser: 120KB", "Optimizador: 150KB", "Generador: 100KB"]),
            new Process(5, "Sistema Gráfico", 900, ["Drivers: 200KB", "OpenGL: 300KB", "Texturas: 250KB"])
        ];

        this.setupUI();
        this.updateDisplay();
        this.autoAssignProcesses();
    }

    setupUI() {
        this.memoryContainer = document.getElementById('memoryContainer');
        this.processList = document.getElementById('processList');
        this.freeMemory = document.getElementById('freeMemory');
        this.usedMemory = document.getElementById('usedMemory');
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
            div.className = `partition ${partition.isOccupied ? 'occupied' : 'free'}`;
            div.innerHTML = `
                <div class="partition-label">P${partition.id}</div>
                <div class="partition-address">${partition.getAddressHex()}</div>
                ${partition.process ? `<div class="partition-process">${partition.process.name}</div>` : ''}
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
                    <div class="process-status ${process.status}">${this.getStatusText(process.status)}</div>
                </div>
                <div class="process-details">
                    <div><strong>Tamaño:</strong> ${process.size} KB</div>
                    <div><strong>Partición:</strong> ${process.partition ? `P${process.partition.id}` : 'Ninguna'}</div>
                    <div style="grid-column: span 2"><strong>Segmentos:</strong> ${process.segments.join(', ')}</div>
                </div>
                <div class="process-controls">
                    <button class="btn start" onclick="simulator.startProcess(${process.id})" 
                            ${process.status === 'running' || !process.partition ? 'disabled' : ''}>
                        Iniciar
                    </button>
                    <button class="btn stop" onclick="simulator.stopProcess(${process.id})"
                            ${process.status !== 'running' ? 'disabled' : ''}>
                        Detener
                    </button>
                </div>
            `;
            this.processList.appendChild(div);
        });
    }

    getStatusText(status) {
        const texts = {
            'ready': 'LISTO',
            'running': 'EJECUTANDO', 
            'stopped': 'DETENIDO'
        };
        return texts[status];
    }

    allocateProcess(processId) {
        const process = this.processes.find(p => p.id === processId);
        const freePartition = this.partitions.find(p => !p.isOccupied);
        
        if (process && freePartition && process.size <= 1024) {
            freePartition.allocate(process);
            process.partition = freePartition;
            return true;
        }
        return false;
    }

    startProcess(processId) {
        const process = this.processes.find(p => p.id === processId);
        
        if (!process.partition) {
            if (!this.allocateProcess(processId)) {
                alert('No hay memoria disponible');
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
            this.updateDisplay();
        }
    }

    updateStats() {
        const occupied = this.partitions.filter(p => p.isOccupied).length;
        const free = NUM_PARTITIONS - occupied;
        
        this.freeMemory.textContent = `${free} MiB`;
        this.usedMemory.textContent = `${occupied} MiB`;
    }

    showPartitionInfo(partition) {
        let info = `Partición ${partition.id}\n`;
        info += `Dirección: ${partition.getAddressHex()}\n`;
        info += `Estado: ${partition.isOccupied ? 'Ocupada' : 'Libre'}\n`;
        
        if (partition.process) {
            info += `\nProceso: ${partition.process.name}\n`;
            info += `Tamaño: ${partition.process.size} KB\n`;
            info += `Estado: ${this.getStatusText(partition.process.status)}\n`;
            info += `Segmentos:\n${partition.process.segments.map(s => `  • ${s}`).join('\n')}`;
        }
        
        alert(info);
    }

    autoAssignProcesses() {
        // Asignar algunos procesos automáticamente
        setTimeout(() => {
            this.allocateProcess(1);
            this.allocateProcess(3);
            this.updateDisplay();
        }, 500);
    }
}

// Inicializar
let simulator;
document.addEventListener('DOMContentLoaded', () => {
    simulator = new MemorySimulator();
});

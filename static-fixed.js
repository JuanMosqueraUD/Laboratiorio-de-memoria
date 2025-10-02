// Simulador de Particiones Estáticas Fijas
const MEMORY_SIZE = 16; // 16 MiB
const PARTITION_SIZE = 1; // 1 MiB
const NUM_PARTITIONS = 16;

// Partición de memoria fija
class MemoryPartition {
    constructor(id) {
        this.id = id;
        this.startAddress = id * 0x100000; // 1 MiB por partición
        this.endAddress = this.startAddress + 0xFFFFFF;
        this.isOccupied = false;
        this.process = null;
        this.size = 1024; // KB
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

// Simulador principal de particiones fijas
class StaticFixedMemorySimulator {
    constructor() {
        this.partitions = [];
        this.processes = [];
        this.nextProcessId = 7; // Comenzar después de los procesos predeterminados
        this.init();
    }

    init() {

        // Crear particiones fijas
        for (let i = 0; i < NUM_PARTITIONS; i++) {
            const partition = new MemoryPartition(i);
            // Reservar P0 para el sistema operativo
            if (i === 0) {
                partition.isOccupied = true;
                partition.process = { name: 'Sistema Operativo', size: 1024, isRunning: true, segments: ['Núcleo', 'Drivers', 'Servicios'] };
            }
            this.partitions.push(partition);
        }

        // Crear procesos predeterminados
        this.processes = [
            new Process(1, "Editor de Texto", 512, ["Código: 256KB", "Datos: 128KB", "Buffer: 128KB"]),
            new Process(2, "Navegador Web", 800, ["Motor JS: 300KB", "Renderizado: 250KB", "Cache: 150KB"]),
            new Process(3, "Base de Datos", 600, ["Engine: 200KB", "Índices: 150KB", "Buffer: 200KB"]),
            new Process(4, "Compilador", 400, ["Parser: 120KB", "Optimizador: 150KB", "Generador: 100KB"]),
            new Process(5, "Sistema Gráfico", 900, ["Drivers: 200KB", "OpenGL: 300KB", "Texturas: 250KB"]),
            new Process(6, "Servidor Grande", 1500, ["Sistema: 500KB", "Cache: 600KB", "Buffers: 400KB"])
        ];

        this.setupUI();
        this.updateDisplay();
    }

    setupUI() {
        this.memoryContainer = document.getElementById('memoryContainer');
        this.processList = document.getElementById('processList');
        this.freeMemory = document.getElementById('freeMemory');
        this.usedMemory = document.getElementById('usedMemory');
        
        // Elementos para crear procesos personalizados
        this.processNameInput = document.getElementById('processName');
        this.processSizeInput = document.getElementById('processSize');
        this.addProcessBtn = document.getElementById('addProcessBtn');
        
        // Event listener para crear procesos
        if (this.addProcessBtn) {
            this.addProcessBtn.addEventListener('click', () => this.createCustomProcess());
        }
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
                    <div class="process-status ${process.isRunning ? 'running' : 'stopped'}">
                        ${process.isRunning ? 'EJECUTANDO' : 'DETENIDO'}
                    </div>
                </div>
                <div class="process-details">
                    <div><strong>Tamaño:</strong> ${process.size} KB</div>
                    <div><strong>Partición:</strong> ${process.partition ? `P${process.partition.id}` : 'Ninguna'}</div>
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

    allocateProcess(processId) {
        const process = this.processes.find(p => p.id === processId);
        if (!process) return false;

        // Verificar si el proceso es demasiado grande SOLO al intentar asignarlo
        if (process.size > 1024) {
            alert(`Error: El proceso "${process.name}" (${process.size} KB) es demasiado grande para las particiones disponibles (máximo 1024 KB)`);
            return false;
        }
        
        // Buscar una partición libre que no sea P0
        const freePartition = this.partitions.find(p => !p.isOccupied && p.id !== 0);
        if (!freePartition) {
            alert('No hay particiones libres disponibles (P0 está reservada para el sistema operativo)');
            return false;
        }
        freePartition.allocate(process);
        process.partition = freePartition;
        return true;
    }

    startProcess(processId) {
        const process = this.processes.find(p => p.id === processId);
        
        // Si el proceso no tiene partición asignada, intentar asignar una
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
            // Liberar la partición cuando se detiene el proceso
            if (process.partition) {
                process.partition.deallocate();
                process.partition = null;
            }
            this.updateDisplay();
        }
    }

    updateStats() {
    // P0 siempre ocupada por el SO
    const occupied = this.partitions.filter(p => p.isOccupied).length;
    const free = NUM_PARTITIONS - occupied;
    this.freeMemory.textContent = `${free} MiB`;
    this.usedMemory.textContent = `${occupied} MiB`;
    }

    showPartitionInfo(partition) {
        let info = `Partición ${partition.id}\n`;
        info += `Dirección: ${partition.getAddressHex()}\n`;
        info += `Tamaño: ${partition.size} KB\n`;
        info += `Estado: ${partition.isOccupied ? 'Ocupada' : 'Libre'}\n`;
        
        if (partition.process) {
            info += `\nProceso: ${partition.process.name}\n`;
            info += `Tamaño del Proceso: ${partition.process.size} KB\n`;
            info += `Fragmentación Interna: ${partition.size - partition.process.size} KB\n`;
            info += `Estado: ${partition.process.isRunning ? 'EJECUTANDO' : 'DETENIDO'}\n`;
            info += `Segmentos:\n${partition.process.segments.map(s => `  • ${s}`).join('\n')}`;
        }
        
        alert(info);
    }

    createCustomProcess() {
        const name = this.processNameInput.value.trim();
        const size = parseInt(this.processSizeInput.value, 10);
        
        if (!name) {
            alert('Por favor, introduce un nombre para el proceso.');
            return;
        }
        
        if (isNaN(size) || size <= 0) {
            alert('Por favor, introduce un tamaño de proceso válido en KB.');
            return;
        }

        const newProcess = new Process(this.nextProcessId++, name, size, [`Tamaño total: ${size}KB`]);
        this.processes.push(newProcess);

        this.processNameInput.value = '';
        this.processSizeInput.value = '';
        this.updateDisplay();
    }

    reset() {
        // Detener todos los procesos y liberar particiones
        this.processes.forEach(process => {
            if (process.isRunning) {
                process.stop();
            }
            if (process.partition) {
                process.partition.deallocate();
                process.partition = null;
            }
        });
        
        // Resetear a solo los procesos predeterminados
        this.processes = [
            new Process(1, "Editor de Texto", 512, ["Código: 256KB", "Datos: 128KB", "Buffer: 128KB"]),
            new Process(2, "Navegador Web", 800, ["Motor JS: 300KB", "Renderizado: 250KB", "Cache: 150KB"]),
            new Process(3, "Base de Datos", 600, ["Engine: 200KB", "Índices: 150KB", "Buffer: 200KB"]),
            new Process(4, "Compilador", 400, ["Parser: 120KB", "Optimizador: 150KB", "Generador: 100KB"]),
            new Process(5, "Sistema Gráfico", 900, ["Drivers: 200KB", "OpenGL: 300KB", "Texturas: 250KB"]),
            new Process(6, "Servidor Grande", 1500, ["Sistema: 500KB", "Cache: 600KB", "Buffers: 400KB"])
        ];
        this.nextProcessId = 7;
        
        // Volver a reservar P0 para el SO tras reiniciar
        const p0 = this.partitions[0];
        p0.isOccupied = true;
        p0.process = { name: 'Sistema Operativo', size: 1024, isRunning: true, segments: ['Núcleo', 'Drivers', 'Servicios'] };
        this.updateDisplay();
    }
}

// Inicializar
let simulator;
document.addEventListener('DOMContentLoaded', () => {
    simulator = new StaticFixedMemorySimulator();
});
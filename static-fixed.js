// Simulador de Particiones Estáticas Fijas
const MEMORY_SIZE = 16; // 16 MiB
const PARTITION_SIZE = 1; // 1 MiB
const NUM_PARTITIONS = 16;
const HEAP_SIZE = 128; // 128 KiB
const STACK_SIZE = 64; // 64 KiB

// Partición de memoria fija
class MemoryPartition {
    constructor(id) {
        this.id = id;
        this.startAddress = id * 0x100000; // 1 MiB por partición
        this.endAddress = this.startAddress + 0xFFFFFF;
        this.isOccupied = false;
        this.process = null;
        this.size = 1024; // KiB
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
    constructor(id, name, baseSize, segments) {
        this.id = id;
        this.name = name;
        this.baseSize = baseSize; // KiB - tamaño base del programa
        this.heapSize = HEAP_SIZE; // KiB
        this.stackSize = STACK_SIZE; // KiB
        this.size = baseSize + HEAP_SIZE + STACK_SIZE; // Tamaño total en KiB
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

    getMemoryBreakdown() {
        return {
            base: this.baseSize,
            heap: this.heapSize,
            stack: this.stackSize,
            total: this.size
        };
    }
}

// Simulador principal de particiones fijas
class StaticFixedMemorySimulator {
    constructor() {
        this.partitions = [];
        this.processes = [];
        this.nextProcessId = 9; // Comenzar después de los procesos predeterminados
        this.init();
    }

    init() {

        // Crear particiones fijas
        for (let i = 0; i < NUM_PARTITIONS; i++) {
            const partition = new MemoryPartition(i);
            // Reservar P0 para el sistema operativo
            if (i === 0) {
                partition.isOccupied = true;
                partition.process = { 
                    name: 'Sistema Operativo', 
                    baseSize: 832, 
                    heapSize: HEAP_SIZE,
                    stackSize: STACK_SIZE,
                    size: 832 + HEAP_SIZE + STACK_SIZE, 
                    isRunning: true, 
                    segments: ['Núcleo', 'Drivers', 'Servicios'] 
                };
            }
            this.partitions.push(partition);
        }

        // Crear procesos predeterminados
        this.processes = [
            new Process(1, "Editor de Texto", 320, ["Código: 160 KiB", "Datos: 80 KiB", "Buffer: 80 KiB"]),
            new Process(2, "Navegador Web", 608, ["Motor JS: 240 KiB", "Renderizado: 200 KiB", "Cache: 168 KiB"]),
            new Process(3, "Base de Datos", 408, ["Engine: 136 KiB", "Índices: 136 KiB", "Buffer: 136 KiB"]),
            new Process(4, "Compilador", 208, ["Parser: 70 KiB", "Optimizador: 68 KiB", "Generador: 70 KiB"]),
            new Process(5, "Sistema Gráfico", 708, ["Drivers: 236 KiB", "OpenGL: 236 KiB", "Texturas: 236 KiB"]),
            new Process(6, "Servidor Grande", 1308, ["Sistema: 436 KiB", "Cache: 436 KiB", "Buffers: 436 KiB"]),
            new Process(7, "Sistema Masivo", 3508, ["Kernel: 1169 KiB", "Drivers: 1169 KiB", "Buffers: 1170 KiB"]),
            new Process(8, "Aplicación Enorme", 3908, ["Framework: 1302 KiB", "Datos: 1303 KiB", "Cache: 1303 KiB"])
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

        // Mostrar información de heap y stack
        this.displayMemoryInfo();
    }

    displayMemoryInfo() {
        const memoryInfoEl = document.getElementById('memoryInfo');
        if (memoryInfoEl) {
            memoryInfoEl.innerHTML = `
                <div class="memory-constants">
                    <h3>Configuración de Memoria</h3>
                    <div class="memory-detail">
                        <span><strong>Heap por proceso:</strong></span>
                        <span>${HEAP_SIZE} KiB</span>
                    </div>
                    <div class="memory-detail">
                        <span><strong>Stack por proceso:</strong></span>
                        <span>${STACK_SIZE} KiB</span>
                    </div>
                    <div class="memory-detail">
                        <span><strong>Overhead total por proceso:</strong></span>
                        <span>${HEAP_SIZE + STACK_SIZE} KiB</span>
                    </div>
                </div>
            `;
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
            const breakdown = process.getMemoryBreakdown();
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
                    <div><strong>Tamaño base:</strong> ${breakdown.base} KiB</div>
                    <div><strong>Heap:</strong> ${breakdown.heap} KiB</div>
                    <div><strong>Stack:</strong> ${breakdown.stack} KiB</div>
                    <div><strong>Tamaño total:</strong> ${breakdown.total} KiB</div>
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
            alert(`Error: El proceso "${process.name}" (${process.size} KiB) es demasiado grande para las particiones disponibles (máximo 1024 KiB)`);
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
        info += `Tamaño: ${partition.size} KiB\n`;
        info += `Estado: ${partition.isOccupied ? 'Ocupada' : 'Libre'}\n`;
        
        if (partition.process) {
            info += `\nProceso: ${partition.process.name}\n`;
            if (partition.process.baseSize !== undefined) {
                // Proceso normal con breakdown de memoria
                info += `Tamaño base: ${partition.process.baseSize} KiB\n`;
                info += `Heap: ${partition.process.heapSize} KiB\n`;
                info += `Stack: ${partition.process.stackSize} KiB\n`;
                info += `Tamaño total: ${partition.process.size} KiB\n`;
            } else {
                // Proceso del sistema operativo
                info += `Tamaño del Proceso: ${partition.process.size} KiB\n`;
            }
            info += `Fragmentación Interna: ${partition.size - partition.process.size} KiB\n`;
            info += `Estado: ${partition.process.isRunning ? 'EJECUTANDO' : 'DETENIDO'}\n`;
            info += `Segmentos:\n${partition.process.segments.map(s => `  • ${s}`).join('\n')}`;
        }
        
        alert(info);
    }

    createCustomProcess() {
        const name = this.processNameInput.value.trim();
        const baseSize = parseInt(this.processSizeInput.value, 10);
        
        if (!name) {
            alert('Por favor, introduce un nombre para el proceso.');
            return;
        }
        
        if (isNaN(baseSize) || baseSize <= 0) {
            alert('Por favor, introduce un tamaño base de proceso válido en KiB.');
            return;
        }

        const totalSize = baseSize + HEAP_SIZE + STACK_SIZE;
        if (totalSize > 1024) {
            alert(`Error: El tamaño total del proceso sería ${totalSize} KiB (${baseSize} + ${HEAP_SIZE} + ${STACK_SIZE}), que excede el límite de 1024 KiB por partición.`);
            return;
        }

        const newProcess = new Process(this.nextProcessId++, name, baseSize, [`Base: ${baseSize} KiB`, `Heap: ${HEAP_SIZE} KiB`, `Stack: ${STACK_SIZE} KiB`]);
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
            new Process(1, "Editor de Texto", 320, ["Código: 160 KiB", "Datos: 80 KiB", "Buffer: 80 KiB"]),
            new Process(2, "Navegador Web", 608, ["Motor JS: 240 KiB", "Renderizado: 200 KiB", "Cache: 168 KiB"]),
            new Process(3, "Base de Datos", 408, ["Engine: 136 KiB", "Índices: 136 KiB", "Buffer: 136 KiB"]),
            new Process(4, "Compilador", 208, ["Parser: 70 KiB", "Optimizador: 68 KiB", "Generador: 70 KiB"]),
            new Process(5, "Sistema Gráfico", 708, ["Drivers: 236 KiB", "OpenGL: 236 KiB", "Texturas: 236 KiB"]),
            new Process(6, "Servidor Grande", 1308, ["Sistema: 436 KiB", "Cache: 436 KiB", "Buffers: 436 KiB"]),
            new Process(7, "Sistema Masivo", 3508, ["Kernel: 1169 KiB", "Drivers: 1169 KiB", "Buffers: 1170 KiB"]),
            new Process(8, "Aplicación Enorme", 3908, ["Framework: 1302 KiB", "Datos: 1303 KiB", "Cache: 1303 KiB"])
        ];
        this.nextProcessId = 9;
        
        // Volver a reservar P0 para el SO tras reiniciar
        const p0 = this.partitions[0];
        p0.isOccupied = true;
        p0.process = { 
            name: 'Sistema Operativo', 
            baseSize: 832, 
            heapSize: HEAP_SIZE,
            stackSize: STACK_SIZE,
            size: 832 + HEAP_SIZE + STACK_SIZE, 
            isRunning: true, 
            segments: ['Núcleo', 'Drivers', 'Servicios'] 
        };
        this.updateDisplay();
    }
}

// Inicializar
let simulator;
document.addEventListener('DOMContentLoaded', () => {
    simulator = new StaticFixedMemorySimulator();
});
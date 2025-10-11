// Simulador de Particiones Estáticas Variables
// Basado en la tabla: SO=1024KiB, y particiones de 512KiB, 1024KiB, 2048KiB, 4096KiB

const HEAP_SIZE = 128; // 128 KiB
const STACK_SIZE = 64; // 64 KiB

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
        this.size = config.size; // KiB
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

// Simulador de particiones estáticas variables
class StaticVariableMemorySimulator {
    constructor() {
        this.partitions = [];
        this.processes = [];
        this.currentAlgorithm = 'best'; // best, first, worst
        this.nextProcessId = 9; // Comenzar después de los procesos predeterminados
        this.init();
    }

    init() {
        // Crear particiones según la tabla predefinida
        this.partitions = PREDEFINED_PARTITIONS.map(config => new VariablePartition(config));

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
        this.currentAlgorithmSpan = document.getElementById('currentAlgorithm');
        this.partitionTableBody = document.getElementById('partitionTableBody');
        
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
        this.updatePartitionTable();
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
                <div class="partition-size-label">${partition.size} KiB</div>
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
                    <div><strong>Tamaño:</strong> ${process.size} KiB</div>
                    <div><strong>Partición:</strong> ${process.partition ? 
                        `${process.partition.id === 'SO' ? 'SO' : `P${process.partition.id}`} (${process.partition.size}KiB)` : 
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
            
            alert(`Error (${algorithmNames[this.currentAlgorithm]}): No hay particiones disponibles para "${process.name}" (${process.size} KiB)\n\nParticiones libres:\n${this.getAvailablePartitionsInfo()}`);
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
        return available.map(p => `• P${p.id}: ${p.size} KiB`).join('\n');
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

    updatePartitionTable() {
        if (!this.partitionTableBody) return;
        
        this.partitionTableBody.innerHTML = '';
        
        this.partitions.forEach((partition, index) => {
            const row = document.createElement('tr');
            
            // Determinar PID y nombre
            let pid = '-';
            let processName = '-';
            let rowClass = 'empty-row';  // Cambio: usar empty-row para particiones sin procesos
            
            if (partition.reserved) {
                // Sistema Operativo
                pid = 'OS';
                processName = partition.name || 'Sistema Operativo';
                rowClass = 'os-row';
            } else if (partition.isOccupied && partition.process) {
                // Proceso normal
                pid = `P${partition.process.id}`;
                processName = partition.process.name || 'Proceso sin nombre';
                rowClass = 'occupied-row';
            }
            
            // Valor L/O (Libre/Ocupado)
            const loValue = (partition.reserved || partition.isOccupied) ? '1' : '0';
            
            // Dirección base
            const baseAddress = partition.getAddressHex();
            
            // Tamaño de la partición
            const partitionSize = `${partition.size} KiB`;
            
            row.className = rowClass;
            row.innerHTML = `
                <td>${pid}</td>
                <td>${processName}</td>
                <td>${loValue}</td>
                <td>${baseAddress}</td>
                <td>${partitionSize}</td>
            `;
            
            this.partitionTableBody.appendChild(row);
        });
    }

    showPartitionInfo(partition) {
        let info = `${partition.id === 'SO' ? 'Sistema Operativo' : `Partición ${partition.id}`}\n`;
        info += `Dirección: ${partition.getAddressHex()}\n`;
        info += `Tamaño: ${partition.size} KiB\n`;
        
        if (partition.reserved) {
            info += `Estado: Reservada para ${partition.name}\n`;
        } else {
            info += `Estado: ${partition.isOccupied ? 'Ocupada' : 'Libre'}\n`;
            
            if (partition.process) {
                info += `\nProceso: ${partition.process.name}\n`;
                info += `Tamaño del Proceso: ${partition.process.size} KiB\n`;
                info += `Fragmentación Interna: ${partition.size - partition.process.size} KiB\n`;
                info += `Eficiencia: ${((partition.process.size / partition.size) * 100).toFixed(1)}%\n`;
                info += `Estado: ${partition.process.isRunning ? 'EJECUTANDO' : 'DETENIDO'}\n`;
                info += `Segmentos:\n${partition.process.segments.map(s => `  • ${s}`).join('\n')}`;
            }
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
            alert('Por favor, introduce un tamaño de proceso válido en KiB.');
            return;
        }

        const newProcess = new Process(this.nextProcessId++, name, size, [`Tamaño total: ${size}KiB`]);
        this.processes.push(newProcess);

        this.processNameInput.value = '';
        this.processSizeInput.value = '';
        this.updateDisplay();
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
        
        // Resetear a solo los procesos predeterminados
        this.processes = [
            new Process(1, "Editor de Texto", 512, ["Código: 256KiB", "Datos: 128KiB", "Buffer: 128KiB"]),
            new Process(2, "Navegador Web", 800, ["Motor JS: 300KiB", "Renderizado: 250KiB", "Cache: 150KiB"]),
            new Process(3, "Base de Datos", 600, ["Engine: 200KiB", "Índices: 150KiB", "Buffer: 200KiB"]),
            new Process(4, "Compilador", 400, ["Parser: 120KiB", "Optimizador: 150KiB", "Generador: 100KiB"]),
            new Process(5, "Sistema Gráfico", 900, ["Drivers: 200KiB", "OpenGL: 300KiB", "Texturas: 250KiB"]),
            new Process(6, "Servidor Grande", 1500, ["Sistema: 500KiB", "Cache: 600KiB", "Buffers: 400KiB"]),
            new Process(7, "Sistema Masivo", 3500, ["Kernel: 1000KiB", "Drivers: 1500KiB", "Buffers: 1000KiB"]),
            new Process(8, "Aplicación Enorme", 5000, ["Framework: 2000KiB", "Datos: 2000KiB", "Cache: 1000KiB"])
        ];
        this.nextProcessId = 9;
        
        this.updateDisplay();
    }
}

// Inicializar
let simulator;
document.addEventListener('DOMContentLoaded', () => {
    simulator = new StaticVariableMemorySimulator();
});
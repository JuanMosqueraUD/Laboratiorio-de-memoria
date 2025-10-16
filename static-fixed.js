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

// ProcessTemplate: representa el tipo de proceso (plantilla)
class ProcessTemplate {
    constructor(id, name, baseSize, segments) {
        this.id = id;
        this.name = name;
        this.baseSize = baseSize;
        this.heapSize = HEAP_SIZE;
        this.stackSize = STACK_SIZE;
        this.size = baseSize + HEAP_SIZE + STACK_SIZE;
        this.segments = segments;
        this.instances = []; // Array de instancias activas
    }

    getInstanceCount() {
        return this.instances.filter(inst => inst.isRunning).length;
    }
}

// ProcessInstance: instancia específica de un proceso en memoria
class ProcessInstance {
    constructor(id, template) {
        this.id = id;
        this.template = template;
        this.name = template.name;
        this.baseSize = template.baseSize; // KiB - tamaño base del programa
        this.heapSize = HEAP_SIZE; // KiB
        this.stackSize = STACK_SIZE; // KiB
        this.size = template.baseSize + HEAP_SIZE + STACK_SIZE; // Tamaño total en KiB
        this.segments = template.segments;
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
        this.processTemplates = [];
        this.processes = [];
        this.nextProcessId = 1;
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

        // Crear templates de procesos predeterminados
        this.processTemplates = [
            new ProcessTemplate(1, "Editor de Texto", 320, ["Código: 160 KiB", "Datos: 80 KiB", "Buffer: 80 KiB"]),
            new ProcessTemplate(2, "Navegador Web", 608, ["Motor JS: 240 KiB", "Renderizado: 200 KiB", "Cache: 168 KiB"]),
            new ProcessTemplate(3, "Base de Datos", 408, ["Engine: 136 KiB", "Índices: 136 KiB", "Buffer: 136 KiB"]),
            new ProcessTemplate(4, "Compilador", 208, ["Parser: 70 KiB", "Optimizador: 68 KiB", "Generador: 70 KiB"]),
            new ProcessTemplate(5, "Sistema Gráfico", 708, ["Drivers: 236 KiB", "OpenGL: 236 KiB", "Texturas: 236 KiB"]),
            new ProcessTemplate(6, "Servidor Grande", 1308, ["Sistema: 436 KiB", "Cache: 436 KiB", "Buffers: 436 KiB"]),
            new ProcessTemplate(7, "Sistema Masivo", 3508, ["Kernel: 1169 KiB", "Drivers: 1169 KiB", "Buffers: 1170 KiB"]),
            new ProcessTemplate(8, "Aplicación Enorme", 3908, ["Framework: 1302 KiB", "Datos: 1303 KiB", "Cache: 1303 KiB"])
        ];
        this.nextProcessId = 9;

        this.setupUI();
        this.updateDisplay();
    }

    setupUI() {
        this.memoryContainer = document.getElementById('memoryContainer');
        this.processList = document.getElementById('processList');
        this.freeMemory = document.getElementById('freeMemory');
        this.usedMemory = document.getElementById('usedMemory');
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
        
        this.processTemplates.forEach(template => {
            const div = document.createElement('div');
            div.className = 'process-item';
            const runningCount = template.getInstanceCount();
            const hasInstances = runningCount > 0;
            
            div.innerHTML = `
                <div class="process-header">
                    <div class="process-name">${template.name}</div>
                    <div class="process-status ${hasInstances ? 'running' : 'stopped'}">
                        ${hasInstances ? `EJECUTANDO (${runningCount})` : 'DETENIDO'}
                    </div>
                </div>
                <div class="process-details">
                    <div><strong>Tamaño base:</strong> ${template.baseSize} KiB</div>
                    <div><strong>Heap:</strong> ${template.heapSize} KiB</div>
                    <div><strong>Stack:</strong> ${template.stackSize} KiB</div>
                    <div><strong>Tamaño total:</strong> ${template.size} KiB</div>
                    <div><strong>Instancias:</strong> ${runningCount}</div>
                    <div style="grid-column: span 2"><strong>Segmentos:</strong> ${template.segments.join(', ')}</div>
                </div>
                <div class="process-controls">
                    <button class="btn start" onclick="simulator.startProcess(${template.id})">
                        Iniciar
                    </button>
                    <button class="btn stop" onclick="simulator.stopProcess(${template.id})"
                            ${!hasInstances ? 'disabled' : ''}>
                        Detener
                    </button>
                </div>
            `;
            this.processList.appendChild(div);
        });
    }

    startProcess(templateId) {
        const template = this.processTemplates.find(t => t.id === templateId);
        if (!template) return;

        // Crear nueva instancia
        const instance = new ProcessInstance(this.nextProcessId++, template);
        
        // Verificar si el proceso es demasiado grande SOLO al intentar asignarlo
        if (instance.size > 1024) {
            alert(`Error: El proceso "${instance.name}" (${instance.size} KiB) es demasiado grande para las particiones disponibles (máximo 1024 KiB)`);
            return;
        }
        
        // Buscar una partición libre que no sea P0
        const freePartition = this.partitions.find(p => !p.isOccupied && p.id !== 0);
        if (!freePartition) {
            alert('No hay particiones libres disponibles (P0 está reservada para el sistema operativo)');
            return;
        }

        freePartition.allocate(instance);
        instance.partition = freePartition;
        instance.isRunning = true;
        
        template.instances.push(instance);
        this.processes.push(instance);
        
        this.updateDisplay();
    }

    stopProcess(templateId) {
        const template = this.processTemplates.find(t => t.id === templateId);
        if (!template || template.instances.length === 0) return;

        // Detener la instancia más antigua (FIFO)
        const oldest = template.instances.shift();
        if (oldest) {
            oldest.isRunning = false;
            // Liberar la partición cuando se detiene el proceso
            if (oldest.partition) {
                oldest.partition.deallocate();
                oldest.partition = null;
            }
            // Remover de la lista de procesos
            const index = this.processes.indexOf(oldest);
            if (index > -1) {
                this.processes.splice(index, 1);
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

    updatePartitionTable() {
        if (!this.partitionTableBody) return;
        
        this.partitionTableBody.innerHTML = '';
        
        this.partitions.forEach((partition, index) => {
            const row = document.createElement('tr');
            
            // Determinar PID y nombre
            let pid = '-';
            let processName = '-';
            let rowClass = 'empty-row';  // Cambio: usar empty-row para particiones sin procesos
            
            if (partition.isOccupied && partition.process) {
                if (index === 0) {
                    // Sistema Operativo
                    pid = 'OS';
                    processName = 'Sistema Operativo';
                    rowClass = 'os-row';
                } else {
                    // Proceso normal
                    pid = `P${partition.process.id}`;
                    processName = partition.process.name || 'Proceso sin nombre';
                    rowClass = 'occupied-row';
                }
            }
            
            // Valor L/O (Libre/Ocupado)
            const loValue = partition.isOccupied ? '1' : '0';
            
            // Dirección base
            const baseAddress = partition.getAddressHex();
            
            row.className = rowClass;
            row.innerHTML = `
                <td>${pid}</td>
                <td>${processName}</td>
                <td>${loValue}</td>
                <td>${baseAddress}</td>
            `;
            
            this.partitionTableBody.appendChild(row);
        });
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

        const newTemplate = new ProcessTemplate(
            this.processTemplates.length + 1,
            name, 
            baseSize, 
            [`Base: ${baseSize} KiB`, `Heap: ${HEAP_SIZE} KiB`, `Stack: ${STACK_SIZE} KiB`]
        );
        this.processTemplates.push(newTemplate);

        this.processNameInput.value = '';
        this.processSizeInput.value = '';
        this.updateDisplay();
    }

    reset() {
        // Detener todos los procesos y liberar particiones
        this.processes.forEach(process => {
            if (process.isRunning) {
                process.isRunning = false;
            }
            if (process.partition) {
                process.partition.deallocate();
                process.partition = null;
            }
        });
        
        // Limpiar todas las instancias de los templates
        this.processTemplates.forEach(template => {
            template.instances = [];
        });
        
        // Resetear a solo los templates predeterminados
        this.processes = [];
        this.processTemplates = [
            new ProcessTemplate(1, "Editor de Texto", 320, ["Código: 160 KiB", "Datos: 80 KiB", "Buffer: 80 KiB"]),
            new ProcessTemplate(2, "Navegador Web", 608, ["Motor JS: 240 KiB", "Renderizado: 200 KiB", "Cache: 168 KiB"]),
            new ProcessTemplate(3, "Base de Datos", 408, ["Engine: 136 KiB", "Índices: 136 KiB", "Buffer: 136 KiB"]),
            new ProcessTemplate(4, "Compilador", 208, ["Parser: 70 KiB", "Optimizador: 68 KiB", "Generador: 70 KiB"]),
            new ProcessTemplate(5, "Sistema Gráfico", 708, ["Drivers: 236 KiB", "OpenGL: 236 KiB", "Texturas: 236 KiB"]),
            new ProcessTemplate(6, "Servidor Grande", 1308, ["Sistema: 436 KiB", "Cache: 436 KiB", "Buffers: 436 KiB"]),
            new ProcessTemplate(7, "Sistema Masivo", 3508, ["Kernel: 1169 KiB", "Drivers: 1169 KiB", "Buffers: 1170 KiB"]),
            new ProcessTemplate(8, "Aplicación Enorme", 3908, ["Framework: 1302 KiB", "Datos: 1303 KiB", "Cache: 1303 KiB"])
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
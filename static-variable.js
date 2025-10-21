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

// Simulador de particiones estáticas variables
class StaticVariableMemorySimulator {
    constructor() {
        this.partitions = [];
        this.processTemplates = [];
        this.processes = [];
        this.currentAlgorithm = 'best'; // best, first, worst
        this.nextProcessId = 1;
        this.init();
    }

    init() {
        // Crear particiones según la tabla predefinida
        this.partitions = PREDEFINED_PARTITIONS.map(config => new VariablePartition(config));

        // Crear templates de procesos predeterminados
        this.processTemplates = [
            new ProcessTemplate(1, "Editor de Texto", 320, ["text: 180 KiB", "data: 70 KiB", "bss: 70 KiB"]),
            new ProcessTemplate(2, "Navegador Web", 608, ["text: 250 KiB", "data: 200 KiB", "bss: 158 KiB"]),
            new ProcessTemplate(3, "Base de Datos", 408, ["text: 136 KiB", "data: 180 KiB", "bss: 92 KiB"]),
            new ProcessTemplate(4, "Compilador", 208, ["text: 100 KiB", "data: 54 KiB", "bss: 54 KiB"]),
            new ProcessTemplate(5, "Sistema Gráfico", 708, ["text: 250 KiB", "data: 250 KiB", "bss: 208 KiB"]),
            new ProcessTemplate(6, "Servidor Grande", 1308, ["text: 350 KiB", "data: 500 KiB", "bss: 458 KiB"]),
            new ProcessTemplate(7, "Sistema Masivo", 3508, ["text: 1200 KiB", "data: 1200 KiB", "bss: 1108 KiB"]),
            new ProcessTemplate(8, "Aplicación Enorme", 3908, ["text: 1000 KiB", "data: 1500 KiB", "bss: 1408 KiB"])
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

    getAvailablePartitionsInfo() {
        const available = this.partitions.filter(p => !p.reserved && !p.isOccupied);
        if (available.length === 0) {
            return "• Ninguna partición libre";
        }
        return available.map(p => `• P${p.id}: ${p.size} KiB`).join('\n');
    }

    startProcess(templateId) {
        const template = this.processTemplates.find(t => t.id === templateId);
        if (!template) return;

        // Crear nueva instancia
        const instance = new ProcessInstance(this.nextProcessId++, template);
        
        const partition = this.findPartition(instance.size);
        
        if (!partition) {
            const algorithmNames = {
                'best': 'Mejor Ajuste',
                'first': 'Primer Ajuste',
                'worst': 'Peor Ajuste'
            };
            
            alert(`Error (${algorithmNames[this.currentAlgorithm]}): No hay particiones disponibles para "${instance.name}" (${instance.size} KiB)\n\nParticiones libres:\n${this.getAvailablePartitionsInfo()}`);
            return;
        }

        partition.allocate(instance);
        instance.partition = partition;
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
        const baseSize = parseInt(this.processSizeInput.value, 10);
        
        if (!name) {
            alert('Por favor, introduce un nombre para el proceso.');
            return;
        }
        
        if (isNaN(baseSize) || baseSize <= 0) {
            alert('Por favor, introduce un tamaño de proceso válido en KiB.');
            return;
        }

        const newTemplate = new ProcessTemplate(
            this.processTemplates.length + 1,
            name, 
            baseSize, 
            [`Tamaño base: ${baseSize}KiB`, `Heap: ${HEAP_SIZE}KiB`, `Stack: ${STACK_SIZE}KiB`]
        );
        this.processTemplates.push(newTemplate);

        this.processNameInput.value = '';
        this.processSizeInput.value = '';
        this.updateDisplay();
    }

    reset() {
        // Detener todos los procesos y liberar particiones (excepto reservadas)
        this.processes.forEach(process => {
            if (process.isRunning) {
                process.isRunning = false;
            }
            if (process.partition && !process.partition.reserved) {
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
            new ProcessTemplate(1, "Editor de Texto", 320, ["text: 180 KiB", "data: 70 KiB", "bss: 70 KiB"]),
            new ProcessTemplate(2, "Navegador Web", 608, ["text: 250 KiB", "data: 200 KiB", "bss: 158 KiB"]),
            new ProcessTemplate(3, "Base de Datos", 408, ["text: 136 KiB", "data: 180 KiB", "bss: 92 KiB"]),
            new ProcessTemplate(4, "Compilador", 208, ["text: 100 KiB", "data: 54 KiB", "bss: 54 KiB"]),
            new ProcessTemplate(5, "Sistema Gráfico", 708, ["text: 250 KiB", "data: 250 KiB", "bss: 208 KiB"]),
            new ProcessTemplate(6, "Servidor Grande", 1308, ["text: 350 KiB", "data: 500 KiB", "bss: 458 KiB"]),
            new ProcessTemplate(7, "Sistema Masivo", 3508, ["text: 1200 KiB", "data: 1200 KiB", "bss: 1108 KiB"]),
            new ProcessTemplate(8, "Aplicación Enorme", 3908, ["text: 1000 KiB", "data: 1500 KiB", "bss: 1408 KiB"])
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
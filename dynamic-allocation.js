document.addEventListener('DOMContentLoaded', () => {
    const TOTAL_MEMORY = 16 * 1024; // 16384 KiB
    const OS_MEMORY = 1024; // 1024 KiB = 1 MiB
    const HEAP_SIZE = 128; // 128 KiB
    const STACK_SIZE = 64; // 64 KiB

    let memoryBlocks = [];
    let processes = [];
    let nextProcessId = 1;
    let currentMode = 'best-fit'; // 'best-fit' or 'compaction'

    // DOM Elements
    const memoryBarContainer = document.getElementById('memoryBarContainer');
    const processList = document.getElementById('processList');
    const addProcessBtn = document.getElementById('addProcessBtn');
    const processNameInput = document.getElementById('processName');
    const processSizeInput = document.getElementById('processSize');
    const compactionToggle = document.getElementById('compactionToggle');
    const resetSimulationBtn = document.getElementById('resetSimulationBtn');
    const totalFreeMemoryEl = document.getElementById('totalFreeMemory');
    const fragmentationEl = document.getElementById('fragmentation');
    const largestFreeBlockEl = document.getElementById('largestFreeBlock');

    // Procesos predeterminados (tomados de las simulaciones estáticas)
    const predefinedProcesses = [
        { name: "Editor de Texto", baseSize: 320, segments: ["text: 180 KiB", "data: 70 KiB", "bss: 70 KiB"] },
        { name: "Navegador Web", baseSize: 608, segments: ["text: 250 KiB", "data: 200 KiB", "bss: 158 KiB"] },
        { name: "Base de Datos", baseSize: 408, segments: ["text: 136 KiB", "data: 180 KiB", "bss: 92 KiB"] },
        { name: "Compilador", baseSize: 208, segments: ["text: 100 KiB", "data: 54 KiB", "bss: 54 KiB"] },
        { name: "Sistema Gráfico", baseSize: 708, segments: ["text: 250 KiB", "data: 250 KiB", "bss: 208 KiB"] },
        { name: "Servidor Grande", baseSize: 1308, segments: ["text: 350 KiB", "data: 500 KiB", "bss: 458 KiB"] },
        { name: "Sistema Masivo", baseSize: 3508, segments: ["text: 1200 KiB", "data: 1200 KiB", "bss: 1108 KiB"] },
        { name: "Aplicación Enorme", baseSize: 3908, segments: ["text: 1000 KiB", "data: 1500 KiB", "bss: 1408 KiB"] }
    ];

    // ProcessTemplate: representa el tipo de proceso (plantilla)
    class ProcessTemplate {
        constructor(id, name, baseSize, segments = []) {
            this.id = id;
            this.name = name;
            this.baseSize = baseSize;
            this.segments = segments;
            this.instances = []; // Array de instancias activas
        }

        createInstance() {
            const instance = new ProcessInstance(nextProcessId++, this);
            this.instances.push(instance);
            processes.push(instance);
            return instance;
        }

        removeOldestInstance() {
            if (this.instances.length === 0) return null;
            const oldest = this.instances.shift(); // FIFO - eliminar el primero
            const index = processes.indexOf(oldest);
            if (index > -1) {
                processes.splice(index, 1);
            }
            return oldest;
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
            this.memoryBlock = null;
        }

        start() {
            if (!this.isRunning && !this.memoryBlock) {
                return this.allocateMemory();
            }
            return false;
        }

        stop() {
            if (this.isRunning && this.memoryBlock) {
                this.deallocateMemory();
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

        allocateMemory() {
            currentMode = compactionToggle.value;
            let allocated = false;

            // --- Best-Fit Algorithm ---
            const freeBlocks = memoryBlocks.filter(b => b.isFree && b.size >= this.size);
            
            if (freeBlocks.length > 0) {
                // Find the smallest block that fits
                freeBlocks.sort((a, b) => a.size - b.size);
                const bestFitBlock = freeBlocks[0];
                this.assignToBlock(bestFitBlock);
                allocated = true;
            } else {
                // --- Compaction Logic ---
                if (currentMode === 'compaction') {
                    const totalFree = memoryBlocks
                        .filter(b => b.isFree)
                        .reduce((sum, b) => sum + b.size, 0);

                    if (totalFree >= this.size) {
                        compactMemory();
                        // After compaction, the last block is the one big free block
                        const newFreeBlock = memoryBlocks[memoryBlocks.length - 1];
                        if (newFreeBlock.isFree && newFreeBlock.size >= this.size) {
                            this.assignToBlock(newFreeBlock);
                            allocated = true;
                        }
                    }
                }
            }

            if (allocated) {
                this.isRunning = true;
            } else {
                alert(`No se pudo asignar memoria para el proceso "${this.name}" de ${this.size} KiB. No hay suficiente espacio contiguo o total.`);
            }

            return allocated;
        }

        assignToBlock(block) {
            const originalSize = block.size;
            const remainingSize = originalSize - this.size;

            // Update the block to be the new process
            block.size = this.size;
            block.isFree = false;
            block.processId = `P${this.id}`;
            block.processName = this.name;
            block.process = this;
            this.memoryBlock = block;

            // If there's remaining space, create a new free block
            if (remainingSize > 0) {
                const newFreeBlock = {
                    id: `free-${Date.now()}`,
                    size: remainingSize,
                    startAddress: block.startAddress + this.size,
                    isFree: true,
                };
                const blockIndex = memoryBlocks.findIndex(b => b.id === block.id);
                memoryBlocks.splice(blockIndex + 1, 0, newFreeBlock);
            }
        }

        deallocateMemory() {
            if (!this.memoryBlock) return;

            const blockIndex = memoryBlocks.findIndex(b => b === this.memoryBlock);
            if (blockIndex === -1) return;

            this.memoryBlock.isFree = true;
            this.memoryBlock.processId = undefined;
            this.memoryBlock.processName = undefined;
            this.memoryBlock.process = null;

            // Merge with next block if it's free
            if (blockIndex + 1 < memoryBlocks.length && memoryBlocks[blockIndex + 1].isFree) {
                const blockToMerge = memoryBlocks[blockIndex + 1];
                this.memoryBlock.size += blockToMerge.size;
                memoryBlocks.splice(blockIndex + 1, 1);
            }

            // Merge with previous block if it's free
            if (blockIndex > 0 && memoryBlocks[blockIndex - 1].isFree) {
                const blockToMerge = this.memoryBlock;
                memoryBlocks[blockIndex - 1].size += blockToMerge.size;
                memoryBlocks.splice(blockIndex, 1);
            }

            this.memoryBlock = null;
            this.isRunning = false;

            // Si el modo de compactación está habilitado, ejecutar compactación automáticamente
            currentMode = compactionToggle.value;
            if (currentMode === 'compaction') {
                // Verificar si hay fragmentación (más de un bloque libre)
                const freeBlocks = memoryBlocks.filter(b => b.isFree);
                if (freeBlocks.length > 1) {
                    setTimeout(() => {
                        compactMemory();
                        updateUI();
                    }, 100);
                }
            }
        }
    }

    // Templates de procesos disponibles
    let processTemplates = [];

    function init() {
        // Reset state
        memoryBlocks = [];
        processes = [];
        processTemplates = [];
        nextProcessId = 1;

        // OS block
        memoryBlocks.push({
            id: 'os',
            processId: 'OS',
            size: OS_MEMORY,
            startAddress: 0,
            isFree: false,
        });

        // Initial free block
        memoryBlocks.push({
            id: 'free-0',
            size: TOTAL_MEMORY - OS_MEMORY,
            startAddress: OS_MEMORY,
            isFree: true,
        });

        // Crear templates de procesos predeterminados
        predefinedProcesses.forEach((procData, index) => {
            const template = new ProcessTemplate(index + 1, procData.name, procData.baseSize, procData.segments);
            processTemplates.push(template);
        });

        displayMemoryInfo();
        updateUI();
    }

    function displayMemoryInfo() {
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

    function createCustomProcess() {
        const name = processNameInput.value.trim();
        const baseSize = parseInt(processSizeInput.value);

        if (!name || isNaN(baseSize) || baseSize <= 0) {
            alert('Por favor, introduce un nombre válido y un tamaño base válido (en KiB).');
            return;
        }

        const newTemplate = new ProcessTemplate(
            processTemplates.length + 1, 
            name, 
            baseSize, 
            [`Tamaño base: ${baseSize}KiB`, `Heap: ${HEAP_SIZE}KiB`, `Stack: ${STACK_SIZE}KiB`]
        );
        processTemplates.push(newTemplate);

        processNameInput.value = '';
        processSizeInput.value = '';
        updateUI();
    }    function startProcess(templateId) {
        const template = processTemplates.find(t => t.id === templateId);
        if (!template) return;

        // Crear nueva instancia
        const instance = template.createInstance();
        if (instance && instance.start()) {
            updateUI();
        }
    }

    function stopProcess(templateId) {
        const template = processTemplates.find(t => t.id === templateId);
        if (!template || template.instances.length === 0) return;

        // Detener la instancia más antigua (FIFO)
        const oldest = template.instances[0];
        if (oldest && oldest.stop()) {
            template.removeOldestInstance();
            updateUI();
        }
    }

    function compactMemory() {
        let compactedAddress = OS_MEMORY;
        const occupiedBlocks = memoryBlocks.filter(b => !b.isFree && b.id !== 'os');
        
        // Create a new list of blocks starting with OS
        const newMemoryBlocks = [memoryBlocks.find(b => b.id === 'os')];

        // Move all occupied blocks to be contiguous
        occupiedBlocks.forEach(block => {
            block.startAddress = compactedAddress;
            newMemoryBlocks.push(block);
            compactedAddress += block.size;
        });

        const totalFreeMemory = TOTAL_MEMORY - compactedAddress;
        if (totalFreeMemory > 0) {
            newMemoryBlocks.push({
                id: 'free-compacted',
                size: totalFreeMemory,
                startAddress: compactedAddress,
                isFree: true,
            });
        }

        memoryBlocks = newMemoryBlocks;
    }

    function updateUI() {
        renderMemoryBar();
        renderProcesses();
        updateSystemInfo();
    }

    function renderMemoryBar() {
        memoryBarContainer.innerHTML = '';
        memoryBlocks.forEach(block => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'memory-block';
            blockDiv.style.width = `${(block.size / TOTAL_MEMORY) * 100}%`;

            let blockClass = 'free-dynamic';
            if (!block.isFree) {
                blockClass = block.id === 'os' ? 'os' : 'occupied-dynamic';
            }
            blockDiv.classList.add(blockClass);
            
            blockDiv.title = `${block.processId || 'Libre'}${block.processName ? ` - ${block.processName}` : ''}: ${block.size} KiB`;
            blockDiv.textContent = block.processId || '';
            memoryBarContainer.appendChild(blockDiv);
        });
    }

    function renderProcesses() {
        processList.innerHTML = '';
        
        processTemplates.forEach(template => {
            const div = document.createElement('div');
            div.className = 'process-item';
            
            // Determinar si el proceso es demasiado grande para la memoria disponible
            const processSize = template.baseSize + HEAP_SIZE + STACK_SIZE;
            const maxFreeMemory = Math.max(
                ...memoryBlocks.filter(b => b.isFree).map(b => b.size),
                0
            );
            const totalFreeMemory = memoryBlocks
                .filter(b => b.isFree)
                .reduce((sum, b) => sum + b.size, 0);
            
            const canFit = processSize <= maxFreeMemory || 
                          (currentMode === 'compaction' && processSize <= totalFreeMemory);
            
            const runningCount = template.getInstanceCount();
            const hasInstances = runningCount > 0;
            
            if (!canFit && !hasInstances) {
                div.classList.add('too-large');
            }
            
            div.innerHTML = `
                <div class="process-header">
                    <div class="process-name">${template.name}</div>
                    <div class="process-status ${hasInstances ? 'running' : 'stopped'}">
                        ${hasInstances ? `EJECUTANDO (${runningCount})` : 'DETENIDO'}
                    </div>
                </div>
                <div class="process-details">
                    <div><strong>Tamaño base:</strong> ${template.baseSize} KiB</div>
                    <div><strong>Heap:</strong> ${HEAP_SIZE} KiB</div>
                    <div><strong>Stack:</strong> ${STACK_SIZE} KiB</div>
                    <div><strong>Total:</strong> ${processSize} KiB</div>
                    <div><strong>Instancias:</strong> ${runningCount}</div>
                    <div style="grid-column: span 3"><strong>Segmentos:</strong> ${template.segments.join(', ')}</div>
                </div>
                <div class="process-controls">
                    <button class="btn start" onclick="startProcess(${template.id})" 
                            ${!canFit ? 'disabled' : ''}>
                        Iniciar
                    </button>
                    <button class="btn stop" onclick="stopProcess(${template.id})"
                            ${!hasInstances ? 'disabled' : ''}>
                        Detener
                    </button>
                </div>
            `;
            processList.appendChild(div);
        });
    }
    
    function updateSystemInfo() {
        const freeBlocks = memoryBlocks.filter(b => b.isFree);
        const totalFree = freeBlocks.reduce((sum, b) => sum + b.size, 0);
        const largestFreeBlock = freeBlocks.length > 0 ? Math.max(...freeBlocks.map(b => b.size)) : 0;
        
        // Fragmentation is total free memory minus the largest free block
        const fragmentation = totalFree - largestFreeBlock;

        totalFreeMemoryEl.textContent = `${totalFree} KiB`;
        fragmentationEl.textContent = `${fragmentation > 0 ? fragmentation : 0} KiB`;
        largestFreeBlockEl.textContent = `${largestFreeBlock} KiB`;

        // Actualizar tablas
        updateProcessTable();
        updateFreeFragmentsTable();
    }

    function updateProcessTable() {
        const processTableBody = document.getElementById('processTableBody');
        
        if (!processTableBody) return;
        
        // Limpiar tabla
        processTableBody.innerHTML = '';
        
        // SIEMPRE agregar el Sistema Operativo como primera fila
        const osRow = document.createElement('tr');
        osRow.className = 'os-row';
        osRow.innerHTML = `
            <td>OS</td>
            <td>Sistema Operativo</td>
            <td>0</td>
            <td>1024 KiB</td>
        `;
        processTableBody.appendChild(osRow);
        
        // Obtener procesos activos (excluyendo el SO)
        const activeProcesses = processes.filter(p => p.isRunning && p.memoryBlock);
        
        // Agregar filas de procesos activos ordenados por dirección de memoria
        activeProcesses.sort((a, b) => {
            const aStart = a.memoryBlock.start || a.memoryBlock.startAddress || 0;
            const bStart = b.memoryBlock.start || b.memoryBlock.startAddress || 0;
            return aStart - bStart;
        });
        
        activeProcesses.forEach(process => {
            const row = document.createElement('tr');
            row.className = 'occupied-row';
            const startAddr = process.memoryBlock.start || process.memoryBlock.startAddress || 0;
            row.innerHTML = `
                <td>P${process.id}</td>
                <td>${process.name}</td>
                <td>${startAddr}</td>
                <td>${process.size} KiB</td>
            `;
            processTableBody.appendChild(row);
        });
    }

    function updateFreeFragmentsTable() {
        const freeFragmentsTableBody = document.getElementById('freeFragmentsTableBody');
        const freeFragmentsTableEmpty = document.getElementById('freeFragmentsTableEmpty');
        const freeFragmentsTable = document.getElementById('freeFragmentsTable');
        
        if (!freeFragmentsTableBody) return;
        
        // Obtener todos los bloques libres de memoria (excluyendo el área del SO)
        const freeBlocks = memoryBlocks.filter(block => {
            const blockStart = block.start || block.startAddress || 0;
            return block.isFree && blockStart >= OS_MEMORY;
        });
        
        // Limpiar tabla
        freeFragmentsTableBody.innerHTML = '';
        
        if (freeBlocks.length === 0) {
            // Mostrar mensaje de tabla vacía
            if (freeFragmentsTable) freeFragmentsTable.style.display = 'none';
            if (freeFragmentsTableEmpty) freeFragmentsTableEmpty.classList.add('show');
        } else {
            // Ocultar mensaje y mostrar tabla
            if (freeFragmentsTable) freeFragmentsTable.style.display = 'table';
            if (freeFragmentsTableEmpty) freeFragmentsTableEmpty.classList.remove('show');
            
            // Agregar filas de fragmentos libres ordenados por dirección base
            freeBlocks.sort((a, b) => {
                const aStart = a.start || a.startAddress || 0;
                const bStart = b.start || b.startAddress || 0;
                return aStart - bStart;
            });
            
            freeBlocks.forEach(block => {
                const row = document.createElement('tr');
                row.className = 'free-row';
                const startAddr = block.start || block.startAddress || 0;
                row.innerHTML = `
                    <td>${startAddr}</td>
                    <td>${block.size} KiB</td>
                `;
                freeFragmentsTableBody.appendChild(row);
            });
        }
    }

    // Make functions globally accessible
    window.startProcess = startProcess;
    window.stopProcess = stopProcess;

    // Event Listeners
    addProcessBtn.addEventListener('click', createCustomProcess);
    resetSimulationBtn.addEventListener('click', init);

    // Initial call
    init();
});

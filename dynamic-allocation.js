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
        { name: "Editor de Texto", baseSize: 320, segments: ["Código: 160 KiB", "Datos: 80 KiB", "Buffer: 80 KiB"] },
        { name: "Navegador Web", baseSize: 608, segments: ["Motor JS: 240 KiB", "Renderizado: 200 KiB", "Cache: 168 KiB"] },
        { name: "Base de Datos", baseSize: 408, segments: ["Engine: 136 KiB", "Índices: 136 KiB", "Buffer: 136 KiB"] },
        { name: "Compilador", baseSize: 208, segments: ["Parser: 70 KiB", "Optimizador: 68 KiB", "Generador: 70 KiB"] },
        { name: "Sistema Gráfico", baseSize: 708, segments: ["Drivers: 236 KiB", "OpenGL: 236 KiB", "Texturas: 236 KiB"] },
        { name: "Servidor Grande", baseSize: 1308, segments: ["Sistema: 436 KiB", "Cache: 436 KiB", "Buffers: 436 KiB"] },
        { name: "Sistema Masivo", baseSize: 3508, segments: ["Kernel: 1169 KiB", "Drivers: 1169 KiB", "Buffers: 1170 KiB"] },
        { name: "Aplicación Enorme", baseSize: 3908, segments: ["Framework: 1302 KiB", "Datos: 1303 KiB", "Cache: 1303 KiB"] }
    ];

    // Clase Process para mantener consistencia con las estáticas
    class Process {
        constructor(id, name, baseSize, segments = []) {
            this.id = id;
            this.name = name;
            this.baseSize = baseSize; // KiB - tamaño base del programa
            this.heapSize = HEAP_SIZE; // KiB
            this.stackSize = STACK_SIZE; // KiB
            this.size = baseSize + HEAP_SIZE + STACK_SIZE; // Tamaño total en KiB
            this.segments = segments;
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

    function init() {
        // Reset state
        memoryBlocks = [];
        processes = [];
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

                // Crear procesos predeterminados
        predefinedProcesses.forEach((procData, index) => {
            const process = new Process(index + 1, procData.name, procData.baseSize, procData.segments);
            processes.push(process);
        });
        nextProcessId = processes.length + 1;

        updateUI();
    }

    function createCustomProcess() {
        const name = processNameInput.value.trim();
        const baseSize = parseInt(processSizeInput.value);

        if (!name || isNaN(baseSize) || baseSize <= 0) {
            alert('Por favor, introduce un nombre válido y un tamaño base válido (en KiB).');
            return;
        }

        const newProcess = new Process(nextProcessId++, name, baseSize, [`Tamaño base: ${baseSize}KiB`, `Heap: ${HEAP_SIZE}KiB`, `Stack: ${STACK_SIZE}KiB`]);
        processes.push(newProcess);

        processNameInput.value = '';
        processSizeInput.value = '';
        updateUI();
    }    function startProcess(processId) {
        const process = processes.find(p => p.id === processId);
        if (process && process.start()) {
            updateUI();
        }
    }

    function stopProcess(processId) {
        const process = processes.find(p => p.id === processId);
        if (process && process.stop()) {
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
        
        processes.forEach(process => {
            const div = document.createElement('div');
            div.className = 'process-item';
            
            // Determinar si el proceso es demasiado grande para la memoria disponible
            const maxFreeMemory = Math.max(
                ...memoryBlocks.filter(b => b.isFree).map(b => b.size),
                0
            );
            const totalFreeMemory = memoryBlocks
                .filter(b => b.isFree)
                .reduce((sum, b) => sum + b.size, 0);
            
            const canFit = process.size <= maxFreeMemory || 
                          (currentMode === 'compaction' && process.size <= totalFreeMemory);
            
            if (!canFit && !process.isRunning) {
                div.classList.add('too-large');
            }
            
            div.innerHTML = `
                <div class="process-header">
                    <div class="process-name">${process.name}</div>
                    <div class="process-status ${process.isRunning ? 'running' : 'stopped'}">
                        ${process.isRunning ? 'EJECUTANDO' : 'DETENIDO'}
                    </div>
                </div>
                <div class="process-details">
                    <div><strong>Tamaño base:</strong> ${process.baseSize} KiB</div>
                    <div><strong>Heap:</strong> ${process.heapSize} KiB</div>
                    <div><strong>Stack:</strong> ${process.stackSize} KiB</div>
                    <div><strong>Total:</strong> ${process.size} KiB</div>
                    <div><strong>Dirección:</strong> ${process.memoryBlock ? `0x${process.memoryBlock.startAddress.toString(16).toUpperCase()}` : 'N/A'}</div>
                    <div style="grid-column: span 3"><strong>Segmentos:</strong> ${process.segments.join(', ')}</div>
                </div>
                <div class="process-controls">
                    <button class="btn start" onclick="startProcess(${process.id})" 
                            ${process.isRunning || !canFit ? 'disabled' : ''}>
                        Iniciar
                    </button>
                    <button class="btn stop" onclick="stopProcess(${process.id})"
                            ${!process.isRunning ? 'disabled' : ''}>
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

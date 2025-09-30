document.addEventListener('DOMContentLoaded', () => {
    const TOTAL_MEMORY = 16 * 1024; // 16384 KB
    const OS_MEMORY = 1024; // 1024 KB = 1 MiB

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
        { name: "Editor de Texto", size: 512, segments: ["Código: 256KB", "Datos: 128KB", "Buffer: 128KB"] },
        { name: "Navegador Web", size: 800, segments: ["Motor JS: 300KB", "Renderizado: 250KB", "Cache: 150KB"] },
        { name: "Base de Datos", size: 600, segments: ["Engine: 200KB", "Índices: 150KB", "Buffer: 200KB"] },
        { name: "Compilador", size: 400, segments: ["Parser: 120KB", "Optimizador: 150KB", "Generador: 100KB"] },
        { name: "Sistema Gráfico", size: 900, segments: ["Drivers: 200KB", "OpenGL: 300KB", "Texturas: 250KB"] },
        { name: "Servidor Grande", size: 1500, segments: ["Sistema: 500KB", "Cache: 600KB", "Buffers: 400KB"] }
    ];

    // Clase Process para mantener consistencia con las estáticas
    class Process {
        constructor(id, name, size, segments = []) {
            this.id = id;
            this.name = name;
            this.size = size;
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
                        alert('No hay un bloque contiguo lo suficientemente grande. Iniciando compactación de memoria...');
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
                alert(`No se pudo asignar memoria para el proceso "${this.name}" de ${this.size} KB. No hay suficiente espacio contiguo o total.`);
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
        processes = predefinedProcesses.map((processData, index) => 
            new Process(index + 1, processData.name, processData.size, processData.segments)
        );
        nextProcessId = processes.length + 1;

        updateUI();
    }

    function createCustomProcess() {
        const name = processNameInput.value.trim();
        const size = parseInt(processSizeInput.value, 10);
        
        if (!name) {
            alert('Por favor, introduce un nombre para el proceso.');
            return;
        }
        
        if (isNaN(size) || size <= 0) {
            alert('Por favor, introduce un tamaño de proceso válido en KB.');
            return;
        }

        const newProcess = new Process(nextProcessId++, name, size, [`Tamaño total: ${size}KB`]);
        processes.push(newProcess);

        processNameInput.value = '';
        processSizeInput.value = '';
        updateUI();
    }

    function startProcess(processId) {
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
            
            blockDiv.title = `${block.processId || 'Libre'}${block.processName ? ` - ${block.processName}` : ''}: ${block.size} KB`;
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
                    <div><strong>Tamaño:</strong> ${process.size} KB</div>
                    <div><strong>Dirección:</strong> ${process.memoryBlock ? `0x${process.memoryBlock.startAddress.toString(16).toUpperCase()}` : 'N/A'}</div>
                    <div style="grid-column: span 2"><strong>Segmentos:</strong> ${process.segments.join(', ')}</div>
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

        totalFreeMemoryEl.textContent = `${totalFree} KB`;
        fragmentationEl.textContent = `${fragmentation > 0 ? fragmentation : 0} KB`;
        largestFreeBlockEl.textContent = `${largestFreeBlock} KB`;
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

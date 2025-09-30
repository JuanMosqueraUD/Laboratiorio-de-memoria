document.addEventListener('DOMContentLoaded', () => {
    const TOTAL_MEMORY = 16 * 1024; // 16384 KB
    const OS_MEMORY = 1024; // 1024 KB = 1 MiB

    let memoryBlocks = [];
    let nextProcessId = 1;
    let currentMode = 'best-fit'; // 'best-fit' or 'compaction'

    // DOM Elements
    const memoryBarContainer = document.getElementById('memoryBarContainer');
    const processTableBody = document.querySelector('#processTable tbody');
    const addProcessBtn = document.getElementById('addProcessBtn');
    const processSizeInput = document.getElementById('processSize');
    const compactionToggle = document.getElementById('compactionToggle');
    const resetSimulationBtn = document.getElementById('resetSimulationBtn');
    const totalFreeMemoryEl = document.getElementById('totalFreeMemory');
    const fragmentationEl = document.getElementById('fragmentation');
    const largestFreeBlockEl = document.getElementById('largestFreeBlock');

    function init() {
        // Reset state
        memoryBlocks = [];
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

        updateUI();
    }

    function addProcess() {
        const size = parseInt(processSizeInput.value, 10);
        if (isNaN(size) || size <= 0) {
            alert('Por favor, introduce un tamaño de proceso válido en KB.');
            return;
        }

        currentMode = compactionToggle.value;
        let allocated = false;

        // --- Best-Fit Algorithm ---
        const freeBlocks = memoryBlocks.filter(b => b.isFree && b.size >= size);
        
        if (freeBlocks.length > 0) {
            // Find the smallest block that fits
            freeBlocks.sort((a, b) => a.size - b.size);
            const bestFitBlock = freeBlocks[0];
            allocateMemory(bestFitBlock, size);
            allocated = true;
        } else {
            // --- Compaction Logic ---
            if (currentMode === 'compaction') {
                const totalFree = memoryBlocks
                    .filter(b => b.isFree)
                    .reduce((sum, b) => sum + b.size, 0);

                if (totalFree >= size) {
                    alert('No hay un bloque contiguo lo suficientemente grande. Iniciando compactación de memoria...');
                    compactMemory();
                    // After compaction, the last block is the one big free block
                    const newFreeBlock = memoryBlocks[memoryBlocks.length - 1];
                    if (newFreeBlock.isFree && newFreeBlock.size >= size) {
                        allocateMemory(newFreeBlock, size);
                        allocated = true;
                    }
                }
            }
        }

        if (!allocated) {
            alert(`No se pudo asignar memoria para un proceso de ${size} KB. No hay suficiente espacio contiguo o total.`);
        }

        processSizeInput.value = '';
        updateUI();
    }

    function allocateMemory(block, requiredSize) {
        const originalSize = block.size;
        const remainingSize = originalSize - requiredSize;
        const processId = `P${nextProcessId++}`;

        // Update the block to be the new process
        block.size = requiredSize;
        block.isFree = false;
        block.processId = processId;

        // If there's remaining space, create a new free block
        if (remainingSize > 0) {
            const newFreeBlock = {
                id: `free-${Date.now()}`,
                size: remainingSize,
                startAddress: block.startAddress + requiredSize,
                isFree: true,
            };
            const blockIndex = memoryBlocks.findIndex(b => b.id === block.id);
            memoryBlocks.splice(blockIndex + 1, 0, newFreeBlock);
        }
    }

    function removeProcess(processId) {
        const blockIndex = memoryBlocks.findIndex(b => b.processId === processId);
        if (blockIndex === -1) return;

        memoryBlocks[blockIndex].isFree = true;
        memoryBlocks[blockIndex].processId = undefined;

        // Merge with next block if it's free
        if (blockIndex + 1 < memoryBlocks.length && memoryBlocks[blockIndex + 1].isFree) {
            const blockToMerge = memoryBlocks[blockIndex + 1];
            memoryBlocks[blockIndex].size += blockToMerge.size;
            memoryBlocks.splice(blockIndex + 1, 1);
        }

        // Merge with previous block if it's free
        if (blockIndex > 0 && memoryBlocks[blockIndex - 1].isFree) {
            const blockToMerge = memoryBlocks[blockIndex];
            memoryBlocks[blockIndex - 1].size += blockToMerge.size;
            memoryBlocks.splice(blockIndex, 1);
        }
        
        updateUI();
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
        renderProcessTable();
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
            
            blockDiv.title = `${block.processId || 'Libre'}: ${block.size} KB`;
            blockDiv.textContent = block.processId || '';
            memoryBarContainer.appendChild(blockDiv);
        });
    }

    function renderProcessTable() {
        processTableBody.innerHTML = '';
        const userProcesses = memoryBlocks.filter(b => !b.isFree && b.id !== 'os');

        userProcesses.forEach(block => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${block.processId}</td>
                <td>${block.size} KB</td>
                <td>0x${block.startAddress.toString(16).toUpperCase()}</td>
                <td><button class="btn stop" data-process-id="${block.processId}">Liberar</button></td>
            `;
            processTableBody.appendChild(row);
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

    // Event Listeners
    addProcessBtn.addEventListener('click', addProcess);
    resetSimulationBtn.addEventListener('click', init);
    processTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('stop')) {
            const processId = e.target.getAttribute('data-process-id');
            removeProcess(processId);
        }
    });

    // Initial call
    init();
});

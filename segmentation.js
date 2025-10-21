document.addEventListener('DOMContentLoaded', () => {
    const TOTAL_MEMORY = 16 * 1024; // 16384 KiB
    const OS_MEMORY = 1024; // 1024 KiB = 1 MiB
    const HEAP_SIZE = 128; // 128 KiB
    const STACK_SIZE = 64; // 64 KiB
    
    // Constantes de segmentación
    const MAX_SEGMENTS_PER_PROCESS = 32; // 2^5 = 32 segmentos
    const MAX_SEGMENT_SIZE = 512; // 2^19 bytes = 512 KiB
    const SEGMENT_NUMBER_BITS = 5;
    const OFFSET_BITS = 19;

    let memoryBlocks = [];
    let processes = [];
    let processTemplates = [];
    let nextProcessId = 1;

    // DOM Elements
    const memoryBarContainer = document.getElementById('memoryBarContainer');
    const processList = document.getElementById('processList');
    const addProcessBtn = document.getElementById('addProcessBtn');
    const processNameInput = document.getElementById('processName');
    const processSizeInput = document.getElementById('processSize');
    const resetSimulationBtn = document.getElementById('resetSimulationBtn');
    const totalFreeMemoryEl = document.getElementById('totalFreeMemory');
    const fragmentationEl = document.getElementById('fragmentation');
    const largestFreeBlockEl = document.getElementById('largestFreeBlock');

    // Procesos predeterminados con tamaños específicos para cada sección
    const predefinedProcesses = [
        { name: "Editor de Texto", text: 180, data: 70, bss: 70 },
        { name: "Navegador Web", text: 250, data: 200, bss: 158 },
        { name: "Base de Datos", text: 136, data: 180, bss: 92 },
        { name: "Compilador", text: 100, data: 54, bss: 54 },
        { name: "Sistema Gráfico", text: 250, data: 250, bss: 208 },
        { name: "Servidor Grande", text: 350, data: 500, bss: 458 },
        { name: "Sistema Masivo", text: 600, data: 1000, bss: 1908 }, // text dividido en 2 segmentos
        { name: "Aplicación Enorme", text: 1000, data: 1500, bss: 1408 } // text y data divididos
    ];

    // Clase Segment: representa un segmento individual en memoria
    class Segment {
        constructor(processId, processName, type, size, segmentNumber) {
            this.processId = processId;
            this.processName = processName;
            this.type = type; // '.text', '.data', '.bss', 'heap', 'stack'
            this.size = size; // en KiB
            this.segmentNumber = segmentNumber; // número de segmento dentro del proceso
            this.memoryBlock = null; // bloque de memoria asignado
        }

        getLabel() {
            if (this.segmentNumber > 0) {
                return `P${this.processId} (${this.type}#${this.segmentNumber})`;
            }
            return `P${this.processId} (${this.type})`;
        }
    }

    // ProcessTemplate: representa el tipo de proceso (plantilla)
    class ProcessTemplate {
        constructor(id, name, textSize, dataSize, bssSize) {
            this.id = id;
            this.name = name;
            this.textSize = textSize;
            this.dataSize = dataSize;
            this.bssSize = bssSize;
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
            this.textSize = template.textSize;
            this.dataSize = template.dataSize;
            this.bssSize = template.bssSize;
            this.heapSize = HEAP_SIZE;
            this.stackSize = STACK_SIZE;
            this.isRunning = false;
            this.segments = []; // Array de objetos Segment
            this.totalSize = 0;
            
            // Crear segmentos dividiendo las secciones si exceden MAX_SEGMENT_SIZE
            this.createSegments();
        }

        createSegments() {
            this.segments = [];
            let segmentCount = 0;

            // Función auxiliar para dividir una sección en segmentos
            const createSegmentsForSection = (type, size) => {
                if (size === 0) return;
                
                let remaining = size;
                let partNumber = 0;
                
                while (remaining > 0 && segmentCount < MAX_SEGMENTS_PER_PROCESS) {
                    const segmentSize = Math.min(remaining, MAX_SEGMENT_SIZE);
                    const segment = new Segment(
                        this.id,
                        this.name,
                        type,
                        segmentSize,
                        partNumber
                    );
                    this.segments.push(segment);
                    this.totalSize += segmentSize;
                    remaining -= segmentSize;
                    partNumber++;
                    segmentCount++;
                }
                
                if (remaining > 0) {
                    console.warn(`Proceso ${this.name} excede el límite de ${MAX_SEGMENTS_PER_PROCESS} segmentos`);
                }
            };

            // Crear segmentos para cada sección
            createSegmentsForSection('.text', this.textSize);
            createSegmentsForSection('.data', this.dataSize);
            createSegmentsForSection('.bss', this.bssSize);
            createSegmentsForSection('heap', this.heapSize);
            createSegmentsForSection('stack', this.stackSize);
        }

        start() {
            if (!this.isRunning) {
                return this.allocateMemory();
            }
            return false;
        }

        stop() {
            if (this.isRunning) {
                this.deallocateMemory();
                return true;
            }
            return false;
        }

        allocateMemory() {
            let allAllocated = true;

            // Intentar asignar cada segmento usando Best-Fit
            for (const segment of this.segments) {
                const allocated = this.allocateSegment(segment);
                if (!allocated) {
                    allAllocated = false;
                    // Si falla, liberar los segmentos ya asignados
                    this.deallocateMemory();
                    alert(`No se pudo asignar memoria para el segmento ${segment.getLabel()} (${segment.size} KiB). Proceso cancelado.`);
                    break;
                }
            }

            if (allAllocated) {
                this.isRunning = true;
            }

            return allAllocated;
        }

        allocateSegment(segment) {
            // Best-Fit: buscar el bloque libre más pequeño que quepa el segmento
            const freeBlocks = memoryBlocks.filter(b => b.isFree && b.size >= segment.size);
            
            if (freeBlocks.length === 0) {
                return false;
            }

            // Ordenar por tamaño (Best-Fit)
            freeBlocks.sort((a, b) => a.size - b.size);
            const bestFitBlock = freeBlocks[0];

            return this.assignSegmentToBlock(segment, bestFitBlock);
        }

        assignSegmentToBlock(segment, block) {
            const originalSize = block.size;
            const remainingSize = originalSize - segment.size;

            // Actualizar el bloque para el segmento
            block.size = segment.size;
            block.isFree = false;
            block.processId = `P${this.id}`;
            block.processName = this.name;
            block.segment = segment;
            segment.memoryBlock = block;

            // Si queda espacio restante, crear un nuevo bloque libre
            if (remainingSize > 0) {
                const newFreeBlock = {
                    id: `free-${Date.now()}-${Math.random()}`,
                    size: remainingSize,
                    startAddress: block.startAddress + segment.size,
                    isFree: true,
                };
                const blockIndex = memoryBlocks.findIndex(b => b.id === block.id);
                memoryBlocks.splice(blockIndex + 1, 0, newFreeBlock);
            }

            return true;
        }

        deallocateMemory() {
            // Liberar todos los segmentos del proceso
            for (const segment of this.segments) {
                if (segment.memoryBlock) {
                    this.deallocateSegment(segment);
                }
            }
            this.isRunning = false;
        }

        deallocateSegment(segment) {
            if (!segment.memoryBlock) return;

            const block = segment.memoryBlock;
            const blockIndex = memoryBlocks.findIndex(b => b === block);
            if (blockIndex === -1) return;

            // Marcar el bloque como libre
            block.isFree = true;
            block.processId = undefined;
            block.processName = undefined;
            block.segment = null;
            segment.memoryBlock = null;

            // Fusionar con el bloque siguiente si es libre
            if (blockIndex + 1 < memoryBlocks.length && memoryBlocks[blockIndex + 1].isFree) {
                block.size += memoryBlocks[blockIndex + 1].size;
                memoryBlocks.splice(blockIndex + 1, 1);
            }

            // Fusionar con el bloque anterior si es libre
            if (blockIndex > 0 && memoryBlocks[blockIndex - 1].isFree) {
                memoryBlocks[blockIndex - 1].size += block.size;
                memoryBlocks.splice(blockIndex, 1);
            }
        }
    }

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
            const template = new ProcessTemplate(
                index + 1, 
                procData.name, 
                procData.text,
                procData.data,
                procData.bss
            );
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

        // Distribuir el tamaño base entre las secciones (aproximadamente)
        const textSize = Math.floor(baseSize * 0.4); // 40% para .text
        const dataSize = Math.floor(baseSize * 0.3); // 30% para .data
        const bssSize = baseSize - textSize - dataSize; // El resto para .bss

        const newTemplate = new ProcessTemplate(
            processTemplates.length + 1, 
            name, 
            textSize,
            dataSize,
            bssSize
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

    function updateUI() {
        renderMemoryBar();
        renderProcesses();
        updateSystemInfo();
    }

    function renderMemoryBar() {
        memoryBarContainer.innerHTML = '';
        
        let currentAddress = 0;
        
        memoryBlocks.forEach(block => {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'memory-block-vertical';

            let blockClass = 'free-dynamic';
            let label = 'Espacio Libre';
            
            if (!block.isFree) {
                blockClass = block.id === 'os' ? 'os' : 'occupied-dynamic';
                
                if (block.segment) {
                    // Mostrar etiqueta del segmento: "P2 (.text)"
                    label = block.segment.getLabel();
                } else if (block.id === 'os') {
                    label = 'Sistema Operativo';
                } else {
                    label = block.processId || 'Ocupado';
                }
            }
            
            blockDiv.classList.add(blockClass);
            
            // Calcular altura proporcional al tamaño (mínimo 30px)
            const heightPercentage = (block.size / TOTAL_MEMORY) * 100;
            const minHeight = 35;
            const calculatedHeight = Math.max(minHeight, (block.size / TOTAL_MEMORY) * 600);
            blockDiv.style.height = `${calculatedHeight}px`;
            
            // Formatear dirección en hexadecimal
            const startAddr = block.startAddress || currentAddress;
            const endAddr = startAddr + block.size - 1;
            const startHex = '0x' + startAddr.toString(16).toUpperCase().padStart(6, '0');
            const endHex = '0x' + endAddr.toString(16).toUpperCase().padStart(6, '0');
            
            blockDiv.innerHTML = `
                <span class="segment-label">${label}</span>
                <span class="segment-size">${block.size} KiB</span>
                <span class="segment-address">${startHex}</span>
            `;
            
            blockDiv.title = `${label}\nTamaño: ${block.size} KiB\nRango: ${startHex} - ${endHex}`;
            
            memoryBarContainer.appendChild(blockDiv);
            currentAddress = endAddr + 1;
        });
    }

    function renderProcesses() {
        processList.innerHTML = '';
        
        processTemplates.forEach(template => {
            const div = document.createElement('div');
            div.className = 'process-item';
            
            const runningCount = template.getInstanceCount();
            const hasInstances = runningCount > 0;
            
            // Calcular tamaño total del proceso
            const totalSize = template.textSize + template.dataSize + template.bssSize + HEAP_SIZE + STACK_SIZE;
            
            // Calcular número de segmentos
            const calculateSegmentCount = () => {
                let count = 0;
                count += Math.ceil(template.textSize / MAX_SEGMENT_SIZE);
                count += Math.ceil(template.dataSize / MAX_SEGMENT_SIZE);
                count += Math.ceil(template.bssSize / MAX_SEGMENT_SIZE);
                count += Math.ceil(HEAP_SIZE / MAX_SEGMENT_SIZE);
                count += Math.ceil(STACK_SIZE / MAX_SEGMENT_SIZE);
                return count;
            };
            
            const segmentCount = calculateSegmentCount();
            
            div.innerHTML = `
                <div class="process-header">
                    <div class="process-name">${template.name}</div>
                    <div class="process-status ${hasInstances ? 'running' : 'stopped'}">
                        ${hasInstances ? `EJECUTANDO (${runningCount})` : 'DETENIDO'}
                    </div>
                </div>
                <div class="process-details">
                    <div><strong>.text:</strong> ${template.textSize} KiB</div>
                    <div><strong>.data:</strong> ${template.dataSize} KiB</div>
                    <div><strong>.bss:</strong> ${template.bssSize} KiB</div>
                    <div><strong>Heap:</strong> ${HEAP_SIZE} KiB</div>
                    <div><strong>Stack:</strong> ${STACK_SIZE} KiB</div>
                    <div><strong>Total:</strong> ${totalSize} KiB</div>
                    <div style="grid-column: span 3"><strong>Segmentos:</strong> ${segmentCount} (máx ${MAX_SEGMENT_SIZE} KiB c/u)</div>
                    <div style="grid-column: span 3"><strong>Instancias activas:</strong> ${runningCount}</div>
                </div>
                <div class="process-controls">
                    <button class="btn start" onclick="startProcess(${template.id})">
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
        updateFreeFragmentsTable();
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

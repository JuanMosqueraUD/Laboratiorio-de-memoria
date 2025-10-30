document.addEventListener('DOMContentLoaded', () => {
    // Constantes de paginación según especificaciones
    const TOTAL_MEMORY = 16 * 1024; // 16384 KiB (16 MiB)
    const PAGE_SIZE = 64; // 64 KiB por página (65536 bits / 8 = 8192 bytes = 8 KiB) - Ajustado a 64 KiB para ser más realista
    const TOTAL_PAGES = TOTAL_MEMORY / PAGE_SIZE; // 256 páginas totales
    const OS_PAGES = 16; // 16 páginas para el SO (1 MiB)
    const USER_PAGES = TOTAL_PAGES - OS_PAGES; // 240 páginas para usuarios
    
    // Constantes de direccionamiento
    const PAGE_NUMBER_BITS = 16; // 16 bits para número de página
    const OFFSET_BITS = 16; // 16 bits para offset
    const MAX_PAGES_PER_PROCESS = Math.pow(2, PAGE_NUMBER_BITS); // 65536 páginas virtuales máximas por proceso
    const MAX_OFFSET = Math.pow(2, OFFSET_BITS) - 1; // 65535 bytes de offset máximo

    let frameTable = []; // Tabla de marcos físicos
    let processes = []; 
    let processTemplates = [];
    let nextProcessId = 1;
    let accessCounter = 0; // Contador global para LRU

    // DOM Elements
    const memoryBarContainer = document.getElementById('memoryBarContainer');
    const processList = document.getElementById('processList');
    const addProcessBtn = document.getElementById('addProcessBtn');
    const processNameInput = document.getElementById('processName');
    const processSizeInput = document.getElementById('processSize');
    const resetSimulationBtn = document.getElementById('resetSimulationBtn');
    const freeFramesEl = document.getElementById('freeFrames');
    const occupiedFramesEl = document.getElementById('occupiedFrames');

    // Constantes de heap y stack
    const HEAP_SIZE = 128; // 128 KiB
    const STACK_SIZE = 64; // 64 KiB

    // Procesos predeterminados con tamaños específicos para cada sección
    const predefinedProcesses = [
        { name: "Editor de Texto", text: 50, data: 20, bss: 14 }, // Total: 84 + 192 = 276 KiB -> 6 páginas (1+1+1+2+1)
        { name: "Navegador Web", text: 160, data: 100, bss: 60 }, // Total: 320 + 192 = 512 KiB -> 8 páginas (3+2+1+2+1)
        { name: "Base de Datos", text: 200, data: 150, bss: 90 }, // Total: 440 + 192 = 632 KiB -> 10 páginas (4+3+2+2+1)
        { name: "Compilador", text: 80, data: 40, bss: 8 }, // Total: 128 + 192 = 320 KiB -> 6 páginas (2+1+1+2+1)
        { name: "Sistema Gráfico", text: 300, data: 300, bss: 212 }, // Total: 812 + 192 = 1004 KiB -> 16 páginas (5+5+4+2+1)
        { name: "Servidor Web", text: 180, data: 140, bss: 128 }, // Total: 448 + 192 = 640 KiB -> 10 páginas (3+3+2+2+1)
        { name: "Aplicación Grande", text: 400, data: 350, bss: 338 }, // Total: 1088 + 192 = 1280 KiB -> 20 páginas (7+6+6+2+1)
        { name: "Sistema Masivo", text: 600, data: 500, bss: 628 } // Total: 1728 + 192 = 1920 KiB -> 30 páginas (10+8+10+2+1)
    ];

    // Clase Frame: representa un marco físico de memoria
    class Frame {
        constructor(frameNumber) {
            this.frameNumber = frameNumber; // Número del marco físico (0-255)
            this.isFree = true;
            this.processId = null;
            this.processName = null;
            this.virtualPageNumber = null; // Número de página virtual del proceso
            this.pageType = null; // Tipo de página: '.text', '.data', '.bss', 'heap', 'stack'
            this.lastAccess = 0; // Para el algoritmo LRU
            this.startAddress = frameNumber * PAGE_SIZE; // Dirección física de inicio
        }

        allocate(processId, processName, virtualPageNumber, pageType) {
            this.isFree = false;
            this.processId = processId;
            this.processName = processName;
            this.virtualPageNumber = virtualPageNumber;
            this.pageType = pageType;
            this.lastAccess = ++accessCounter;
        }

        deallocate() {
            this.isFree = true;
            this.processId = null;
            this.processName = null;
            this.virtualPageNumber = null;
            this.pageType = null;
            this.lastAccess = 0;
        }

        access() {
            this.lastAccess = ++accessCounter;
        }
    }

    // Clase PageTableEntry: entrada en la tabla de páginas
    class PageTableEntry {
        constructor(virtualPageNumber, pageType) {
            this.virtualPageNumber = virtualPageNumber;
            this.pageType = pageType; // Tipo de página: '.text', '.data', '.bss', 'heap', 'stack'
            this.frameNumber = null; // Marco físico asignado
            this.present = false; // Bit de presencia
            this.referenced = false; // Bit de referencia para LRU
            this.modified = false; // Bit de modificación (no usado en esta simulación)
        }

        mapToFrame(frameNumber) {
            this.frameNumber = frameNumber;
            this.present = true;
        }

        unmap() {
            this.frameNumber = null;
            this.present = false;
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
            this.heapSize = HEAP_SIZE;
            this.stackSize = STACK_SIZE;
            this.totalSize = textSize + dataSize + bssSize + HEAP_SIZE + STACK_SIZE;
            // Calcular páginas necesarias sumando el ceil de cada sección
            this.pagesNeeded = Math.ceil(textSize / PAGE_SIZE) + 
                               Math.ceil(dataSize / PAGE_SIZE) + 
                               Math.ceil(bssSize / PAGE_SIZE) + 
                               Math.ceil(HEAP_SIZE / PAGE_SIZE) + 
                               Math.ceil(STACK_SIZE / PAGE_SIZE);
            this.instances = [];
        }

        createInstance() {
            const instance = new ProcessInstance(nextProcessId++, this);
            this.instances.push(instance);
            processes.push(instance);
            return instance;
        }

        removeOldestInstance() {
            if (this.instances.length === 0) return null;
            const oldest = this.instances.shift();
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

    // ProcessInstance: instancia específica de un proceso
    class ProcessInstance {
        constructor(id, template) {
            this.id = id;
            this.template = template;
            this.name = template.name;
            this.textSize = template.textSize;
            this.dataSize = template.dataSize;
            this.bssSize = template.bssSize;
            this.heapSize = template.heapSize;
            this.stackSize = template.stackSize;
            this.totalSize = template.totalSize;
            this.pagesNeeded = template.pagesNeeded;
            this.isRunning = false;
            this.pageTable = new Map(); // Tabla de páginas: virtualPageNumber -> PageTableEntry
            this.allocatedFrames = []; // Lista de marcos asignados para liberación rápida
            this.pageTypes = []; // Lista con el tipo de cada página en orden
            
            // Calcular cuántas páginas necesita cada sección
            this.calculatePageDistribution();
            
            // Inicializar tabla de páginas con tipos
            this.initializePageTable();
        }

        calculatePageDistribution() {
            // Calcular páginas necesarias para cada sección
            this.pageTypes = []; // Limpiar el array
            
            // Función auxiliar para agregar páginas de un tipo
            const addPagesForSection = (sectionSize, pageType) => {
                if (sectionSize <= 0) return;
                
                // Calcular cuántas páginas completas necesita esta sección
                const pagesForThisSection = Math.ceil(sectionSize / PAGE_SIZE);
                
                // Agregar las páginas necesarias
                for (let i = 0; i < pagesForThisSection; i++) {
                    this.pageTypes.push(pageType);
                }
            };
            
            // Asignar páginas en orden: .text -> .data -> .bss -> heap -> stack
            addPagesForSection(this.textSize, '.text');
            addPagesForSection(this.dataSize, '.data');
            addPagesForSection(this.bssSize, '.bss');
            addPagesForSection(this.heapSize, 'heap');
            addPagesForSection(this.stackSize, 'stack');
            
            // Verificar que coincida con pagesNeeded
            console.log(`Proceso ${this.name}: pageTypes.length=${this.pageTypes.length}, pagesNeeded=${this.pagesNeeded}`);
        }

        initializePageTable() {
            for (let i = 0; i < this.pagesNeeded; i++) {
                const pageType = this.pageTypes[i] || 'unknown';
                this.pageTable.set(i, new PageTableEntry(i, pageType));
            }
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
            // Verificar si hay suficientes marcos libres
            const freeFrames = frameTable.filter(frame => frame.isFree);
            if (freeFrames.length < this.pagesNeeded) {
                // No hay suficiente memoria disponible
                alert(`No hay suficientes marcos libres para el proceso ${this.name}.\n` +
                      `Necesita: ${this.pagesNeeded} páginas (${this.pagesNeeded * PAGE_SIZE} KiB)\n` +
                      `Disponibles: ${freeFrames.length} páginas (${freeFrames.length * PAGE_SIZE} KiB)\n` +
                      `El proceso no se ejecutará.`);
                return false;
            }

            // Asignar marcos a las páginas del proceso
            const availableFrames = frameTable.filter(frame => frame.isFree).slice(0, this.pagesNeeded);
            
            for (let i = 0; i < this.pagesNeeded; i++) {
                const frame = availableFrames[i];
                const pageEntry = this.pageTable.get(i);
                
                frame.allocate(this.id, this.name, i, pageEntry.pageType);
                pageEntry.mapToFrame(frame.frameNumber);
                this.allocatedFrames.push(frame.frameNumber);
            }

            this.isRunning = true;
            return true;
        }

        deallocateMemory() {
            // Liberar todos los marcos asignados al proceso
            this.allocatedFrames.forEach(frameNumber => {
                const frame = frameTable[frameNumber];
                if (frame && frame.processId === this.id) {
                    frame.deallocate();
                }
            });

            // Limpiar tabla de páginas
            this.pageTable.forEach(pageEntry => {
                pageEntry.unmap();
            });

            this.allocatedFrames = [];
            this.isRunning = false;
        }

        // Simular acceso a una página (para algoritmo LRU)
        accessPage(virtualPageNumber) {
            const pageEntry = this.pageTable.get(virtualPageNumber);
            if (pageEntry && pageEntry.present) {
                const frame = frameTable[pageEntry.frameNumber];
                if (frame) {
                    frame.access();
                    pageEntry.referenced = true;
                }
            }
        }
    }

    function init() {
        // Reset state
        frameTable = [];
        processes = [];
        processTemplates = [];
        nextProcessId = 1;
        accessCounter = 0;

        // Inicializar tabla de marcos
        for (let i = 0; i < TOTAL_PAGES; i++) {
            const frame = new Frame(i);
            
            // Marcar marcos del OS como ocupados
            if (i < OS_PAGES) {
                frame.allocate('OS', 'Sistema Operativo', i);
            }
            
            frameTable.push(frame);
        }

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
                    <h3>Configuración de Paginación</h3>
                    <div class="memory-detail">
                        <span><strong>Tamaño de página:</strong></span>
                        <span>${PAGE_SIZE} KiB</span>
                    </div>
                    <div class="memory-detail">
                        <span><strong>Páginas totales:</strong></span>
                        <span>${TOTAL_PAGES}</span>
                    </div>
                    <div class="memory-detail">
                        <span><strong>Páginas del SO:</strong></span>
                        <span>${OS_PAGES}</span>
                    </div>
                    <div class="memory-detail">
                        <span><strong>Páginas de usuario:</strong></span>
                        <span>${USER_PAGES}</span>
                    </div>
                    <div class="memory-detail">
                        <span><strong>Heap por proceso:</strong></span>
                        <span>${HEAP_SIZE} KiB</span>
                    </div>
                    <div class="memory-detail">
                        <span><strong>Stack por proceso:</strong></span>
                        <span>${STACK_SIZE} KiB</span>
                    </div>
                    <div class="memory-detail">
                        <span><strong>Bits dirección virtual:</strong></span>
                        <span>32 (${PAGE_NUMBER_BITS} página + ${OFFSET_BITS} offset)</span>
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
    }

    function startProcess(templateId) {
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
        renderPageTables();
    }

    function renderMemoryBar() {
        memoryBarContainer.innerHTML = '';
        
        frameTable.forEach(frame => {
            const frameDiv = document.createElement('div');
            frameDiv.className = 'memory-block-vertical';

            let frameClass = 'free-dynamic';
            let label = 'Marco Libre';
            
            if (!frame.isFree) {
                frameClass = frame.processId === 'OS' ? 'os' : 'occupied-dynamic';
                
                if (frame.processId === 'OS') {
                    label = 'Sistema Operativo';
                } else {
                    label = `P${frame.processId} (${frame.pageType} - Pág ${frame.virtualPageNumber})`;
                }
            }
            
            frameDiv.classList.add(frameClass);
            
            // Calcular altura proporcional (todas las páginas tienen el mismo tamaño)
            const calculatedHeight = Math.max(25, (PAGE_SIZE / TOTAL_MEMORY) * 600);
            frameDiv.style.height = `${calculatedHeight}px`;
            
            // Formatear dirección física
            const startAddr = frame.startAddress;
            const endAddr = startAddr + PAGE_SIZE - 1;
            const startHex = '0x' + startAddr.toString(16).toUpperCase().padStart(6, '0');
            const endHex = '0x' + endAddr.toString(16).toUpperCase().padStart(6, '0');
            
            frameDiv.innerHTML = `
                <span class="segment-label">${label}</span>
                <span class="segment-size">${PAGE_SIZE} KiB</span>
                <span class="segment-address">Marco ${frame.frameNumber}</span>
            `;
            
            const tooltipText = frame.processId === 'OS' 
                ? `${label}\nMarco: ${frame.frameNumber}\nTamaño: ${PAGE_SIZE} KiB\nRango: ${startHex} - ${endHex}`
                : `${label}\nMarco: ${frame.frameNumber}\nTamaño: ${PAGE_SIZE} KiB\nRango: ${startHex} - ${endHex}${frame.lastAccess > 0 ? `\nÚltimo acceso: ${frame.lastAccess}` : ''}`;
            
            frameDiv.title = tooltipText;
            
            memoryBarContainer.appendChild(frameDiv);
        });
    }

    function renderProcesses() {
        processList.innerHTML = '';
        
        processTemplates.forEach(template => {
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
                    <div><strong>.text:</strong> ${template.textSize} KiB</div>
                    <div><strong>.data:</strong> ${template.dataSize} KiB</div>
                    <div><strong>.bss:</strong> ${template.bssSize} KiB</div>
                    <div><strong>Heap:</strong> ${template.heapSize} KiB</div>
                    <div><strong>Stack:</strong> ${template.stackSize} KiB</div>
                    <div><strong>Total:</strong> ${template.totalSize} KiB</div>
                    <div style="grid-column: span 3"><strong>Páginas necesarias:</strong> ${template.pagesNeeded} (${template.pagesNeeded * PAGE_SIZE} KiB)</div>
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
    
    function renderPageTables() {
        const container = document.getElementById('pageTablesContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Obtener todas las instancias de procesos activas
        const activeProcesses = processes.filter(p => p.isRunning);
        
        if (activeProcesses.length === 0) {
            container.innerHTML = '<div class="empty-table-message show">No hay procesos activos con páginas</div>';
            return;
        }
        
        // Crear una tabla para cada proceso
        activeProcesses.forEach(process => {
            const wrapper = document.createElement('div');
            wrapper.className = 'segment-table-wrapper';
            
            const title = document.createElement('div');
            title.className = 'segment-table-title';
            title.textContent = `P${process.id} - ${process.name} - Tabla de Páginas`;
            wrapper.appendChild(title);
            
            const table = document.createElement('table');
            table.className = 'segment-table';
            
            // Crear encabezado
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr>
                    <th rowspan="2" class="main-header">Página Virtual</th>
                    <th rowspan="2" class="main-header">Tipo</th>
                    <th rowspan="2" class="main-header">Marco Físico</th>
                    <th colspan="2" class="main-header">Dirección Física</th>
                    <th rowspan="2" class="main-header">Presente</th>
                    <th rowspan="2" class="main-header">Último Acceso</th>
                </tr>
                <tr>
                    <th class="sub-header">Dec</th>
                    <th class="sub-header">Hex</th>
                </tr>
            `;
            table.appendChild(thead);
            
            // Crear cuerpo de la tabla
            const tbody = document.createElement('tbody');
            
            // Mostrar todas las páginas del proceso (incluso las no presentes)
            for (let i = 0; i < process.pagesNeeded; i++) {
                const pageEntry = process.pageTable.get(i);
                if (!pageEntry) continue;
                
                const row = document.createElement('tr');
                
                let frameNumber = '-';
                let physicalAddress = '-';
                let physicalAddressHex = '-';
                let present = 'No';
                let lastAccess = '-';
                
                if (pageEntry.present && pageEntry.frameNumber !== null) {
                    const frame = frameTable[pageEntry.frameNumber];
                    frameNumber = pageEntry.frameNumber;
                    physicalAddress = frame.startAddress;
                    physicalAddressHex = '0x' + physicalAddress.toString(16).toUpperCase().padStart(6, '0');
                    present = 'Sí';
                    lastAccess = frame.lastAccess || '-';
                }
                
                row.innerHTML = `
                    <td class="dec-value">${i}</td>
                    <td class="segment-type">${pageEntry.pageType}</td>
                    <td class="dec-value">${frameNumber}</td>
                    <td class="dec-value">${physicalAddress}</td>
                    <td class="hex-value">${physicalAddressHex}</td>
                    <td class="segment-type ${pageEntry.present ? 'present' : 'not-present'}">${present}</td>
                    <td class="dec-value">${lastAccess}</td>
                `;
                tbody.appendChild(row);
            }
            
            table.appendChild(tbody);
            wrapper.appendChild(table);
            container.appendChild(wrapper);
        });
    }
    
    function updateSystemInfo() {
        const freeFrames = frameTable.filter(f => f.isFree).length;
        const occupiedFrames = TOTAL_PAGES - freeFrames;

        freeFramesEl.textContent = `${freeFrames}`;
        occupiedFramesEl.textContent = `${occupiedFrames}`;
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
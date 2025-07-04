/**
 * MUSIC PDF MANAGER - MAIN APPLICATION SCRIPT
 * Script principal que maneja la lógica de la aplicación
 */

// === ESTADO GLOBAL DE LA APLICACIÓN ===
const AppState = {
    currentModule: 'visualizer',
    currentPDF: null,
    files: {
        instrumentos: [],
        voces: []
    },
    filteredFiles: {
        instrumentos: [],
        voces: []
    },
    searchQuery: '',
    isLoading: false,
    pdfViewer: null
};

// === CONTROLADOR PRINCIPAL DE LA APLICACIÓN ===
class MusicPDFManager {
    constructor() {
        this.config = ConfigUtils.getConfig();
        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        try {
            console.log('🎵 Iniciando Music PDF Manager...');
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Configurar PDF.js
            this.setupPDFJS();
            
            // Inicializar búsqueda
            this.setupSearch();
            
            // Inicializar visualizador de PDF
            this.setupPDFViewer();
            
            // Cargar archivos
            await this.loadFiles();
            
            console.log('✅ Aplicación iniciada correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar la aplicación:', error);
            this.showError('Error al inicializar la aplicación');
        }
    }

    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const module = e.target.dataset.module;
                this.switchModule(module);
            });
        });

        // PDF viewer controls
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');
        const fullscreenBtn = document.getElementById('fullscreen');

        if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    /**
     * Configura PDF.js
     */
    setupPDFJS() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            console.log('📄 PDF.js configurado correctamente');
        } else {
            console.warn('⚠️ PDF.js no está disponible');
        }
    }

    /**
     * Cambia entre módulos
     */
    switchModule(moduleName) {
        // Actualizar estado
        AppState.currentModule = moduleName;

        // Actualizar tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleName}"]`).classList.add('active');

        // Mostrar módulo correspondiente
        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });
        document.getElementById(`${moduleName}-module`).classList.add('active');

        console.log(`📋 Módulo cambiado a: ${moduleName}`);
    }

    /**
     * Carga archivos desde Google Drive o datos simulados
     */
    async loadFiles() {
        this.showLoading(true);
        
        try {
            console.log('📁 Cargando archivos...');

            if (this.config.isDev) {
                // Usar datos simulados
                console.log('🔧 Modo desarrollo: usando datos simulados');
                AppState.files.instrumentos = [...this.config.mockData.instrumentos];
                AppState.files.voces = [...this.config.mockData.voces];
            } else {
                // Cargar desde Google Drive API
                console.log('☁️ Cargando desde Google Drive...');
                const driveAPI = new DriveAPI();
                AppState.files.instrumentos = await driveAPI.getFiles('instrumentos');
                AppState.files.voces = await driveAPI.getFiles('voces');
            }

            // Ordenar archivos alfabéticamente
            this.sortFiles();

            // Actualizar UI
            this.updateFileLists();
            this.updateFileCounts();

            console.log(`📊 Archivos cargados: ${AppState.files.instrumentos.length} instrumentos, ${AppState.files.voces.length} voces`);

        } catch (error) {
            console.error('❌ Error cargando archivos:', error);
            this.showError('Error al cargar los archivos');
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Ordena archivos alfabéticamente
     */
    sortFiles() {
        AppState.files.instrumentos.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        AppState.files.voces.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        
        // Actualizar también los archivos filtrados
        AppState.filteredFiles.instrumentos = [...AppState.files.instrumentos];
        AppState.filteredFiles.voces = [...AppState.files.voces];
    }

    /**
     * Actualiza las listas de archivos en la UI
     */
    updateFileLists() {
        this.renderFileList('instrumentos', AppState.filteredFiles.instrumentos);
        this.renderFileList('voces', AppState.filteredFiles.voces);
    }

    /**
     * Renderiza una lista de archivos
     */
    renderFileList(section, files) {
        const container = document.getElementById(`${section}-list`);
        if (!container) return;

        if (files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <h3>No hay archivos</h3>
                    <p>No se encontraron archivos PDF en esta sección</p>
                </div>
            `;
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="pdf-item" data-file-id="${file.id}" data-section="${section}">
                <span class="pdf-item-icon">📄</span>
                <div class="pdf-item-info">
                    <div class="pdf-item-name">${this.highlightSearchTerms(file.name)}</div>
                    <div class="pdf-item-meta">
                        ${file.size} • ${ConfigUtils.formatDate(file.modifiedTime)}
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar event listeners
        container.querySelectorAll('.pdf-item').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = item.dataset.fileId;
                const section = item.dataset.section;
                this.selectFile(fileId, section);
            });
        });
    }

    /**
     * Resalta términos de búsqueda en el texto
     */
    highlightSearchTerms(text) {
        if (!AppState.searchQuery || AppState.searchQuery.length < 2) return text;

        const regex = new RegExp(`(${AppState.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\    /**
     * Renderiza una lista de archivos
     */
    renderFileList(section, files) {
        const container = document.getElementById(`${section}-list`);
        if (!container) return;

        if (files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <h3>No hay archivos</h3>
                    <p>No se encontraron archivos PDF en esta sección</p>
                </div>
            `;
            return;
        }

        container.innerHTML = files.map(file => `
            <div class="pdf-item" data-file-id="${file.id}" data-section="${section}">
                <span class="pdf-item-icon">📄</span>
                <div class="pdf-item-info">
                    <div class="pdf-item-name">${this.highlightSearch(file.name)}</div>
                    <div class="pdf-item-meta">
                        ${file.size} • ${ConfigUtils.formatDate(file.modifiedTime)}
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar event listeners
        container.querySelectorAll('.pdf-item').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = item.dataset.fileId;
                const section = item.dataset.section;
                this.selectFile(fileId, section);
            });
        });
    }')})`, 'gi');
        return text.replace(regex, '<span class="search-result-match">$1</span>');
    }

    /**
     * Selecciona un archivo PDF
     */
    selectFile(fileId, section) {
        // Encontrar el archivo
        const file = AppState.files[section].find(f => f.id === fileId);
        if (!file) return;

        // Actualizar estado
        AppState.currentPDF = file;

        // Actualizar UI
        this.updateActiveFile(fileId);
        this.loadPDF(file);

        console.log(`📄 Archivo seleccionado: ${file.name}`);
    }

    /**
     * Actualiza el archivo activo visualmente
     */
    updateActiveFile(fileId) {
        // Remover estado activo de todos los items
        document.querySelectorAll('.pdf-item').forEach(item => {
            item.classList.remove('active');
        });

        // Agregar estado activo al item seleccionado
        const activeItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    /**
     * Carga un PDF en el visualizador
     */
    async loadPDF(file) {
        try {
            // Actualizar título
            document.getElementById('current-pdf-title').textContent = file.name;

            // Usar el PDFViewer para cargar el archivo
            if (this.pdfViewer) {
                await this.pdfViewer.loadPDF(file.downloadUrl || `#demo-pdf-${file.id}`);
            } else {
                // Fallback si no hay PDFViewer
                this.showPDFPlaceholder(file.name);
            }

        } catch (error) {
            console.error('❌ Error cargando PDF:', error);
            this.showPDFError();
        }
    }

    /**
     * Muestra placeholder del PDF en modo desarrollo
     */
    showPDFPlaceholder(fileName) {
        const viewer = document.getElementById('pdf-viewer');
        viewer.innerHTML = `
            <div class="pdf-placeholder">
                <div class="placeholder">
                    <div class="placeholder-icon">📄</div>
                    <h3>Vista previa no disponible</h3>
                    <p><strong>${fileName}</strong></p>
                    <p>En modo desarrollo. Configura Google Drive API para ver PDFs reales.</p>
                    <br>
                    <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); max-width: 400px; margin: 0 auto;">
                        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">
                            💡 <strong>Para ver PDFs reales:</strong><br>
                            1. Configura Google Drive API<br>
                            2. Actualiza las credenciales en drive-config.js<br>
                            3. Comparte las carpetas públicamente
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza un PDF real
     */
    async renderPDF(url) {
        // Esta función se implementará cuando tengamos acceso real a PDFs
        console.log('🔄 Renderizando PDF:', url);
        // Implementación con PDF.js aquí
    }

    /**
     * Muestra estado de carga del PDF
     */
    showPDFLoading() {
        const viewer = document.getElementById('pdf-viewer');
        viewer.innerHTML = `
            <div class="pdf-loading">
                <div class="spinner"></div>
                <p>${this.config.app.MESSAGES.PDF_LOADING}</p>
            </div>
        `;
    }

    /**
     * Muestra error del PDF
     */
    showPDFError() {
        const viewer = document.getElementById('pdf-viewer');
        viewer.innerHTML = `
            <div class="pdf-error">
                <div class="pdf-error-icon">⚠️</div>
                <h3>Error al cargar PDF</h3>
                <p>No se pudo cargar el archivo PDF. Inténtalo de nuevo.</p>
            </div>
        `;
    }

    /**
     * Maneja la búsqueda
     */
    handleSearch(query) {
        AppState.searchQuery = query.toLowerCase().trim();

        if (AppState.searchQuery.length < this.config.app.SEARCH.MIN_QUERY_LENGTH) {
            // Mostrar todos los archivos
            AppState.filteredFiles.instrumentos = [...AppState.files.instrumentos];
            AppState.filteredFiles.voces = [...AppState.files.voces];
        } else {
            // Filtrar archivos
            this.filterFiles();
        }

        this.updateFileLists();
        this.updateFileCounts();
    }

    /**
     * Filtra archivos según la búsqueda
     */
    filterFiles() {
        const query = AppState.searchQuery;

        AppState.filteredFiles.instrumentos = AppState.files.instrumentos.filter(file =>
            file.name.toLowerCase().includes(query)
        );

        AppState.filteredFiles.voces = AppState.files.voces.filter(file =>
            file.name.toLowerCase().includes(query)
        );
    }

    /**
     * Actualiza contadores de archivos
     */
    updateFileCounts() {
        const instCount = document.getElementById('instrumentos-count');
        const vocCount = document.getElementById('voces-count');

        if (instCount) {
            const count = AppState.filteredFiles.instrumentos.length;
            instCount.textContent = `${count} archivo${count !== 1 ? 's' : ''}`;
        }

        if (vocCount) {
            const count = AppState.filteredFiles.voces.length;
            vocCount.textContent = `${count} archivo${count !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Controles de zoom
     */
    zoomIn() {
        if (this.pdfViewer) {
            this.pdfViewer.zoomIn();
        }
        console.log('🔍 Zoom In');
    }

    zoomOut() {
        if (this.pdfViewer) {
            this.pdfViewer.zoomOut();
        }
        console.log('🔍 Zoom Out');
    }

    toggleFullscreen() {
        const viewer = document.getElementById('pdf-viewer');
        if (viewer) {
            if (!document.fullscreenElement) {
                viewer.requestFullscreen().catch(err => {
                    console.log('❌ Error entrando en pantalla completa:', err);
                });
            } else {
                document.exitFullscreen();
            }
        }
        console.log('⛶ Toggle Fullscreen');
    }

    /**
     * Muestra/oculta loading overlay
     */
    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
        AppState.isLoading = show;
    }

    /**
     * Muestra mensaje de error
     */
    showError(message) {
        console.error('❌', message);
        // Aquí podrías mostrar un modal de error o notification
        alert(message); // Temporal, reemplazar con UI mejor
    }

    /**
     * Configura la funcionalidad de búsqueda
     */
    setupSearch() {
        // Inicializar SearchManager
        this.searchManager = new SearchManager();
        console.log('🔍 Sistema de búsqueda configurado');
    }

    /**
     * Configura el visualizador de PDF
     */
    setupPDFViewer() {
        // Inicializar PDFViewer
        this.pdfViewer = new PDFViewer('pdf-viewer');
        AppState.pdfViewer = this.pdfViewer;
        console.log('📄 Visualizador PDF configurado');
    }
}

// === INICIALIZACIÓN DE LA APLICACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que todas las dependencias estén cargadas
    if (typeof ConfigUtils === 'undefined') {
        console.error('❌ ConfigUtils no está disponible');
        return;
    }

    if (typeof SearchManager === 'undefined') {
        console.error('❌ SearchManager no está disponible');
        return;
    }

    if (typeof PDFViewer === 'undefined') {
        console.error('❌ PDFViewer no está disponible');
        return;
    }

    // Inicializar la aplicación
    window.app = new MusicPDFManager();
});

// === EXPORTAR PARA DEBUGGING ===
window.AppState = AppState;
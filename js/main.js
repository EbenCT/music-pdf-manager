/**
 * MUSIC PDF MANAGER - MAIN APPLICATION SCRIPT
 * Versión refactorizada con módulos especializados
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
    pdfViewer: null,
    driveAPI: null,
    isAuthenticated: false,
    lastAuthCheck: null,
    isLoadingFiles: false
};

// === CONTROLADOR PRINCIPAL DE LA APLICACIÓN ===
class MusicPDFManager {
    constructor() {
        this.config = ConfigUtils.getConfig();
        this.authEventHandled = false;
        this.init();
    }

    /**
     * Inicializa la aplicación con módulos refactorizados
     */
    async init() {
        try {
            console.log('🎵 Iniciando Music PDF Manager (Refactorizado)...');
            console.log('☁️ Modo: GOOGLE DRIVE con módulos especializados');
            
            // Verificar credenciales
            if (!this.config.credentialsValid) {
                throw new Error('Credenciales de Google Drive no válidas');
            }
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Configurar PDF.js
            this.setupPDFJS();
            
            // Inicializar módulos
            this.setupSearch();
            this.setupPDFViewer();
            
            // Inicializar Google Drive API refactorizada
            await this.initializeDriveAPI();
            
            // Intentar autenticación automática
            await this.tryAutoAuthentication();
            
            console.log('✅ Aplicación refactorizada inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar aplicación:', error);
            this.showCriticalError(error.message);
        }
    }

    /**
     * Inicializa Google Drive API refactorizada
     */
    async initializeDriveAPI() {
        try {
            console.log('🔧 Inicializando Google Drive API refactorizada...');
            
            // Verificar que los módulos estén disponibles
            if (!window.DriveAPIGIS) {
                throw new Error('DriveAPIGIS no está disponible');
            }
            
            this.driveAPI = new DriveAPIGIS();
            AppState.driveAPI = this.driveAPI;
            
            // Inicializar con módulos
            await this.driveAPI.init();
            
            console.log('✅ Google Drive API refactorizada lista');
            
        } catch (error) {
            console.error('❌ Error inicializando Drive API refactorizada:', error);
            throw new Error(`Error configurando Google Drive: ${error.message}`);
        }
    }

    /**
     * Intenta autenticación automática
     */
    async tryAutoAuthentication() {
        try {
            console.log('🔄 Verificando autenticación automática...');
            
            if (this.driveAPI.isSignedIn && this.driveAPI.isTokenValid()) {
                console.log('✅ Token válido encontrado, cargando archivos...');
                AppState.isAuthenticated = true;
                this.driveAPI.updateAuthStatus(true);
                await this.loadFiles();
                return;
            }

            console.log('⚠️ No hay token válido, se requiere autenticación manual');
            this.showAuthRequired();
            
        } catch (error) {
            console.error('❌ Error en autenticación automática:', error);
            this.showAuthRequired();
        }
    }

    /**
     * Muestra que se requiere autenticación
     */
    showAuthRequired() {
        this.driveAPI.showAuthButton();
        this.updateUI('auth-required');
    }

    /**
     * Configura event listeners
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

        // Event listener de autenticación
        this.setupAuthEventListener();

        // Timer de validación de token
        this.startTokenValidationTimer();
    }

    /**
     * Configura listener de autenticación de forma segura
     */
    setupAuthEventListener() {
        if (this.authEventHandled) {
            console.log('⚠️ Event listener de auth ya configurado');
            return;
        }

        console.log('🔧 Configurando event listener de autenticación...');
        
        const authHandler = (event) => {
            console.log('📢 Evento driveAuthSuccess recibido');
            
            if (AppState.isLoadingFiles) {
                console.log('⚠️ Ya se están cargando archivos, ignorando...');
                return;
            }

            this.onAuthSuccess();
        };

        window.addEventListener('driveAuthSuccess', authHandler, { once: false });
        this.authEventHandled = true;
        
        console.log('✅ Event listener de autenticación configurado');
    }

    /**
     * Timer para verificar validez del token
     */
    startTokenValidationTimer() {
        setInterval(() => {
            if (this.driveAPI && AppState.isAuthenticated) {
                if (!this.driveAPI.isTokenValid()) {
                    console.log('⏰ Token expirado, requiriendo nueva autenticación');
                    this.handleTokenExpired();
                }
            }
        }, 600000); // 10 minutos
    }

    /**
     * Maneja expiración del token
     */
    handleTokenExpired() {
        AppState.isAuthenticated = false;
        AppState.isLoadingFiles = false;
        this.driveAPI.clearStoredToken();
        this.driveAPI.updateAuthStatus(false);
        this.showAuthRequired();
        this.updateUI('token-expired');
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
     * Carga archivos desde Google Drive con módulos refactorizados
     */
    async loadFiles() {
        if (AppState.isLoadingFiles) {
            console.log('⚠️ Ya se están cargando archivos, ignorando...');
            return;
        }

        AppState.isLoadingFiles = true;
        this.showLoading(true, 'Cargando archivos PDF desde Google Drive...');
        
        try {
            console.log('📁 Cargando archivos con módulos refactorizados...');

            if (!this.driveAPI) {
                throw new Error('Google Drive API no inicializada');
            }

            if (!AppState.isAuthenticated || !this.driveAPI.isSignedIn || !this.driveAPI.isTokenValid()) {
                throw new Error('No hay sesión válida de Google Drive');
            }

            console.log('📋 Estado de autenticación verificado - cargando archivos...');
            
            // Cargar ambas carpetas en paralelo usando módulos
            const [instrumentosFiles, vocesFiles] = await Promise.all([
                this.driveAPI.getFiles('instrumentos'),
                this.driveAPI.getFiles('voces')
            ]);

            // Guardar archivos
            AppState.files.instrumentos = instrumentosFiles;
            AppState.files.voces = vocesFiles;
            AppState.lastAuthCheck = Date.now();

            // Ordenar archivos alfabéticamente
            this.sortFiles();

            // Actualizar UI
            this.updateFileLists();
            this.updateFileCounts();
            this.updateUI('files-loaded');

            console.log(`📊 Archivos cargados exitosamente: ${AppState.files.instrumentos.length} instrumentos, ${AppState.files.voces.length} voces`);

        } catch (error) {
            console.error('❌ Error cargando archivos:', error);
            this.showDriveError(DriveUtils.getFriendlyErrorMessage(error));
        } finally {
            AppState.isLoadingFiles = false;
            this.showLoading(false);
        }
    }

    /**
     * Actualiza la UI según el estado
     */
    updateUI(state) {
        const currentPDFTitle = document.getElementById('current-pdf-title');
        
        switch (state) {
            case 'auth-required':
                if (currentPDFTitle) {
                    currentPDFTitle.textContent = 'Autenticación requerida';
                }
                this.showPlaceholderInLists('🔐 Haz clic en "Iniciar Sesión" para acceder a tus archivos');
                break;
                
            case 'token-expired':
                if (currentPDFTitle) {
                    currentPDFTitle.textContent = 'Sesión expirada - Inicia sesión nuevamente';
                }
                this.showPlaceholderInLists('⏰ Tu sesión ha expirado. Inicia sesión nuevamente.');
                break;
                
            case 'files-loaded':
                if (currentPDFTitle) {
                    currentPDFTitle.textContent = 'Selecciona un archivo PDF para visualizar';
                }
                break;
        }
    }

    /**
     * Muestra placeholder en las listas
     */
    showPlaceholderInLists(message) {
        ['instrumentos', 'voces'].forEach(section => {
            const container = document.getElementById(`${section}-list`);
            const countElement = document.getElementById(`${section}-count`);
            
            if (container) {
                container.innerHTML = `
                    <div class="empty-state auth-required">
                        <div class="empty-state-icon">☁️</div>
                        <p>${message}</p>
                    </div>
                `;
            }
            
            if (countElement) {
                countElement.textContent = 'Conectando...';
            }
        });
    }

    /**
     * Maneja éxito de autenticación
     */
    async onAuthSuccess() {
        console.log('🎉 Procesando éxito de autenticación...');
        
        if (AppState.isLoadingFiles) {
            console.log('⚠️ Ya se están procesando archivos, ignorando...');
            return;
        }

        AppState.isAuthenticated = true;
        
        try {
            await this.loadFiles();
        } catch (error) {
            console.error('❌ Error cargando archivos después de auth:', error);
            this.showDriveError(`Error cargando archivos: ${error.message}`);
        }
    }

    /**
     * Maneja errores de autenticación
     */
    onAuthError(errorMessage) {
        console.error('❌ Error de autenticación:', errorMessage);
        this.showAuthError(errorMessage);
        AppState.isAuthenticated = false;
        AppState.isLoadingFiles = false;
    }

    /**
     * Maneja cierre de sesión
     */
    onSignOut() {
        console.log('👋 Usuario cerró sesión');
        AppState.isAuthenticated = false;
        AppState.isLoadingFiles = false;
        AppState.files = { instrumentos: [], voces: [] };
        AppState.filteredFiles = { instrumentos: [], voces: [] };
        
        if (this.pdfViewer) {
            this.pdfViewer.clear();
        }
        
        this.updateUI('auth-required');
    }

    /**
     * Muestra error de autenticación
     */
    showAuthError(message) {
        ['instrumentos', 'voces'].forEach(section => {
            const container = document.getElementById(`${section}-list`);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div style="font-size: 2rem; margin-bottom: var(--spacing-md);">🔐</div>
                        <h3>Error de Autenticación</h3>
                        <p style="color: var(--accent-red); margin-bottom: var(--spacing-md);">${message}</p>
                        <button class="btn" onclick="window.app.retryConnection()">
                            🔐 Intentar Nuevamente
                        </button>
                    </div>
                `;
            }
        });
    }

    /**
     * Reintentar conexión
     */
    async retryConnection() {
        console.log('🔄 Reintentando conexión...');
        
        try {
            AppState.isAuthenticated = false;
            AppState.isLoadingFiles = false;
            
            await this.initializeDriveAPI();
            await this.driveAPI.authenticate();
            
        } catch (error) {
            console.error('❌ Error en reintento:', error);
            this.showDriveError(`Error al reconectar: ${error.message}`);
        }
    }

    /**
     * Ordena archivos alfabéticamente
     */
    sortFiles() {
        AppState.files.instrumentos.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        AppState.files.voces.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        
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
                    <h3>No hay archivos PDF</h3>
                    <p>No se encontraron archivos en la carpeta de ${section}</p>
                    <button class="btn secondary" onclick="window.app.retryLoadFiles()">
                        🔄 Intentar de nuevo
                    </button>
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
                        ${file.size} • ${DriveUtils.formatDate(file.modifiedTime)}
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
        return SearchUtils.highlightMatches(text, AppState.searchQuery, 'search-result-match');
    }

    /**
     * Selecciona un archivo PDF
     */
    selectFile(fileId, section) {
        const file = AppState.files[section].find(f => f.id === fileId);
        if (!file) return;

        AppState.currentPDF = file;
        this.updateActiveFile(fileId);
        this.loadPDF(file);

        console.log(`📄 Archivo seleccionado: ${file.name}`);
    }

    /**
     * Actualiza el archivo activo visualmente
     */
    updateActiveFile(fileId) {
        document.querySelectorAll('.pdf-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    /**
     * Carga un PDF desde Google Drive
     */
    async loadPDF(file) {
        try {
            console.log(`📄 Cargando PDF desde Google Drive: ${file.name}`);
            
            document.getElementById('current-pdf-title').textContent = file.name;

            if (this.pdfViewer) {
                await this.pdfViewer.loadPDF(file.downloadUrl, file);
            } else {
                this.showPDFError('Visualizador PDF no disponible');
            }

        } catch (error) {
            console.error('❌ Error cargando PDF:', error);
            this.showPDFError(DriveUtils.getFriendlyErrorMessage(error));
        }
    }

    /**
     * Muestra error del PDF
     */
    showPDFError(message) {
        const viewer = document.getElementById('pdf-viewer');
        viewer.innerHTML = `
            <div class="pdf-error">
                <div class="pdf-error-icon">⚠️</div>
                <h3>Error al cargar PDF</h3>
                <p>${message}</p>
                <div style="margin-top: var(--spacing-lg);">
                    <button class="btn secondary" onclick="window.app.retryLoadFiles()">
                        🔄 Reintentar
                    </button>
                    <button class="btn secondary" onclick="window.debugDriveConnection()" style="margin-left: var(--spacing-sm);">
                        🔧 Debug Conexión
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Maneja la búsqueda con SearchUtils
     */
    handleSearch(query) {
        AppState.searchQuery = query.toLowerCase().trim();

        if (AppState.searchQuery.length < this.config.app.SEARCH.MIN_QUERY_LENGTH) {
            AppState.filteredFiles.instrumentos = [...AppState.files.instrumentos];
            AppState.filteredFiles.voces = [...AppState.files.voces];
        } else {
            this.filterFiles();
        }

        this.updateFileLists();
        this.updateFileCounts();
    }

    /**
     * Filtra archivos usando SearchUtils
     */
    filterFiles() {
        const query = AppState.searchQuery;

        // Usar SearchUtils para filtrado más inteligente
        const instrumentosResults = SearchUtils.multiCriteriaSearch(query, AppState.files.instrumentos, ['name']);
        const vocesResults = SearchUtils.multiCriteriaSearch(query, AppState.files.voces, ['name']);

        AppState.filteredFiles.instrumentos = instrumentosResults.map(result => result.item);
        AppState.filteredFiles.voces = vocesResults.map(result => result.item);
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
     * Reintenta cargar archivos
     */
    async retryLoadFiles() {
        console.log('🔄 Reintentando cargar archivos...');
        
        if (!AppState.isAuthenticated) {
            await this.retryConnection();
        } else {
            AppState.isLoadingFiles = false;
            await this.loadFiles();
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
    showLoading(show, message = 'Cargando...') {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            const messageElement = overlay.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            
            if (show) {
                overlay.classList.add('show');
            } else {
                overlay.classList.remove('show');
            }
        }
        AppState.isLoading = show;
    }

    /**
     * Muestra error crítico de la aplicación
     */
    showCriticalError(message) {
        const container = document.querySelector('.main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--spacing-xxl); color: var(--accent-red);">
                    <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">⚠️</div>
                    <h2>Error de Configuración</h2>
                    <p style="margin-bottom: var(--spacing-lg);">${message}</p>
                    <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); max-width: 600px; margin: 0 auto;">
                        <h3 style="color: var(--text-primary); margin-bottom: var(--spacing-md);">Pasos para solucionar:</h3>
                        <ol style="text-align: left; color: var(--text-secondary);">
                            <li>Verificar credenciales en Google Cloud Console</li>
                            <li>Comprobar que las carpetas de Drive sean accesibles</li>
                            <li>Asegurar que la URL esté en dominios autorizados</li>
                            <li>Verificar que todos los módulos estén cargados</li>
                        </ol>
                    </div>
                    <button class="btn" onclick="location.reload()" style="margin-top: var(--spacing-lg);">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    }

    /**
     * Muestra error específico de Google Drive
     */
    showDriveError(message) {
        ['instrumentos', 'voces'].forEach(section => {
            const container = document.getElementById(`${section}-list`);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div style="font-size: 2rem; margin-bottom: var(--spacing-md);">☁️</div>
                        <h3>Error de Google Drive</h3>
                        <p style="color: var(--accent-red); margin-bottom: var(--spacing-md);">${message}</p>
                        <div style="margin-top: var(--spacing-md);">
                            <button class="btn secondary" onclick="window.app.retryConnection()">
                                🔄 Intentar de nuevo
                            </button>
                            <button class="btn secondary" onclick="window.debugDriveConnection()" style="margin-left: var(--spacing-sm);">
                                🔧 Debug
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        console.error('❌ Error de Google Drive:', message);
        if (this.driveAPI) {
            console.log('🔍 Estado de conexión:', this.driveAPI.getConnectionStatus());
        }
    }

    /**
     * Configura la funcionalidad de búsqueda
     */
    setupSearch() {
        this.searchManager = new SearchManager();
        console.log('🔍 Sistema de búsqueda configurado con SearchUtils');
    }

    /**
     * Configura el visualizador de PDF
     */
    setupPDFViewer() {
        this.pdfViewer = new PDFViewer('pdf-viewer');
        AppState.pdfViewer = this.pdfViewer;
        console.log('📄 Visualizador PDF configurado');
    }

    /**
     * Cierra sesión (wrapper para UI)
     */
    async signOut() {
        if (this.driveAPI) {
            await this.driveAPI.signOut();
        }
    }
}

// === INICIALIZACIÓN DE LA APLICACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    // Verificar dependencias refactorizadas
    const dependencies = [
        { name: 'ConfigUtils', obj: typeof ConfigUtils !== 'undefined' },
        { name: 'DriveUtils', obj: typeof DriveUtils !== 'undefined' },
        { name: 'DriveAuth', obj: typeof DriveAuth !== 'undefined' },
        { name: 'DriveFiles', obj: typeof DriveFiles !== 'undefined' },
        { name: 'DriveAPIGIS', obj: typeof DriveAPIGIS !== 'undefined' },
        { name: 'SearchUtils', obj: typeof SearchUtils !== 'undefined' },
        { name: 'SearchManager', obj: typeof SearchManager !== 'undefined' },
        { name: 'PDFViewer', obj: typeof PDFViewer !== 'undefined' },
        { name: 'Google Identity', obj: typeof google !== 'undefined' && google.accounts }
    ];

    console.log('🔍 Verificando dependencias refactorizadas...');
    const missingDeps = dependencies.filter(dep => !dep.obj);
    
    if (missingDeps.length > 0) {
        console.error('❌ Dependencias faltantes:', missingDeps.map(d => d.name));
        
        document.querySelector('.main-content').innerHTML = `
            <div style="text-align: center; padding: var(--spacing-xxl); color: var(--accent-red);">
                <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">🔧</div>
                <h2>Error de Módulos</h2>
                <p style="margin-bottom: var(--spacing-lg);">Faltan módulos requeridos: ${missingDeps.map(d => d.name).join(', ')}</p>
                <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); max-width: 600px; margin: 0 auto;">
                    <h3 style="color: var(--text-primary); margin-bottom: var(--spacing-md);">Módulos verificados:</h3>
                    <ul style="text-align: left; color: var(--text-secondary);">
                        ${dependencies.map(dep => 
                            `<li>${dep.name}: ${dep.obj ? '✅' : '❌'}</li>`
                        ).join('')}
                    </ul>
                </div>
                <button class="btn" onclick="location.reload()" style="margin-top: var(--spacing-lg);">
                    🔄 Reintentar
                </button>
            </div>
        `;
        return;
    }

    console.log('✅ Todos los módulos verificados');

    // Inicializar aplicación
    window.app = new MusicPDFManager();
});

// === EXPORTAR PARA DEBUGGING ===
window.AppState = AppState;

// === DEBUG DE ESTADO GLOBAL MEJORADO ===
window.debugAppState = function() {
    console.group('🔍 DEBUG DE ESTADO GLOBAL - MÓDULOS REFACTORIZADOS');
    
    console.log('📊 Archivos cargados:', {
        instrumentos: AppState.files.instrumentos.length,
        voces: AppState.files.voces.length
    });
    console.log('📊 Estado de carga:', {
        isAuthenticated: AppState.isAuthenticated,
        isLoadingFiles: AppState.isLoadingFiles,
        authEventHandled: window.app?.authEventHandled
    });
    
    // Debug específico de módulos
    if (AppState.driveAPI) {
        console.log('🔐 Auth Module:', AppState.driveAPI.driveAuth?.getConnectionStatus());
        console.log('📁 Files Module Status:', AppState.driveAPI.driveFiles ? 'Loaded' : 'Not loaded');
    }
    
    // Cache info
    console.log('💾 Cache Size:', DriveUtils.cache.size());
    
    // Browser support
    console.log('🌐 Browser Support:', DriveUtils.checkBrowserSupport());
    
    console.groupEnd();
};

// === FUNCIÓN DE TESTING COMPLETO ===
window.testCompleteSystem = async function() {
    console.group('🧪 TESTING SISTEMA COMPLETO');
    
    try {
        // 1. Test de módulos
        console.log('1️⃣ Testing módulos...');
        const modules = ['DriveUtils', 'DriveAuth', 'DriveFiles', 'DriveAPIGIS', 'PDFViewer', 'SearchManager', 'SearchUtils'];
        modules.forEach(module => {
            console.log(`  ${module}: ${typeof window[module] !== 'undefined' ? '✅' : '❌'}`);
        });
        
        // 2. Test de configuración
        console.log('2️⃣ Testing configuración...');
        console.log('  Config válida:', ConfigUtils.areCredentialsValid());
        console.log('  IDs válidos:', ConfigUtils.areFolderIdsValid());
        
        // 3. Test de conexión si está disponible
        if (window.app && window.app.driveAPI) {
            console.log('3️⃣ Testing conexión...');
            const testResult = await window.app.driveAPI.testConnection();
            console.log('  Test resultado:', testResult ? '✅' : '❌');
        }
        
        console.log('🎉 Test completo finalizado');
        
    } catch (error) {
        console.error('❌ Error en testing:', error);
    }
    
    console.groupEnd();
};

// === FUNCIÓN DE DEBUG PARA BÚSQUEDA ===
window.debugSearchState = function() {
    if (window.app && window.app.searchManager) {
        window.app.searchManager.debugSearchState();
    } else {
        console.log('❌ SearchManager no disponible');
    }
};

// === FUNCIÓN DE LIMPIEZA DE CACHE ===
window.clearAppCache = function() {
    console.log('🗑️ Limpiando cache de la aplicación...');
    
    if (DriveUtils && DriveUtils.cache) {
        DriveUtils.cache.clear();
        console.log('✅ Cache de DriveUtils limpiado');
    }
    
    if (window.app && window.app.searchManager && window.app.searchManager.clearSearchHistory) {
        window.app.searchManager.clearSearchHistory();
        console.log('✅ Historial de búsqueda limpiado');
    }
    
    // Limpiar localStorage relacionado con la app (excepto tokens de auth)
    const keysToKeep = ['gdrive_access_token', 'gdrive_token_expiry', 'gdrive_user_info'];
    Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
    
    console.log('✅ Cache de aplicación limpiado completamente');
};

// === FUNCIÓN DE EXPORTAR CONFIGURACIÓN ===
window.exportAppConfig = function() {
    const config = {
        driveConfig: window.DRIVE_CONFIG,
        appConfig: window.APP_CONFIG,
        timestamp: new Date().toISOString(),
        version: '1.0.0-refactored'
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `music-pdf-manager-config-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('📥 Configuración exportada');
};

// === FUNCIÓN DE ESTADÍSTICAS DE LA APLICACIÓN ===
window.getAppStatistics = function() {
    const stats = {
        files: {
            total: AppState.files.instrumentos.length + AppState.files.voces.length,
            instrumentos: AppState.files.instrumentos.length,
            voces: AppState.files.voces.length
        },
        authentication: {
            isAuthenticated: AppState.isAuthenticated,
            hasValidToken: AppState.driveAPI?.isTokenValid() || false,
            lastAuthCheck: AppState.lastAuthCheck
        },
        search: window.app?.searchManager?.getSearchStats() || null,
        browser: DriveUtils?.checkBrowserSupport() || null,
        performance: {
            isLoading: AppState.isLoading,
            isLoadingFiles: AppState.isLoadingFiles,
            lastUpdate: Date.now()
        }
    };
    
    console.group('📊 ESTADÍSTICAS DE LA APLICACIÓN');
    console.table(stats.files);
    console.log('🔐 Autenticación:', stats.authentication);
    console.log('🔍 Búsqueda:', stats.search);
    console.log('🌐 Navegador:', stats.browser);
    console.log('⚡ Rendimiento:', stats.performance);
    console.groupEnd();
    
    return stats;
};

// === FUNCIÓN DE HEALTH CHECK ===
window.healthCheck = async function() {
    console.group('🏥 HEALTH CHECK DEL SISTEMA');
    
    const health = {
        modules: {},
        apis: {},
        storage: {},
        overall: 'unknown'
    };
    
    // Check modules
    const modules = ['ConfigUtils', 'DriveUtils', 'DriveAuth', 'DriveFiles', 'DriveAPIGIS', 'SearchUtils', 'SearchManager', 'PDFViewer'];
    modules.forEach(module => {
        health.modules[module] = typeof window[module] !== 'undefined';
    });
    
    // Check APIs
    health.apis.googleIdentity = typeof google !== 'undefined' && !!google.accounts;
    health.apis.pdfjs = typeof pdfjsLib !== 'undefined';
    
    // Check storage
    try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        health.storage.localStorage = true;
    } catch (e) {
        health.storage.localStorage = false;
    }
    
    // Check Drive connection
    if (AppState.driveAPI) {
        try {
            health.apis.driveConnection = AppState.driveAPI.isSignedIn && AppState.driveAPI.isTokenValid();
        } catch (e) {
            health.apis.driveConnection = false;
        }
    }
    
    // Overall health
    const moduleHealth = Object.values(health.modules).every(Boolean);
    const apiHealth = Object.values(health.apis).every(Boolean);
    const storageHealth = Object.values(health.storage).every(Boolean);
    
    if (moduleHealth && apiHealth && storageHealth) {
        health.overall = 'healthy';
        console.log('✅ Sistema completamente saludable');
    } else if (moduleHealth && storageHealth) {
        health.overall = 'degraded';
        console.log('⚠️ Sistema parcialmente funcional');
    } else {
        health.overall = 'unhealthy';
        console.log('❌ Sistema con problemas críticos');
    }
    
    console.log('Health Status:', health);
    console.groupEnd();
    
    return health;
};

console.log('🚀 Main.js cargado: VERSIÓN REFACTORIZADA - Módulos separados');
console.log('🔧 Funciones disponibles:');
console.log('  - debugAppState() - Debug completo del estado');
console.log('  - debugDriveConnection() - Debug específico de Google Drive'); 
console.log('  - testCompleteSystem() - Test completo del sistema');
console.log('  - debugSearchState() - Debug del sistema de búsqueda');
console.log('  - clearAppCache() - Limpiar cache de la aplicación');
console.log('  - exportAppConfig() - Exportar configuración');
console.log('  - getAppStatistics() - Estadísticas de la aplicación');
console.log('  - healthCheck() - Verificación de salud del sistema');

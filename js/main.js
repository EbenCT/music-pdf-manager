/**
 * MUSIC PDF MANAGER - MAIN APPLICATION SCRIPT
 * Versión corregida con manejo de eventos mejorado
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
    isLoadingFiles: false // ✅ AGREGADO para evitar cargas múltiples
};

// === CONTROLADOR PRINCIPAL DE LA APLICACIÓN ===
class MusicPDFManager {
    constructor() {
        this.config = ConfigUtils.getConfig();
        this.authEventHandled = false; // ✅ AGREGADO para evitar múltiples handlers
        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        try {
            console.log('🎵 Iniciando Music PDF Manager...');
            console.log('☁️ Modo: GOOGLE DRIVE con Google Identity Services');
            
            // Verificar credenciales
            if (!this.config.credentialsValid) {
                throw new Error('Credenciales de Google Drive no válidas');
            }
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Configurar PDF.js
            this.setupPDFJS();
            
            // Inicializar búsqueda
            this.setupSearch();
            
            // Inicializar visualizador de PDF
            this.setupPDFViewer();
            
            // Inicializar Google Drive API con GIS
            await this.initializeDriveAPI();
            
            // Intentar autenticación automática con token guardado
            await this.tryAutoAuthentication();
            
            console.log('✅ Aplicación inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar la aplicación:', error);
            this.showCriticalError(error.message);
        }
    }

    /**
     * Inicializa Google Drive API con GIS
     */
    async initializeDriveAPI() {
        try {
            console.log('🔧 Inicializando Google Drive API con GIS...');
            
            this.driveAPI = new DriveAPIGIS();
            AppState.driveAPI = this.driveAPI;
            
            // Inicializar (esto cargará gapi y GIS)
            await this.driveAPI.init();
            
            console.log('✅ Google Drive API con GIS lista');
            
        } catch (error) {
            console.error('❌ Error inicializando Drive API:', error);
            throw new Error(`Error configurando Google Drive: ${error.message}`);
        }
    }

    /**
     * Intenta autenticación automática con token guardado
     */
    async tryAutoAuthentication() {
        try {
            console.log('🔄 Verificando autenticación automática...');
            
            // Si el DriveAPI ya detectó un token válido durante init
            if (this.driveAPI.isSignedIn && this.driveAPI.isTokenValid()) {
                console.log('✅ Token válido encontrado, cargando archivos automáticamente...');
                AppState.isAuthenticated = true;
                this.driveAPI.updateAuthStatus(true);
                await this.loadFiles();
                return;
            }

            // No hay token válido, mostrar botón de auth
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
     * Configura todos los event listeners - CORREGIDO
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

        // ✅ CRÍTICO: Escuchar evento de autenticación SOLO UNA VEZ
        this.setupAuthEventListener();

        // Verificar periódicamente el estado del token
        this.startTokenValidationTimer();
    }

    /**
     * ✅ NUEVO: Configura el listener de autenticación de forma segura
     */
    setupAuthEventListener() {
        if (this.authEventHandled) {
            console.log('⚠️ Event listener de auth ya configurado, saltando...');
            return;
        }

        console.log('🔧 Configurando event listener de autenticación...');
        
        const authHandler = (event) => {
            console.log('📢 Evento driveAuthSuccess recibido');
            
            // Prevenir múltiples ejecuciones
            if (AppState.isLoadingFiles) {
                console.log('⚠️ Ya se están cargando archivos, ignorando evento...');
                return;
            }

            this.onAuthSuccess();
        };

        window.addEventListener('driveAuthSuccess', authHandler, { once: false });
        this.authEventHandled = true;
        
        console.log('✅ Event listener de autenticación configurado');
    }

    /**
     * Inicia timer para verificar validez del token
     */
    startTokenValidationTimer() {
        // Verificar cada 10 minutos
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
     * Maneja la expiración del token
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
     * Carga archivos desde Google Drive - CORREGIDO
     */
    async loadFiles() {
        // ✅ Prevenir carga múltiple
        if (AppState.isLoadingFiles) {
            console.log('⚠️ Ya se están cargando archivos, ignorando...');
            return;
        }

        AppState.isLoadingFiles = true;
        this.showLoading(true, 'Cargando archivos PDF desde Google Drive...');
        
        try {
            console.log('📁 Cargando archivos desde Google Drive...');

            if (!this.driveAPI) {
                throw new Error('Google Drive API no está inicializada');
            }

            if (!AppState.isAuthenticated || !this.driveAPI.isSignedIn || !this.driveAPI.isTokenValid()) {
                throw new Error('No hay sesión válida de Google Drive');
            }

            console.log('📋 Estado de autenticación verificado - cargando archivos...');
            
            // Cargar ambas carpetas en paralelo
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
            this.showDriveError(error.message);
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
                // Las listas ya se actualizan en updateFileLists()
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
     * Maneja el éxito de autenticación - CORREGIDO
     */
    async onAuthSuccess() {
        console.log('🎉 Procesando éxito de autenticación...');
        
        // ✅ Evitar procesamiento múltiple
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
     * Maneja el cierre de sesión
     */
    onSignOut() {
        console.log('👋 Usuario cerró sesión');
        AppState.isAuthenticated = false;
        AppState.isLoadingFiles = false;
        AppState.files = { instrumentos: [], voces: [] };
        AppState.filteredFiles = { instrumentos: [], voces: [] };
        
        // Limpiar visualizador PDF
        if (this.pdfViewer) {
            this.pdfViewer.clear();
        }
        
        // Actualizar UI
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
            // Limpiar estado previo
            AppState.isAuthenticated = false;
            AppState.isLoadingFiles = false;
            
            // Reinicializar API
            await this.initializeDriveAPI();
            
            // Intentar autenticación
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

        const regex = new RegExp(`(${AppState.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
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
     * Carga un PDF desde Google Drive
     */
    async loadPDF(file) {
        try {
            console.log(`📄 Cargando PDF desde Google Drive: ${file.name}`);
            
            // Actualizar título
            document.getElementById('current-pdf-title').textContent = file.name;

            // Usar el PDFViewer para cargar el archivo
            if (this.pdfViewer) {
                // Pasar tanto la URL como la información del archivo
                await this.pdfViewer.loadPDF(file.downloadUrl, file);
            } else {
                this.showPDFError('Visualizador PDF no disponible');
            }

        } catch (error) {
            console.error('❌ Error cargando PDF:', error);
            this.showPDFError(`Error cargando PDF: ${error.message}`);
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
     * Reintenta cargar archivos
     */
    async retryLoadFiles() {
        console.log('🔄 Reintentando cargar archivos...');
        
        if (!AppState.isAuthenticated) {
            await this.retryConnection();
        } else {
            AppState.isLoadingFiles = false; // Reset flag
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
                            <li>Verificar que Google Identity Services esté habilitado</li>
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
        // Mostrar en las listas
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

        // Log detallado
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
        console.log('🔍 Sistema de búsqueda configurado');
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
    // Verificar que todas las dependencias estén cargadas
    const dependencies = [
        { name: 'ConfigUtils', obj: typeof ConfigUtils !== 'undefined' },
        { name: 'SearchManager', obj: typeof SearchManager !== 'undefined' },
        { name: 'PDFViewer', obj: typeof PDFViewer !== 'undefined' },
        { name: 'DriveAPIGIS', obj: typeof DriveAPIGIS !== 'undefined' },
        { name: 'Google Identity', obj: typeof google !== 'undefined' && google.accounts }
    ];

    console.log('🔍 Verificando dependencias...');
    const missingDeps = dependencies.filter(dep => !dep.obj);
    
    if (missingDeps.length > 0) {
        console.error('❌ Dependencias faltantes:', missingDeps.map(d => d.name));
        
        // Mostrar error en la UI
        document.querySelector('.main-content').innerHTML = `
            <div style="text-align: center; padding: var(--spacing-xxl); color: var(--accent-red);">
                <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">📄</div>
                <h2>Error de Dependencias</h2>
                <p style="margin-bottom: var(--spacing-lg);">Faltan dependencias requeridas: ${missingDeps.map(d => d.name).join(', ')}</p>
                <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); max-width: 600px; margin: 0 auto;">
                    <h3 style="color: var(--text-primary); margin-bottom: var(--spacing-md);">Pasos para solucionar:</h3>
                    <ol style="text-align: left; color: var(--text-secondary);">
                        <li>Verificar que todos los archivos .js estén presentes</li>
                        <li>Comprobar que se carguen en el orden correcto</li>
                        <li>Revisar la configuración del servidor web</li>
                        <li>Verificar la consola para errores específicos</li>
                    </ol>
                </div>
                <button class="btn" onclick="location.reload()" style="margin-top: var(--spacing-lg);">
                    🔄 Reintentar
                </button>
            </div>
        `;
        return;
    }

    console.log('✅ Todas las dependencias verificadas');

    // Inicializar la aplicación
    window.app = new MusicPDFManager();
});

// === EXPORTAR PARA DEBUGGING ===
window.AppState = AppState;

// === DEBUG DE ESTADO GLOBAL ===
window.debugAppState = function() {
    console.log('🔍 DEBUG DE ESTADO GLOBAL:');
    console.log('📊 AppState:', AppState);
    console.log('📊 DriveAPI Status:', AppState.driveAPI?.getConnectionStatus());
    console.log('📊 PDF Viewer Info:', AppState.pdfViewer?.getPDFInfo());
    console.log('📊 Archivos cargados:', {
        instrumentos: AppState.files.instrumentos.length,
        voces: AppState.files.voces.length
    });
    console.log('📊 Estado de carga:', {
        isAuthenticated: AppState.isAuthenticated,
        isLoadingFiles: AppState.isLoadingFiles,
        authEventHandled: window.app?.authEventHandled
    });
};

console.log('🚀 Main.js cargado: VERSIÓN CORREGIDA - Event handling arreglado');
console.log('🔧 Funciones de debug disponibles: debugAppState(), debugDriveConnection()');
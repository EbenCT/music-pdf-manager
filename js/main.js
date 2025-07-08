/**
 * MUSIC PDF MANAGER - MAIN APPLICATION (REFACTORIZADO)
 * Aplicación principal optimizada y limpia
 */

// === ESTADO GLOBAL ===
const AppState = {
    currentModule: 'visualizer',
    currentPDF: null,
    currentSection: 'instrumentos', // Nueva propiedad
    files: { instrumentos: [], voces: [] },
    filteredFiles: { instrumentos: [], voces: [] },
    searchQuery: '',
    isLoading: false,
    pdfViewer: null,
    driveAPI: null,
    isAuthenticated: false,
    isLoadingFiles: false,
    loadingProgress: {
        instrumentos: { current: 0, total: 0, status: 'waiting' },
        voces: { current: 0, total: 0, status: 'waiting' }
    },
    loadedModules: new Set(['visualizer'])
};

// === CONTROLADOR PRINCIPAL ===
class MusicPDFManager {
    constructor() {
        this.config = ConfigUtils.getConfig();
        this.authEventHandled = false;
        this.init();
    }

    async init() {
        try {
            if (!this.config.credentialsValid) {
                throw new Error('Credenciales de Google Drive no válidas');
            }
            
            this.setupEventListeners();
            this.setupPDFJS();
            this.setupSearch();
            this.setupPDFViewer();
            
            await this.initializeDriveAPI();
            await this.tryAutoAuthentication();
            
        } catch (error) {
            this.showCriticalError(error.message);
        }
    }

    async initializeDriveAPI() {
        if (!window.DriveAPIGIS) {
            throw new Error('DriveAPIGIS no está disponible');
        }
        
        this.driveAPI = new DriveAPIGIS();
        AppState.driveAPI = this.driveAPI;
        await this.driveAPI.init();
    }

    async tryAutoAuthentication() {
        if (this.driveAPI.isSignedIn && this.driveAPI.isTokenValid()) {
            AppState.isAuthenticated = true;
            this.driveAPI.updateAuthStatus(true);
            await this.loadAllFiles();
            return;
        }
        
        const recovered = await this.driveAPI.driveAuth.recoverStoredAuth();
        if (recovered) {
            AppState.isAuthenticated = true;
            await this.loadAllFiles();
            return;
        }
        
        this.showAuthRequired();
    }

    showAuthRequired() {
        this.driveAPI.showAuthButton();
        this.updateUI('auth-required');
    }

setupEventListeners() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const module = e.target.dataset.module;
            this.switchModule(module);
        });
    });

    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const fullscreenBtn = document.getElementById('fullscreen');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.zoomOut());
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    this.setupAuthEventListener();
    this.setupSectionSwitch(); // ← NUEVA LÍNEA
    this.startTokenValidationTimer();
}

setupSectionSwitch() {
    // Event listeners para el switch de sección
    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            this.switchSection(section);
        });
    });
}

switchSection(section) {
    if (AppState.currentSection === section) return;
    
    AppState.currentSection = section;
    
    // Actualizar botones del switch
    document.querySelectorAll('.switch-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Actualizar título y contador
    const title = document.getElementById('current-section-title');
    const count = document.getElementById('current-section-count');
    
    if (title) {
        title.textContent = section === 'instrumentos' ? '🎸 Instrumentos' : '🎤 Voces';
    }
    
    // Actualizar lista con animación
    this.updateUnifiedList();
    
    // Actualizar contador
    this.updateCurrentSectionCount();
}

updateUnifiedList() {
    const container = document.getElementById('unified-pdf-list');
    if (!container) return;
    
    // Agregar clase de transición
    container.classList.add('section-transition');
    
    // Obtener archivos de la sección actual
    const currentFiles = AppState.filteredFiles[AppState.currentSection] || [];
    
    this.renderFileList('unified', currentFiles);
    
    // Remover clase de transición después de la animación
    setTimeout(() => {
        container.classList.remove('section-transition');
    }, 300);
}

updateCurrentSectionCount() {
    const countElement = document.getElementById('current-section-count');
    if (!countElement) return;
    
    const section = AppState.currentSection;
    
    if (AppState.loadingProgress[section].status === 'completed') {
        const total = AppState.files[section].length;
        const filtered = AppState.filteredFiles[section].length;
        const text = AppState.searchQuery ? 
            `${filtered} de ${total} archivos` : 
            `${total} archivo${total !== 1 ? 's' : ''}`;
        countElement.textContent = text;
    } else {
        countElement.textContent = AppState.loadingProgress[section].status === 'loading' ? 
            'Cargando...' : 'Conectando...';
    }
}

    async switchModule(moduleName) {
        AppState.currentModule = moduleName;

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleName}"]`).classList.add('active');

        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });

        await this.loadModuleContent(moduleName);
        document.getElementById(`${moduleName}-module`).classList.add('active');
        this.initializeModule(moduleName);
    }

async loadModuleContent(moduleName) {
    if (AppState.loadedModules.has(moduleName)) {
        return;
    }

    try {
        const moduleContainer = document.getElementById(`${moduleName}-module`);
        
        switch (moduleName) {
            case 'combiner':
                const combinerResponse = await fetch('modules/combiner.html');
                if (!combinerResponse.ok) {
                    throw new Error(`Error cargando módulo combiner: ${combinerResponse.statusText}`);
                }
                
                const combinerHtml = await combinerResponse.text();
                moduleContainer.innerHTML = combinerHtml;
                AppState.loadedModules.add('combiner');
                break;
                
            case 'musical':
                // 🎼 CORRECCIÓN COMPLETA: Cargar HTML del módulo musical dinámicamente
                const musicalResponse = await fetch('modules/musical.html');
                if (!musicalResponse.ok) {
                    throw new Error(`Error cargando módulo musical: ${musicalResponse.statusText}`);
                }
                
                const musicalHtml = await musicalResponse.text();
                moduleContainer.innerHTML = musicalHtml;
                AppState.loadedModules.add('musical');
                
                // ⭐ VALIDAR que las funciones estén disponibles antes de activar
                await this.validateAndActivateMusicalModule();
                break;
                
            case 'visualizer':
                // Ya está en el HTML principal
                break;
        }
        
    } catch (error) {
        const moduleContainer = document.getElementById(`${moduleName}-module`);
        moduleContainer.innerHTML = `
            <div class="module-header">
                <h2>❌ Error cargando módulo</h2>
            </div>
            <div class="placeholder">
                <div class="placeholder-icon">⚠️</div>
                <p>Error: ${error.message}</p>
                <button class="btn secondary" onclick="window.app.retryLoadModule('${moduleName}')">
                    🔄 Reintentar
                </button>
            </div>
        `;
        
        console.error(`❌ Error cargando módulo ${moduleName}:`, error);
    }
}

// ⭐ NUEVA FUNCIÓN: Validar y activar módulo musical
async validateAndActivateMusicalModule() {
    const maxRetries = 10;
    let retries = 0;
    
    const waitForMusicalModule = () => {
        return new Promise((resolve, reject) => {
            const checkModule = () => {
                if (window.MusicalModule && 
                    typeof window.MusicalModule.activate === 'function' &&
                    typeof window.MusicalModule.selectFile === 'function' &&
                    typeof window.MusicalModule.refreshFileList === 'function') {
                    
                    console.log('✅ MusicalModule completamente disponible');
                    resolve();
                } else if (retries < maxRetries) {
                    retries++;
                    console.log(`⏳ Esperando MusicalModule... intento ${retries}/${maxRetries}`);
                    setTimeout(checkModule, 100);
                } else {
                    reject(new Error('MusicalModule no pudo inicializarse después de múltiples intentos'));
                }
            };
            checkModule();
        });
    };

    try {
        // Esperar a que el módulo esté completamente disponible
        await waitForMusicalModule();
        
        // Ahora activar el módulo musical
        await window.MusicalModule.activate();
        
        console.log('🎼 Módulo musical activado exitosamente');
        
    } catch (error) {
        console.error('❌ Error validando/activando módulo musical:', error);
        
        // Mostrar mensaje de error en el contenedor
        const moduleContainer = document.getElementById('musical-module');
        if (moduleContainer) {
            moduleContainer.innerHTML = `
                <div class="module-header">
                    <h2>🎼 Módulo Musical Instructivo</h2>
                </div>
                <div class="placeholder">
                    <div class="placeholder-icon">⚠️</div>
                    <h3>Error de Inicialización</h3>
                    <p>${error.message}</p>
                    <button class="btn" onclick="window.app.retryLoadModule('musical')">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    }
}

// ⭐ NUEVA FUNCIÓN: Reintentar carga de módulo
async retryLoadModule(moduleName) {
    console.log(`🔄 Reintentando carga del módulo: ${moduleName}`);
    
    // Limpiar estado del módulo
    AppState.loadedModules.delete(moduleName);
    
    // Limpiar contenido actual
    const moduleContainer = document.getElementById(`${moduleName}-module`);
    if (moduleContainer) {
        moduleContainer.innerHTML = '<div class="loading">Cargando módulo...</div>';
    }
    
    // Recargar módulo
    await this.loadModuleContent(moduleName);
}

    async retryLoadModule(moduleName) {
        AppState.loadedModules.delete(moduleName);
        await this.switchModule(moduleName);
    }

    initializeModule(moduleName) {
        switch (moduleName) {
            case 'combiner':
                if (window.CombinerModule && typeof window.CombinerModule.init === 'function') {
                    window.CombinerModule.init();
                }
                break;
        }
    }

    setupAuthEventListener() {
        if (this.authEventHandled) return;

        const authHandler = (event) => {
            if (AppState.isLoadingFiles) return;
            this.onAuthSuccess();
        };

        window.addEventListener('driveAuthSuccess', authHandler, { once: false });
        this.authEventHandled = true;
    }

    startTokenValidationTimer() {
        setInterval(() => {
            if (this.driveAPI && AppState.isAuthenticated) {
                if (!this.driveAPI.isTokenValid()) {
                    this.handleTokenExpired();
                }
            }
        }, 300000);
    }

    handleTokenExpired() {
        if (this.driveAPI.driveAuth.refreshTokenSilently) {
            this.driveAPI.driveAuth.refreshTokenSilently()
                .then(success => {
                    if (!success) {
                        this.forceReauth();
                    }
                })
                .catch(() => this.forceReauth());
        } else {
            this.forceReauth();
        }
    }

    forceReauth() {
        AppState.isAuthenticated = false;
        AppState.isLoadingFiles = false;
        this.driveAPI.clearStoredToken();
        this.driveAPI.updateAuthStatus(false);
        this.showAuthRequired();
        this.updateUI('token-expired');
    }

    setupPDFJS() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
    }

    async loadAllFiles() {
        if (AppState.isLoadingFiles) return;

        AppState.isLoadingFiles = true;
        this.showLoading(true, 'Cargando archivos PDF...');
        
        try {
            if (!this.driveAPI || !AppState.isAuthenticated || !this.driveAPI.isSignedIn || !this.driveAPI.isTokenValid()) {
                throw new Error('No hay sesión válida de Google Drive');
            }
            
            const loadPromises = [
                this.loadFilesWithProgress('instrumentos'),
                this.loadFilesWithProgress('voces')
            ];

            const [instrumentosFiles, vocesFiles] = await Promise.all(loadPromises);

            AppState.files.instrumentos = instrumentosFiles;
            AppState.files.voces = vocesFiles;

            this.sortFiles();
            this.updateFileLists();
            this.updateFileCounts();
            this.updateUI('files-loaded');

            if (AppState.currentModule === 'combiner' && window.CombinerModule) {
                window.CombinerModule.init();
            }

        } catch (error) {
            this.showDriveError(DriveUtils.getFriendlyErrorMessage(error));
        } finally {
            AppState.isLoadingFiles = false;
            this.showLoading(false);
        }
    }

    async loadFilesWithProgress(folderType) {
        try {
            AppState.loadingProgress[folderType].status = 'loading';
            this.updateLoadingProgress(folderType, 'Cargando...');
            
            const files = await this.driveAPI.getFiles(folderType);
            
            AppState.loadingProgress[folderType].status = 'completed';
            AppState.loadingProgress[folderType].total = files.length;
            AppState.loadingProgress[folderType].current = files.length;
            
            this.updateLoadingProgress(folderType, `${files.length} archivos`);
            
            return files;
            
        } catch (error) {
            AppState.loadingProgress[folderType].status = 'error';
            this.updateLoadingProgress(folderType, `Error: ${error.message}`);
            throw error;
        }
    }

    updateLoadingProgress(folderType, message) {
        const countElement = document.getElementById(`${folderType}-count`);
        if (countElement) {
            countElement.textContent = message;
        }
        
        const listElement = document.getElementById(`${folderType}-list`);
        if (listElement && AppState.loadingProgress[folderType].status === 'loading') {
            listElement.innerHTML = `
                <div class="loading">
                    <div class="spinner" style="width: 30px; height: 30px; margin: 0 auto var(--spacing-md);"></div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    updateUI(state) {
        const currentPDFTitle = document.getElementById('current-pdf-title');
        
        switch (state) {
            case 'auth-required':
                if (currentPDFTitle) {
                    currentPDFTitle.textContent = 'Autenticación requerida';
                }
                this.showPlaceholderInLists('🔐 Autoriza para acceder a tus PDFs');
                break;
                
            case 'token-expired':
                if (currentPDFTitle) {
                    currentPDFTitle.textContent = 'Renovando sesión...';
                }
                this.showPlaceholderInLists('⏰ Renovando acceso...');
                break;
                
            case 'files-loaded':
                if (currentPDFTitle) {
                    const totalFiles = AppState.files.instrumentos.length + AppState.files.voces.length;
                    currentPDFTitle.textContent = `${totalFiles} archivos cargados - Selecciona uno para visualizar`;
                }
                break;
        }
    }

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

    async onAuthSuccess() {
        if (AppState.isLoadingFiles) return;

        AppState.isAuthenticated = true;
        
        try {
            await this.loadAllFiles();
        } catch (error) {
            this.showDriveError(`Error cargando archivos: ${error.message}`);
        }
    }

    onAuthError(errorMessage) {
        this.showAuthError(errorMessage);
        AppState.isAuthenticated = false;
        AppState.isLoadingFiles = false;
    }

    onSignOut() {
        AppState.isAuthenticated = false;
        AppState.isLoadingFiles = false;
        AppState.files = { instrumentos: [], voces: [] };
        AppState.filteredFiles = { instrumentos: [], voces: [] };
        
        if (this.pdfViewer) {
            this.pdfViewer.clear();
        }
        
        this.updateUI('auth-required');
    }

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

    async retryConnection() {
        try {
            AppState.isAuthenticated = false;
            AppState.isLoadingFiles = false;
            
            await this.initializeDriveAPI();
            await this.driveAPI.authenticate();
            
        } catch (error) {
            this.showDriveError(`Error al reconectar: ${error.message}`);
        }
    }

    sortFiles() {
        AppState.files.instrumentos.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        AppState.files.voces.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        
        AppState.filteredFiles.instrumentos = [...AppState.files.instrumentos];
        AppState.filteredFiles.voces = [...AppState.files.voces];
    }

updateFileLists() {
    // Actualizar la lista unificada en lugar de las listas separadas
    this.updateUnifiedList();
}

renderFileList(section, files) {
    let container;
    
    if (section === 'unified') {
        container = document.getElementById('unified-pdf-list');
    } else {
        container = document.getElementById(`${section}-list`);
    }
    
    if (!container) return;

    if (files.length === 0) {
        const sectionName = section === 'unified' ? AppState.currentSection : section;
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📄</div>
                <h3>No hay archivos PDF</h3>
                <p>No se encontraron archivos en la carpeta de ${sectionName}</p>
                <button class="btn secondary" onclick="window.app.retryLoadFiles()">
                    🔄 Recargar archivos
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = files.map(file => `
        <div class="pdf-item" data-file-id="${file.id}" data-section="${section === 'unified' ? AppState.currentSection : section}">
            <span class="pdf-item-icon">📄</span>
            <div class="pdf-item-info">
                <div class="pdf-item-name">${this.highlightSearchTerms(file.name)}</div>
                <div class="pdf-item-meta">
                    ${file.size} • ${DriveUtils.formatDate(file.modifiedTime)}
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.pdf-item').forEach(item => {
        item.addEventListener('click', () => {
            const fileId = item.dataset.fileId;
            const fileSection = item.dataset.section;
            this.selectFile(fileId, fileSection);
        });
    });
}

    highlightSearchTerms(text) {
        if (!AppState.searchQuery || AppState.searchQuery.length < 2) return text;
        return SearchUtils.highlightMatches(text, AppState.searchQuery, 'search-result-match');
    }

    selectFile(fileId, section) {
        const file = AppState.files[section].find(f => f.id === fileId);
        if (!file) return;

        AppState.currentPDF = file;
        this.updateActiveFile(fileId);
        this.loadPDF(file);
    }

    updateActiveFile(fileId) {
        document.querySelectorAll('.pdf-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    async loadPDF(file) {
        try {
            document.getElementById('current-pdf-title').textContent = file.name;

            if (this.pdfViewer) {
                await this.pdfViewer.loadPDF(file.downloadUrl, file);
            } else {
                this.showPDFError('Visualizador PDF no disponible');
            }

        } catch (error) {
            this.showPDFError(DriveUtils.getFriendlyErrorMessage(error));
        }
    }

    showPDFError(message) {
        const viewer = document.getElementById('pdf-viewer');
        viewer.innerHTML = `
            <div class="pdf-error">
                <div class="pdf-error-icon">⚠️</div>
                <h3>Error al cargar PDF</h3>
                <p>${message}</p>
                <div style="margin-top: var(--spacing-lg);">
                    <button class="btn secondary" onclick="window.app.retryLoadFiles()">
                        🔄 Recargar archivos
                    </button>
                </div>
            </div>
        `;
    }

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

    filterFiles() {
        const query = AppState.searchQuery;

        const instrumentosResults = SearchUtils.multiCriteriaSearch(query, AppState.files.instrumentos, ['name']);
        const vocesResults = SearchUtils.multiCriteriaSearch(query, AppState.files.voces, ['name']);

        AppState.filteredFiles.instrumentos = instrumentosResults.map(result => result.item);
        AppState.filteredFiles.voces = vocesResults.map(result => result.item);
    }

updateFileCounts() {
    // Solo actualizar el contador de la sección actual
    this.updateCurrentSectionCount();
}

    async retryLoadFiles() {
        if (!AppState.isAuthenticated) {
            await this.retryConnection();
        } else {
            AppState.isLoadingFiles = false;
            AppState.loadingProgress = {
                instrumentos: { current: 0, total: 0, status: 'waiting' },
                voces: { current: 0, total: 0, status: 'waiting' }
            };
            await this.loadAllFiles();
        }
    }

    zoomIn() {
        if (this.pdfViewer) {
            this.pdfViewer.zoomIn();
        }
    }

    zoomOut() {
        if (this.pdfViewer) {
            this.pdfViewer.zoomOut();
        }
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
    }

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

    showCriticalError(message) {
        const container = document.querySelector('.main-content');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: var(--spacing-xxl); color: var(--accent-red);">
                    <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">⚠️</div>
                    <h2>Error de Configuración</h2>
                    <p style="margin-bottom: var(--spacing-lg);">${message}</p>
                    <button class="btn" onclick="location.reload()" style="margin-top: var(--spacing-lg);">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    }

    showDriveError(message) {
        ['instrumentos', 'voces'].forEach(section => {
            const container = document.getElementById(`${section}-list`);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div style="font-size: 2rem; margin-bottom: var(--spacing-md);">☁️</div>
                        <h3>Error de Google Drive</h3>
                        <p style="color: var(--accent-red); margin-bottom: var(--spacing-md);">${message}</p>
                        <button class="btn secondary" onclick="window.app.retryConnection()">
                            🔄 Reconectar
                        </button>
                    </div>
                `;
            }
        });
    }

    setupSearch() {
        this.searchManager = new SearchManager();
    }

    setupPDFViewer() {
        this.pdfViewer = new PDFViewer('pdf-viewer');
        AppState.pdfViewer = this.pdfViewer;
    }

    async signOut() {
        if (this.driveAPI) {
            await this.driveAPI.signOut();
        }
    }
}

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    const dependencies = [
        { name: 'ConfigUtils', obj: typeof ConfigUtils !== 'undefined' },
        { name: 'DriveUtils', obj: typeof DriveUtils !== 'undefined' },
        { name: 'DriveAPIGIS', obj: typeof DriveAPIGIS !== 'undefined' },
        { name: 'SearchUtils', obj: typeof SearchUtils !== 'undefined' },
        { name: 'SearchManager', obj: typeof SearchManager !== 'undefined' },
        { name: 'PDFViewer', obj: typeof PDFViewer !== 'undefined' },
        { name: 'Google Identity', obj: typeof google !== 'undefined' && google.accounts }
    ];

    const missingDeps = dependencies.filter(dep => !dep.obj);
    
    if (missingDeps.length > 0) {
        document.querySelector('.main-content').innerHTML = `
            <div style="text-align: center; padding: var(--spacing-xxl); color: var(--accent-red);">
                <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">🔧</div>
                <h2>Error de Módulos</h2>
                <p style="margin-bottom: var(--spacing-lg);">Faltan módulos requeridos: ${missingDeps.map(d => d.name).join(', ')}</p>
                <button class="btn" onclick="location.reload()" style="margin-top: var(--spacing-lg);">
                    🔄 Reintentar
                </button>
            </div>
        `;
        return;
    }

    window.app = new MusicPDFManager();
});

// === EXPORTAR ===
window.AppState = AppState;
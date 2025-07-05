/**
 * MUSIC PDF MANAGER - MAIN APPLICATION SCRIPT
 * Versión optimizada sin logs excesivos
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

    async init() {
        try {
            console.log('🎵 Iniciando Music PDF Manager...');
            
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
            console.error('❌ Error al inicializar aplicación:', error);
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
            await this.loadFiles();
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
        this.startTokenValidationTimer();
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
        }, 600000);
    }

    handleTokenExpired() {
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

    switchModule(moduleName) {
        AppState.currentModule = moduleName;

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-module="${moduleName}"]`).classList.add('active');

        document.querySelectorAll('.module').forEach(module => {
            module.classList.remove('active');
        });
        document.getElementById(`${moduleName}-module`).classList.add('active');
    }

    async loadFiles() {
        if (AppState.isLoadingFiles) return;

        AppState.isLoadingFiles = true;
        this.showLoading(true, 'Cargando archivos PDF desde Google Drive...');
        
        try {
            console.log('📁 Cargando archivos desde Google Drive...');

            if (!this.driveAPI || !AppState.isAuthenticated || !this.driveAPI.isSignedIn || !this.driveAPI.isTokenValid()) {
                throw new Error('No hay sesión válida de Google Drive');
            }
            
            const [instrumentosFiles, vocesFiles] = await Promise.all([
                this.driveAPI.getFiles('instrumentos'),
                this.driveAPI.getFiles('voces')
            ]);

            AppState.files.instrumentos = instrumentosFiles;
            AppState.files.voces = vocesFiles;
            AppState.lastAuthCheck = Date.now();

            this.sortFiles();
            this.updateFileLists();
            this.updateFileCounts();
            this.updateUI('files-loaded');

        } catch (error) {
            console.error('❌ Error cargando archivos:', error);
            this.showDriveError(DriveUtils.getFriendlyErrorMessage(error));
        } finally {
            AppState.isLoadingFiles = false;
            this.showLoading(false);
        }
    }

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
            await this.loadFiles();
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
        this.renderFileList('instrumentos', AppState.filteredFiles.instrumentos);
        this.renderFileList('voces', AppState.filteredFiles.voces);
    }

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

        container.querySelectorAll('.pdf-item').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = item.dataset.fileId;
                const section = item.dataset.section;
                this.selectFile(fileId, section);
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
                        🔄 Reintentar
                    </button>
                    <button class="btn secondary" onclick="window.debugDriveConnection()" style="margin-left: var(--spacing-sm);">
                        🔧 Debug Conexión
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

    async retryLoadFiles() {
        if (!AppState.isAuthenticated) {
            await this.retryConnection();
        } else {
            AppState.isLoadingFiles = false;
            await this.loadFiles();
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

// === INICIALIZACIÓN DE LA APLICACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
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

    window.app = new MusicPDFManager();
});

// === EXPORTAR PARA DEBUGGING ===
window.AppState = AppState;

// === FUNCIONES DE DEBUG SIMPLIFICADAS ===
window.debugAppState = function() {
    console.group('🔍 DEBUG DE ESTADO GLOBAL');
    console.log('📊 Archivos:', {
        instrumentos: AppState.files.instrumentos.length,
        voces: AppState.files.voces.length
    });
    console.log('📊 Estado:', {
        isAuthenticated: AppState.isAuthenticated,
        isLoadingFiles: AppState.isLoadingFiles
    });
    if (AppState.driveAPI) {
        console.log('🔐 Auth:', AppState.driveAPI.driveAuth?.getConnectionStatus());
    }
    console.groupEnd();
};

window.debugDriveConnection = function() {
    const driveAPI = window.AppState?.driveAPI;
    if (!driveAPI) {
        console.error('❌ DriveAPI no disponible');
        return;
    }
    
    driveAPI.debugInfo();
    
    if (driveAPI.isSignedIn) {
        const files = window.AppState?.files;
        if (files && files.instrumentos && files.instrumentos.length > 0) {
            const testFile = files.instrumentos[0];
            driveAPI.downloadFileBlob(testFile.id)
                .then(blob => {
                    console.log('✅ Test descarga exitoso:', blob.size, 'bytes');
                })
                .catch(error => {
                    console.error('❌ Test descarga falló:', error);
                });
        }
    }
};

window.clearAppCache = function() {
    if (DriveUtils && DriveUtils.cache) {
        DriveUtils.cache.clear();
    }
    
    if (window.app && window.app.searchManager && window.app.searchManager.clearSearchHistory) {
        window.app.searchManager.clearSearchHistory();
    }
    
    const keysToKeep = ['gdrive_access_token', 'gdrive_token_expiry', 'gdrive_user_info'];
    Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
    
    console.log('✅ Cache limpiado');
};

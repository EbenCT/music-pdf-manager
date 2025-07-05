/**
 * MUSIC PDF MANAGER - MAIN APPLICATION OPTIMIZADO
 * SIN LÍMITES + AUTENTICACIÓN PERMANENTE
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
    isLoadingFiles: false,
    // ← NUEVO: Estado de carga
    loadingProgress: {
        instrumentos: { current: 0, total: 0, status: 'waiting' },
        voces: { current: 0, total: 0, status: 'waiting' }
    }
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
            console.log('🎵 Iniciando Music PDF Manager OPTIMIZADO...');
            
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

    // ← MODIFICADO: Auto-auth más agresiva
    async tryAutoAuthentication() {
        if (this.driveAPI.isSignedIn && this.driveAPI.isTokenValid()) {
            AppState.isAuthenticated = true;
            this.driveAPI.updateAuthStatus(true);
            await this.loadAllFiles();
            return;
        }
        
        // ← NUEVO: Intentar recuperar auth almacenada
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
        }, 300000); // ← REDUCIDO: Cada 5 minutos
    }

    handleTokenExpired() {
        console.log('⏰ Token expirado, intentando renovación automática...');
        
        // ← NUEVO: Intentar renovación automática antes de desconectar
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

    // ← MODIFICADO: Cargar TODOS los archivos
    async loadAllFiles() {
        if (AppState.isLoadingFiles) return;

        AppState.isLoadingFiles = true;
        this.showLoading(true, 'Cargando TODOS los archivos PDF...');
        
        try {
            console.log('📁 Cargando TODOS los archivos desde Google Drive...');

            if (!this.driveAPI || !AppState.isAuthenticated || !this.driveAPI.isSignedIn || !this.driveAPI.isTokenValid()) {
                throw new Error('No hay sesión válida de Google Drive');
            }
            
            // ← NUEVO: Carga paralela con progreso
            const loadPromises = [
                this.loadFilesWithProgress('instrumentos'),
                this.loadFilesWithProgress('voces')
            ];

            const [instrumentosFiles, vocesFiles] = await Promise.all(loadPromises);

            AppState.files.instrumentos = instrumentosFiles;
            AppState.files.voces = vocesFiles;
            AppState.lastAuthCheck = Date.now();

            this.sortFiles();
            this.updateFileLists();
            this.updateFileCounts();
            this.updateUI('files-loaded');

            // ← NUEVO: Log de estadísticas
            console.log(`✅ CARGA COMPLETA: ${instrumentosFiles.length} instrumentos + ${vocesFiles.length} voces = ${instrumentosFiles.length + vocesFiles.length} archivos totales`);

        } catch (error) {
            console.error('❌ Error cargando archivos:', error);
            this.showDriveError(DriveUtils.getFriendlyErrorMessage(error));
        } finally {
            AppState.isLoadingFiles = false;
            this.showLoading(false);
        }
    }

    // ← NUEVO: Carga con progreso visual
    async loadFilesWithProgress(folderType) {
        try {
            AppState.loadingProgress[folderType].status = 'loading';
            
            this.updateLoadingProgress(folderType, 'Iniciando carga...');
            
            const files = await this.driveAPI.getFiles(folderType);
            
            AppState.loadingProgress[folderType].status = 'completed';
            AppState.loadingProgress[folderType].total = files.length;
            AppState.loadingProgress[folderType].current = files.length;
            
            this.updateLoadingProgress(folderType, `✅ ${files.length} archivos cargados`);
            
            return files;
            
        } catch (error) {
            AppState.loadingProgress[folderType].status = 'error';
            this.updateLoadingProgress(folderType, `❌ Error: ${error.message}`);
            throw error;
        }
    }

    // ← NUEVO: Actualizar progreso visual
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
                    currentPDFTitle.textContent = 'Autenticación permanente requerida';
                }
                this.showPlaceholderInLists('🔐 Autoriza una vez para acceso permanente a TODOS tus PDFs');
                break;
                
            case 'token-expired':
                if (currentPDFTitle) {
                    currentPDFTitle.textContent = 'Renovando sesión automáticamente...';
                }
                this.showPlaceholderInLists('⏰ Renovando acceso automático...');
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
                        🔄 Recargar todos los archivos
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
                        🔄 Recargar archivos
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

        if (instCount && AppState.loadingProgress.instrumentos.status === 'completed') {
            const total = AppState.files.instrumentos.length;
            const filtered = AppState.filteredFiles.instrumentos.length;
            const text = AppState.searchQuery ? 
                `${filtered} de ${total} archivos` : 
                `${total} archivo${total !== 1 ? 's' : ''}`;
            instCount.textContent = text;
        }

        if (vocCount && AppState.loadingProgress.voces.status === 'completed') {
            const total = AppState.files.voces.length;
            const filtered = AppState.filteredFiles.voces.length;
            const text = AppState.searchQuery ? 
                `${filtered} de ${total} archivos` : 
                `${total} archivo${total !== 1 ? 's' : ''}`;
            vocCount.textContent = text;
        }
    }

    // ← MODIFICADO: Reintentar carga completa
    async retryLoadFiles() {
        if (!AppState.isAuthenticated) {
            await this.retryConnection();
        } else {
            AppState.isLoadingFiles = false;
            // ← LIMPIAR progreso anterior
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
                                🔄 Reconectar
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

    // ← NUEVO: Obtener estadísticas de carga
    getLoadingStats() {
        const totalFiles = AppState.files.instrumentos.length + AppState.files.voces.length;
        const loadedSections = Object.values(AppState.loadingProgress)
            .filter(p => p.status === 'completed').length;
        
        return {
            totalFiles,
            sections: {
                instrumentos: AppState.files.instrumentos.length,
                voces: AppState.files.voces.length
            },
            loadingProgress: AppState.loadingProgress,
            completedSections: loadedSections,
            isFullyLoaded: loadedSections === 2
        };
    }

    // ← NUEVO: Forzar recarga completa
    async forceFullReload() {
        console.log('🔄 Forzando recarga completa...');
        
        // Limpiar cache si existe
        if (window.clearAppCache) {
            window.clearAppCache();
        }
        
        // Reset estado
        AppState.files = { instrumentos: [], voces: [] };
        AppState.filteredFiles = { instrumentos: [], voces: [] };
        AppState.isLoadingFiles = false;
        AppState.loadingProgress = {
            instrumentos: { current: 0, total: 0, status: 'waiting' },
            voces: { current: 0, total: 0, status: 'waiting' }
        };
        
        // Recargar
        await this.loadAllFiles();
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

    console.log('🚀 Iniciando aplicación OPTIMIZADA...');
    window.app = new MusicPDFManager();
});

// === EXPORTAR PARA DEBUGGING ===
window.AppState = AppState;

// === FUNCIONES DE DEBUG OPTIMIZADAS ===
window.debugAppState = function() {
    console.group('🔍 DEBUG DE ESTADO GLOBAL OPTIMIZADO');
    
    const stats = window.app ? window.app.getLoadingStats() : null;
    
    console.log('📊 Archivos cargados:', stats || {
        instrumentos: AppState.files.instrumentos.length,
        voces: AppState.files.voces.length,
        total: AppState.files.instrumentos.length + AppState.files.voces.length
    });
    
    console.log('📊 Estado de carga:', AppState.loadingProgress);
    
    console.log('📊 Auth:', {
        isAuthenticated: AppState.isAuthenticated,
        isLoadingFiles: AppState.isLoadingFiles,
        tokenValid: AppState.driveAPI ? AppState.driveAPI.isTokenValid() : false
    });
    
    if (AppState.driveAPI) {
        console.log('🔐 Estado de conexión:', AppState.driveAPI.driveAuth?.getConnectionStatus());
    }
    
    console.groupEnd();
};

window.forceFullReload = function() {
    if (window.app && window.app.forceFullReload) {
        window.app.forceFullReload();
    } else {
        console.log('🔄 Función no disponible, recargando página...');
        location.reload();
    }
};

window.showLoadingStats = function() {
    if (window.app) {
        const stats = window.app.getLoadingStats();
        console.table(stats);
        console.log('📊 Estadísticas detalladas:', stats);
    } else {
        console.error('❌ App no disponible');
    }
};

window.clearAppCache = function() {
    if (DriveUtils && DriveUtils.cache) {
        DriveUtils.cache.clear();
    }
    
    if (window.app && window.app.searchManager && window.app.searchManager.clearSearchHistory) {
        window.app.searchManager.clearSearchHistory();
    }
    
    const keysToKeep = ['gdrive_access_token', 'gdrive_token_expiry', 'gdrive_user_info', 'gdrive_refresh_token', 'gdrive_last_auth'];
    Object.keys(localStorage).forEach(key => {
        if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
    
    console.log('✅ Cache limpiado (tokens de auth conservados)');
};

console.log('🎵 Main App cargada: MODO OPTIMIZADO - SIN LÍMITES + AUTH PERMANENTE');
/**
 * MUSIC PDF MANAGER - MAIN APPLICATION SCRIPT (Google Identity Services)
 * Script principal actualizado para usar Google Identity Services (GIS)
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
    isAuthenticated: false
};

// === CONTROLADOR PRINCIPAL DE LA APLICACIÓN ===
class MusicPDFManager {
    constructor() {
        this.config = ConfigUtils.getConfig();
        this.init();
    }

    /**
     * Intenta autenticación automática sin bloquear la UI
     */
    async tryAutoAuthentication() {
        try {
            console.log('🔄 Intentando autenticación automática...');
            await this.driveAPI.authenticate();
            // Si llega aquí, la autenticación fue exitosa automáticamente
        } catch (error) {
            console.log('⚠️ Autenticación automática no disponible, esperando interacción del usuario');
            // No hacer nada, el usuario tendrá que hacer click en el botón de auth
        }
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
            
            // NO cargar archivos automáticamente - esperar autenticación del usuario
            console.log('✅ Aplicación lista. Esperando autenticación del usuario...');
            
            // Intentar autenticación automática (no bloqueante)
            this.tryAutoAuthentication();
            
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
            
            console.log('✅ Google Drive API con GIS lista para autenticación');
            
        } catch (error) {
            console.error('❌ Error inicializando Drive API:', error);
            throw new Error(`Error configurando Google Drive: ${error.message}`);
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

        // Escuchar eventos de autenticación
        window.addEventListener('driveAuthSuccess', () => {
            this.onAuthSuccess();
        });
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
     * Carga archivos desde Google Drive con manejo de autenticación
     */
    async loadFiles() {
        this.showLoading(true, 'Inicializando conexión con Google Drive...');
        
        try {
            console.log('📁 Cargando archivos desde Google Drive...');

            if (!this.driveAPI) {
                throw new Error('Google Drive API no está inicializada');
            }

            // SOLO cargar archivos si ya está autenticado
            if (!AppState.isAuthenticated || !this.driveAPI.isSignedIn) {
                console.log('⚠️ Usuario no autenticado, esperando autenticación...');
                this.showLoading(false);
                
                // Intentar autenticación
                try {
                    await this.driveAPI.authenticate();
                    // Si llega aquí, la autenticación fue exitosa
                    // onAuthSuccess() se llamará automáticamente y volverá a llamar loadFiles()
                    return;
                } catch (authError) {
                    console.log('⚠️ Autenticación manual requerida:', authError.message);
                    this.showLoading(false);
                    return;
                }
            }

            // Cargar ambas carpetas en paralelo SOLO si está autenticado
            this.showLoading(true, 'Cargando archivos PDF...');
            
            console.log('📋 Estado de autenticación:');
            console.log('  - isSignedIn:', this.driveAPI.isSignedIn);
            console.log('  - hasAccessToken:', !!this.driveAPI.accessToken);
            console.log('  - appAuthenticated:', AppState.isAuthenticated);
            
            const [instrumentosFiles, vocesFiles] = await Promise.all([
                this.driveAPI.getFiles('instrumentos'),
                this.driveAPI.getFiles('voces')
            ]);

            // Guardar archivos
            AppState.files.instrumentos = instrumentosFiles;
            AppState.files.voces = vocesFiles;
            AppState.isAuthenticated = true;

            // Ordenar archivos alfabéticamente
            this.sortFiles();

            // Actualizar UI
            this.updateFileLists();
            this.updateFileCounts();

            console.log(`📊 Archivos cargados desde Drive: ${AppState.files.instrumentos.length} instrumentos, ${AppState.files.voces.length} voces`);

        } catch (error) {
            console.error('❌ Error cargando archivos:', error);
            this.showDriveError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Maneja el éxito de autenticación
     */
    onAuthSuccess() {
        console.log('🎉 Autenticación exitosa, cargando archivos...');
        AppState.isAuthenticated = true;
        this.loadFiles();
    }

    /**
     * Maneja errores de autenticación
     */
    onAuthError(errorMessage) {
        console.error('❌ Error de autenticación:', errorMessage);
        this.showAuthError(errorMessage);
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
                        <h3>Autenticación Requerida</h3>
                        <p style="color: var(--accent-red); margin-bottom: var(--spacing-md);">${message}</p>
                        <button class="btn" onclick="window.app.retryConnection()">
                            🔐 Intentar Autenticación
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
            // Reinicializar API
            await this.initializeDriveAPI();
            
            // Cargar archivos
            await this.loadFiles();
            
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
                await this.pdfViewer.loadPDF(file.downloadUrl);
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
                <button class="btn secondary" onclick="window.app.retryLoadFiles()">
                    🔄 Reintentar
                </button>
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
        await this.loadFiles();
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
                        <button class="btn secondary" onclick="window.app.retryConnection()">
                            🔄 Intentar de nuevo
                        </button>
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

    if (typeof DriveAPIGIS === 'undefined') {
        console.error('❌ DriveAPIGIS no está disponible - verificar que js/drive-api.js esté cargado');
        console.error('📋 Archivos requeridos:');
        console.error('  - config/drive-config.js:', typeof ConfigUtils !== 'undefined' ? '✅' : '❌');
        console.error('  - js/drive-api.js:', typeof DriveAPIGIS !== 'undefined' ? '✅' : '❌');
        console.error('  - js/pdf-viewer.js:', typeof PDFViewer !== 'undefined' ? '✅' : '❌');
        console.error('  - js/search.js:', typeof SearchManager !== 'undefined' ? '✅' : '❌');
        
        // Mostrar error en la UI
        document.querySelector('.main-content').innerHTML = `
            <div style="text-align: center; padding: var(--spacing-xxl); color: var(--accent-red);">
                <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">📄</div>
                <h2>Error de Archivos JavaScript</h2>
                <p style="margin-bottom: var(--spacing-lg);">El archivo js/drive-api.js no está disponible</p>
                <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); max-width: 600px; margin: 0 auto;">
                    <h3 style="color: var(--text-primary); margin-bottom: var(--spacing-md);">Pasos para solucionar:</h3>
                    <ol style="text-align: left; color: var(--text-secondary);">
                        <li>Crear el archivo js/drive-api.js en tu proyecto</li>
                        <li>Verificar que el archivo se subió correctamente al servidor</li>
                        <li>Comprobar configuración MIME types en render.yaml</li>
                        <li>Recargar la página</li>
                    </ol>
                </div>
                <button class="btn" onclick="location.reload()" style="margin-top: var(--spacing-lg);">
                    🔄 Reintentar
                </button>
            </div>
        `;
        return;
    }

    // Inicializar la aplicación
    window.app = new MusicPDFManager();
});

// === EXPORTAR PARA DEBUGGING ===
window.AppState = AppState;

console.log('🚀 Main.js cargado: GOOGLE DRIVE con Google Identity Services');
// ===== SCRIPT DE DEBUG TEMPORAL =====
// Agregar al final de main.js para diagnosticar problemas

// Debug detallado después de autenticación
window.addEventListener('driveAuthSuccess', function() {
    console.log('🎉 Evento driveAuthSuccess recibido');
    
    setTimeout(() => {
        console.log('🔍 DEBUG POST-AUTENTICACIÓN:');
        console.log('📊 Estado AppState:', {
            isAuthenticated: window.AppState?.isAuthenticated,
            currentModule: window.AppState?.currentModule,
            files: {
                instrumentos: window.AppState?.files?.instrumentos?.length || 0,
                voces: window.AppState?.files?.voces?.length || 0
            }
        });
        
        console.log('📊 Estado DriveAPI:', {
            isInitialized: window.AppState?.driveAPI?.isInitialized,
            isSignedIn: window.AppState?.driveAPI?.isSignedIn,
            hasAccessToken: !!window.AppState?.driveAPI?.accessToken
        });
        
        console.log('📊 Configuración:', {
            folderIds: window.DRIVE_CONFIG?.FOLDERS,
            folderIdsValid: window.ConfigUtils?.areFolderIdsValid()
        });
        
        // Verificar elementos de UI
        const instrumentosCount = document.getElementById('instrumentos-count')?.textContent;
        const vocesCount = document.getElementById('voces-count')?.textContent;
        
        console.log('📊 Estado UI:', {
            instrumentosCount,
            vocesCount,
            currentPDFTitle: document.getElementById('current-pdf-title')?.textContent
        });
        
        // Test manual de carga de archivos
        if (window.app && window.app.driveAPI && window.app.driveAPI.isSignedIn) {
            console.log('🧪 Probando carga manual de archivos...');
            
            window.app.driveAPI.getFiles('instrumentos')
                .then(files => {
                    console.log('✅ Test instrumentos exitoso:', files.length, 'archivos');
                    console.log('📋 Primeros archivos:', files.slice(0, 3));
                })
                .catch(error => {
                    console.error('❌ Test instrumentos falló:', error);
                });
                
            window.app.driveAPI.getFiles('voces')
                .then(files => {
                    console.log('✅ Test voces exitoso:', files.length, 'archivos');
                    console.log('📋 Primeros archivos:', files.slice(0, 3));
                })
                .catch(error => {
                    console.error('❌ Test voces falló:', error);
                });
        }
    }, 2000);
});

// Debug de folders IDs
function debugFolderIds() {
    console.log('🔍 DEBUG IDS DE CARPETAS:');
    
    const config = window.DRIVE_CONFIG;
    if (!config) {
        console.error('❌ DRIVE_CONFIG no disponible');
        return;
    }
    
    console.log('📁 Carpetas configuradas:');
    console.log('  Instrumentos:', config.FOLDERS?.INSTRUMENTOS);
    console.log('  Voces:', config.FOLDERS?.VOCES);
    
    // Verificar que son IDs válidos
    const instrumentosId = config.FOLDERS?.INSTRUMENTOS;
    const vocesId = config.FOLDERS?.VOCES;
    
    const isValidId = (id) => {
        return id && 
               typeof id === 'string' && 
               id.length >= 25 && 
               !id.includes('http') && 
               !id.includes('drive.google.com');
    };
    
    console.log('✅ ID Instrumentos válido:', isValidId(instrumentosId));
    console.log('✅ ID Voces válido:', isValidId(vocesId));
    
    if (!isValidId(instrumentosId) || !isValidId(vocesId)) {
        console.error('❌ PROBLEMA: Los IDs de carpetas no son válidos');
        console.error('💡 Los IDs deben ser solo el código, no la URL completa');
        console.error('✅ Correcto: "1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV"');
        console.error('❌ Incorrecto: "https://drive.google.com/drive/folders/1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV"');
    }
}

// Test de acceso a Google Drive API
async function testDriveAPIAccess() {
    console.log('🧪 TEST DE ACCESO A GOOGLE DRIVE API...');
    
    const driveAPI = window.AppState?.driveAPI;
    if (!driveAPI) {
        console.error('❌ DriveAPI no disponible');
        return;
    }
    
    if (!driveAPI.isSignedIn) {
        console.error('❌ Usuario no autenticado');
        return;
    }
    
    try {
        // Test directo de Google Drive API
        const testResponse = await driveAPI.gapi.client.drive.files.list({
            q: 'parents in "1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV"',
            fields: 'files(id,name,mimeType)',
            pageSize: 5
        });
        
        console.log('✅ Test API exitoso:', testResponse.result);
        
    } catch (error) {
        console.error('❌ Test API falló:', error);
    }
}

// Agregar funciones al window para debugging manual
window.debugFolderIds = debugFolderIds;
window.testDriveAPIAccess = testDriveAPIAccess;

// Ejecutar debug de folder IDs inmediatamente
setTimeout(debugFolderIds, 1000);

console.log('🔧 Debug scripts cargados. Funciones disponibles:');
console.log('  - debugFolderIds()');
console.log('  - testDriveAPIAccess()');
console.log('  - showOAuthDebugInfo()');
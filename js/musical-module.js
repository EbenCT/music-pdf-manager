/**
 * MUSIC PDF MANAGER - MUSICAL MODULE
 * Controlador principal del módulo musical instructivo
 */

class MusicalModule {
    constructor() {
        this.processor = null;
        this.isInitialized = false;
        this.isActive = false;
        
        // Referencias a elementos DOM principales
        this.elements = {
            fileList: null,
            content: null,
            searchInput: null,
            transpositionPanel: null,
            configModal: null
        };
        
        this.config = {
            autoTranspose: false,
            preserveOriginal: true,
            showConfidence: false,
            enableAnimations: true
        };
    }

    /**
     * Inicializa el módulo musical
     */
    async init() {
        try {
            console.log('🎼 Inicializando módulo musical...');
            
            if (this.isInitialized) {
                console.log('⚠️ Módulo musical ya está inicializado');
                return true;
            }

            // Verificar dependencias
            await this.checkDependencies();
            
            // Crear procesador principal
            this.processor = new MusicalProcessor();
            
            // Inicializar procesador
            await this.processor.init();
            
            // Configurar elementos DOM
            this.setupDOMElements();
            
            // Configurar event listeners globales
            this.setupGlobalEventListeners();
            
            // Cargar configuración guardada
            this.loadSavedConfig();
            
            this.isInitialized = true;
            console.log('✅ Módulo musical inicializado correctamente');
            
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando módulo musical:', error);
            this.showInitializationError(error.message);
            return false;
        }
    }

    /**
     * Verifica dependencias necesarias
     */
    async checkDependencies() {
        const requiredClasses = [
            'MusicalProcessor',
            'ChordDetector', 
            'ChordTransposer',
            'PDFTextExtractor',
            'MusicalRenderer'
        ];
        
        const missing = requiredClasses.filter(className => !window[className]);
        
        if (missing.length > 0) {
            throw new Error(`Dependencias faltantes: ${missing.join(', ')}`);
        }
        
        // Verificar PDF.js
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js no está disponible');
        }
        
        console.log('✅ Todas las dependencias están disponibles');
    }

    /**
     * Configura elementos DOM
     */
    setupDOMElements() {
        this.elements = {
            fileList: document.getElementById('musical-file-list'),
            content: document.getElementById('musical-content'),
            searchInput: document.getElementById('musical-search-input'),
            transpositionPanel: document.getElementById('transposition-panel'),
            configModal: document.getElementById('musical-config-modal'),
            statusPanel: document.getElementById('musical-status')
        };
        
        // Verificar elementos críticos
        const criticalElements = ['fileList', 'content'];
        const missingElements = criticalElements.filter(key => !this.elements[key]);
        
        if (missingElements.length > 0) {
            console.warn('⚠️ Elementos DOM faltantes:', missingElements);
        }
    }

    /**
     * Configura event listeners globales
     */
    setupGlobalEventListeners() {
        // Listener para cambios de módulo
        document.addEventListener('moduleChanged', (event) => {
            if (event.detail.module === 'musical') {
                this.activate();
            } else {
                this.deactivate();
            }
        });
        
        // Listener para cambios en archivos
        document.addEventListener('filesUpdated', () => {
            if (this.isActive && this.processor) {
                this.processor.loadInstrumentFiles();
            }
        });
        
        // Atajos de teclado específicos del módulo
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            this.handleKeyboardShortcuts(e);
        });
        
        // Listener para resize de ventana
        window.addEventListener('resize', DriveUtils.debounce(() => {
            if (this.isActive) {
                this.adjustLayout();
            }
        }, 250));
    }

    /**
     * Activa el módulo musical
     */
    async activate() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        this.isActive = true;
        console.log('🎼 Módulo musical activado');
        
        // Refrescar lista de archivos
        if (this.processor) {
            this.processor.loadInstrumentFiles();
        }
        
        // Ajustar layout inicial
        this.adjustLayout();
        
        // Enfocar input de búsqueda si existe
        if (this.elements.searchInput) {
            setTimeout(() => {
                this.elements.searchInput.focus();
            }, 100);
        }
    }

    /**
     * Desactiva el módulo musical
     */
    deactivate() {
        this.isActive = false;
        console.log('🎼 Módulo musical desactivado');
        
        // Limpiar estado temporal
        this.clearTemporaryState();
        
        // Cerrar modales abiertos
        this.closeAllModals();
    }

    /**
     * Maneja atajos de teclado
     */
    handleKeyboardShortcuts(e) {
        // Solo procesar si no estamos en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case 'ArrowUp':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.transpose(1);
                }
                break;
                
            case 'ArrowDown':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.transpose(-1);
                }
                break;
                
            case 'ArrowLeft':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.transpose(-0.5);
                }
                break;
                
            case 'ArrowRight':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.transpose(0.5);
                }
                break;
                
            case 'r':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.resetTransposition();
                }
                break;
                
            case 'c':
                if (e.ctrlKey && e.shiftKey) {
                    e.preventDefault();
                    this.openConfig();
                }
                break;
                
            case 'f':
                if (e.ctrlKey) {
                    e.preventDefault();
                    if (this.elements.searchInput) {
                        this.elements.searchInput.focus();
                        this.elements.searchInput.select();
                    }
                }
                break;
        }
    }

    /**
     * Ajusta layout responsive
     */
    adjustLayout() {
        const isMobile = window.innerWidth <= 768;
        const musicalGrid = document.querySelector('.musical-grid');
        
        if (musicalGrid) {
            if (isMobile) {
                musicalGrid.style.gridTemplateColumns = '1fr';
            } else {
                musicalGrid.style.gridTemplateColumns = '350px 1fr';
            }
        }
    }

    /**
     * Limpia estado temporal
     */
    clearTemporaryState() {
        // Limpiar highlights
        document.querySelectorAll('.chord.highlighted, .chord.search-highlighted').forEach(el => {
            el.classList.remove('highlighted', 'search-highlighted');
        });
        
        // Limpiar modales
        this.closeAllModals();
    }

    /**
     * Cierra todos los modales
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.loading-overlay.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
    }

    // === MÉTODOS DELEGADOS AL PROCESADOR ===

    /**
     * Selecciona un archivo
     */
    async selectFile(fileId) {
        if (!this.processor) {
            console.error('❌ Procesador no inicializado');
            return;
        }
        
        try {
            await this.processor.selectFile(fileId);
        } catch (error) {
            console.error('❌ Error seleccionando archivo:', error);
            this.showError('Error al cargar el archivo: ' + error.message);
        }
    }

    /**
     * Transpone acordes
     */
    async transpose(semitones) {
        if (!this.processor) {
            console.error('❌ Procesador no inicializado');
            return;
        }
        
        try {
            await this.processor.transpose(semitones);
            this.saveTranspositionState();
        } catch (error) {
            console.error('❌ Error en transposición:', error);
            this.showError('Error en la transposición: ' + error.message);
        }
    }

    /**
     * Resetea transposición
     */
    async resetTransposition() {
        if (!this.processor) {
            console.error('❌ Procesador no inicializado');
            return;
        }
        
        try {
            await this.processor.resetTransposition();
            this.clearTranspositionState();
        } catch (error) {
            console.error('❌ Error reseteando transposición:', error);
            this.showError('Error al resetear transposición: ' + error.message);
        }
    }

    /**
     * Refresca lista de archivos
     */
    refreshFileList() {
        if (!this.processor) {
            console.error('❌ Procesador no inicializado');
            return;
        }
        
        this.processor.refreshFileList();
    }

    /**
     * Abre configuración
     */
    openConfig() {
        if (this.elements.configModal) {
            this.elements.configModal.classList.add('show');
        }
    }

    /**
     * Cierra configuración
     */
    closeConfig() {
        if (this.elements.configModal) {
            this.elements.configModal.classList.remove('show');
        }
    }

    /**
     * Aplica configuración
     */
    applyConfig() {
        if (!this.processor) return;
        
        this.processor.applyConfig();
        this.saveConfig();
    }

    /**
     * Resetea configuración
     */
    resetConfig() {
        if (!this.processor) return;
        
        this.processor.resetConfig();
        this.clearSavedConfig();
    }

    /**
     * Maneja click en acorde
     */
    handleChordClick(chordId) {
        if (!this.processor || !this.processor.musicalRenderer) return;
        
        this.processor.musicalRenderer.handleChordClick(chordId);
    }

    // === PERSISTENCIA DE ESTADO ===

    /**
     * Guarda configuración
     */
    saveConfig() {
        try {
            const config = {
                ...this.config,
                processorConfig: this.processor ? this.processor.state.config : {}
            };
            
            localStorage.setItem('musical-module-config', JSON.stringify(config));
            console.log('💾 Configuración guardada');
        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
        }
    }

    /**
     * Carga configuración guardada
     */
    loadSavedConfig() {
        try {
            const saved = localStorage.getItem('musical-module-config');
            if (saved) {
                const config = JSON.parse(saved);
                this.config = { ...this.config, ...config };
                console.log('📁 Configuración cargada');
            }
        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
        }
    }

    /**
     * Limpia configuración guardada
     */
    clearSavedConfig() {
        try {
            localStorage.removeItem('musical-module-config');
            console.log('🗑️ Configuración limpiada');
        } catch (error) {
            console.error('❌ Error limpiando configuración:', error);
        }
    }

    /**
     * Guarda estado de transposición
     */
    saveTranspositionState() {
        if (!this.processor || !this.processor.state.currentFile) return;
        
        try {
            const state = {
                fileId: this.processor.state.currentFile.id,
                transposition: this.processor.state.currentTransposition,
                key: this.processor.state.transposedKey,
                timestamp: Date.now()
            };
            
            localStorage.setItem('musical-last-transposition', JSON.stringify(state));
        } catch (error) {
            console.error('❌ Error guardando estado de transposición:', error);
        }
    }

    /**
     * Limpia estado de transposición
     */
    clearTranspositionState() {
        try {
            localStorage.removeItem('musical-last-transposition');
        } catch (error) {
            console.error('❌ Error limpiando estado de transposición:', error);
        }
    }

    // === MANEJO DE ERRORES Y NOTIFICACIONES ===

    /**
     * Muestra error de inicialización
     */
    showInitializationError(message) {
        const container = document.getElementById('musical-module');
        if (container) {
            container.innerHTML = `
                <div class="module-header">
                    <h2>🎼 Módulo Musical Instructivo</h2>
                </div>
                <div class="placeholder">
                    <div class="placeholder-icon">⚠️</div>
                    <h3>Error de Inicialización</h3>
                    <p>${message}</p>
                    <button class="btn" onclick="MusicalModule.retryInit()">
                        🔄 Reintentar
                    </button>
                </div>
            `;
        }
    }

    /**
     * Reintenta inicialización
     */
    async retryInit() {
        this.isInitialized = false;
        await this.init();
    }

    /**
     * Muestra error general
     */
    showError(message) {
        console.error('❌', message);
        if (window.UIHandlers && window.UIHandlers.showNotification) {
            window.UIHandlers.showNotification(message, 'error', 5000);
        } else {
            alert('Error: ' + message);
        }
    }

    /**
     * Muestra éxito
     */
    showSuccess(message) {
        console.log('✅', message);
        if (window.UIHandlers && window.UIHandlers.showNotification) {
            window.UIHandlers.showNotification(message, 'success', 3000);
        }
    }

    // === MÉTODOS DE INFORMACIÓN ===

    /**
     * Obtiene estado del módulo
     */
    getModuleState() {
        return {
            isInitialized: this.isInitialized,
            isActive: this.isActive,
            hasProcessor: !!this.processor,
            currentFile: this.processor ? this.processor.state.currentFile : null,
            transposition: this.processor ? this.processor.state.currentTransposition : 0,
            config: this.config
        };
    }

    /**
     * Obtiene estadísticas del módulo
     */
    getModuleStats() {
        if (!this.processor) return null;
        
        const processorState = this.processor.getState();
        
        return {
            filesAvailable: this.processor.availableFiles.length,
            filesFiltered: this.processor.filteredFiles.length,
            chordsDetected: processorState.detectedChords.length,
            currentKey: processorState.transposedKey,
            searchQuery: this.processor.searchQuery,
            isProcessing: processorState.isProcessing
        };
    }

    /**
     * Debug completo del módulo
     */
    debugModule() {
        console.group('🎼 MUSICAL MODULE DEBUG');
        console.log('Estado del módulo:', this.getModuleState());
        console.log('Estadísticas:', this.getModuleStats());
        
        if (this.processor) {
            this.processor.debugState();
        }
        
        console.log('Elementos DOM:', this.elements);
        console.log('Configuración:', this.config);
        console.groupEnd();
    }

    /**
     * Exporta datos del módulo
     */
    exportModuleData() {
        if (!this.processor) return null;
        
        const data = {
            moduleInfo: {
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                state: this.getModuleState()
            },
            processorData: this.processor.getState(),
            statistics: this.getModuleStats(),
            config: this.config
        };
        
        return data;
    }

    /**
     * Cleanup al destruir el módulo
     */
    destroy() {
        console.log('🧹 Destruyendo módulo musical...');
        
        this.deactivate();
        
        if (this.processor) {
            if (typeof this.processor.destroy === 'function') {
                this.processor.destroy();
            }
            this.processor = null;
        }
        
        this.clearTemporaryState();
        this.isInitialized = false;
        
        console.log('✅ Módulo musical destruido');
    }
}

// === INSTANCIA GLOBAL ===
const musicalModuleInstance = new MusicalModule();

// === EXPORTAR FUNCIONES GLOBALES ===
window.MusicalModule = {
    // Métodos principales
    init: () => musicalModuleInstance.init(),
    activate: () => musicalModuleInstance.activate(),
    deactivate: () => musicalModuleInstance.deactivate(),
    
    // Métodos de archivo
    selectFile: (fileId) => musicalModuleInstance.selectFile(fileId),
    refreshFileList: () => musicalModuleInstance.refreshFileList(),
    
    // Métodos de transposición
    transpose: (semitones) => musicalModuleInstance.transpose(semitones),
    resetTransposition: () => musicalModuleInstance.resetTransposition(),
    
    // Métodos de configuración
    openConfig: () => musicalModuleInstance.openConfig(),
    closeConfig: () => musicalModuleInstance.closeConfig(),
    applyConfig: () => musicalModuleInstance.applyConfig(),
    resetConfig: () => musicalModuleInstance.resetConfig(),
    
    // Métodos de interacción
    handleChordClick: (chordId) => musicalModuleInstance.handleChordClick(chordId),
    
    // Métodos de utilidad
    getState: () => musicalModuleInstance.getModuleState(),
    getStats: () => musicalModuleInstance.getModuleStats(),
    debug: () => musicalModuleInstance.debugModule(),
    export: () => musicalModuleInstance.exportModuleData(),
    
    // Métodos de mantenimiento
    retryInit: () => musicalModuleInstance.retryInit(),
    destroy: () => musicalModuleInstance.destroy(),
    
    // Acceso a la instancia (solo para debugging)
    _instance: musicalModuleInstance
};

console.log('🎼 Musical Module cargado - Controlador principal inicializado');
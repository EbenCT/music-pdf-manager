/**
 * MUSIC PDF MANAGER - MUSICAL PROCESSOR
 * Procesador principal del módulo musical instructivo
 */

class MusicalProcessor {
    constructor() {
        this.state = {
            currentFile: null,
            originalText: '',
            processedText: '',
            detectedChords: [],
            currentTransposition: 0,
            originalKey: null,
            transposedKey: null,
            isProcessing: false,
            config: {
                detectComplexChords: true,
                highlightBassNotes: true,
                chordStyle: 'bold-red',
                fontSize: 16
            }
        };
        
        this.chordDetector = null;
        this.chordTransposer = null;
        this.textExtractor = null;
        this.musicalRenderer = null;
        
        this.availableFiles = [];
        this.filteredFiles = [];
        this.searchQuery = '';
    }

    /**
     * Inicializa el módulo musical
     */
    async init() {
        try {
            console.log('🎼 Inicializando módulo musical...');
            
            // Verificar dependencias
            this.checkDependencies();
            
            // Inicializar componentes
            await this.initializeComponents();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar archivos de instrumentos
            this.loadInstrumentFiles();
            
            // Aplicar configuración inicial
            this.applyConfiguration();
            
            console.log('✅ Módulo musical inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando módulo musical:', error);
            this.showError('Error al inicializar el módulo musical: ' + error.message);
        }
    }

    /**
     * Verifica que las dependencias estén disponibles
     */
    checkDependencies() {
        const dependencies = [
            { name: 'ChordDetector', obj: window.ChordDetector },
            { name: 'ChordTransposer', obj: window.ChordTransposer },
            { name: 'PDFTextExtractor', obj: window.PDFTextExtractor },
            { name: 'MusicalRenderer', obj: window.MusicalRenderer }
        ];

        const missing = dependencies.filter(dep => !dep.obj);
        
        if (missing.length > 0) {
            throw new Error(`Dependencias faltantes: ${missing.map(d => d.name).join(', ')}`);
        }
    }

    /**
     * Inicializa los componentes del módulo
     */
    async initializeComponents() {
        this.chordDetector = new ChordDetector();
        this.chordTransposer = new ChordTransposer();
        this.textExtractor = new PDFTextExtractor();
        this.musicalRenderer = new MusicalRenderer();
        
        // Configurar callbacks
        this.musicalRenderer.setChordClickHandler((chord, element) => {
            this.handleChordClick(chord, element);
        });
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Búsqueda de archivos
        const searchInput = document.getElementById('musical-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Configuración modal
        const configElements = document.querySelectorAll('#musical-config-modal input, #musical-config-modal select');
        configElements.forEach(element => {
            element.addEventListener('change', () => {
                this.updateConfigPreview();
            });
        });

        // Font size slider
        const fontSizeSlider = document.getElementById('font-size');
        if (fontSizeSlider) {
            fontSizeSlider.addEventListener('input', (e) => {
                document.getElementById('font-size-value').textContent = e.target.value + 'px';
            });
        }
    }

    /**
     * Carga archivos de instrumentos desde AppState
     */
    loadInstrumentFiles() {
        if (window.AppState && window.AppState.files && window.AppState.files.instrumentos) {
            this.availableFiles = window.AppState.files.instrumentos;
            this.filteredFiles = [...this.availableFiles];
            console.log(`📁 Cargados ${this.availableFiles.length} archivos de instrumentos`);
        } else {
            console.warn('⚠️ No se encontraron archivos de instrumentos en AppState');
            this.availableFiles = [];
            this.filteredFiles = [];
        }
        
        this.renderFileList();
    }

    /**
     * Renderiza la lista de archivos
     */
 renderFileList() {
        const container = document.getElementById('musical-file-list');
        if (!container) {
            console.warn('⚠️ Contenedor de lista de archivos no encontrado');
            return;
        }

        if (this.filteredFiles.length === 0) {
            const isSearching = this.searchQuery.length > 0;
            container.innerHTML = `
                <div class="placeholder">
                    <div class="placeholder-icon">${isSearching ? '🔍' : '🎸'}</div>
                    <p>${isSearching ? 'Sin resultados para tu búsqueda' : 'No hay archivos de instrumentos disponibles'}</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">
                        ${isSearching ? 'Intenta con otros términos' : 'Verifica la conexión con Google Drive'}
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredFiles.map(file => `
            <div class="musical-file-item" 
                 data-file-id="${file.id}"
                 onclick="MusicalModule.selectFile('${file.id}')">
                <div class="musical-file-name">${this.highlightSearchTerms(file.name)}</div>
                <div class="musical-file-meta">${file.size} • ${this.formatDate(file.modifiedTime)}</div>
            </div>
        `).join('');
    }

    /**
     * Resalta términos de búsqueda
     */
    highlightSearchTerms(text) {
        if (!this.searchQuery || this.searchQuery.length < 2) return text;
        
        const regex = new RegExp(`(${this.searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="search-result-match">$1</span>');
    }

    /**
     * Formatea fecha
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('es-ES');
        } catch {
            return 'N/A';
        }
    }

    /**
     * Maneja la búsqueda de archivos
     */
    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        
        if (this.searchQuery.length < 2) {
            this.filteredFiles = [...this.availableFiles];
        } else {
            this.filteredFiles = this.availableFiles.filter(file => 
                file.name.toLowerCase().includes(this.searchQuery)
            );
        }
        
        this.renderFileList();
    }

    /**
     * Selecciona un archivo para procesar
     */
    async selectFile(fileId) {
        try {
            const file = this.availableFiles.find(f => f.id === fileId);
            if (!file) {
                throw new Error('Archivo no encontrado');
            }

            this.showProcessingStatus('Cargando archivo...', 'loading');
            
            // Actualizar UI
            this.updateActiveFile(fileId);
            this.updateFileInfo(file);
            
            // Extraer texto del PDF
            await this.processFile(file);
            
        } catch (error) {
            console.error('❌ Error seleccionando archivo:', error);
            this.showError('Error al cargar el archivo: ' + error.message);
            this.hideProcessingStatus();
        }
    }

    /**
     * Procesa un archivo PDF
     */
    async processFile(file) {
        try {
            this.state.isProcessing = true;
            this.state.currentFile = file;
            this.state.currentTransposition = 0;
            
            this.showProcessingStatus('Extrayendo texto del PDF...', 'processing');

            // Obtener PDF blob
            const driveAPI = window.AppState?.driveAPI;
            if (!driveAPI || !driveAPI.isSignedIn) {
                throw new Error('No hay sesión activa de Google Drive');
            }

            const blob = await driveAPI.downloadFileBlob(file.id);
            
            this.showProcessingStatus('Procesando contenido musical...', 'processing');

            // Extraer texto con posiciones
            const extractedData = await this.textExtractor.extractFromBlob(blob);
            this.state.originalText = extractedData.text;
            
            this.showProcessingStatus('Detectando acordes...', 'processing');

            // Detectar acordes
            this.state.detectedChords = this.chordDetector.detectChords(
                this.state.originalText, 
                this.state.config
            );
            
            // Detectar tonalidad original
            this.state.originalKey = this.chordDetector.detectKey(this.state.detectedChords);
            this.state.transposedKey = this.state.originalKey;
            
            console.log(`🎵 Detectados ${this.state.detectedChords.length} acordes`);
            console.log(`🎯 Tonalidad detectada: ${this.state.originalKey || 'No detectada'}`);
            
            // Renderizar contenido
            this.renderMusicalContent();
            
            // Mostrar panel de transposición
            this.showTranspositionPanel();
            
            // Actualizar información
            this.updateChordInfo();
            
            this.hideProcessingStatus();
            
        } catch (error) {
            console.error('❌ Error procesando archivo:', error);
            this.showError('Error procesando el archivo musical: ' + error.message);
            this.hideProcessingStatus();
        } finally {
            this.state.isProcessing = false;
        }
    }

    /**
     * Renderiza el contenido musical con acordes resaltados
     */
renderMusicalContent() {
        const container = document.getElementById('musical-content');
        if (!container) {
            console.warn('⚠️ Contenedor de contenido musical no encontrado');
            return;
        }
        
        if (!this.state.originalText) {
            container.innerHTML = `
                <div class="placeholder">
                    <div class="placeholder-icon">🎼</div>
                    <p>Selecciona un archivo de instrumentos para ver los acordes</p>
                    <div class="musical-features">
                        <div class="feature-item">
                            <span class="feature-icon">🎯</span>
                            <span>Detección automática de acordes</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🎵</span>
                            <span>Transposición en tiempo real</span>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🎨</span>
                            <span>Resaltado de acordes</span>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Renderizar con acordes resaltados
        const renderedHTML = this.musicalRenderer.render(
            this.state.originalText,
            this.state.detectedChords,
            this.state.config
        );

        container.innerHTML = `<div class="musical-text chord-style-${this.state.config.chordStyle}">${renderedHTML}</div>`;
        
        // Aplicar tamaño de fuente
        container.style.fontSize = this.state.config.fontSize + 'px';
    }

    /**
     * Transpone los acordes
     */
    async transpose(semitones) {
        if (!this.state.detectedChords.length || this.state.isProcessing) return;

        try {
            this.state.isProcessing = true;
            this.state.currentTransposition += semitones;

            console.log(`🎼 Transponiendo ${semitones} semitonos (total: ${this.state.currentTransposition})`);

            // Transponer acordes
            const transposedChords = this.chordTransposer.transposeChords(
                this.state.detectedChords,
                semitones
            );

            // Calcular nueva tonalidad
            if (this.state.originalKey) {
                this.state.transposedKey = this.chordTransposer.transposeKey(
                    this.state.originalKey,
                    this.state.currentTransposition
                );
            }

            // Actualizar acordes en el estado
            this.state.detectedChords = transposedChords;

            // Re-renderizar con animación
            this.renderMusicalContentWithAnimation();

            // Actualizar información
            this.updateTranspositionInfo();
            this.updateChordInfo();

        } catch (error) {
            console.error('❌ Error en transposición:', error);
            this.showError('Error en la transposición: ' + error.message);
        } finally {
            this.state.isProcessing = false;
        }
    }

    /**
     * Renderiza contenido con animación de transposición
     */
    renderMusicalContentWithAnimation() {
        this.renderMusicalContent();
        
        // Añadir clase de animación temporal
        const chords = document.querySelectorAll('.chord');
        chords.forEach(chord => {
            chord.classList.add('transposed');
            setTimeout(() => {
                chord.classList.remove('transposed');
            }, 300);
        });
    }

    /**
     * Resetea la transposición
     */
    async resetTransposition() {
        if (!this.state.currentFile || this.state.currentTransposition === 0) return;

        console.log('🔄 Reseteando transposición a original');
        
        // Resetear al original
        const originalSemitones = -this.state.currentTransposition;
        this.state.currentTransposition = 0;
        
        // Transponer de vuelta al original
        this.state.detectedChords = this.chordTransposer.transposeChords(
            this.state.detectedChords,
            originalSemitones
        );
        
        this.state.transposedKey = this.state.originalKey;
        
        // Re-renderizar
        this.renderMusicalContentWithAnimation();
        this.updateTranspositionInfo();
        this.updateChordInfo();
    }

    /**
     * Maneja click en acorde
     */
    handleChordClick(chord, element) {
        console.log(`🎵 Click en acorde: ${chord.original} → ${chord.transposed}`);
        
        // Mostrar información del acorde
        this.showChordInfo(chord, element);
    }

    /**
     * Muestra información de un acorde
     */
    showChordInfo(chord, element) {
        // Crear tooltip temporal
        const tooltip = document.createElement('div');
        tooltip.className = 'chord-tooltip';
        tooltip.innerHTML = `
            <strong>${chord.transposed}</strong><br>
            Original: ${chord.original}<br>
            Tipo: ${chord.type}
            ${chord.bassNote ? `<br>Bajo: ${chord.bassNote}` : ''}
        `;
        
        tooltip.style.cssText = `
            position: absolute;
            background: var(--secondary-black);
            border: 2px solid var(--accent-red);
            border-radius: var(--radius-md);
            padding: var(--spacing-sm);
            color: var(--text-primary);
            font-size: 0.8rem;
            z-index: 1000;
            pointer-events: none;
            box-shadow: var(--shadow-lg);
        `;
        
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
        tooltip.style.left = (rect.left + rect.width / 2 - tooltip.offsetWidth / 2) + 'px';
        
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 3000);
    }

    /**
     * Actualiza información del archivo activo
     */
    updateActiveFile(fileId) {
        document.querySelectorAll('.musical-file-item').forEach(item => {
            item.classList.remove('active');
        });

        const activeItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    /**
     * Actualiza información del archivo
     */
    updateFileInfo(file) {
        const titleElement = document.getElementById('current-musical-file');
        if (titleElement) {
            titleElement.textContent = file.name;
        }
    }

    /**
     * Actualiza información de acordes
     */
    updateChordInfo() {
        const chordCountElement = document.getElementById('chord-count');
        const currentKeyElement = document.getElementById('current-key');
        const originalKeyElement = document.getElementById('original-key');
        const transposedKeyElement = document.getElementById('transposed-key');

        if (chordCountElement) {
            chordCountElement.textContent = `${this.state.detectedChords.length} acordes`;
        }

        if (currentKeyElement) {
            currentKeyElement.textContent = `Tonalidad: ${this.state.transposedKey || 'N/A'}`;
        }

        if (originalKeyElement) {
            originalKeyElement.textContent = this.state.originalKey || '-';
        }

        if (transposedKeyElement) {
            transposedKeyElement.textContent = this.state.transposedKey || '-';
        }
    }

    /**
     * Actualiza información de transposición
     */
    updateTranspositionInfo() {
        const valueElement = document.getElementById('transposition-value');
        if (valueElement) {
            valueElement.textContent = this.state.currentTransposition.toString();
        }
    }

    /**
     * Muestra/oculta panel de transposición
     */
    showTranspositionPanel() {
        const panel = document.getElementById('transposition-panel');
        if (panel) {
            panel.style.display = 'block';
        }
    }

    hideTranspositionPanel() {
        const panel = document.getElementById('transposition-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    /**
     * Muestra status de procesamiento
     */
    showProcessingStatus(message, type = 'loading') {
        const statusPanel = document.getElementById('musical-status');
        const titleElement = document.getElementById('musical-status-title');
        const messageElement = document.getElementById('musical-status-message');

        if (statusPanel && titleElement && messageElement) {
            titleElement.textContent = type === 'loading' ? 'Cargando...' : 'Procesando...';
            messageElement.textContent = message;
            statusPanel.className = `musical-status ${type}`;
        }
    }

    hideProcessingStatus() {
        const statusPanel = document.getElementById('musical-status');
        if (statusPanel) {
            statusPanel.classList.add('hidden');
        }
    }

    /**
     * Aplica configuración
     */
    applyConfiguration() {
        const config = this.state.config;
        
        // Aplicar a elementos del DOM solo si existen
        const detectComplexElement = document.getElementById('detect-complex-chords');
        if (detectComplexElement) {
            detectComplexElement.checked = config.detectComplexChords;
        }
        
        const highlightBassElement = document.getElementById('highlight-bass-notes');
        if (highlightBassElement) {
            highlightBassElement.checked = config.highlightBassNotes;
        }
        
        const chordStyleElement = document.getElementById('chord-style');
        if (chordStyleElement) {
            chordStyleElement.value = config.chordStyle;
        }
        
        const fontSizeElement = document.getElementById('font-size');
        if (fontSizeElement) {
            fontSizeElement.value = config.fontSize;
        }
        
        const fontSizeValueElement = document.getElementById('font-size-value');
        if (fontSizeValueElement) {
            fontSizeValueElement.textContent = config.fontSize + 'px';
        }
        
        console.log('⚙️ Configuración aplicada:', config);
    }
    /**
     * Actualiza preview de configuración
     */
    updateConfigPreview() {
        // Esta función se ejecuta cuando cambian los controles de configuración
        // en tiempo real para preview
    }

    /**
     * Aplica configuración desde modal
     */
    applyConfig() {
        // Solo leer configuración si los elementos existen
        const detectComplexElement = document.getElementById('detect-complex-chords');
        const highlightBassElement = document.getElementById('highlight-bass-notes');
        const chordStyleElement = document.getElementById('chord-style');
        const fontSizeElement = document.getElementById('font-size');

        this.state.config = {
            detectComplexChords: detectComplexElement ? detectComplexElement.checked : this.state.config.detectComplexChords,
            highlightBassNotes: highlightBassElement ? highlightBassElement.checked : this.state.config.highlightBassNotes,
            chordStyle: chordStyleElement ? chordStyleElement.value : this.state.config.chordStyle,
            fontSize: fontSizeElement ? parseInt(fontSizeElement.value) : this.state.config.fontSize
        };

        // Re-renderizar si hay contenido
        if (this.state.originalText) {
            this.renderMusicalContent();
        }

        this.closeConfig();
        this.showSuccess('Configuración aplicada correctamente');
    }

    /**
     * Resetea configuración
     */
    resetConfig() {
        this.state.config = {
            detectComplexChords: true,
            highlightBassNotes: true,
            chordStyle: 'bold-red',
            fontSize: 16
        };
        
        this.applyConfiguration();
    }

    /**
     * Abre modal de configuración
     */
    openConfig() {
        const modal = document.getElementById('musical-config-modal');
        if (modal) {
            modal.classList.add('show');
        } else {
            console.warn('⚠️ Modal de configuración no disponible - HTML del módulo musical no cargado');
            this.showError('Configuración no disponible. El módulo musical necesita ser cargado completamente.');
        }
    }

    /**
     * Cierra modal de configuración
     */
    closeConfig() {
        const modal = document.getElementById('musical-config-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Refresca lista de archivos
     */
    refreshFileList() {
        this.loadInstrumentFiles();
        this.showSuccess('Lista de archivos actualizada');
    }

    /**
     * Muestra error
     */
    showError(message) {
        console.error('❌', message);
        if (window.UIHandlers && window.UIHandlers.showNotification) {
            window.UIHandlers.showNotification(message, 'error');
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
            window.UIHandlers.showNotification(message, 'success');
        }
    }

    /**
     * Obtiene estado actual
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Debug del estado
     */
    debugState() {
        console.group('🎼 MUSICAL PROCESSOR DEBUG');
        console.log('Estado actual:', this.getState());
        console.log('Archivos disponibles:', this.availableFiles.length);
        console.log('Archivos filtrados:', this.filteredFiles.length);
        console.log('Query de búsqueda:', this.searchQuery);
        console.groupEnd();
    }
}

// === EXPORTAR ===
window.MusicalProcessor = MusicalProcessor;
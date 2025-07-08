/**
 * MUSIC PDF MANAGER - MUSICAL PROCESSOR CORREGIDO
 * Manejo robusto de errores y flujos alternativos
 */

class MusicalProcessor {
    constructor() {
        this.state = {
            isProcessing: false,
            currentFile: null,
            currentChords: [],
            detectedKey: null,
            originalText: '',
            extractionMethod: null,
            manualInputActive: false
        };
        
        this.config = {
            detectComplexChords: true,
            highlightBassNotes: true,
            chordStyle: 'bold-red',
            fontSize: 16,
            // NUEVO: Configuraciones para manejo de errores
            enableRetry: true,
            maxRetries: 2,
            enableManualFallback: true,
            debugMode: true
        };
        
        // Dependencias
        this.driveAPI = null;
        this.textExtractor = null;
        this.chordDetector = null;
        this.chordTransposer = null;
        this.renderer = null;
        
        this.initializationAttempts = 0;
        this.maxInitAttempts = 3;
    }

    /**
     * ✅ MEJORADO: Inicialización con verificación robusta de dependencias
     */
    async initialize() {
        try {
            this.initializationAttempts++;
            console.log(`🎼 Inicializando módulo musical (intento ${this.initializationAttempts}/${this.maxInitAttempts})...`);
            
            // Verificar dependencias críticas
            const missingDeps = this.checkDependencies();
            if (missingDeps.length > 0) {
                if (this.initializationAttempts < this.maxInitAttempts) {
                    console.warn(`⚠️ Dependencias faltantes: ${missingDeps.join(', ')}. Reintentando en 1s...`);
                    await this.delay(1000);
                    return this.initialize();
                } else {
                    throw new Error(`Dependencias críticas no disponibles: ${missingDeps.join(', ')}`);
                }
            }

            // Inicializar componentes
            await this.initializeComponents();
            
            console.log('✅ Módulo musical inicializado correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando módulo musical:', error);
            this.showInitializationError(error);
            return false;
        }
    }

    /**
     * ✅ NUEVO: Verificación robusta de dependencias
     */
    checkDependencies() {
        const requiredDeps = [
            { name: 'DriveAPI', check: () => window.AppState?.driveAPI },
            { name: 'PDFTextExtractor', check: () => window.PDFTextExtractor },
            { name: 'ChordDetector', check: () => window.ChordDetector },
            { name: 'ChordTransposer', check: () => window.ChordTransposer },
            { name: 'MusicalRenderer', check: () => window.MusicalRenderer },
            { name: 'pdfjsLib', check: () => window.pdfjsLib }
        ];

        const missing = requiredDeps
            .filter(dep => !dep.check())
            .map(dep => dep.name);

        if (missing.length > 0) {
            console.error('❌ Dependencias faltantes:', missing);
        }

        return missing;
    }

    /**
     * ✅ MEJORADO: Inicialización de componentes con manejo de errores
     */
    async initializeComponents() {
        try {
            // Inicializar DriveAPI
            this.driveAPI = window.AppState.driveAPI;
            console.log('✅ DriveAPI conectada');

            // Inicializar extractor de texto corregido
            this.textExtractor = new window.PDFTextExtractor();
            console.log('✅ PDFTextExtractor inicializado');

            // Inicializar detectores de acordes
            this.chordDetector = new window.ChordDetector();
            this.chordTransposer = new window.ChordTransposer();
            console.log('✅ Detectores de acordes inicializados');

            // Inicializar renderer
            this.renderer = new window.MusicalRenderer();
            console.log('✅ Renderer inicializado');

            // Verificar archivos disponibles
            await this.loadAvailableFiles();
            
            // Aplicar configuración
            this.applyConfiguration();
            
        } catch (error) {
            console.error('❌ Error inicializando componentes:', error);
            throw error;
        }
    }

    /**
     * ✅ CORREGIDO: Procesamiento de archivos con manejo robusto de errores
     */
    async processFile(file) {
        try {
            this.state.isProcessing = true;
            this.state.currentFile = file;
            this.state.currentChords = [];
            this.state.detectedKey = null;
            this.state.originalText = '';

            console.log(`🎯 Procesando archivo: ${file.name} (${file.id})`);
            this.showProcessingStatus(`Descargando ${file.name}...`);
            
            // Descargar archivo desde Google Drive con reintentos
            const blob = await this.downloadFileWithRetry(file);
            
            // Extraer texto con el extractor corregido
            this.showProcessingStatus(`Extrayendo texto de ${file.name}...`);
            const extractedData = await this.textExtractor.extractFromBlob(blob, file.name);
            
            // Manejar resultado de extracción
            await this.handleExtractionResult(extractedData, file);
            
        } catch (error) {
            console.error('❌ Error procesando archivo:', error);
            await this.handleProcessingError(error, file);
        } finally {
            this.state.isProcessing = false;
            this.hideProcessingStatus();
        }
    }

    /**
     * ✅ NUEVO: Descarga con reintentos
     */
    async downloadFileWithRetry(file, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                console.log(`📥 Descargando archivo: ${file.name} (intento ${attempt}/${retries})`);
                const blob = await this.downloadFileBlob(file);
                console.log(`✅ Archivo descargado: ${blob.size} bytes`);
                return blob;
            } catch (error) {
                console.warn(`⚠️ Error en descarga (intento ${attempt}):`, error);
                if (attempt === retries) throw error;
                await this.delay(1000 * attempt); // Backoff exponencial
            }
        }
    }

    /**
     * ✅ MEJORADO: Manejo de resultados de extracción
     */
    async handleExtractionResult(extractedData, file) {
        this.state.extractionMethod = extractedData.extractionMethod;
        this.state.originalText = extractedData.text;

        console.log(`🔍 Método de extracción: ${extractedData.extractionMethod}`);
        console.log(`📏 Texto extraído: ${extractedData.text.length} caracteres`);

        switch (extractedData.extractionMethod) {
            case 'DIRECT':
                // Extracción exitosa
                console.log('✅ Extracción directa exitosa');
                await this.processExtractedText(extractedData);
                break;

            case 'OCR':
                // OCR exitoso
                console.log('🤖 OCR exitoso');
                await this.processExtractedText(extractedData);
                break;

            case 'MANUAL_REQUIRED':
                // Requiere entrada manual
                console.log('🔧 Se requiere entrada manual');
                await this.showManualInputOption(extractedData, file);
                break;

            case 'DIRECT_FAILED':
            case 'OCR_FAILED':
            case 'FAILED':
            default:
                // Todas las extracciones fallaron
                console.warn('🚫 Extracción fallida - mostrando opciones');
                await this.showExtractionFailedOptions(extractedData, file);
                break;
        }
    }

    /**
     * ✅ MEJORADO: Procesamiento de texto extraído
     */
    async processExtractedText(extractedData) {
        try {
            const { text, metadata } = extractedData;
            
            if (!text || text.trim().length === 0) {
                await this.handleNoText(extractedData);
                return;
            }

            // Detectar acordes
            this.showProcessingStatus('Detectando acordes...');
            const detectedChords = this.chordDetector.detectChords(text);
            
            if (detectedChords.length === 0) {
                await this.handleNoChords(extractedData);
                return;
            }

            // Procesar acordes encontrados
            this.state.currentChords = detectedChords;
            this.state.detectedKey = this.chordDetector.detectKey(detectedChords);
            
            console.log(`🎼 Acordes detectados: ${detectedChords.length}`);
            console.log(`🎵 Tonalidad detectada: ${this.state.detectedKey || 'No determinada'}`);

            // Renderizar resultado
            await this.renderMusicalContent(text, detectedChords, metadata);
            
        } catch (error) {
            console.error('❌ Error procesando texto extraído:', error);
            this.showError(`Error procesando texto: ${error.message}`);
        }
    }

    /**
     * ✅ NUEVO: Manejo cuando se requiere entrada manual
     */
    async showManualInputOption(extractedData, file) {
        const helpMessage = extractedData.helpMessage || {};
        
        const content = `
            <div class="manual-input-required">
                <div class="message-header">
                    <span class="manual-icon">🎼</span>
                    <h3>${helpMessage.title || 'Se requiere entrada manual'}</h3>
                </div>
                <div class="message-content">
                    <p>${helpMessage.description || 'El PDF no pudo ser procesado automáticamente.'}</p>
                    
                    ${helpMessage.suggestions ? `
                        <div class="suggestions">
                            <h4>💡 Sugerencias:</h4>
                            <ul>
                                ${helpMessage.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="message-actions">
                        <button class="control-btn primary" onclick="window.musicalProcessor.showManualInput('${file.id}')">
                            ✏️ Agregar Acordes Manualmente
                        </button>
                        <button class="control-btn" onclick="window.musicalProcessor.showPDFViewer('${file.id}')">
                            📄 Ver PDF Original
                        </button>
                        <button class="control-btn" onclick="window.musicalProcessor.goBack()">
                            ← Volver a la Lista
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(content);
        this.showFileInfo({
            name: file.name,
            extractionInfo: {
                method: extractedData.extractionMethod,
                helpMessage: helpMessage.title,
                textLength: extractedData.text.length
            }
        });
    }

    /**
     * ✅ NUEVO: Manejo cuando falla completamente la extracción
     */
    async showExtractionFailedOptions(extractedData, file) {
        const errorMessage = extractedData.error || 'Error desconocido';
        const helpMessage = extractedData.helpMessage || 'No se pudo procesar el archivo';
        
        const content = `
            <div class="extraction-failed">
                <div class="message-header">
                    <span class="error-icon">❌</span>
                    <h3>Error en la extracción</h3>
                </div>
                <div class="message-content">
                    <p><strong>No se pudo extraer texto del PDF.</strong></p>
                    <p class="error-details">Error: ${errorMessage}</p>
                    <p class="help-message">${helpMessage}</p>
                    
                    <div class="troubleshooting">
                        <h4>🔧 Opciones disponibles:</h4>
                        <ul>
                            <li>✏️ Escribir los acordes manualmente mientras ves el PDF</li>
                            <li>📄 Visualizar el PDF original en pantalla completa</li>
                            <li>🔄 Intentar procesar el archivo nuevamente</li>
                            <li>📂 Seleccionar otro archivo</li>
                        </ul>
                    </div>
                    
                    <div class="message-actions">
                        <button class="control-btn primary" onclick="window.musicalProcessor.showManualInput('${file.id}')">
                            ✏️ Entrada Manual
                        </button>
                        <button class="control-btn" onclick="window.musicalProcessor.showPDFViewer('${file.id}')">
                            📄 Ver PDF
                        </button>
                        <button class="control-btn" onclick="window.musicalProcessor.retryProcessing('${file.id}')">
                            🔄 Reintentar
                        </button>
                        <button class="control-btn" onclick="window.musicalProcessor.goBack()">
                            ← Volver
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(content);
        this.showFileInfo({
            name: file.name,
            extractionInfo: {
                method: 'ERROR',
                helpMessage: errorMessage,
                textLength: 0
            }
        });
    }

    /**
     * ✅ NUEVO: Muestra entrada manual de acordes
     */
    async showManualInput(fileId) {
        try {
            this.state.manualInputActive = true;
            
            const file = this.findFileById(fileId);
            if (!file) {
                this.showError('Archivo no encontrado');
                return;
            }

            const content = `
                <div class="manual-chord-input">
                    <div class="input-header">
                        <h3>🎼 Entrada Manual de Acordes</h3>
                        <p>Archivo: <strong>${file.name}</strong></p>
                    </div>
                    
                    <div class="input-layout">
                        <div class="pdf-viewer-side">
                            <h4>📄 Vista del PDF</h4>
                            <div id="manual-pdf-viewer" class="mini-pdf-viewer">
                                <p>Cargando PDF...</p>
                            </div>
                        </div>
                        
                        <div class="chord-input-side">
                            <h4>✏️ Escribir Acordes</h4>
                            <div class="input-instructions">
                                <p>💡 <strong>Instrucciones:</strong></p>
                                <ul>
                                    <li>Escribe los acordes en notación americana (C, Dm, G7, Am, etc.)</li>
                                    <li>Separa los acordes con espacios o líneas</li>
                                    <li>Puedes incluir letras de canciones</li>
                                    <li>El sistema detectará automáticamente los acordes</li>
                                </ul>
                            </div>
                            
                            <textarea id="manual-chord-text" 
                                      placeholder="Ejemplo:&#10;Intro: C Am F G&#10;&#10;Verso:&#10;C          Am&#10;Esta es una canción&#10;F          G&#10;Con acordes simples&#10;&#10;Coro:&#10;C Am F G (repetir)"
                                      rows="15"
                                      class="chord-textarea"></textarea>
                            
                            <div class="input-actions">
                                <button class="control-btn primary" onclick="window.musicalProcessor.processManualInput('${fileId}')">
                                    🎯 Detectar Acordes
                                </button>
                                <button class="control-btn" onclick="window.musicalProcessor.clearManualInput()">
                                    🗑️ Limpiar
                                </button>
                                <button class="control-btn" onclick="window.musicalProcessor.goBack()">
                                    ← Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            this.updateContent(content);
            
            // Cargar PDF en el visor lateral
            await this.loadPDFInMiniViewer(file);
            
        } catch (error) {
            console.error('❌ Error mostrando entrada manual:', error);
            this.showError(`Error cargando entrada manual: ${error.message}`);
        }
    }

    /**
     * ✅ NUEVO: Procesa entrada manual de acordes
     */
    async processManualInput(fileId) {
        try {
            const textarea = document.getElementById('manual-chord-text');
            if (!textarea) {
                this.showError('No se pudo acceder al texto ingresado');
                return;
            }

            const manualText = textarea.value.trim();
            if (!manualText) {
                this.showError('Por favor escribe algunos acordes');
                return;
            }

            console.log('🎼 Procesando entrada manual de acordes...');
            this.showProcessingStatus('Detectando acordes del texto manual...');

            // Detectar acordes del texto manual
            const detectedChords = this.chordDetector.detectChords(manualText);
            
            if (detectedChords.length === 0) {
                this.showError('No se detectaron acordes válidos en el texto. Verifica que uses notación americana (C, Dm, G7, etc.)');
                return;
            }

            // Procesar acordes
            this.state.currentChords = detectedChords;
            this.state.detectedKey = this.chordDetector.detectKey(detectedChords);
            this.state.originalText = manualText;
            this.state.extractionMethod = 'MANUAL';
            this.state.manualInputActive = false;

            console.log(`🎼 Acordes detectados manualmente: ${detectedChords.length}`);
            console.log(`🎵 Tonalidad detectada: ${this.state.detectedKey || 'No determinada'}`);

            // Renderizar resultado
            const file = this.findFileById(fileId);
            await this.renderMusicalContent(manualText, detectedChords, {
                extractionMethod: 'MANUAL',
                fileName: file?.name || 'Manual Input'
            });

        } catch (error) {
            console.error('❌ Error procesando entrada manual:', error);
            this.showError(`Error procesando acordes: ${error.message}`);
        } finally {
            this.hideProcessingStatus();
        }
    }

    /**
     * ✅ NUEVO: Carga PDF en visor mini para entrada manual
     */
    async loadPDFInMiniViewer(file) {
        try {
            const viewerElement = document.getElementById('manual-pdf-viewer');
            if (!viewerElement) return;

            viewerElement.innerHTML = '<p>Cargando PDF...</p>';

            const blob = await this.downloadFileBlob(file);
            const url = URL.createObjectURL(blob);

            viewerElement.innerHTML = `
                <iframe src="${url}" 
                        style="width: 100%; height: 400px; border: none;">
                </iframe>
            `;

        } catch (error) {
            console.error('❌ Error cargando PDF en mini visor:', error);
            const viewerElement = document.getElementById('manual-pdf-viewer');
            if (viewerElement) {
                viewerElement.innerHTML = '<p>❌ Error cargando PDF</p>';
            }
        }
    }

    /**
     * ✅ NUEVO: Reintenta el procesamiento
     */
    async retryProcessing(fileId) {
        const file = this.findFileById(fileId);
        if (!file) {
            this.showError('Archivo no encontrado');
            return;
        }

        console.log(`🔄 Reintentando procesamiento de: ${file.name}`);
        await this.processFile(file);
    }

    /**
     * ✅ NUEVO: Busca archivo por ID
     */
    findFileById(fileId) {
        // Buscar en archivos de instrumentos
        let file = this.state.availableFiles?.instrumentos?.find(f => f.id === fileId);
        if (file) return file;

        // Buscar en archivos de voces
        file = this.state.availableFiles?.voces?.find(f => f.id === fileId);
        return file;
    }

    /**
     * ✅ MEJORADO: Renderizado de contenido musical
     */
    async renderMusicalContent(text, chords, metadata = {}) {
        try {
            console.log('🎨 Renderizando contenido musical...');
            
            const renderData = {
                originalText: text,
                detectedChords: chords,
                detectedKey: this.state.detectedKey,
                extractionMethod: this.state.extractionMethod,
                metadata,
                config: this.config
            };

            const renderedContent = await this.renderer.renderMusicContent(renderData);
            this.updateContent(renderedContent);

            // Mostrar controles de transposición
            this.showTranspositionControls();
            
            // Mostrar información del archivo
            this.showFileInfo({
                name: this.state.currentFile?.name || metadata.fileName,
                extractionInfo: {
                    method: this.state.extractionMethod,
                    textLength: text.length,
                    chordsFound: chords.length,
                    detectedKey: this.state.detectedKey
                }
            });

        } catch (error) {
            console.error('❌ Error renderizando contenido:', error);
            this.showError(`Error mostrando contenido: ${error.message}`);
        }
    }

    /**
     * ✅ MEJORADO: Manejo de errores de procesamiento
     */
    async handleProcessingError(error, file) {
        console.error('❌ Error en procesamiento:', error);
        
        const errorContent = `
            <div class="processing-error">
                <div class="error-header">
                    <span class="error-icon">💥</span>
                    <h3>Error de Procesamiento</h3>
                </div>
                <div class="error-content">
                    <p><strong>No se pudo procesar el archivo:</strong> ${file?.name || 'Archivo desconocido'}</p>
                    <p class="error-message">${error.message}</p>
                    
                    <div class="error-actions">
                        <button class="control-btn" onclick="window.musicalProcessor.retryProcessing('${file?.id}')">
                            🔄 Reintentar
                        </button>
                        <button class="control-btn" onclick="window.musicalProcessor.showManualInput('${file?.id}')">
                            ✏️ Entrada Manual
                        </button>
                        <button class="control-btn" onclick="window.musicalProcessor.goBack()">
                            ← Volver a la Lista
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(errorContent);
    }

    /**
     * ✅ NUEVO: Utilidad para delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * ✅ NUEVO: Limpiar entrada manual
     */
    clearManualInput() {
        const textarea = document.getElementById('manual-chord-text');
        if (textarea) {
            textarea.value = '';
            textarea.focus();
        }
    }

    /**
     * ✅ MEJORADO: Mostrar error de inicialización
     */
    showInitializationError(error) {
        const content = `
            <div class="initialization-error">
                <div class="error-header">
                    <span class="error-icon">⚡</span>
                    <h3>Error de Inicialización</h3>
                </div>
                <div class="error-content">
                    <p><strong>No se pudo inicializar el módulo musical.</strong></p>
                    <p class="error-message">${error.message}</p>
                    
                    <div class="troubleshooting">
                        <h4>🔧 Posibles soluciones:</h4>
                        <ul>
                            <li>Recarga la página (Ctrl+F5)</li>
                            <li>Verifica tu conexión a internet</li>
                            <li>Limpia el cache del navegador</li>
                            <li>Contacta al soporte técnico</li>
                        </ul>
                    </div>
                    
                    <div class="error-actions">
                        <button class="control-btn primary" onclick="location.reload()">
                            🔄 Recargar Página
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.updateContent(content);
    }

    // === MÉTODOS EXISTENTES QUE SE MANTIENEN ===
    
    async selectFile(fileElement) {
        // Implementación existente mantenida
        // (Este método ya existe en el código original)
    }

    async downloadFileBlob(file) {
        // Implementación existente mantenida
        // (Este método ya existe en el código original)
    }

    showProcessingStatus(message) {
        // Implementación existente mantenida
    }

    hideProcessingStatus() {
        // Implementación existente mantenida
    }

    updateContent(content) {
        // Implementación existente mantenida
    }

    showFileInfo(fileInfo) {
        // Implementación existente mantenida
    }

    showError(message) {
        // Implementación existente mantenida
    }

    goBack() {
        // Implementación existente mantenida
    }

    async loadAvailableFiles() {
        // Implementación existente mantenida
    }

    applyConfiguration() {
        // Implementación existente mantenida
    }

    showTranspositionControls() {
        // Implementación existente mantenida
    }

    async handleNoText(extractedData) {
        // Implementación existente mantenida para compatibilidad
    }

    async handleNoChords(extractedData) {
        // Implementación existente mantenida para compatibilidad
    }
}

// === EXPORTAR ===
window.MusicalProcessor = MusicalProcessor;
console.log('🎼 Musical Processor CORREGIDO cargado - Versión 2.0.0');
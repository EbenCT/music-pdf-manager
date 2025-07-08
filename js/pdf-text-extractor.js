/**
 * MUSIC PDF MANAGER - PDF TEXT EXTRACTOR CORREGIDO
 * Solución completa para problemas de extracción y OCR
 */

class PDFTextExtractor {
    constructor() {
        this.config = {
            preserveSpacing: true,
            includePositions: true,
            mergeLines: true,
            normalizeWhitespace: false,
            extractMetadata: true,
            useOCRFallback: true,
            ocrLanguage: 'eng+spa',
            debugMode: true,
            // NUEVO: Configuración de fallbacks
            enableManualInput: true,
            maxRetries: 3,
            timeoutMs: 30000
        };
        
        this.currentDocument = null;
        this.extractionCache = new Map();
        this.ocrWorker = null;
        this.ocrInitialized = false;
    }

    /**
     * ✅ CORREGIDO: Inicializa Tesseract.js desde cdnjs.cloudflare.com
     */
    async initializeOCR() {
        if (this.ocrWorker && this.ocrInitialized) {
            return this.ocrWorker;
        }
        
        try {
            console.log('🤖 Inicializando OCR worker...');
            
            // SOLUCIÓN: Cargar desde cdnjs.cloudflare.com (permitido por CSP)
            if (typeof Tesseract === 'undefined') {
                console.log('📥 Cargando Tesseract.js desde cdnjs.cloudflare.com...');
                await this.loadTesseractFromCDNJS();
            }
            
            // Crear worker con configuración corregida
            this.ocrWorker = await Tesseract.createWorker({
                workerPath: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/worker.min.js',
                corePath: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/tesseract-core.wasm.js'
            });
            
            await this.ocrWorker.loadLanguage(this.config.ocrLanguage);
            await this.ocrWorker.initialize(this.config.ocrLanguage);
            
            this.ocrInitialized = true;
            console.log('✅ OCR worker inicializado correctamente');
            return this.ocrWorker;
            
        } catch (error) {
            console.warn('⚠️ No se pudo inicializar OCR:', error.message);
            this.ocrWorker = null;
            this.ocrInitialized = false;
            return null;
        }
    }

    /**
     * ✅ NUEVO: Carga Tesseract.js desde cdnjs.cloudflare.com
     */
    async loadTesseractFromCDNJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // CORREGIDO: Usar cdnjs.cloudflare.com en lugar de cdn.jsdelivr.net
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/tesseract.min.js';
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                console.log('✅ Tesseract.js cargado desde cdnjs.cloudflare.com');
                resolve();
            };
            
            script.onerror = (error) => {
                console.error('❌ Error cargando Tesseract.js desde cdnjs.cloudflare.com:', error);
                reject(new Error('Error cargando Tesseract.js'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * ✅ MEJORADO: Extracción principal con manejo robusto de errores
     */
    async extractFromBlob(blob, fileName = 'unknown.pdf') {
        if (!blob || blob.size === 0) {
            throw new Error('Blob inválido o vacío');
        }

        console.log(`📄 Iniciando extracción de texto del PDF: ${fileName}...`);
        
        const cacheKey = await this.generateCacheKey(blob, fileName);
        
        // Verificar cache
        if (this.extractionCache.has(cacheKey)) {
            console.log('📋 Resultado encontrado en cache');
            return this.extractionCache.get(cacheKey);
        }

        let result = {
            text: '',
            metadata: {},
            extractionMethod: 'FAILED',
            success: false,
            helpMessage: null,
            error: null
        };

        try {
            // PASO 1: Intentar extracción directa de PDF
            result = await this.extractDirectText(blob, fileName);
            
            // PASO 2: Si no hay texto, intentar OCR
            if (result.text.length === 0 && this.config.useOCRFallback) {
                console.log('🤖 Texto vacío detectado, intentando OCR fallback...');
                const ocrResult = await this.extractWithOCR(blob, fileName);
                
                if (ocrResult.success) {
                    result = ocrResult;
                } else {
                    // PASO 3: Configurar para entrada manual
                    result = await this.setupManualInput(blob, fileName, result);
                }
            } else if (result.text.length === 0) {
                // OCR deshabilitado, configurar entrada manual
                result = await this.setupManualInput(blob, fileName, result);
            }

            // Guardar en cache
            this.extractionCache.set(cacheKey, result);
            
            console.log(`✅ Extracción completada: ${result.text.length} caracteres`);
            console.log(`🔧 Método usado: ${result.extractionMethod}`);
            
            return result;

        } catch (error) {
            console.error('❌ Error durante la extracción:', error);
            result.error = error.message;
            result.helpMessage = this.getErrorHelpMessage(error);
            return result;
        }
    }

    /**
     * ✅ MEJORADO: Extracción directa de texto del PDF
     */
    async extractDirectText(blob, fileName) {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({
                data: arrayBuffer,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                cMapPacked: true
            }).promise;

            console.log(`📖 PDF cargado: ${pdf.numPages} páginas`);
            
            // Extraer metadatos
            const metadata = await this.extractMetadata(pdf);
            console.log('📊 Metadata extraída:', metadata);

            let fullText = '';
            let totalItems = 0;

            // Procesar cada página
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                console.log(`📄 Procesando página ${pageNum}/${pdf.numPages}`);
                
                const page = await pdf.getPage(pageNum);
                const pageInfo = page.getViewport({ scale: 1 });
                console.log(`📋 Página ${pageNum} - Info:`, {
                    rotation: pageInfo.rotation,
                    userUnit: pageInfo.userUnit,
                    view: pageInfo.viewBox
                });

                const textContent = await page.getTextContent();
                console.log(`🔍 Página ${pageNum} - TextContent:`, {
                    itemsCount: textContent.items.length,
                    styles: Object.keys(textContent.styles).length
                });

                console.log(`📝 Página ${pageNum} - Items de texto:`, textContent.items.map(item => ({
                    text: item.str,
                    hasTransform: !!item.transform,
                    width: item.width,
                    height: item.height
                })));

                const validItems = textContent.items.filter(item => 
                    item.str && 
                    item.str.trim().length > 0 && 
                    !this.isSpecialCharacter(item.str)
                );

                console.log(`✓ Página ${pageNum} - Items válidos: ${validItems.length}/${textContent.items.length}`);

                if (validItems.length === 0) {
                    console.log(`⚠️ Página ${pageNum} - No hay items de texto válidos`);
                    continue;
                }

                const pageText = this.processTextItems(validItems);
                fullText += pageText + '\n';
                totalItems += validItems.length;

                console.log(`📏 Página ${pageNum} - Texto extraído: ${pageText.length} caracteres`);
            }

            // Limpiar documento
            this.currentDocument = pdf;

            if (fullText.trim().length === 0) {
                console.log('⚠️ No se pudo extraer texto del PDF (posiblemente sea una imagen escaneada)');
                return {
                    text: '',
                    metadata,
                    extractionMethod: 'DIRECT_FAILED',
                    success: false,
                    helpMessage: 'El PDF no contiene texto extraíble. Posiblemente sea una imagen escaneada.',
                    totalPages: pdf.numPages,
                    totalItems: 0
                };
            }

            return {
                text: fullText.trim(),
                metadata,
                extractionMethod: 'DIRECT',
                success: true,
                totalPages: pdf.numPages,
                totalItems
            };

        } catch (error) {
            console.error('❌ Error en extracción directa:', error);
            throw new Error(`Error procesando PDF: ${error.message}`);
        }
    }

    /**
     * ✅ CORREGIDO: Extracción con OCR usando configuración correcta
     */
    async extractWithOCR(blob, fileName) {
        try {
            const worker = await this.initializeOCR();
            
            if (!worker) {
                throw new Error('OCR worker no disponible');
            }

            console.log('🤖 Iniciando OCR en el PDF...');
            
            // Convertir blob a imagen para OCR
            const imageData = await this.convertPDFToImage(blob);
            
            if (!imageData) {
                throw new Error('No se pudo convertir PDF a imagen');
            }

            // Realizar OCR
            console.log('🔍 Ejecutando reconocimiento OCR...');
            const { data: { text, confidence } } = await worker.recognize(imageData, {
                tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#♭♯majmindimsusadd ',
            });

            console.log(`🤖 OCR completado - Confianza: ${confidence}%`);
            console.log(`📏 Texto extraído por OCR: ${text.length} caracteres`);

            if (text.trim().length === 0) {
                return {
                    text: '',
                    metadata: { ocrConfidence: confidence },
                    extractionMethod: 'OCR_FAILED',
                    success: false,
                    helpMessage: 'OCR no pudo extraer texto útil del PDF.'
                };
            }

            return {
                text: text.trim(),
                metadata: { 
                    ocrConfidence: confidence,
                    ocrMethod: 'tesseract'
                },
                extractionMethod: 'OCR',
                success: true
            };

        } catch (error) {
            console.error('❌ Error en OCR fallback:', error);
            return {
                text: '',
                metadata: {},
                extractionMethod: 'OCR_FAILED',
                success: false,
                helpMessage: `Error en OCR: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * ✅ NUEVO: Configurar entrada manual cuando falla la extracción automática
     */
    async setupManualInput(blob, fileName, previousResult) {
        console.log('🚫 Extracción automática fallida - configurando entrada manual');
        
        return {
            text: '',
            metadata: previousResult.metadata || {},
            extractionMethod: 'MANUAL_REQUIRED',
            success: false,
            helpMessage: this.getManualInputHelpMessage(),
            requiresManualInput: true,
            fileName,
            blob
        };
    }

    /**
     * ✅ NUEVO: Convierte PDF a imagen para OCR
     */
    async convertPDFToImage(blob) {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1); // Primera página
            
            const scale = 2.0; // Mayor resolución para mejor OCR
            const viewport = page.getViewport({ scale });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            return canvas;

        } catch (error) {
            console.error('❌ Error convirtiendo PDF a imagen:', error);
            return null;
        }
    }

    /**
     * ✅ MEJORADO: Procesa items de texto con mejor espaciado
     */
    processTextItems(items) {
        if (!items || items.length === 0) {
            return '';
        }

        // Agrupar por líneas basado en coordenadas Y
        const lines = this.groupTextItemsByLines(items);
        
        // Procesar cada línea
        const processedLines = lines.map(line => {
            return line
                .sort((a, b) => a.transform[4] - b.transform[4]) // Ordenar por X
                .map(item => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
        });

        return processedLines
            .filter(line => line.length > 0)
            .join('\n');
    }

    /**
     * ✅ NUEVO: Agrupa items de texto por líneas
     */
    groupTextItemsByLines(items) {
        const lines = [];
        const threshold = 5; // Tolerancia para considerar misma línea

        for (const item of items) {
            if (!item.transform || item.transform.length < 6) continue;
            
            const y = item.transform[5];
            let lineFound = false;

            for (const line of lines) {
                if (line.length === 0) continue;
                
                const lineY = line[0].transform[5];
                if (Math.abs(y - lineY) <= threshold) {
                    line.push(item);
                    lineFound = true;
                    break;
                }
            }

            if (!lineFound) {
                lines.push([item]);
            }
        }

        // Ordenar líneas por Y (de arriba hacia abajo)
        return lines.sort((a, b) => {
            if (a.length === 0 || b.length === 0) return 0;
            return b[0].transform[5] - a[0].transform[5];
        });
    }

    /**
     * ✅ NUEVO: Verifica si es un carácter especial a ignorar
     */
    isSpecialCharacter(str) {
        const specialChars = /^[\u0000-\u001F\u007F-\u009F\uFEFF\u200B-\u200D\uFFFE\uFFFF]$/;
        return specialChars.test(str) || str.length === 0;
    }

    /**
     * ✅ MEJORADO: Extrae metadatos del PDF
     */
    async extractMetadata(pdf) {
        try {
            const metadata = await pdf.getMetadata();
            return {
                title: metadata.info.Title || null,
                author: metadata.info.Author || null,
                subject: metadata.info.Subject || null,
                creator: metadata.info.Creator || null,
                producer: metadata.info.Producer || null,
                creationDate: metadata.info.CreationDate || null,
                modificationDate: metadata.info.ModDate || null,
                pdfVersion: metadata.info.PDFFormatVersion || null,
                pageCount: pdf.numPages
            };
        } catch (error) {
            console.warn('⚠️ Error extrayendo metadatos:', error);
            return { pageCount: pdf?.numPages || 0 };
        }
    }

    /**
     * ✅ NUEVO: Genera clave de cache más específica
     */
    async generateCacheKey(blob, fileName) {
        const hash = await this.calculateSimpleHash(blob);
        return `pdf_${fileName}_${blob.size}_${hash}`;
    }

    /**
     * ✅ NUEVO: Calcula hash simple para cache
     */
    async calculateSimpleHash(blob) {
        const arrayBuffer = await blob.slice(0, 1024).arrayBuffer(); // Primeros 1KB
        let hash = 0;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < uint8Array.length; i++) {
            hash = ((hash << 5) - hash + uint8Array[i]) & 0xffffffff;
        }
        
        return Math.abs(hash).toString(16);
    }

    /**
     * ✅ NUEVO: Mensaje de ayuda para entrada manual
     */
    getManualInputHelpMessage() {
        return {
            title: "Se requiere entrada manual",
            description: "El PDF no pudo ser procesado automáticamente. Puedes ingresar los acordes manualmente.",
            suggestions: [
                "🎼 Usa el botón 'Agregar Acordes Manualmente' para escribir los acordes",
                "📄 Puedes ver el PDF mientras escribes los acordes",
                "✏️ Escribe los acordes en notación americana (C, Dm, G7, etc.)",
                "💡 El sistema detectará automáticamente los acordes que escribas"
            ],
            actions: [
                { text: "Agregar Acordes Manualmente", action: "showManualInput" },
                { text: "Ver PDF Original", action: "showPDF" }
            ]
        };
    }

    /**
     * ✅ NUEVO: Mensaje de ayuda para errores
     */
    getErrorHelpMessage(error) {
        const errorMessages = {
            'NetworkError': 'Error de conexión. Verifica tu conexión a internet.',
            'SecurityError': 'Error de seguridad. El PDF puede estar protegido.',
            'InvalidPDF': 'El archivo no es un PDF válido.',
            'CorruptedPDF': 'El PDF parece estar dañado.',
            'default': 'Error procesando el PDF. Intenta con otro archivo.'
        };

        const errorType = error.name || 'default';
        return errorMessages[errorType] || errorMessages.default;
    }

    /**
     * ✅ MEJORADO: Configuración con validación
     */
    setConfig(newConfig) {
        const validKeys = Object.keys(this.config);
        const filteredConfig = Object.keys(newConfig)
            .filter(key => validKeys.includes(key))
            .reduce((obj, key) => {
                obj[key] = newConfig[key];
                return obj;
            }, {});

        this.config = { ...this.config, ...filteredConfig };
        console.log('⚙️ Configuración de extracción actualizada:', this.config);
    }

    /**
     * ✅ MEJORADO: Limpieza de recursos
     */
    async cleanup() {
        try {
            if (this.currentDocument) {
                this.currentDocument.destroy();
                this.currentDocument = null;
                console.log('🗑️ Documento PDF limpiado');
            }
            
            if (this.ocrWorker && this.ocrInitialized) {
                await this.ocrWorker.terminate();
                this.ocrWorker = null;
                this.ocrInitialized = false;
                console.log('🗑️ OCR Worker terminado');
            }

            // Limpiar cache si es muy grande
            if (this.extractionCache.size > 50) {
                this.extractionCache.clear();
                console.log('🗑️ Cache de extracción limpiado');
            }

        } catch (error) {
            console.warn('⚠️ Error durante limpieza:', error);
        }
    }

    /**
     * ✅ NUEVO: Información de debug
     */
    getDebugInfo() {
        return {
            config: this.config,
            hasDocument: !!this.currentDocument,
            hasOCRWorker: !!this.ocrWorker,
            ocrInitialized: this.ocrInitialized,
            cacheSize: this.extractionCache.size,
            version: '2.0.0-fixed'
        };
    }
}

// === EXPORTAR ===
window.PDFTextExtractor = PDFTextExtractor;
console.log('📄 PDF Text Extractor CORREGIDO cargado - Versión 2.0.0');
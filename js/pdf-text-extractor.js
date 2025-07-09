/**
 * MUSIC PDF MANAGER - PDF TEXT EXTRACTOR CORREGIDO
 * Solución para el problema de extracción de 0 caracteres
 */

class PDFTextExtractor {
    constructor() {
        this.config = {
            preserveSpacing: true,
            includePositions: true,
            mergeLines: true,
            normalizeWhitespace: false,
            extractMetadata: true,
            useOCRFallback: true,          // NUEVO: Usar OCR como fallback
            ocrLanguage: 'eng+spa',        // NUEVO: Idiomas para OCR
            debugMode: true                // NUEVO: Modo debug detallado
        };
        
        this.currentDocument = null;
        this.extractionCache = new Map();
        this.ocrWorker = null;
        this.ocrScheduler = null;
    }

    /**
     * Inicializa Tesseract.js para OCR fallback
     */
async initializeOCR() {
    if (this.ocrWorker) return this.ocrWorker;
    
    try {
        // Verificar que Tesseract esté disponible (ya cargado en index.html)
        if (typeof Tesseract === 'undefined') {
            console.error('❌ Tesseract.js no está disponible');
            return null;
        }
        
        console.log('🤖 Inicializando OCR (modo sin workers)...');
        
        // Usar createScheduler sin workers para evitar problemas de CSP
        this.ocrScheduler = Tesseract.createScheduler();
        
        // Crear worker sin usar web workers reales
        const worker = await Tesseract.createWorker({
            logger: m => {
                if (m.status === 'recognizing text') {
                    console.log(`🔍 OCR progreso: ${Math.round(m.progress * 100)}%`);
                }
            }
        });
        
        await worker.loadLanguage(this.config.ocrLanguage);
        await worker.initialize(this.config.ocrLanguage);
        
        this.ocrScheduler.addWorker(worker);
        this.ocrWorker = this.ocrScheduler;
        
        console.log('✅ OCR inicializado correctamente (sin workers)');
        return this.ocrWorker;
        
    } catch (error) {
        console.warn('⚠️ No se pudo inicializar OCR:', error.message);
        this.ocrWorker = null;
        return null;
    }
}

    /**
     * Extrae texto de un blob PDF con debugging mejorado
     */
    async extractFromBlob(pdfBlob) {
        try {
            console.log('📄 Iniciando extracción de texto del PDF...');
            
            if (!pdfBlob || pdfBlob.type !== 'application/pdf') {
                throw new Error('El archivo no es un PDF válido');
            }

            // Verificar PDF.js
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js no está disponible');
            }

            // Generar clave de cache
            const cacheKey = await this.generateCacheKey(pdfBlob);
            
            // Verificar cache
            if (this.extractionCache.has(cacheKey)) {
                console.log('📋 Usando texto desde cache');
                return this.extractionCache.get(cacheKey);
            }

            // Convertir blob a ArrayBuffer
            const arrayBuffer = await pdfBlob.arrayBuffer();
            
            // Cargar documento PDF con configuración mejorada
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                verbosity: this.config.debugMode ? 1 : 0,
                standardFontDataUrl: null,
                enableXfa: true
            });
            
            this.currentDocument = await loadingTask.promise;
            
            console.log(`📖 PDF cargado: ${this.currentDocument.numPages} páginas`);
            
            // Extraer metadata
            const metadata = await this.extractMetadata();
            console.log('📊 Metadata extraída:', metadata);
            
            // Extraer texto de todas las páginas con debugging
            const extractedData = await this.extractAllPagesWithDebugging();
            
            // Si no se extrajo texto, intentar OCR fallback o mostrar ayuda
            if (extractedData.text.length === 0) {
                if (this.config.useOCRFallback) {
                    console.log('🤖 Texto vacío detectado, intentando OCR fallback...');
                    try {
                        const ocrResult = await this.extractWithOCR();
                        if (ocrResult && ocrResult.text.length > 0) {
                            extractedData.text = ocrResult.text;
                            extractedData.pages = ocrResult.pages;
                            extractedData.extractionMethod = 'OCR';
                        } else {
                            console.warn('🚫 OCR no pudo extraer texto útil');
                            extractedData.extractionMethod = 'FAILED';
                            extractedData.helpMessage = this.getHelpMessage();
                        }
                    } catch (ocrError) {
                        console.warn('⚠️ OCR fallback falló:', ocrError.message);
                        extractedData.extractionMethod = 'FAILED';
                        extractedData.helpMessage = this.getHelpMessage();
                    }
                } else {
                    console.warn('📄 Sin texto extraído y OCR desactivado');
                    extractedData.extractionMethod = 'FAILED';
                    extractedData.helpMessage = this.getHelpMessage();
                }
            }
            
            const result = {
                text: extractedData.text,
                pages: extractedData.pages,
                metadata: metadata,
                extractedAt: new Date().toISOString(),
                totalPages: this.currentDocument.numPages,
                extractionMethod: extractedData.extractionMethod || 'PDF.js'
            };
            
            // Guardar en cache
            this.extractionCache.set(cacheKey, result);
            
            console.log(`✅ Extracción completada: ${result.text.length} caracteres`);
            console.log(`🔧 Método usado: ${result.extractionMethod}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error en extracción de texto:', error);
            throw new Error(`Error extrayendo texto del PDF: ${error.message}`);
        }
    }

    /**
     * Extrae texto con debugging detallado
     */
    async extractAllPagesWithDebugging() {
        const pages = [];
        let combinedText = '';
        
        for (let pageNum = 1; pageNum <= this.currentDocument.numPages; pageNum++) {
            console.log(`📄 Procesando página ${pageNum}/${this.currentDocument.numPages}`);
            
            const pageData = await this.extractPageWithDebugging(pageNum);
            pages.push(pageData);
            
            // Combinar texto con separador de página
            if (combinedText.length > 0) {
                combinedText += '\n\n--- Página ' + pageNum + ' ---\n\n';
            }
            combinedText += pageData.text;
        }
        
        return {
            text: this.postProcessText(combinedText),
            pages: pages
        };
    }

    /**
     * Extrae página con debugging detallado
     */
    async extractPageWithDebugging(pageNum) {
        try {
            const page = await this.currentDocument.getPage(pageNum);
            
            // DEBUG: Información de la página
            console.log(`📋 Página ${pageNum} - Info:`, {
                rotation: page.rotate,
                userUnit: page.userUnit,
                view: page.view
            });
            
            const textContent = await page.getTextContent();
            
            // DEBUG: Información del contenido de texto
            console.log(`🔍 Página ${pageNum} - TextContent:`, {
                itemsCount: textContent.items.length,
                styles: Object.keys(textContent.styles || {}).length
            });
            
            // DEBUG: Mostrar primeros items si hay pocos
            if (textContent.items.length <= 10) {
                console.log(`📝 Página ${pageNum} - Items de texto:`, textContent.items);
            }
            
            // DEBUG: Verificar si hay items válidos
            const validItems = textContent.items.filter(item => 
                item.str && typeof item.str === 'string' && item.str.trim().length > 0
            );
            
            console.log(`✓ Página ${pageNum} - Items válidos: ${validItems.length}/${textContent.items.length}`);
            
            // Procesar items de texto
            const processedText = this.processTextItems(textContent.items);
            
            console.log(`📏 Página ${pageNum} - Texto extraído: ${processedText.text.length} caracteres`);
            
            return {
                pageNumber: pageNum,
                text: processedText.text,
                items: processedText.items,
                itemsCount: textContent.items.length,
                validItemsCount: validItems.length,
                viewport: page.getViewport({ scale: 1.0 })
            };
            
        } catch (error) {
            console.error(`❌ Error procesando página ${pageNum}:`, error);
            return {
                pageNumber: pageNum,
                text: '',
                items: [],
                error: error.message
            };
        }
    }

    /**
     * Extrae texto usando OCR como fallback
     */
async extractWithOCR() {
    try {
        const scheduler = await this.initializeOCR();
        if (!scheduler) {
            throw new Error('OCR scheduler no disponible');
        }
        
        const pages = [];
        let combinedText = '';
        
        for (let pageNum = 1; pageNum <= this.currentDocument.numPages; pageNum++) {
            console.log(`🤖 OCR - Procesando página ${pageNum}/${this.currentDocument.numPages}`);
            
            // Convertir página a imagen
            const imageData = await this.renderPageToImage(pageNum);
            
            // Aplicar OCR usando el scheduler
            const { data: { text } } = await scheduler.addJob('recognize', imageData);
            
            console.log(`📖 OCR - Página ${pageNum}: ${text.length} caracteres extraídos`);
            
            pages.push({
                pageNumber: pageNum,
                text: text,
                method: 'OCR'
            });
            
            if (combinedText.length > 0) {
                combinedText += '\n\n--- Página ' + pageNum + ' ---\n\n';
            }
            combinedText += text;
        }
        
        return {
            text: this.postProcessText(combinedText),
            pages: pages
        };
        
    } catch (error) {
        console.error('❌ Error en OCR fallback:', error);
        return null;
    }
}

    /**
     * Renderiza página del PDF como imagen para OCR
     */
    async renderPageToImage(pageNum) {
        const page = await this.currentDocument.getPage(pageNum);
        
        // Configurar viewport con escala alta para mejor OCR
        const viewport = page.getViewport({ scale: 2.0 });
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Renderizar página en canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        return canvas;
    }

    /**
     * Procesa items de texto con debugging mejorado
     */
    processTextItems(textItems) {
        if (!textItems || textItems.length === 0) {
            console.log('⚠️ No hay items de texto para procesar');
            return { text: '', items: [] };
        }

        console.log(`🔧 Procesando ${textItems.length} items de texto`);

        // DEBUG: Analizar tipos de items
        const itemAnalysis = this.analyzeTextItems(textItems);
        console.log('📊 Análisis de items:', itemAnalysis);

        // Filtrar items válidos
        const validItems = textItems.filter(item => {
            const isValid = item.str && 
                           typeof item.str === 'string' && 
                           item.str.trim().length > 0 &&
                           item.transform &&
                           Array.isArray(item.transform) &&
                           item.transform.length >= 6;
            
            if (!isValid && this.config.debugMode) {
                console.log('🚫 Item inválido:', item);
            }
            
            return isValid;
        });

        console.log(`✓ Items válidos para procesamiento: ${validItems.length}/${textItems.length}`);

        if (validItems.length === 0) {
            console.log('⚠️ No hay items válidos para extraer texto');
            return { text: '', items: [] };
        }

        // Organizar items por líneas basado en posición Y
        const lines = this.organizeItemsByLines(validItems);
        console.log(`📐 Organizados en ${lines.length} líneas`);
        
        // Procesar cada línea
        const processedLines = lines.map((line, index) => {
            const lineText = this.processLine(line);
            if (this.config.debugMode && lineText.trim()) {
                console.log(`📝 Línea ${index + 1}: "${lineText}"`);
            }
            return lineText;
        });
        
        // Combinar líneas
        const finalText = processedLines.join('\n');
        
        console.log(`📄 Texto final: ${finalText.length} caracteres`);
        
        return {
            text: finalText,
            items: validItems.map(item => this.processTextItem(item))
        };
    }

    /**
     * Analiza los items de texto para debugging
     */
    analyzeTextItems(items) {
        const analysis = {
            total: items.length,
            withText: 0,
            withTransform: 0,
            withValidTransform: 0,
            empty: 0,
            sample: []
        };

        items.forEach((item, index) => {
            if (item.str) analysis.withText++;
            if (item.transform) analysis.withTransform++;
            if (item.transform && Array.isArray(item.transform) && item.transform.length >= 6) {
                analysis.withValidTransform++;
            }
            if (!item.str || item.str.trim().length === 0) analysis.empty++;
            
            // Recopilar muestra de los primeros 5 items
            if (index < 5) {
                analysis.sample.push({
                    str: item.str,
                    hasTransform: !!item.transform,
                    transformLength: item.transform ? item.transform.length : 0
                });
            }
        });

        return analysis;
    }

    /**
     * Organiza items por líneas con tolerancia mejorada
     */
    organizeItemsByLines(textItems) {
        const lines = [];
        const yTolerance = 3; // Tolerancia reducida para mayor precisión
        
        textItems.forEach(item => {
            const y = item.transform[5]; // Posición Y
            
            // Buscar línea existente con Y similar
            let targetLine = lines.find(line => 
                Math.abs(line.y - y) <= yTolerance
            );
            
            if (!targetLine) {
                targetLine = { y: y, items: [] };
                lines.push(targetLine);
            }
            
            targetLine.items.push(item);
        });
        
        // Ordenar líneas por Y (de arriba a abajo)
        lines.sort((a, b) => b.y - a.y);
        
        // Ordenar items dentro de cada línea por X (de izquierda a derecha)
        lines.forEach(line => {
            line.items.sort((a, b) => a.transform[4] - b.transform[4]);
        });
        
        return lines.map(line => line.items);
    }

    /**
     * Procesa una línea de texto con espaciado mejorado
     */
    processLine(lineItems) {
        if (!lineItems || lineItems.length === 0) return '';
        
        let lineText = '';
        let lastX = 0;
        let lastWidth = 0;
        
        lineItems.forEach((item, index) => {
            const currentX = item.transform[4];
            const text = item.str.trim();
            
            if (!text) return; // Saltar items vacíos
            
            // Calcular espaciado basado en posición
            if (index > 0) {
                const spacing = this.calculateSpacing(lastX + lastWidth, currentX, item);
                lineText += spacing;
            }
            
            lineText += text;
            lastX = currentX;
            lastWidth = this.estimateTextWidth(text, item);
        });
        
        return lineText;
    }

    /**
     * Calcula espaciado entre elementos con lógica mejorada
     */
    calculateSpacing(lastEnd, currentX, item) {
        const gap = currentX - lastEnd;
        const charWidth = this.estimateCharWidth(item);
        
        if (gap > charWidth * 2) {
            // Gap grande - múltiples espacios
            const spaces = Math.min(Math.floor(gap / charWidth), 8);
            return ' '.repeat(Math.max(1, spaces));
        } else if (gap > charWidth * 0.3) {
            // Gap normal - un espacio
            return ' ';
        } else {
            // Sin gap significativo
            return '';
        }
    }

    /**
     * Estima ancho de texto con mayor precisión
     */
    estimateTextWidth(text, textItem) {
        const fontSize = textItem.transform[0] || 12;
        const scale = textItem.transform[3] || 1;
        const avgCharWidth = fontSize * scale * 0.6;
        return text.length * avgCharWidth;
    }

    /**
     * Estima ancho de carácter
     */
    estimateCharWidth(textItem) {
        const fontSize = textItem.transform[0] || 12;
        const scale = textItem.transform[3] || 1;
        return fontSize * scale * 0.6;
    }

    /**
     * Procesa item de texto individual
     */
    processTextItem(item) {
        return {
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
            fontSize: item.transform[0] || 12,
            fontName: item.fontName || 'unknown'
        };
    }

    /**
     * Post-procesa el texto extraído
     */
    postProcessText(text) {
        let processed = text;
        
        // Limpiar caracteres problemáticos primero
        processed = this.cleanText(processed);
        
        if (this.config.mergeLines) {
            // Unir líneas que están fragmentadas
            processed = this.mergeFragmentedLines(processed);
        }
        
        if (this.config.normalizeWhitespace) {
            // Normalizar espacios en blanco
            processed = processed.replace(/\s+/g, ' ');
        }
        
        return processed.trim();
    }

    /**
     * Une líneas fragmentadas con lógica mejorada
     */
    mergeFragmentedLines(text) {
        const lines = text.split('\n');
        const mergedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            let currentLine = lines[i].trim();
            
            if (!currentLine) {
                // Línea vacía - agregar si no es consecutiva
                if (i > 0 && mergedLines[mergedLines.length - 1]) {
                    mergedLines.push('');
                }
                continue;
            }
            
            // Verificar si la línea anterior termina de manera incompleta
            if (i > 0 && this.shouldMergeWithPrevious(currentLine, lines[i - 1])) {
                // Unir con línea anterior
                const lastIndex = mergedLines.length - 1;
                if (lastIndex >= 0) {
                    mergedLines[lastIndex] = mergedLines[lastIndex] + ' ' + currentLine;
                } else {
                    mergedLines.push(currentLine);
                }
            } else {
                mergedLines.push(currentLine);
            }
        }
        
        return mergedLines.join('\n');
    }

    /**
     * Determina si una línea debe unirse con la anterior
     */
    shouldMergeWithPrevious(currentLine, previousLine) {
        if (!currentLine || !previousLine) return false;
        
        const prevTrimmed = previousLine.trim();
        const currTrimmed = currentLine.trim();
        
        // Si la línea anterior termina con guión
        if (prevTrimmed.endsWith('-')) return true;
        
        // Si la línea anterior es muy corta y no termina con puntuación
        if (prevTrimmed.length < 50 && !/[.!?:;]$/.test(prevTrimmed)) {
            // Y la línea actual no empieza con mayúscula o acorde musical
            if (!/^[A-Z]/.test(currTrimmed) && !/^[A-G][#b]?/.test(currTrimmed)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Limpia el texto de caracteres problemáticos
     */
    cleanText(text) {
        return text
            .replace(/\u00A0/g, ' ')          // Espacios no-breaking
            .replace(/\u2013/g, '-')         // En dash
            .replace(/\u2014/g, '--')        // Em dash
            .replace(/[\u2018\u2019]/g, "'") // Smart quotes
            .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
            .replace(/\u2026/g, '...')       // Ellipsis
            .replace(/\f/g, '\n')            // Form feed a newline
            .replace(/\r\n/g, '\n')          // Windows line endings
            .replace(/\r/g, '\n')            // Mac line endings
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Control characters
    }

    /**
     * Extrae metadata del PDF
     */
    async extractMetadata() {
        if (!this.config.extractMetadata || !this.currentDocument) {
            return {};
        }

        try {
            const metadata = await this.currentDocument.getMetadata();
            
            return {
                title: metadata.info.Title || null,
                author: metadata.info.Author || null,
                subject: metadata.info.Subject || null,
                creator: metadata.info.Creator || null,
                producer: metadata.info.Producer || null,
                creationDate: metadata.info.CreationDate || null,
                modificationDate: metadata.info.ModDate || null,
                keywords: metadata.info.Keywords || null,
                pages: this.currentDocument.numPages,
                version: metadata.info.PDFFormatVersion || null
            };
            
        } catch (error) {
            console.warn('⚠️ Error extrayendo metadata:', error);
            return {};
        }
    }

    /**
     * Genera clave de cache para el blob
     */
    async generateCacheKey(blob) {
        return `pdf_${blob.size}_${blob.type}_${Date.now()}`;
    }

    /**
     * Configura opciones de extracción
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Configuración de extracción actualizada:', this.config);
    }

    /**
     * Limpia recursos
     */
async cleanup() {
    if (this.currentDocument) {
        this.currentDocument.destroy();
        this.currentDocument = null;
    }
    
    if (this.ocrScheduler) {
        await this.ocrScheduler.terminate();
        this.ocrScheduler = null;
    }
    
    this.ocrWorker = null;
}

    /**
     * Obtiene mensaje de ayuda para PDFs sin texto extraíble
     */
    getHelpMessage() {
        return {
            title: "PDF con texto como imagen detectado",
            description: "Este PDF contiene texto en formato de imagen que no puede ser extraído automáticamente.",
            suggestions: [
                "✏️ Verifica que el PDF tenga texto seleccionable (intenta seleccionar texto con el mouse)",
                "🔄 Si el PDF es escaneado, considera convertirlo a texto usando herramientas OCR externas",
                "📝 Como alternativa, puedes escribir los acordes manualmente en un editor de texto",
                "🎼 El PDF se puede visualizar normalmente, pero la detección automática de acordes no funcionará"
            ],
            troubleshooting: {
                textSelectable: "¿Puedes seleccionar texto en el PDF? Si no, es una imagen escaneada.",
                ocrAvailable: "El OCR automático está " + (this.config.useOCRFallback ? "activado" : "desactivado"),
                fileType: "Tipo de archivo procesado: PDF con contenido de imagen"
            }
        };
    }

    /**
     * Obtiene estadísticas de extracción
     */
getDebugInfo() {
    return {
        config: this.config,
        hasDocument: !!this.currentDocument,
        hasOCRScheduler: !!this.ocrScheduler,
        hasOCRWorker: !!this.ocrWorker,  // Mantenido para compatibilidad
        cacheSize: this.extractionCache.size
    };
}
}

// === EXPORTAR ===
window.PDFTextExtractor = PDFTextExtractor;
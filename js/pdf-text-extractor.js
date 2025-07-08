/**
 * MUSIC PDF MANAGER - PDF TEXT EXTRACTOR
 * Extrae texto de PDFs manteniendo posiciones y formato
 */

class PDFTextExtractor {
    constructor() {
        this.config = {
            preserveSpacing: true,
            includePositions: true,
            mergeLines: true,
            normalizeWhitespace: false,
            extractMetadata: true
        };
        
        this.currentDocument = null;
        this.extractionCache = new Map();
    }

    /**
     * Extrae texto de un blob PDF
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
            
            // Cargar documento PDF
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                verbosity: 0
            });
            
            this.currentDocument = await loadingTask.promise;
            
            console.log(`📖 PDF cargado: ${this.currentDocument.numPages} páginas`);
            
            // Extraer metadata
            const metadata = await this.extractMetadata();
            
            // Extraer texto de todas las páginas
            const extractedData = await this.extractAllPages();
            
            const result = {
                text: extractedData.text,
                pages: extractedData.pages,
                metadata: metadata,
                extractedAt: new Date().toISOString(),
                totalPages: this.currentDocument.numPages
            };
            
            // Guardar en cache
            this.extractionCache.set(cacheKey, result);
            
            console.log(`✅ Extracción completada: ${result.text.length} caracteres`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Error en extracción de texto:', error);
            throw new Error(`Error extrayendo texto del PDF: ${error.message}`);
        }
    }

    /**
     * Extrae texto de todas las páginas
     */
    async extractAllPages() {
        const pages = [];
        let combinedText = '';
        
        for (let pageNum = 1; pageNum <= this.currentDocument.numPages; pageNum++) {
            console.log(`📄 Procesando página ${pageNum}/${this.currentDocument.numPages}`);
            
            const pageData = await this.extractPage(pageNum);
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
     * Extrae texto de una página específica
     */
    async extractPage(pageNum) {
        try {
            const page = await this.currentDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Procesar items de texto
            const processedText = this.processTextItems(textContent.items);
            
            return {
                pageNumber: pageNum,
                text: processedText.text,
                items: processedText.items,
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
     * Procesa items de texto manteniendo posiciones
     */
    processTextItems(textItems) {
        if (!textItems || textItems.length === 0) {
            return { text: '', items: [] };
        }

        // Organizar items por líneas basado en posición Y
        const lines = this.organizeItemsByLines(textItems);
        
        // Procesar cada línea
        const processedLines = lines.map(line => this.processLine(line));
        
        // Combinar líneas
        const finalText = processedLines.join('\n');
        
        return {
            text: finalText,
            items: textItems.map(item => this.processTextItem(item))
        };
    }

    /**
     * Organiza items de texto por líneas
     */
    organizeItemsByLines(textItems) {
        const lines = [];
        const yTolerance = 5; // Tolerancia para considerar items en la misma línea
        
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
     * Procesa una línea de texto
     */
    processLine(lineItems) {
        if (!lineItems || lineItems.length === 0) return '';
        
        let lineText = '';
        let lastX = 0;
        
        lineItems.forEach((item, index) => {
            const currentX = item.transform[4];
            const text = item.str;
            
            // Calcular espaciado basado en posición
            if (index > 0) {
                const spacing = this.calculateSpacing(lastX, currentX, item);
                lineText += spacing;
            }
            
            lineText += text;
            lastX = currentX + this.estimateTextWidth(text);
        });
        
        return lineText.trim();
    }

    /**
     * Calcula espaciado entre elementos de texto
     */
    calculateSpacing(lastX, currentX, item) {
        if (!this.config.preserveSpacing) return ' ';
        
        const gap = currentX - lastX;
        const charWidth = this.estimateCharWidth(item);
        
        if (gap > charWidth * 3) {
            // Gap grande - múltiples espacios
            const spaces = Math.min(Math.floor(gap / charWidth), 10);
            return ' '.repeat(Math.max(1, spaces));
        } else if (gap > charWidth * 0.5) {
            // Gap normal - un espacio
            return ' ';
        } else {
            // Sin gap - no agregar espacio
            return '';
        }
    }

    /**
     * Estima ancho de carácter
     */
    estimateCharWidth(textItem) {
        // Estimación basada en el tamaño de fuente
        const fontSize = textItem.transform[0] || 12;
        return fontSize * 0.6; // Aproximación
    }

    /**
     * Estima ancho de texto
     */
    estimateTextWidth(text) {
        // Estimación simple - mejorar en futuras versiones
        return text.length * 7; // 7 píxeles por carácter promedio
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
        
        if (this.config.normalizeWhitespace) {
            // Normalizar espacios en blanco
            processed = processed.replace(/\s+/g, ' ');
        }
        
        if (this.config.mergeLines) {
            // Unir líneas que están fragmentadas
            processed = this.mergeFragmentedLines(processed);
        }
        
        // Limpiar caracteres problemáticos
        processed = this.cleanText(processed);
        
        return processed.trim();
    }

    /**
     * Une líneas fragmentadas
     */
    mergeFragmentedLines(text) {
        const lines = text.split('\n');
        const mergedLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            let currentLine = lines[i].trim();
            
            // Verificar si la línea anterior termina de manera incompleta
            if (i > 0 && this.shouldMergeWithPrevious(currentLine, lines[i - 1])) {
                // Unir con línea anterior
                const lastIndex = mergedLines.length - 1;
                mergedLines[lastIndex] = mergedLines[lastIndex] + ' ' + currentLine;
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
        
        // Si la línea anterior termina con guión
        if (prevTrimmed.endsWith('-')) return true;
        
        // Si la línea anterior es muy corta y no termina con puntuación
        if (prevTrimmed.length < 50 && !/[.!?:;]$/.test(prevTrimmed)) {
            // Y la línea actual no empieza con mayúscula o acorde
            if (!/^[A-Z]/.test(currentLine) && !/^[A-G][#b]?/.test(currentLine)) {
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
            .replace(/\r/g, '\n');           // Mac line endings
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
        // Usar tamaño y tipo como clave simple
        // En producción, considerar usar hash del contenido
        return `pdf_${blob.size}_${blob.type}_${Date.now()}`;
    }

    /**
     * Extrae texto específico por coordenadas
     */
    async extractTextByRegion(pageNum, x, y, width, height) {
        try {
            const page = await this.currentDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            const regionItems = textContent.items.filter(item => {
                const itemX = item.transform[4];
                const itemY = item.transform[5];
                
                return itemX >= x && itemX <= x + width &&
                       itemY >= y && itemY <= y + height;
            });
            
            return this.processTextItems(regionItems).text;
            
        } catch (error) {
            console.error('❌ Error extrayendo región:', error);
            return '';
        }
    }

    /**
     * Busca texto específico en el PDF
     */
    async searchText(searchTerm, caseSensitive = false) {
        if (!this.currentDocument) return [];
        
        const results = [];
        const searchRegex = new RegExp(
            searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            caseSensitive ? 'g' : 'gi'
        );
        
        for (let pageNum = 1; pageNum <= this.currentDocument.numPages; pageNum++) {
            const pageData = await this.extractPage(pageNum);
            const matches = pageData.text.matchAll(searchRegex);
            
            for (const match of matches) {
                results.push({
                    page: pageNum,
                    text: match[0],
                    index: match.index,
                    context: this.getSearchContext(pageData.text, match.index, 50)
                });
            }
        }
        
        return results;
    }

    /**
     * Obtiene contexto alrededor de una búsqueda
     */
    getSearchContext(text, index, radius) {
        const start = Math.max(0, index - radius);
        const end = Math.min(text.length, index + radius);
        return text.slice(start, end);
    }

    /**
     * Obtiene estadísticas del texto extraído
     */
    getExtractionStats(extractedData) {
        const text = extractedData.text;
        
        return {
            totalCharacters: text.length,
            totalWords: text.split(/\s+/).filter(w => w.length > 0).length,
            totalLines: text.split('\n').length,
            totalPages: extractedData.totalPages,
            hasMetadata: Object.keys(extractedData.metadata || {}).length > 0,
            averageWordsPerPage: Math.round(
                text.split(/\s+/).filter(w => w.length > 0).length / extractedData.totalPages
            ),
            extractionTime: extractedData.extractedAt
        };
    }

    /**
     * Limpia cache de extracción
     */
    clearCache() {
        this.extractionCache.clear();
        console.log('🗑️ Cache de extracción limpiado');
    }

    /**
     * Obtiene información del cache
     */
    getCacheInfo() {
        return {
            size: this.extractionCache.size,
            keys: Array.from(this.extractionCache.keys())
        };
    }

    /**
     * Configura opciones de extracción
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Configuración de extracción actualizada:', this.config);
    }

    /**
     * Cierra documento actual
     */
    closeDocument() {
        if (this.currentDocument) {
            this.currentDocument.destroy();
            this.currentDocument = null;
        }
    }
}

// === EXPORTAR ===
window.PDFTextExtractor = PDFTextExtractor;
/**
 * MUSIC PDF MANAGER - MUSICAL RENDERER
 * Renderiza texto musical con acordes resaltados
 */

class MusicalRenderer {
    constructor() {
        this.chordClickHandler = null;
        this.config = {
            preserveSpacing: true,
            highlightOnHover: true,
            showChordTooltips: true,
            animateTransitions: true
        };
        
        this.chordElements = new Map();
        this.lastRenderedChords = [];
    }

    /**
     * Renderiza texto musical con acordes resaltados
     */
    render(text, chords, config = {}) {
        console.log('🎨 Renderizando contenido musical...');
        
        if (!text || !chords) {
            return this.renderEmptyState();
        }

        // Actualizar configuración
        this.updateConfig(config);
        
        // Limpiar elementos anteriores
        this.chordElements.clear();
        
        // Ordenar acordes por posición
        const sortedChords = [...chords].sort((a, b) => a.position - b.position);
        
        // Construir HTML con acordes resaltados
        const renderedHTML = this.buildHTMLWithChords(text, sortedChords);
        
        // Guardar acordes para referencia
        this.lastRenderedChords = sortedChords;
        
        console.log(`✅ Renderizado completado: ${sortedChords.length} acordes resaltados`);
        
        return renderedHTML;
    }

    /**
     * Construye HTML con acordes resaltados
     */
    buildHTMLWithChords(text, chords) {
        if (chords.length === 0) {
            return this.escapeHtml(text);
        }

        let html = '';
        let lastIndex = 0;
        
        chords.forEach((chord, index) => {
            // Agregar texto antes del acorde
            if (chord.position > lastIndex) {
                const beforeText = text.slice(lastIndex, chord.position);
                html += this.escapeHtml(beforeText);
            }
            
            // Agregar acorde resaltado
            html += this.renderChord(chord, index);
            
            lastIndex = chord.position + chord.length;
        });
        
        // Agregar texto restante
        if (lastIndex < text.length) {
            const remainingText = text.slice(lastIndex);
            html += this.escapeHtml(remainingText);
        }
        
        return html;
    }

    /**
     * Renderiza un acorde individual
     */
    renderChord(chord, index) {
        const chordId = `chord-${index}`;
        const chordClasses = this.getChordClasses(chord);
        const chordAttributes = this.getChordAttributes(chord, chordId);
        
        // Crear elemento de acorde
        const chordElement = `<span ${chordAttributes} class="${chordClasses}">${this.escapeHtml(chord.transposed)}</span>`;
        
        // Guardar referencia
        this.chordElements.set(chordId, chord);
        
        return chordElement;
    }

    /**
     * Obtiene clases CSS para un acorde
     */
    getChordClasses(chord) {
        const classes = ['chord'];
        
        // Tipo de acorde
        classes.push(`chord-type-${chord.type}`);
        
        // Complejidad
        if (chord.isComplex) {
            classes.push('complex');
        }
        
        // Nota de bajo
        if (chord.hasBassNote) {
            classes.push('bass-note');
        }
        
        // Nivel de confianza
        if (chord.confidence < 0.7) {
            classes.push('low-confidence');
        } else if (chord.confidence > 0.9) {
            classes.push('high-confidence');
        }
        
        return classes.join(' ');
    }

    /**
     * Obtiene atributos para un acorde
     */
    getChordAttributes(chord, chordId) {
        const attributes = [
            `id="${chordId}"`,
            `data-original="${this.escapeHtml(chord.original)}"`,
            `data-transposed="${this.escapeHtml(chord.transposed)}"`,
            `data-note="${chord.note}"`,
            `data-type="${chord.type}"`,
            `data-confidence="${chord.confidence.toFixed(2)}"`,
            `onclick="MusicalModule.handleChordClick('${chordId}')"`
        ];
        
        if (chord.suffix) {
            attributes.push(`data-suffix="${this.escapeHtml(chord.suffix)}"`);
        }
        
        if (chord.bassNote) {
            attributes.push(`data-bass-note="${chord.bassNote}"`);
        }
        
        if (this.config.showChordTooltips) {
            attributes.push(`title="${this.generateChordTooltip(chord)}"`);
        }
        
        return attributes.join(' ');
    }

    /**
     * Genera tooltip para un acorde
     */
    generateChordTooltip(chord) {
        let tooltip = `${chord.transposed}`;
        
        if (chord.original !== chord.transposed) {
            tooltip += ` (Original: ${chord.original})`;
        }
        
        tooltip += `\nTipo: ${chord.type}`;
        
        if (chord.bassNote) {
            tooltip += `\nBajo: ${chord.bassNote}`;
        }
        
        tooltip += `\nConfianza: ${Math.round(chord.confidence * 100)}%`;
        
        return tooltip;
    }

    /**
     * Actualiza acordes transpuestos sin re-renderizar todo
     */
    updateTransposedChords(newChords) {
        console.log('🔄 Actualizando acordes transpuestos...');
        
        newChords.forEach((chord, index) => {
            const chordId = `chord-${index}`;
            const element = document.getElementById(chordId);
            
            if (element) {
                // Actualizar texto
                element.textContent = chord.transposed;
                
                // Actualizar atributos
                element.setAttribute('data-transposed', chord.transposed);
                element.setAttribute('data-note', chord.note);
                
                if (chord.bassNote) {
                    element.setAttribute('data-bass-note', chord.bassNote);
                }
                
                // Actualizar tooltip
                if (this.config.showChordTooltips) {
                    element.title = this.generateChordTooltip(chord);
                }
                
                // Agregar animación si está habilitada
                if (this.config.animateTransitions) {
                    this.animateChordChange(element);
                }
                
                // Actualizar referencia
                this.chordElements.set(chordId, chord);
            }
        });
    }

    /**
     * Anima cambio de acorde
     */
    animateChordChange(element) {
        element.classList.add('transposed');
        
        setTimeout(() => {
            element.classList.remove('transposed');
        }, 300);
    }

    /**
     * Resalta un acorde específico
     */
    highlightChord(chordId, temporary = false) {
        const element = document.getElementById(chordId);
        if (!element) return;
        
        element.classList.add('highlighted');
        
        if (temporary) {
            setTimeout(() => {
                element.classList.remove('highlighted');
            }, 2000);
        }
    }

    /**
     * Remueve resaltado de todos los acordes
     */
    removeAllHighlights() {
        document.querySelectorAll('.chord.highlighted').forEach(element => {
            element.classList.remove('highlighted');
        });
    }

    /**
     * Filtra acordes por tipo
     */
    filterChordsByType(chordType, visible = true) {
        const selector = `.chord-type-${chordType}`;
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            if (visible) {
                element.style.display = 'inline';
                element.classList.remove('chord-hidden');
            } else {
                element.style.display = 'none';
                element.classList.add('chord-hidden');
            }
        });
        
        console.log(`🎯 ${visible ? 'Mostrados' : 'Ocultados'} ${elements.length} acordes tipo ${chordType}`);
    }

    /**
     * Muestra todos los acordes
     */
    showAllChords() {
        document.querySelectorAll('.chord').forEach(element => {
            element.style.display = 'inline';
            element.classList.remove('chord-hidden');
        });
    }

    /**
     * Aplica estilo personalizado a acordes
     */
    applyChordStyle(styleName) {
        const container = document.querySelector('.musical-text');
        if (!container) return;
        
        // Remover estilos anteriores
        container.className = container.className
            .replace(/chord-style-\w+/g, '')
            .trim();
        
        // Agregar nuevo estilo
        container.classList.add(`chord-style-${styleName}`);
        
        console.log(`🎨 Aplicado estilo de acordes: ${styleName}`);
    }

    /**
     * Ajusta tamaño de fuente
     */
    adjustFontSize(fontSize) {
        const container = document.querySelector('.musical-content');
        if (container) {
            container.style.fontSize = fontSize + 'px';
            console.log(`📏 Tamaño de fuente ajustado: ${fontSize}px`);
        }
    }

    /**
     * Busca y resalta acordes específicos
     */
    searchAndHighlightChords(searchTerm) {
        if (!searchTerm) {
            this.removeAllHighlights();
            return 0;
        }
        
        const normalizedSearch = searchTerm.toLowerCase();
        let highlightedCount = 0;
        
        this.chordElements.forEach((chord, chordId) => {
            const element = document.getElementById(chordId);
            if (!element) return;
            
            const matches = (
                chord.original.toLowerCase().includes(normalizedSearch) ||
                chord.transposed.toLowerCase().includes(normalizedSearch) ||
                chord.note.toLowerCase().includes(normalizedSearch) ||
                (chord.type && chord.type.toLowerCase().includes(normalizedSearch))
            );
            
            if (matches) {
                element.classList.add('search-highlighted');
                highlightedCount++;
            } else {
                element.classList.remove('search-highlighted');
            }
        });
        
        console.log(`🔍 Resaltados ${highlightedCount} acordes que coinciden con: ${searchTerm}`);
        return highlightedCount;
    }

    /**
     * Limpia resaltado de búsqueda
     */
    clearSearchHighlight() {
        document.querySelectorAll('.chord.search-highlighted').forEach(element => {
            element.classList.remove('search-highlighted');
        });
    }

    /**
     * Obtiene acordes únicos
     */
    getUniqueChords() {
        const unique = new Map();
        
        this.lastRenderedChords.forEach(chord => {
            const key = chord.transposed;
            if (!unique.has(key)) {
                unique.set(key, {
                    chord: chord.transposed,
                    type: chord.type,
                    count: 1,
                    positions: [chord.position]
                });
            } else {
                unique.get(key).count++;
                unique.get(key).positions.push(chord.position);
            }
        });
        
        return Array.from(unique.values())
            .sort((a, b) => b.count - a.count);
    }

    /**
     * Genera estadísticas de renderizado
     */
    getRenderStats() {
        const chordsByType = {};
        const chordsByNote = {};
        
        this.lastRenderedChords.forEach(chord => {
            // Por tipo
            chordsByType[chord.type] = (chordsByType[chord.type] || 0) + 1;
            
            // Por nota
            chordsByNote[chord.note] = (chordsByNote[chord.note] || 0) + 1;
        });
        
        return {
            totalChords: this.lastRenderedChords.length,
            uniqueChords: this.getUniqueChords().length,
            chordsByType,
            chordsByNote,
            avgConfidence: this.calculateAverageConfidence(),
            complexChords: this.lastRenderedChords.filter(c => c.isComplex).length,
            bassNoteChords: this.lastRenderedChords.filter(c => c.hasBassNote).length
        };
    }

    /**
     * Calcula confianza promedio
     */
    calculateAverageConfidence() {
        if (this.lastRenderedChords.length === 0) return 0;
        
        const total = this.lastRenderedChords.reduce((sum, chord) => sum + chord.confidence, 0);
        return Math.round((total / this.lastRenderedChords.length) * 100) / 100;
    }

    /**
     * Exporta acordes como texto plano
     */
    exportChords(format = 'simple') {
        const uniqueChords = this.getUniqueChords();
        
        switch (format) {
            case 'simple':
                return uniqueChords.map(c => c.chord).join(' | ');
                
            case 'detailed':
                return uniqueChords.map(c => 
                    `${c.chord} (${c.type}, usado ${c.count} vez${c.count !== 1 ? 'es' : ''})`
                ).join('\n');
                
            case 'json':
                return JSON.stringify(uniqueChords, null, 2);
                
            default:
                return uniqueChords;
        }
    }

    /**
     * Renderiza estado vacío
     */
    renderEmptyState() {
        return `
            <div class="musical-empty-state">
                <div class="empty-icon">🎼</div>
                <p>No hay contenido musical para mostrar</p>
            </div>
        `;
    }

    /**
     * Escapa HTML
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Actualiza configuración
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Establece manejador de click en acordes
     */
    setChordClickHandler(handler) {
        this.chordClickHandler = handler;
    }

    /**
     * Maneja click en acorde
     */
    handleChordClick(chordId) {
        const chord = this.chordElements.get(chordId);
        const element = document.getElementById(chordId);
        
        if (chord && element && this.chordClickHandler) {
            this.chordClickHandler(chord, element);
        }
        
        // Resaltar temporalmente
        this.highlightChord(chordId, true);
    }

    /**
     * Limpia todos los elementos renderizados
     */
    clear() {
        this.chordElements.clear();
        this.lastRenderedChords = [];
        this.removeAllHighlights();
        this.clearSearchHighlight();
    }

    /**
     * Verifica si el renderizado es válido
     */
    validateRender() {
        const issues = [];
        
        // Verificar que todos los acordes tengan elementos
        this.lastRenderedChords.forEach((chord, index) => {
            const chordId = `chord-${index}`;
            const element = document.getElementById(chordId);
            
            if (!element) {
                issues.push(`Elemento faltante para acorde ${chord.transposed} en posición ${index}`);
            }
        });
        
        // Verificar elementos huérfanos
        document.querySelectorAll('.chord').forEach(element => {
            const chordId = element.id;
            if (!this.chordElements.has(chordId)) {
                issues.push(`Elemento huérfano encontrado: ${chordId}`);
            }
        });
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }

    /**
     * Debug del renderizador
     */
    debugRender() {
        console.group('🎨 MUSICAL RENDERER DEBUG');
        console.log('Configuración:', this.config);
        console.log('Acordes renderizados:', this.lastRenderedChords.length);
        console.log('Elementos de acordes:', this.chordElements.size);
        console.log('Estadísticas:', this.getRenderStats());
        console.log('Validación:', this.validateRender());
        console.groupEnd();
    }
}

// === EXPORTAR ===
window.MusicalRenderer = MusicalRenderer;
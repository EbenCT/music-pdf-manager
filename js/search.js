/**
 * MUSIC PDF MANAGER - SEARCH FUNCTIONALITY
 * Maneja la funcionalidad de búsqueda avanzada y filtrado
 */

class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchResults = null;
        this.searchTimeout = null;
        this.isSearching = false;
        this.lastQuery = '';
        
        // Configuración
        this.config = window.APP_CONFIG?.SEARCH || {
            MIN_QUERY_LENGTH: 2,
            DEBOUNCE_DELAY: 300,
            MAX_RESULTS: 10,
            FUZZY_THRESHOLD: 0.6
        };

        this.init();
    }

    /**
     * Inicializa el sistema de búsqueda
     */
    init() {
        this.searchInput = document.getElementById('search-input');
        this.searchResults = document.getElementById('search-results');
        
        if (!this.searchInput || !this.searchResults) {
            console.warn('⚠️ Elementos de búsqueda no encontrados');
            return;
        }

        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        
        console.log('🔍 Search Manager inicializado');
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Input de búsqueda con debounce
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // Focus y blur del input
        this.searchInput.addEventListener('focus', () => {
            this.onSearchFocus();
        });

        this.searchInput.addEventListener('blur', (e) => {
            // Pequeño delay para permitir clics en resultados
            setTimeout(() => this.onSearchBlur(e), 150);
        });

        // Navegación con teclado en resultados
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Click fuera para cerrar resultados
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideResults();
            }
        });
    }

    /**
     * Configura atajos de teclado globales
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + F para enfocar búsqueda
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                this.focusSearch();
            }

            // Escape para limpiar búsqueda
            if (e.key === 'Escape' && document.activeElement === this.searchInput) {
                this.clearSearch();
            }
        });
    }

    /**
     * Maneja el input de búsqueda con debounce
     */
    handleSearchInput(query) {
        // Limpiar timeout anterior
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce para evitar búsquedas excesivas
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, this.config.DEBOUNCE_DELAY);
    }

    /**
     * Realiza la búsqueda
     */
    async performSearch(query) {
        const trimmedQuery = query.trim();
        
        // Validar longitud mínima
        if (trimmedQuery.length < this.config.MIN_QUERY_LENGTH) {
            this.clearResults();
            this.updateGlobalFilter('');
            return;
        }

        // Evitar búsquedas repetidas
        if (trimmedQuery === this.lastQuery) {
            return;
        }

        this.lastQuery = trimmedQuery;
        this.isSearching = true;

        try {
            console.log(`🔍 Buscando: "${trimmedQuery}"`);

            // Realizar búsqueda
            const results = await this.search(trimmedQuery);
            
            // Mostrar resultados
            this.displayResults(results, trimmedQuery);
            
            // Actualizar filtro global
            this.updateGlobalFilter(trimmedQuery);

        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            this.showSearchError();
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * Busca en todas las fuentes disponibles
     */
    async search(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        // Obtener archivos del estado global
        const files = window.AppState?.files || { instrumentos: [], voces: [] };

        // Buscar en instrumentos
        files.instrumentos.forEach(file => {
            const score = this.calculateRelevanceScore(file.name, lowerQuery);
            if (score > 0) {
                results.push({
                    ...file,
                    section: 'instrumentos',
                    sectionName: 'Instrumentos',
                    score: score,
                    matchType: this.getMatchType(file.name, lowerQuery)
                });
            }
        });

        // Buscar en voces
        files.voces.forEach(file => {
            const score = this.calculateRelevanceScore(file.name, lowerQuery);
            if (score > 0) {
                results.push({
                    ...file,
                    section: 'voces',
                    sectionName: 'Voces',
                    score: score,
                    matchType: this.getMatchType(file.name, lowerQuery)
                });
            }
        });

        // Ordenar por relevancia
        results.sort((a, b) => {
            // Primero por tipo de coincidencia
            if (a.matchType !== b.matchType) {
                const typeOrder = { exact: 0, startsWith: 1, contains: 2, fuzzy: 3 };
                return typeOrder[a.matchType] - typeOrder[b.matchType];
            }
            // Luego por score
            return b.score - a.score;
        });

        // Limitar resultados
        return results.slice(0, this.config.MAX_RESULTS);
    }

    /**
     * Calcula la puntuación de relevancia
     */
    calculateRelevanceScore(text, query) {
        const lowerText = text.toLowerCase();
        
        // Coincidencia exacta
        if (lowerText === query) {
            return 100;
        }

        // Comienza con la query
        if (lowerText.startsWith(query)) {
            return 90;
        }

        // Contiene la query completa
        if (lowerText.includes(query)) {
            return 80;
        }

        // Búsqueda fuzzy por palabras
        const words = query.split(' ').filter(w => w.length > 1);
        let matchCount = 0;
        
        words.forEach(word => {
            if (lowerText.includes(word)) {
                matchCount++;
            }
        });

        if (matchCount > 0) {
            return Math.floor((matchCount / words.length) * 70);
        }

        // Búsqueda por caracteres similares
        const similarity = this.calculateStringSimilarity(lowerText, query);
        if (similarity > this.config.FUZZY_THRESHOLD) {
            return Math.floor(similarity * 60);
        }

        return 0;
    }

    /**
     * Determina el tipo de coincidencia
     */
    getMatchType(text, query) {
        const lowerText = text.toLowerCase();
        
        if (lowerText === query) return 'exact';
        if (lowerText.startsWith(query)) return 'startsWith';
        if (lowerText.includes(query)) return 'contains';
        
        return 'fuzzy';
    }

    /**
     * Calcula similitud entre strings (algoritmo simple)
     */
    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Distancia de Levenshtein (para búsqueda fuzzy)
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Muestra los resultados de búsqueda
     */
    displayResults(results, query) {
        if (results.length === 0) {
            this.showNoResults(query);
            return;
        }

        const html = results.map(result => `
            <div class="search-result-item" 
                 data-file-id="${result.id}" 
                 data-section="${result.section}"
                 data-score="${result.score}">
                <span class="search-result-icon">${this.getFileIcon(result)}</span>
                <div class="search-result-info">
                    <div class="search-result-name">
                        ${this.highlightMatches(result.name, query)}
                    </div>
                    <div class="search-result-section">
                        ${result.sectionName} • ${result.size}
                        ${this.getMatchBadge(result.matchType)}
                    </div>
                </div>
                <div class="search-result-score" title="Relevancia: ${result.score}%">
                    ${this.getScoreStars(result.score)}
                </div>
            </div>
        `).join('');

        this.searchResults.innerHTML = html;
        this.showResults();
        this.attachResultListeners();
    }

    /**
     * Resalta las coincidencias en el texto
     */
    highlightMatches(text, query) {
        if (!query) return text;

        // Escapar caracteres especiales de regex
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Crear regex case-insensitive
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        
        return text.replace(regex, '<span class="search-result-match">$1</span>');
    }

    /**
     * Obtiene el icono según el tipo de archivo
     */
    getFileIcon(file) {
        if (file.section === 'instrumentos') {
            return '🎸';
        } else if (file.section === 'voces') {
            return '🎤';
        }
        return '📄';
    }

    /**
     * Obtiene badge según el tipo de coincidencia
     */
    getMatchBadge(matchType) {
        const badges = {
            exact: '<span class="match-badge exact" title="Coincidencia exacta">💯</span>',
            startsWith: '<span class="match-badge starts" title="Comienza con">▶️</span>',
            contains: '<span class="match-badge contains" title="Contiene">🔍</span>',
            fuzzy: '<span class="match-badge fuzzy" title="Coincidencia aproximada">≈</span>'
        };
        
        return badges[matchType] || '';
    }

    /**
     * Obtiene estrellas según la puntuación
     */
    getScoreStars(score) {
        if (score >= 90) return '⭐⭐⭐';
        if (score >= 70) return '⭐⭐';
        if (score >= 50) return '⭐';
        return '';
    }

    /**
     * Adjunta event listeners a los resultados
     */
    attachResultListeners() {
        this.searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectResult(item);
            });

            // Agregar atributo para navegación con teclado
            item.setAttribute('data-index', index);
        });
    }

    /**
     * Selecciona un resultado de búsqueda
     */
    selectResult(item) {
        const fileId = item.dataset.fileId;
        const section = item.dataset.section;

        // Llamar al método de selección del app principal
        if (window.app && typeof window.app.selectFile === 'function') {
            window.app.selectFile(fileId, section);
        }

        // Ocultar resultados
        this.hideResults();

        console.log(`✅ Resultado seleccionado: ${fileId} (${section})`);
    }

    /**
     * Maneja navegación con teclado en resultados
     */
    handleKeyNavigation(e) {
        if (!this.searchResults.classList.contains('show')) return;

        const items = this.searchResults.querySelectorAll('.search-result-item');
        const currentActive = this.searchResults.querySelector('.search-result-item.keyboard-active');
        let newActiveIndex = -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (currentActive) {
                    const currentIndex = parseInt(currentActive.dataset.index);
                    newActiveIndex = Math.min(currentIndex + 1, items.length - 1);
                } else {
                    newActiveIndex = 0;
                }
                break;

            case 'ArrowUp':
                e.preventDefault();
                if (currentActive) {
                    const currentIndex = parseInt(currentActive.dataset.index);
                    newActiveIndex = Math.max(currentIndex - 1, 0);
                } else {
                    newActiveIndex = items.length - 1;
                }
                break;

            case 'Enter':
                e.preventDefault();
                if (currentActive) {
                    this.selectResult(currentActive);
                } else if (items.length > 0) {
                    this.selectResult(items[0]);
                }
                return;

            case 'Escape':
                e.preventDefault();
                this.hideResults();
                return;
        }

        // Actualizar item activo
        if (newActiveIndex >= 0 && items[newActiveIndex]) {
            // Remover clase anterior
            if (currentActive) {
                currentActive.classList.remove('keyboard-active');
            }

            // Agregar clase nueva
            items[newActiveIndex].classList.add('keyboard-active');
            
            // Scroll si es necesario
            items[newActiveIndex].scrollIntoView({
                block: 'nearest',
                behavior: 'smooth'
            });
        }
    }

    /**
     * Muestra "sin resultados"
     */
    showNoResults(query) {
        this.searchResults.innerHTML = `
            <div class="search-result-item no-results">
                <span class="search-result-icon">🔍</span>
                <div class="search-result-info">
                    <div class="search-result-name">Sin resultados para "${query}"</div>
                    <div class="search-result-section">Prueba con otros términos o revisa la ortografía</div>
                </div>
            </div>
        `;
        this.showResults();
    }

    /**
     * Muestra error de búsqueda
     */
    showSearchError() {
        this.searchResults.innerHTML = `
            <div class="search-result-item error">
                <span class="search-result-icon">⚠️</span>
                <div class="search-result-info">
                    <div class="search-result-name">Error en la búsqueda</div>
                    <div class="search-result-section">Inténtalo de nuevo</div>
                </div>
            </div>
        `;
        this.showResults();
    }

    /**
     * Actualiza el filtro global de archivos
     */
    updateGlobalFilter(query) {
        if (window.AppState) {
            window.AppState.searchQuery = query;
            
            // Notificar al app principal para actualizar las listas
            if (window.app && typeof window.app.handleSearch === 'function') {
                window.app.handleSearch(query);
            }
        }
    }

    /**
     * Muestra los resultados
     */
    showResults() {
        this.searchResults.classList.add('show');
    }

    /**
     * Oculta los resultados
     */
    hideResults() {
        this.searchResults.classList.remove('show');
        
        // Remover navegación por teclado
        const activeItem = this.searchResults.querySelector('.keyboard-active');
        if (activeItem) {
            activeItem.classList.remove('keyboard-active');
        }
    }

    /**
     * Limpia los resultados
     */
    clearResults() {
        this.searchResults.innerHTML = '';
        this.hideResults();
    }

    /**
     * Enfoca el input de búsqueda
     */
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            this.searchInput.select();
        }
    }

    /**
     * Limpia la búsqueda
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.clearResults();
            this.updateGlobalFilter('');
            this.lastQuery = '';
        }
    }

    /**
     * Maneja el focus del input
     */
    onSearchFocus() {
        // Si hay texto y resultados previos, mostrarlos
        if (this.searchInput.value.trim() && this.searchResults.innerHTML) {
            this.showResults();
        }
    }

    /**
     * Maneja el blur del input
     */
    onSearchBlur(e) {
        // Solo ocultar si no se está interactuando con los resultados
        if (!e.relatedTarget || !e.relatedTarget.closest('.search-results')) {
            this.hideResults();
        }
    }

    /**
     * Obtiene estadísticas de búsqueda
     */
    getSearchStats() {
        return {
            lastQuery: this.lastQuery,
            isSearching: this.isSearching,
            hasResults: this.searchResults.classList.contains('show'),
            resultCount: this.searchResults.querySelectorAll('.search-result-item').length
        };
    }
}

// === UTILIDADES DE BÚSQUEDA ===
const SearchUtils = {
    /**
     * Normaliza texto para búsqueda (remueve acentos, etc.)
     */
    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Extrae palabras clave de un texto
     */
    extractKeywords(text, minLength = 3) {
        const normalized = this.normalizeText(text);
        const words = normalized.split(' ');
        
        return words
            .filter(word => word.length >= minLength)
            .filter((word, index, array) => array.indexOf(word) === index);
    },

    /**
     * Busca texto en contenido PDF (placeholder para futuro)
     */
    async searchInPDFContent(pdfFile, query) {
        // Esta función se implementaría para buscar dentro del contenido de PDFs
        console.log('🔍 Búsqueda en contenido PDF no implementada aún');
        return [];
    }
};

// === ESTILOS ADICIONALES PARA BÚSQUEDA ===
const searchCSS = `
.search-result-item.keyboard-active {
    background: var(--medium-gray) !important;
    border-left: 3px solid var(--accent-red);
}

.search-result-score {
    display: flex;
    align-items: center;
    font-size: 0.8rem;
    color: var(--text-muted);
}

.match-badge {
    display: inline-block;
    margin-left: var(--spacing-xs);
    font-size: 0.7rem;
}

.search-result-item.no-results,
.search-result-item.error {
    cursor: default;
}

.search-result-item.no-results:hover,
.search-result-item.error:hover {
    background: transparent !important;
}
`;

// Agregar estilos adicionales
if (!document.querySelector('#search-styles')) {
    const style = document.createElement('style');
    style.id = 'search-styles';
    style.textContent = searchCSS;
    document.head.appendChild(style);
}

// === EXPORTAR ===
window.SearchManager = SearchManager;
window.SearchUtils = SearchUtils;
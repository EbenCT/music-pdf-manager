/**
 * MUSIC PDF MANAGER - SEARCH FUNCTIONALITY (REFACTORIZADO)
 * Sistema de búsqueda simplificado que usa SearchUtils
 */

class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchResults = null;
        this.searchTimeout = null;
        this.isSearching = false;
        this.lastQuery = '';
        this.smartFilter = null;
        
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

        // Inicializar filtro inteligente con SearchUtils
        if (typeof SearchUtils !== 'undefined') {
            this.smartFilter = SearchUtils.createSmartFilter();
            console.log('🔍 Search Manager inicializado con SearchUtils');
        } else {
            console.warn('⚠️ SearchUtils no disponible, usando búsqueda básica');
        }

        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Input con debounce
        this.searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(e.target.value);
        });

        // Focus y blur
        this.searchInput.addEventListener('focus', () => this.onSearchFocus());
        this.searchInput.addEventListener('blur', (e) => {
            setTimeout(() => this.onSearchBlur(e), 150);
        });

        // Navegación con teclado
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });

        // Click fuera para cerrar
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
     * Maneja input con debounce
     */
    handleSearchInput(query) {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, this.config.DEBOUNCE_DELAY);
    }

    /**
     * Realiza la búsqueda usando SearchUtils
     */
    async performSearch(query) {
        const trimmedQuery = query.trim();
        
        if (trimmedQuery.length < this.config.MIN_QUERY_LENGTH) {
            this.clearResults();
            this.updateGlobalFilter('');
            return;
        }

        if (trimmedQuery === this.lastQuery) return;

        this.lastQuery = trimmedQuery;
        this.isSearching = true;

        try {
            console.log(`🔍 Buscando con SearchUtils: "${trimmedQuery}"`);

            const results = await this.search(trimmedQuery);
            this.displayResults(results, trimmedQuery);
            this.updateGlobalFilter(trimmedQuery);

        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            this.showSearchError();
        } finally {
            this.isSearching = false;
        }
    }

    /**
     * Búsqueda usando SearchUtils
     */
    async search(query) {
        const files = window.AppState?.files || { instrumentos: [], voces: [] };
        const allFiles = [];

        // Combinar archivos con información de sección
        files.instrumentos.forEach(file => {
            allFiles.push({
                ...file,
                section: 'instrumentos',
                sectionName: 'Instrumentos'
            });
        });

        files.voces.forEach(file => {
            allFiles.push({
                ...file,
                section: 'voces',
                sectionName: 'Voces'
            });
        });

        // Usar SearchUtils si está disponible
        if (this.smartFilter && typeof SearchUtils !== 'undefined') {
            const searchResults = this.smartFilter.search(query, allFiles, {
                fields: ['name'],
                maxResults: this.config.MAX_RESULTS,
                minScore: 15
            });

            return searchResults.map(result => ({
                ...result.item,
                score: result.score,
                matchType: result.matchType
            }));
        } else {
            // Fallback a búsqueda básica
            return this.basicSearch(query, allFiles);
        }
    }

    /**
     * Búsqueda básica sin SearchUtils (fallback)
     */
    basicSearch(query, files) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        files.forEach(file => {
            const lowerName = file.name.toLowerCase();
            let score = 0;
            let matchType = 'none';

            if (lowerName === lowerQuery) {
                score = 100;
                matchType = 'exact';
            } else if (lowerName.startsWith(lowerQuery)) {
                score = 90;
                matchType = 'startsWith';
            } else if (lowerName.includes(lowerQuery)) {
                score = 80;
                matchType = 'contains';
            }

            if (score > 0) {
                results.push({
                    ...file,
                    score,
                    matchType
                });
            }
        });

        return results.sort((a, b) => b.score - a.score).slice(0, this.config.MAX_RESULTS);
    }

    /**
     * Muestra resultados usando SearchUtils para highlighting
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
                        ${this.getScoreIndicator(result.score)}
                    </div>
                </div>
            </div>
        `).join('');

        this.searchResults.innerHTML = html;
        this.showResults();
        this.attachResultListeners();
    }

    /**
     * Resalta coincidencias usando SearchUtils si está disponible
     */
    highlightMatches(text, query) {
        if (typeof SearchUtils !== 'undefined') {
            return SearchUtils.highlightMatches(text, query, 'search-result-match');
        } else {
            // Fallback básico
            if (!query || query.length < 2) return text;
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            return text.replace(regex, '<span class="search-result-match">$1</span>');
        }
    }

    /**
     * Obtiene icono según tipo de archivo
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
     * Obtiene badge según tipo de coincidencia
     */
    getMatchBadge(matchType) {
        const badges = {
            exact: '<span class="match-badge exact" title="Coincidencia exacta">💯</span>',
            startsWith: '<span class="match-badge starts" title="Comienza con">▶️</span>',
            contains: '<span class="match-badge contains" title="Contiene">🔍</span>',
            partial: '<span class="match-badge partial" title="Coincidencia parcial">📝</span>',
            fuzzy: '<span class="match-badge fuzzy" title="Coincidencia aproximada">≈</span>'
        };
        
        return badges[matchType] || '';
    }

    /**
     * Obtiene indicador de score
     */
    getScoreIndicator(score) {
        if (score >= 90) return '<span class="score-indicator high" title="Alta relevancia">⭐⭐⭐</span>';
        if (score >= 70) return '<span class="score-indicator medium" title="Media relevancia">⭐⭐</span>';
        if (score >= 50) return '<span class="score-indicator low" title="Baja relevancia">⭐</span>';
        return '';
    }

    /**
     * Adjunta event listeners a resultados
     */
    attachResultListeners() {
        this.searchResults.querySelectorAll('.search-result-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectResult(item);
            });
            item.setAttribute('data-index', index);
        });
    }

    /**
     * Selecciona resultado y agrega al historial
     */
    selectResult(item) {
        const fileId = item.dataset.fileId;
        const section = item.dataset.section;

        // Encontrar el archivo completo
        const files = window.AppState?.files || {};
        const file = files[section]?.find(f => f.id === fileId);

        if (file && this.smartFilter) {
            // Agregar al historial de búsqueda inteligente
            this.smartFilter.addToHistory(this.lastQuery, file);
        }

        // Llamar al método de selección del app principal
        if (window.app && typeof window.app.selectFile === 'function') {
            window.app.selectFile(fileId, section);
        }

        this.hideResults();
        console.log(`✅ Resultado seleccionado: ${fileId} (${section})`);
    }

    /**
     * Navegación con teclado mejorada
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
            if (currentActive) {
                currentActive.classList.remove('keyboard-active');
            }
            items[newActiveIndex].classList.add('keyboard-active');
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
                    <div class="search-result-section">
                        Prueba con otros términos o revisa la ortografía
                    </div>
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
     * Actualiza filtro global
     */
    updateGlobalFilter(query) {
        if (window.AppState) {
            window.AppState.searchQuery = query;
            
            if (window.app && typeof window.app.handleSearch === 'function') {
                window.app.handleSearch(query);
            }
        }
    }

    /**
     * Muestra/oculta resultados
     */
    showResults() {
        this.searchResults.classList.add('show');
    }

    hideResults() {
        this.searchResults.classList.remove('show');
        const activeItem = this.searchResults.querySelector('.keyboard-active');
        if (activeItem) {
            activeItem.classList.remove('keyboard-active');
        }
    }

    clearResults() {
        this.searchResults.innerHTML = '';
        this.hideResults();
    }

    /**
     * Limpia y enfoca búsqueda
     */
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            this.searchInput.select();
        }
    }

    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.clearResults();
            this.updateGlobalFilter('');
            this.lastQuery = '';
        }
    }

    onSearchFocus() {
        if (this.searchInput.value.trim() && this.searchResults.innerHTML) {
            this.showResults();
        }
    }

    onSearchBlur(e) {
        if (!e.relatedTarget || !e.relatedTarget.closest('.search-results')) {
            this.hideResults();
        }
    }

    /**
     * Obtiene estadísticas de búsqueda
     */
    getSearchStats() {
        const baseStats = {
            lastQuery: this.lastQuery,
            isSearching: this.isSearching,
            hasResults: this.searchResults.classList.contains('show'),
            resultCount: this.searchResults.querySelectorAll('.search-result-item').length
        };

        // Agregar stats de SearchUtils si está disponible
        if (this.smartFilter && typeof SearchUtils !== 'undefined') {
            baseStats.smartFilterStats = SearchUtils.generateSearchStats(this.smartFilter.history);
        }

        return baseStats;
    }

    /**
     * Obtiene sugerencias basadas en input actual
     */
    getSuggestions(partialQuery) {
        if (typeof SearchUtils === 'undefined') {
            return [];
        }

        const files = window.AppState?.files || { instrumentos: [], voces: [] };
        const allFiles = [...files.instrumentos, ...files.voces];
        
        return SearchUtils.generateSuggestions(partialQuery, allFiles, 5);
    }

    /**
     * Debug de estado de búsqueda
     */
    debugSearchState() {
        console.group('🔍 DEBUG SEARCH STATE');
        console.log('Search Manager:', {
            lastQuery: this.lastQuery,
            isSearching: this.isSearching,
            hasSmartFilter: !!this.smartFilter,
            hasSearchUtils: typeof SearchUtils !== 'undefined'
        });
        
        if (this.smartFilter) {
            console.log('Smart Filter History:', this.smartFilter.history.length, 'items');
            console.log('Recent searches:', this.smartFilter.history.slice(-5));
        }
        
        console.log('Current Stats:', this.getSearchStats());
        console.groupEnd();
    }

    /**
     * Exporta historial de búsqueda
     */
    exportSearchHistory() {
        if (!this.smartFilter) {
            console.warn('⚠️ No hay historial de búsqueda para exportar');
            return null;
        }

        const exportData = {
            history: this.smartFilter.history,
            stats: this.getSearchStats(),
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `music-pdf-search-history-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('📥 Historial de búsqueda exportado');
        return exportData;
    }

    /**
     * Importa historial de búsqueda
     */
    importSearchHistory(data) {
        if (!data || !data.history || !this.smartFilter) {
            console.error('❌ Datos de importación inválidos');
            return false;
        }

        try {
            this.smartFilter.history = data.history;
            console.log('✅ Historial de búsqueda importado:', data.history.length, 'items');
            return true;
        } catch (error) {
            console.error('❌ Error importando historial:', error);
            return false;
        }
    }

    /**
     * Limpia historial de búsqueda
     */
    clearSearchHistory() {
        if (this.smartFilter) {
            this.smartFilter.history = [];
            console.log('🗑️ Historial de búsqueda limpiado');
        }
    }

    /**
     * Obtiene archivos más buscados
     */
    getMostSearchedFiles(limit = 10) {
        if (!this.smartFilter) return [];

        const fileCount = {};
        
        this.smartFilter.history.forEach(item => {
            if (item.selectedItem) {
                const fileName = item.selectedItem.name;
                fileCount[fileName] = (fileCount[fileName] || 0) + 1;
            }
        });

        return Object.entries(fileCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([name, count]) => ({ name, count }));
    }

    /**
     * Obtiene términos de búsqueda más frecuentes
     */
    getMostFrequentQueries(limit = 10) {
        if (!this.smartFilter) return [];

        const queryCount = {};
        
        this.smartFilter.history.forEach(item => {
            const query = item.query.toLowerCase();
            queryCount[query] = (queryCount[query] || 0) + 1;
        });

        return Object.entries(queryCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([query, count]) => ({ query, count }));
    }

    /**
     * Obtiene métricas de rendimiento de búsqueda
     */
    getPerformanceMetrics() {
        return {
            totalSearches: this.smartFilter?.history.length || 0,
            averageQueryLength: this.calculateAverageQueryLength(),
            searchSuccessRate: this.calculateSearchSuccessRate(),
            mostActiveSearchDay: this.getMostActiveSearchDay(),
            searchTrends: this.getSearchTrends()
        };
    }

    /**
     * Calcula longitud promedio de query
     */
    calculateAverageQueryLength() {
        if (!this.smartFilter || this.smartFilter.history.length === 0) return 0;

        const totalLength = this.smartFilter.history.reduce((sum, item) => sum + item.query.length, 0);
        return Math.round(totalLength / this.smartFilter.history.length * 100) / 100;
    }

    /**
     * Calcula tasa de éxito de búsquedas
     */
    calculateSearchSuccessRate() {
        if (!this.smartFilter || this.smartFilter.history.length === 0) return 0;

        const successfulSearches = this.smartFilter.history.filter(item => item.selectedItem).length;
        return Math.round((successfulSearches / this.smartFilter.history.length) * 100);
    }

    /**
     * Obtiene día más activo de búsqueda
     */
    getMostActiveSearchDay() {
        if (!this.smartFilter || this.smartFilter.history.length === 0) return null;

        const dayCount = {};
        
        this.smartFilter.history.forEach(item => {
            const day = new Date(item.timestamp).toDateString();
            dayCount[day] = (dayCount[day] || 0) + 1;
        });

        const mostActive = Object.entries(dayCount)
            .sort(([,a], [,b]) => b - a)[0];

        return mostActive ? { day: mostActive[0], searches: mostActive[1] } : null;
    }

    /**
     * Obtiene tendencias de búsqueda
     */
    getSearchTrends() {
        if (!this.smartFilter || this.smartFilter.history.length === 0) return [];

        const last30Days = this.smartFilter.history.filter(item => 
            Date.now() - new Date(item.timestamp).getTime() <= 30 * 24 * 60 * 60 * 1000
        );

        const trendsMap = {};
        last30Days.forEach(item => {
            const words = item.query.toLowerCase().split(' ');
            words.forEach(word => {
                if (word.length > 2) {
                    trendsMap[word] = (trendsMap[word] || 0) + 1;
                }
            });
        });

        return Object.entries(trendsMap)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));
    }
}

// === EXPORTAR ===
window.SearchManager = SearchManager;

console.log('🔍 Search Manager cargado: VERSIÓN REFACTORIZADA con SearchUtils');
/**
 * SEARCH UTILITIES MODULE
 * Utilidades especializadas para búsqueda y filtrado
 */

class SearchUtils {
    /**
     * Normaliza texto para búsqueda (remueve acentos, etc.)
     */
    static normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Extrae palabras clave de un texto
     */
    static extractKeywords(text, minLength = 3) {
        const normalized = this.normalizeText(text);
        const words = normalized.split(' ');
        
        return words
            .filter(word => word.length >= minLength)
            .filter((word, index, array) => array.indexOf(word) === index);
    }

    /**
     * Calcula similitud entre dos strings usando Jaccard
     */
    static calculateJaccardSimilarity(str1, str2) {
        const set1 = new Set(this.normalizeText(str1).split(' '));
        const set2 = new Set(this.normalizeText(str2).split(' '));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    /**
     * Búsqueda fuzzy avanzada
     */
    static fuzzySearch(query, texts, threshold = 0.3) {
        const results = [];
        const normalizedQuery = this.normalizeText(query);
        
        texts.forEach((text, index) => {
            const normalizedText = this.normalizeText(text);
            
            // Múltiples tipos de coincidencia
            let score = 0;
            let matchType = 'none';
            
            // Coincidencia exacta
            if (normalizedText === normalizedQuery) {
                score = 100;
                matchType = 'exact';
            }
            // Comienza con
            else if (normalizedText.startsWith(normalizedQuery)) {
                score = 90;
                matchType = 'startsWith';
            }
            // Contiene
            else if (normalizedText.includes(normalizedQuery)) {
                score = 80;
                matchType = 'contains';
            }
            // Similitud por palabras
            else {
                const jaccardScore = this.calculateJaccardSimilarity(normalizedQuery, normalizedText);
                if (jaccardScore > threshold) {
                    score = Math.floor(jaccardScore * 70);
                    matchType = 'fuzzy';
                }
            }
            
            if (score > 0) {
                results.push({
                    index,
                    text,
                    score,
                    matchType,
                    normalizedText
                });
            }
        });
        
        // Ordenar por relevancia
        return results.sort((a, b) => {
            if (a.matchType !== b.matchType) {
                const typeOrder = { exact: 0, startsWith: 1, contains: 2, fuzzy: 3 };
                return typeOrder[a.matchType] - typeOrder[b.matchType];
            }
            return b.score - a.score;
        });
    }

    /**
     * Resalta coincidencias en texto
     */
    static highlightMatches(text, query, className = 'search-match') {
        if (!query || query.length < 2) return text;

        // Escapar caracteres especiales de regex
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Crear regex case-insensitive para palabras completas y parciales
        const patterns = [
            new RegExp(`\\b(${escapedQuery})\\b`, 'gi'), // Palabra completa
            new RegExp(`(${escapedQuery})`, 'gi')         // Coincidencia parcial
        ];
        
        let result = text;
        
        // Aplicar el primer patrón que encuentre coincidencias
        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                result = text.replace(pattern, `<span class="${className}">$1</span>`);
                break;
            }
        }
        
        return result;
    }

    /**
     * Búsqueda con múltiples criterios
     */
    static multiCriteriaSearch(query, items, searchFields = ['name']) {
        const results = [];
        const normalizedQuery = this.normalizeText(query);
        const queryWords = normalizedQuery.split(' ').filter(w => w.length > 1);
        
        items.forEach((item, index) => {
            let maxScore = 0;
            let bestMatchType = 'none';
            let bestField = null;
            
            // Buscar en todos los campos especificados
            searchFields.forEach(field => {
                const fieldValue = item[field] || '';
                const normalizedValue = this.normalizeText(fieldValue);
                
                // Score por coincidencia exacta del campo
                let fieldScore = 0;
                let fieldMatchType = 'none';
                
                if (normalizedValue === normalizedQuery) {
                    fieldScore = 100;
                    fieldMatchType = 'exact';
                } else if (normalizedValue.includes(normalizedQuery)) {
                    fieldScore = 80;
                    fieldMatchType = 'contains';
                } else {
                    // Score por palabras individuales
                    let wordMatches = 0;
                    queryWords.forEach(word => {
                        if (normalizedValue.includes(word)) {
                            wordMatches++;
                        }
                    });
                    
                    if (wordMatches > 0) {
                        fieldScore = Math.floor((wordMatches / queryWords.length) * 60);
                        fieldMatchType = 'partial';
                    }
                }
                
                // Bonus por campo prioritario (ej: nombre vs descripción)
                if (field === 'name') fieldScore *= 1.2;
                
                if (fieldScore > maxScore) {
                    maxScore = fieldScore;
                    bestMatchType = fieldMatchType;
                    bestField = field;
                }
            });
            
            if (maxScore > 0) {
                results.push({
                    item,
                    index,
                    score: Math.floor(maxScore),
                    matchType: bestMatchType,
                    matchField: bestField
                });
            }
        });
        
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Filtro inteligente con historial
     */
    static createSmartFilter(searchHistory = []) {
        return {
            history: searchHistory,
            
            search(query, items, options = {}) {
                const {
                    fields = ['name'],
                    minScore = 10,
                    maxResults = 20,
                    boost = {}
                } = options;
                
                // Realizar búsqueda
                let results = SearchUtils.multiCriteriaSearch(query, items, fields);
                
                // Aplicar boost basado en historial
                if (this.history.length > 0) {
                    results = results.map(result => {
                        const item = result.item;
                        const historicalBoost = this.calculateHistoricalBoost(item, query);
                        
                        return {
                            ...result,
                            score: result.score + historicalBoost,
                            historicalBoost
                        };
                    });
                }
                
                // Filtrar por score mínimo y limitar resultados
                return results
                    .filter(r => r.score >= minScore)
                    .slice(0, maxResults);
            },
            
            calculateHistoricalBoost(item, query) {
                // Boost basado en búsquedas anteriores similares
                let boost = 0;
                
                this.history.forEach(historyItem => {
                    const { query: pastQuery, selectedItem } = historyItem;
                    
                    if (selectedItem && selectedItem.id === item.id) {
                        const querySimilarity = SearchUtils.calculateJaccardSimilarity(query, pastQuery);
                        boost += querySimilarity * 10; // Hasta 10 puntos de boost
                    }
                });
                
                return Math.min(boost, 20); // Máximo 20 puntos de boost
            },
            
            addToHistory(query, selectedItem) {
                this.history.push({
                    query,
                    selectedItem,
                    timestamp: Date.now()
                });
                
                // Mantener solo los últimos 50 elementos
                if (this.history.length > 50) {
                    this.history = this.history.slice(-50);
                }
            }
        };
    }

    /**
     * Búsqueda en contenido PDF (placeholder para implementación futura)
     */
    static async searchInPDFContent(pdfFile, query) {
        // Esta función se implementaría para buscar dentro del contenido de PDFs
        console.log('🔍 Búsqueda en contenido PDF no implementada aún');
        return [];
    }

    /**
     * Sugerencias de búsqueda basadas en input parcial
     */
    static generateSuggestions(partialQuery, availableItems, maxSuggestions = 5) {
        if (!partialQuery || partialQuery.length < 2) return [];
        
        const suggestions = new Set();
        const normalizedQuery = this.normalizeText(partialQuery);
        
        availableItems.forEach(item => {
            const name = item.name || '';
            const normalizedName = this.normalizeText(name);
            
            // Sugerencias basadas en prefijos
            if (normalizedName.startsWith(normalizedQuery)) {
                suggestions.add(name);
            }
            
            // Sugerencias basadas en palabras que comienzan con la query
            const words = normalizedName.split(' ');
            words.forEach(word => {
                if (word.startsWith(normalizedQuery)) {
                    suggestions.add(name);
                }
            });
        });
        
        return Array.from(suggestions).slice(0, maxSuggestions);
    }

    /**
     * Estadísticas de búsqueda
     */
    static generateSearchStats(searchHistory) {
        const stats = {
            totalSearches: searchHistory.length,
            uniqueQueries: new Set(searchHistory.map(h => h.query)).size,
            mostSearchedQueries: {},
            searchesByDay: {},
            averageQueryLength: 0
        };
        
        if (searchHistory.length === 0) return stats;
        
        // Calcular estadísticas
        let totalQueryLength = 0;
        
        searchHistory.forEach(item => {
            const { query, timestamp } = item;
            
            // Conteo de queries
            stats.mostSearchedQueries[query] = (stats.mostSearchedQueries[query] || 0) + 1;
            
            // Búsquedas por día
            const day = new Date(timestamp).toDateString();
            stats.searchesByDay[day] = (stats.searchesByDay[day] || 0) + 1;
            
            // Longitud promedio
            totalQueryLength += query.length;
        });
        
        stats.averageQueryLength = totalQueryLength / searchHistory.length;
        
        // Ordenar queries más buscadas
        stats.mostSearchedQueries = Object.entries(stats.mostSearchedQueries)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
        
        return stats;
    }
}

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

.search-match {
    background: var(--accent-red-light);
    color: var(--accent-red);
    padding: 0 2px;
    border-radius: 2px;
    font-weight: 600;
}

.search-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--dark-gray);
    border: 1px solid var(--border-gray);
    border-radius: 0 0 var(--radius-md) var(--radius-md);
    max-height: 200px;
    overflow-y: auto;
    z-index: 101;
    display: none;
}

.search-suggestions.show {
    display: block;
}

.search-suggestion-item {
    padding: var(--spacing-sm) var(--spacing-md);
    cursor: pointer;
    border-bottom: 1px solid var(--border-gray);
    transition: background var(--transition-fast);
}

.search-suggestion-item:last-child {
    border-bottom: none;
}

.search-suggestion-item:hover {
    background: var(--medium-gray);
}

.search-suggestion-item.active {
    background: var(--accent-red-light);
}
`;

// Agregar estilos si no existen
if (!document.querySelector('#search-utils-styles')) {
    const style = document.createElement('style');
    style.id = 'search-utils-styles';
    style.textContent = searchCSS;
    document.head.appendChild(style);
}

// === EXPORTAR ===
window.SearchUtils = SearchUtils;
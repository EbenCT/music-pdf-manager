/**
 * MUSIC PDF MANAGER - COMBINER MODULE - CORREGIDO
 * Módulo para combinar múltiples PDFs con búsqueda y separación por secciones
 */

class PDFCombiner {
    constructor() {
        this.state = {
            currentMode: 'manual',
            currentSection: 'instrumentos',
            availableFiles: { instrumentos: [], voces: [] },
            filteredFiles: { instrumentos: [], voces: [] },
            selectedFiles: [],
            searchResults: [],
            similarityThreshold: 0.6,
            isProcessing: false,
            manualSearchQuery: ''
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAvailableFiles();
        this.updateSimilarityDisplay();
        this.updateModeDescription();
        this.updateSectionDisplay();
    }

    setupEventListeners() {
        // Switch principal de modo
        document.querySelectorAll('.mode-switch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchMode(e.target.dataset.mode);
            });
        });

        // Switch de sección (para modo manual)
        document.querySelectorAll('.section-switch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // Buscador modo manual
        const manualSearchInput = document.getElementById('manual-search-input');
        if (manualSearchInput) {
            manualSearchInput.addEventListener('input', (e) => {
                this.handleManualSearch(e.target.value);
            });
        }

        // Slider de similitud
        const slider = document.getElementById('similarity-threshold');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.state.similarityThreshold = parseFloat(e.target.value);
                this.updateSimilarityDisplay();
            });
        }

        // Textarea de canciones
        const textarea = document.getElementById('song-list-textarea');
        if (textarea) {
            textarea.addEventListener('input', DriveUtils.debounce(() => {
                this.updateSearchButton();
            }, 500));
        }
    }

    handleManualSearch(query) {
        this.state.manualSearchQuery = query.toLowerCase().trim();
        this.filterCurrentSectionFiles();
        this.renderAvailableFiles();
    }

    filterCurrentSectionFiles() {
        const currentFiles = this.state.availableFiles[this.state.currentSection] || [];
        
        if (this.state.manualSearchQuery.length < 2) {
            this.state.filteredFiles[this.state.currentSection] = [...currentFiles];
        } else {
            this.state.filteredFiles[this.state.currentSection] = currentFiles.filter(file => 
                file.name.toLowerCase().includes(this.state.manualSearchQuery)
            );
        }
    }

    switchMode(mode) {
        if (this.state.currentMode === mode) return;
        
        this.state.currentMode = mode;

        document.querySelectorAll('.mode-switch-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${mode}-mode`).classList.add('active');

        this.updateModeDescription();
        this.updateActionButtons();
        
        if (mode === 'manual') {
            this.renderAvailableFiles();
        }
        
        console.log(`🔄 Cambiado a modo: ${mode}`);
    }

    updateModeDescription() {
        const descriptions = {
            manual: 'Selecciona archivos uno por uno y reordénalos como desees',
            automatic: 'Proporciona una lista de nombres y el sistema buscará las mejores coincidencias'
        };
        
        const element = document.getElementById('mode-description-text');
        if (element) {
            element.textContent = descriptions[this.state.currentMode] || '';
        }
    }

    switchSection(section) {
        if (this.state.currentSection === section) return;
        
        this.state.currentSection = section;

        document.querySelectorAll('.section-switch-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        const searchInput = document.getElementById('manual-search-input');
        if (searchInput) {
            searchInput.value = '';
            this.state.manualSearchQuery = '';
        }

        this.updateSectionDisplay();
        this.filterCurrentSectionFiles();
        this.renderAvailableFiles();
        
        console.log(`📁 Cambiado a sección: ${section}`);
    }

    updateSectionDisplay() {
        const title = document.getElementById('current-section-title-combiner');
        const count = document.getElementById('current-section-count-combiner');
        
        if (title) {
            title.textContent = this.state.currentSection === 'instrumentos' ? '🎸 Instrumentos' : '🎤 Voces';
        }
        
        if (count) {
            const filteredCount = this.state.filteredFiles[this.state.currentSection]?.length || 0;
            const totalCount = this.state.availableFiles[this.state.currentSection]?.length || 0;
            
            if (this.state.manualSearchQuery && filteredCount !== totalCount) {
                count.textContent = `${filteredCount} de ${totalCount}`;
            } else {
                count.textContent = `${totalCount} archivo${totalCount !== 1 ? 's' : ''}`;
            }
        }
    }

    loadAvailableFiles() {
        if (window.AppState && window.AppState.files) {
            this.state.availableFiles = window.AppState.files;
            this.state.filteredFiles = {
                instrumentos: [...this.state.availableFiles.instrumentos],
                voces: [...this.state.availableFiles.voces]
            };
            console.log('✅ Archivos cargados desde AppState:', {
                instrumentos: this.state.availableFiles.instrumentos.length,
                voces: this.state.availableFiles.voces.length
            });
        } else {
            // Datos de prueba para desarrollo
            this.state.availableFiles = {
                instrumentos: [
                    { id: '1', name: 'Ahora es tiempo de alabar a Dios.pdf', size: '245 KB', section: 'instrumentos' },
                    { id: '2', name: 'Vine a alabar a Dios.pdf', size: '198 KB', section: 'instrumentos' },
                    { id: '3', name: 'Magnifiquemos al Señor.pdf', size: '223 KB', section: 'instrumentos' },
                    { id: '4', name: 'Esta es la confianza que tenemos en el.pdf', size: '267 KB', section: 'instrumentos' },
                    { id: '5', name: 'Mas el Dios de toda gracias.pdf', size: '189 KB', section: 'instrumentos' }
                ],
                voces: [
                    { id: '9', name: 'Amazing Grace - Himno Tradicional.pdf', size: '156 KB', section: 'voces' },
                    { id: '10', name: 'Ave María - Franz Schubert.pdf', size: '203 KB', section: 'voces' },
                    { id: '11', name: 'Hallelujah - Leonard Cohen.pdf', size: '287 KB', section: 'voces' }
                ]
            };
            this.state.filteredFiles = {
                instrumentos: [...this.state.availableFiles.instrumentos],
                voces: [...this.state.availableFiles.voces]
            };
            console.log('⚠️ Usando datos de prueba para desarrollo');
        }

        this.renderAvailableFiles();
        this.updateSectionDisplay();
    }

    renderAvailableFiles() {
        const container = document.getElementById('available-files');
        if (!container) return;

        const currentFiles = this.state.filteredFiles[this.state.currentSection] || [];

        if (currentFiles.length === 0) {
            const isFiltering = this.state.manualSearchQuery.length > 0;
            container.innerHTML = `
                <div class="placeholder">
                    <div class="placeholder-icon">${isFiltering ? '🔍' : '📄'}</div>
                    <p>${isFiltering ? 'Sin resultados para tu búsqueda' : `No hay archivos en ${this.state.currentSection}`}</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">
                        ${isFiltering ? 'Intenta con otros términos' : 'Verifica la conexión con Google Drive'}
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = currentFiles.map(file => `
            <div class="combiner-file-item" 
                 data-file-id="${file.id}" 
                 data-section="${this.state.currentSection}"
                 onclick="CombinerModule.toggleFileSelection('${file.id}')">
                <input type="checkbox" class="file-checkbox" id="check-${file.id}">
                <div class="file-info">
                    <div class="file-name">${this.highlightSearchTerms(file.name)}</div>
                    <div class="file-meta">${this.state.currentSection} • ${file.size}</div>
                </div>
            </div>
        `).join('');

        this.updateSelectedStates();
    }

    highlightSearchTerms(text) {
        if (!this.state.manualSearchQuery || this.state.manualSearchQuery.length < 2) return text;
        
        const regex = new RegExp(`(${this.state.manualSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="search-result-match">$1</span>');
    }

    updateSelectedStates() {
        this.state.selectedFiles.forEach(selectedFile => {
            const fileElement = document.querySelector(`[data-file-id="${selectedFile.id}"]`);
            const checkbox = document.getElementById(`check-${selectedFile.id}`);
            
            if (fileElement && selectedFile.section === this.state.currentSection) {
                fileElement.classList.add('selected');
                if (checkbox) checkbox.checked = true;
            }
        });
    }

    toggleFileSelection(fileId) {
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        const checkbox = document.getElementById(`check-${fileId}`);
        
        if (this.state.selectedFiles.find(f => f.id === fileId)) {
            this.state.selectedFiles = this.state.selectedFiles.filter(f => f.id !== fileId);
            if (fileElement) fileElement.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        } else {
            const file = this.state.availableFiles[this.state.currentSection].find(f => f.id === fileId);
            if (file) {
                this.state.selectedFiles.push({
                    ...file,
                    section: this.state.currentSection
                });
                if (fileElement) fileElement.classList.add('selected');
                if (checkbox) checkbox.checked = true;
            }
        }
        
        this.updateSelectedFilesList();
        this.updateActionButtons();
    }

    updateSelectedFilesList() {
        const container = document.getElementById('selected-files');
        const countElement = document.getElementById('selected-count');
        
        if (countElement) {
            countElement.textContent = this.state.selectedFiles.length;
        }
        
        if (!container) return;
        
        if (this.state.selectedFiles.length === 0) {
            container.innerHTML = `
                <div class="placeholder">
                    <div class="placeholder-icon">📋</div>
                    <p>Selecciona archivos de la lista izquierda</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">Puedes arrastrar para reordenar</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.state.selectedFiles.map((file, index) => `
            <div class="selected-file-item" 
                 data-file-id="${file.id}" 
                 data-index="${index}"
                 draggable="true">
                <div class="drag-handle">⋮⋮</div>
                <div class="file-order">${index + 1}</div>
                <div class="file-info" style="flex: 1;">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${file.section} • ${file.size}</div>
                </div>
                <button class="remove-file-btn" onclick="CombinerModule.removeSelectedFile('${file.id}')">✕</button>
            </div>
        `).join('');
    }

    removeSelectedFile(fileId) {
        this.state.selectedFiles = this.state.selectedFiles.filter(f => f.id !== fileId);
        
        document.querySelectorAll(`[data-file-id="${fileId}"]`).forEach(element => {
            element.classList.remove('selected');
        });
        
        const checkbox = document.getElementById(`check-${fileId}`);
        if (checkbox) checkbox.checked = false;
        
        this.updateSelectedFilesList();
        this.updateActionButtons();
    }

    clearAllSelections() {
        this.state.selectedFiles = [];
        
        document.querySelectorAll('.file-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        document.querySelectorAll('.combiner-file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        this.updateSelectedFilesList();
        this.updateActionButtons();
    }

    // === MODO AUTOMÁTICO - CORREGIDO ===
    searchSongs() {
        const textarea = document.getElementById('song-list-textarea');
        if (!textarea) return;

        const songNames = textarea.value.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'));

        if (songNames.length === 0) {
            this.showError('Por favor, ingresa al menos un nombre de canción');
            return;
        }

        console.log('🔍 Buscando canciones en ambas secciones:', songNames);
        this.state.searchResults = [];

        songNames.forEach((songName, index) => {
            // Buscar en instrumentos
            const instrumentMatches = this.findSimilarFiles(songName, this.state.availableFiles.instrumentos.map(f => ({...f, section: 'instrumentos'})));
            
            // Buscar en voces
            const voicesMatches = this.findSimilarFiles(songName, this.state.availableFiles.voces.map(f => ({...f, section: 'voces'})));

            const result = {
                searchTerm: songName,
                order: index + 1,
                instrumentos: {
                    matches: instrumentMatches,
                    selectedMatch: instrumentMatches.length > 0 ? instrumentMatches[0] : null,
                    confirmed: instrumentMatches.length > 0 && instrumentMatches[0].similarity >= 0.8
                },
                voces: {
                    matches: voicesMatches,
                    selectedMatch: voicesMatches.length > 0 ? voicesMatches[0] : null,
                    confirmed: voicesMatches.length > 0 && voicesMatches[0].similarity >= 0.8
                }
            };

            this.state.searchResults.push(result);
        });

        console.log('📊 Resultados de búsqueda:', this.state.searchResults);
        this.renderSearchResults();
        this.updateActionButtons();
    }

    findSimilarFiles(searchTerm, files) {
        const matches = [];

        files.forEach(file => {
            const similarity = this.calculateSimilarity(searchTerm, file.name);
            
            if (similarity >= this.state.similarityThreshold) {
                matches.push({
                    ...file,
                    similarity: similarity,
                    matchType: this.getSimilarityLevel(similarity)
                });
            }
        });

        return matches.sort((a, b) => b.similarity - a.similarity);
    }

    calculateSimilarity(text1, text2) {
        const normalized1 = this.normalizeText(text1);
        const normalized2 = this.normalizeText(text2);
        
        const exactSimilarity = this.sequenceMatcher(normalized1, normalized2);
        
        const words1 = new Set(normalized1.split(' ').filter(w => w.length > 0));
        const words2 = new Set(normalized2.split(' ').filter(w => w.length > 0));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        const wordSimilarity = union.size > 0 ? intersection.size / union.size : 0;
        
        const importantWords = ['dios', 'señor', 'jesus', 'cristo', 'alabar', 'adorar', 'santo', 'gloria'];
        let bonus = 0;
        
        importantWords.forEach(word => {
            if (normalized1.includes(word) && normalized2.includes(word)) {
                bonus += 0.1;
            }
        });
        
        return Math.min(1.0, Math.max(exactSimilarity, wordSimilarity) + bonus);
    }

    normalizeText(text) {
        return text.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    sequenceMatcher(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

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

    getSimilarityLevel(similarity) {
        if (similarity >= 0.8) return 'high';
        if (similarity >= 0.5) return 'medium';
        return 'low';
    }

// FUNCIÓN CORREGIDA - Reemplazar en js/combiner.js
renderSearchResults() {
    console.log('🔍 Renderizando resultados de búsqueda:', this.state.searchResults.length);
    
    const container = document.getElementById('search-results');
    const countElement = document.getElementById('matches-count');
    
    if (!container) {
        console.error('❌ Elemento search-results no encontrado');
        return;
    }
    
    // Actualizar contador
    const confirmedInstrumentos = this.state.searchResults.filter(r => r.instrumentos.confirmed).length;
    const confirmedVoces = this.state.searchResults.filter(r => r.voces.confirmed).length;
    
    if (countElement) {
        countElement.textContent = `🎸${confirmedInstrumentos} | 🎤${confirmedVoces} de ${this.state.searchResults.length}`;
    }

    // Si no hay resultados, mostrar placeholder
    if (this.state.searchResults.length === 0) {
        container.innerHTML = `
            <div class="placeholder">
                <div class="placeholder-icon">🤖</div>
                <p>Escribe los nombres de las canciones arriba</p>
                <p style="font-size: 0.9rem; color: var(--text-muted);">El sistema buscará automáticamente</p>
            </div>
        `;
        return;
    }

    try {
        // Crear HTML de forma más segura
        const resultsHTML = this.state.searchResults.map((result, index) => {
            return this.createResultItemHTML(result, index);
        }).join('');

        container.innerHTML = resultsHTML;
        
        // Agregar event listeners después de insertar el HTML
        this.attachSearchResultListeners();
        
        console.log('✅ Resultados renderizados exitosamente');
        
    } catch (error) {
        console.error('❌ Error renderizando resultados:', error);
        container.innerHTML = `
            <div class="placeholder">
                <div class="placeholder-icon">⚠️</div>
                <p>Error mostrando resultados</p>
                <p style="font-size: 0.9rem; color: var(--accent-red);">Revisa la consola para más detalles</p>
                <button class="btn secondary" onclick="CombinerModule.debugSearchResults()">
                    🔧 Debug
                </button>
            </div>
        `;
    }
}

// NUEVA FUNCIÓN AUXILIAR - Agregar en js/combiner.js
createResultItemHTML(result, index) {
    return `
        <div class="search-result-item" style="margin-bottom: var(--spacing-lg); background: var(--dark-gray); border-radius: var(--radius-md); padding: var(--spacing-md);">
            <!-- Encabezado del término de búsqueda -->
            <div style="background: var(--medium-gray); padding: var(--spacing-sm) var(--spacing-md); border-radius: var(--radius-sm); text-align: center; margin-bottom: var(--spacing-md); border-bottom: 2px solid var(--accent-red);">
                <h4 style="color: var(--text-primary); margin: 0; font-size: 1rem; font-weight: 600;">
                    "${result.searchTerm}" (${result.order})
                </h4>
            </div>
            
            <!-- Sección Instrumentos -->
            <div style="background: var(--secondary-black); border-radius: var(--radius-md); padding: var(--spacing-md); border: 1px solid var(--border-gray); margin-bottom: var(--spacing-sm);">
                <div style="color: var(--accent-red); font-weight: 600; margin-bottom: var(--spacing-sm); font-size: 0.9rem;">
                    🎸 Instrumentos
                </div>
                ${this.createSectionHTML(result.instrumentos, index, 'instrumentos')}
            </div>
            
            <!-- Sección Voces -->
            <div style="background: var(--secondary-black); border-radius: var(--radius-md); padding: var(--spacing-md); border: 1px solid var(--border-gray);">
                <div style="color: var(--accent-red); font-weight: 600; margin-bottom: var(--spacing-sm); font-size: 0.9rem;">
                    🎤 Voces
                </div>
                ${this.createSectionHTML(result.voces, index, 'voces')}
            </div>
        </div>
    `;
}

// NUEVA FUNCIÓN AUXILIAR - Agregar en js/combiner.js
createSectionHTML(sectionData, resultIndex, sectionType) {
    if (sectionData.matches.length === 0) {
        return `
            <div style="display: flex; align-items: center; gap: var(--spacing-sm); opacity: 0.7;">
                <div class="similarity-score low">0%</div>
                <div style="flex: 1;">
                    <div style="color: var(--accent-red);">❌ Sin coincidencias encontradas</div>
                </div>
            </div>
        `;
    }

    const bestMatch = sectionData.selectedMatch;
    const similarityPercent = Math.round(bestMatch.similarity * 100);
    
    // Crear select de alternativas si hay múltiples matches
    let selectHTML = '';
    if (sectionData.matches.length > 1) {
        const selectId = `select-${resultIndex}-${sectionType}`;
        selectHTML = `
            <select id="${selectId}" class="alternative-select" style="background: var(--dark-gray); color: var(--text-primary); border: 1px solid var(--border-gray); padding: var(--spacing-xs); border-radius: var(--radius-sm); margin-top: var(--spacing-xs); width: 100%; font-size: 0.8rem;">
                ${sectionData.matches.map((match, matchIndex) => `
                    <option value="${matchIndex}" ${matchIndex === 0 ? 'selected' : ''}>
                        ${this.escapeHtml(match.name)} (${Math.round(match.similarity * 100)}%)
                    </option>
                `).join('')}
            </select>
        `;
    }
    
    const confirmBtnId = `confirm-${resultIndex}-${sectionType}`;
    
    return `
        <div style="display: flex; align-items: flex-start; gap: var(--spacing-sm);">
            <div class="similarity-score ${bestMatch.matchType}">${similarityPercent}%</div>
            <div style="flex: 1;">
                <div class="file-name" style="color: var(--text-primary); font-weight: 500; margin-bottom: var(--spacing-xs);">
                    ${this.escapeHtml(bestMatch.name)}
                </div>
                <div class="match-status ${sectionData.confirmed ? 'confirmed' : 'suggested'}" style="font-size: 0.8rem; margin-top: var(--spacing-xs);">
                    ${sectionData.confirmed ? '✅ Confirmado automáticamente' : '⚠️ Requiere confirmación'}
                    • ${bestMatch.size}
                </div>
                ${selectHTML}
            </div>
            <div>
                <button 
                    id="${confirmBtnId}"
                    class="btn confirm-btn ${sectionData.confirmed ? 'secondary' : ''}" 
                    style="padding: var(--spacing-xs) var(--spacing-sm); font-size: 0.8rem; min-width: 60px;">
                    ${sectionData.confirmed ? '✅' : '❓'}
                </button>
            </div>
        </div>
    `;
}

// NUEVA FUNCIÓN AUXILIAR - Agregar en js/combiner.js
escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// NUEVA FUNCIÓN - Agregar en js/combiner.js
attachSearchResultListeners() {
    // Agregar listeners para los selects de alternativas
    document.querySelectorAll('.alternative-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const selectId = e.target.id;
            const [, resultIndex, sectionType] = selectId.split('-');
            this.selectAlternativeMatch(parseInt(resultIndex), sectionType, e.target.value);
        });
    });
    
    // Agregar listeners para los botones de confirmación
    document.querySelectorAll('.confirm-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnId = e.target.id;
            const [, resultIndex, sectionType] = btnId.split('-');
            this.toggleSectionConfirmation(parseInt(resultIndex), sectionType);
        });
    });
}

// AGREGAR estas nuevas funciones auxiliares
renderSectionResultSafe(sectionData, resultIndex, sectionType) {
    if (sectionData.matches.length === 0) {
        return `
            <div style="display: flex; align-items: center; gap: var(--spacing-sm); opacity: 0.7;">
                <div class="similarity-score low">0%</div>
                <div style="flex: 1;">
                    <div style="color: var(--accent-red);">❌ Sin coincidencias encontradas</div>
                </div>
            </div>
        `;
    }

    const bestMatch = sectionData.selectedMatch;
    const similarityPercent = Math.round(bestMatch.similarity * 100);
    
    let selectHtml = '';
    if (sectionData.matches.length > 1) {
        const options = sectionData.matches.map((match, matchIndex) => 
            `<option value="${matchIndex}" ${matchIndex === 0 ? 'selected' : ''}>${match.name} (${Math.round(match.similarity * 100)}%)</option>`
        ).join('');
        
        selectHtml = `
            <select class="alternative-select" 
                    onchange="CombinerModule.selectAlternativeMatch(${resultIndex}, '${sectionType}', this.value)" 
                    style="background: var(--dark-gray); color: var(--text-primary); border: 1px solid var(--border-gray); padding: var(--spacing-xs); border-radius: var(--radius-sm); margin-top: var(--spacing-xs); width: 100%; font-size: 0.8rem;">
                ${options}
            </select>
        `;
    }
    
    return `
        <div style="display: flex; align-items: flex-start; gap: var(--spacing-sm);">
            <div class="similarity-score ${bestMatch.matchType}">${similarityPercent}%</div>
            <div style="flex: 1;">
                <div class="file-name" style="color: var(--text-primary); font-weight: 500; margin-bottom: var(--spacing-xs);">
                    ${bestMatch.name}
                </div>
                <div class="match-status ${sectionData.confirmed ? 'confirmed' : 'suggested'}" style="font-size: 0.8rem; margin-top: var(--spacing-xs);">
                    ${sectionData.confirmed ? '✅ Confirmado automáticamente' : '⚠️ Requiere confirmación'}
                    • ${bestMatch.size}
                </div>
                ${selectHtml}
            </div>
            <div>
                <button 
                    class="btn confirm-btn ${sectionData.confirmed ? 'secondary' : ''}" 
                    onclick="CombinerModule.toggleSectionConfirmation(${resultIndex}, '${sectionType}')"
                    style="padding: var(--spacing-xs) var(--spacing-sm); font-size: 0.8rem; min-width: 60px;">
                    ${sectionData.confirmed ? '✅' : '❓'}
                </button>
            </div>
        </div>
    `;
}

// AGREGAR función de debugging
debugSearchResults() {
    console.group('🔍 DEBUG SEARCH RESULTS');
    console.log('Número de resultados:', this.state.searchResults.length);
    console.log('Elemento container:', document.getElementById('search-results'));
    console.log('Elemento contador:', document.getElementById('matches-count'));
    
    this.state.searchResults.forEach((result, index) => {
        console.log(`Resultado ${index + 1}:`, {
            searchTerm: result.searchTerm,
            instrumentos: {
                matches: result.instrumentos.matches.length,
                confirmed: result.instrumentos.confirmed,
                selectedMatch: result.instrumentos.selectedMatch?.name
            },
            voces: {
                matches: result.voces.matches.length,
                confirmed: result.voces.confirmed,
                selectedMatch: result.voces.selectedMatch?.name
            }
        });
    });
    console.groupEnd();
}

renderSectionResult(sectionData, resultIndex, sectionType) {
    if (sectionData.matches.length === 0) {
        return `
            <div style="display: flex; align-items: center; gap: var(--spacing-sm); opacity: 0.7;">
                <div class="similarity-score low">0%</div>
                <div style="flex: 1;">
                    <div style="color: var(--accent-red);">
                        ❌ Sin coincidencias encontradas
                    </div>
                </div>
            </div>
        `;
    }

    const bestMatch = sectionData.selectedMatch;
    const similarityPercent = Math.round(bestMatch.similarity * 100);
    
    return `
        <div style="display: flex; align-items: flex-start; gap: var(--spacing-sm);">
            <div class="similarity-score ${bestMatch.matchType}">${similarityPercent}%</div>
            <div style="flex: 1;">
                <div class="file-name" style="color: var(--text-primary); font-weight: 500; margin-bottom: var(--spacing-xs);">${bestMatch.name}</div>
                <div class="match-status ${sectionData.confirmed ? 'confirmed' : 'suggested'}" style="font-size: 0.8rem; margin-top: var(--spacing-xs);">
                    ${sectionData.confirmed ? '✅ Confirmado automáticamente' : '⚠️ Requiere confirmación'}
                    • ${bestMatch.size}
                </div>
                ${sectionData.matches.length > 1 ? `
                    <select class="alternative-select" onchange="CombinerModule.selectAlternativeMatch(${resultIndex}, '${sectionType}', this.value)" style="background: var(--dark-gray); color: var(--text-primary); border: 1px solid var(--border-gray); padding: var(--spacing-xs); border-radius: var(--radius-sm); margin-top: var(--spacing-xs); width: 100%; font-size: 0.8rem;">
                        ${sectionData.matches.map((match, matchIndex) => `
                            <option value="${matchIndex}" ${matchIndex === 0 ? 'selected' : ''}>
                                ${match.name} (${Math.round(match.similarity * 100)}%)
                            </option>
                        `).join('')}
                    </select>
                ` : ''}
            </div>
            <div>
                <button 
                    class="btn confirm-btn ${sectionData.confirmed ? 'secondary' : ''}" 
                    onclick="CombinerModule.toggleSectionConfirmation(${resultIndex}, '${sectionType}')"
                    style="padding: var(--spacing-xs) var(--spacing-sm); font-size: 0.8rem; min-width: 60px;">
                    ${sectionData.confirmed ? '✅' : '❓'}
                </button>
            </div>
        </div>
    `;
}

    selectAlternativeMatch(resultIndex, sectionType, matchIndex) {
        const result = this.state.searchResults[resultIndex];
        result[sectionType].selectedMatch = result[sectionType].matches[parseInt(matchIndex)];
        
        this.renderSearchResults();
    }

    toggleSectionConfirmation(resultIndex, sectionType) {
        const result = this.state.searchResults[resultIndex];
        result[sectionType].confirmed = !result[sectionType].confirmed;
        
        this.renderSearchResults();
        this.updateActionButtons();
    }

    updateSimilarityDisplay() {
        const value = Math.round(this.state.similarityThreshold * 100);
        const element = document.getElementById('similarity-value');
        if (element) {
            element.textContent = `${value}%`;
        }
    }

    updateSearchButton() {
        const textarea = document.getElementById('song-list-textarea');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchBtn && textarea) {
            if (this.state.currentMode === 'automatic') {
                const hasText = textarea.value.trim().length > 0;
                searchBtn.style.display = hasText ? 'inline-flex' : 'none';
            } else {
                searchBtn.style.display = 'none';
            }
        }
    }

    updateActionButtons() {
        const previewBtn = document.getElementById('preview-btn');
        const combineBtn = document.getElementById('combine-btn');
        
        let hasSelection = false;
        
        if (this.state.currentMode === 'manual') {
            hasSelection = this.state.selectedFiles.length > 0;
        } else {
            // En modo automático, verificar si hay al menos una confirmación en cualquier sección
            hasSelection = this.state.searchResults.some(r => 
                r.instrumentos.confirmed || r.voces.confirmed
            );
        }
        
        if (previewBtn) previewBtn.disabled = !hasSelection;
        if (combineBtn) combineBtn.disabled = !hasSelection;
        
        this.updateSearchButton();
    }

    // === FUNCIÓN CORREGIDA PARA OBTENER ARCHIVOS POR SECCIÓN ===
    getFilesToCombine() {
        if (this.state.currentMode === 'manual') {
            return {
                instrumentos: this.state.selectedFiles.filter(f => f.section === 'instrumentos'),
                voces: this.state.selectedFiles.filter(f => f.section === 'voces')
            };
        } else {
            const instrumentos = [];
            const voces = [];
            
            this.state.searchResults
                .sort((a, b) => a.order - b.order)
                .forEach(result => {
                    if (result.instrumentos.confirmed && result.instrumentos.selectedMatch) {
                        instrumentos.push(result.instrumentos.selectedMatch);
                    }
                    if (result.voces.confirmed && result.voces.selectedMatch) {
                        voces.push(result.voces.selectedMatch);
                    }
                });
                
            console.log('📋 Archivos a combinar:', { instrumentos: instrumentos.length, voces: voces.length });
            return { instrumentos, voces };
        }
    }

    showPreview() {
        const filesToCombine = this.getFilesToCombine();
        const totalFiles = filesToCombine.instrumentos.length + filesToCombine.voces.length;
        
        if (totalFiles === 0) {
            this.showError('No hay archivos seleccionados para combinar');
            return;
        }

        const countElement = document.getElementById('preview-count');
        if (countElement) {
            countElement.textContent = totalFiles;
        }
        
        const previewList = document.getElementById('preview-list');
        if (previewList) {
            let html = '';
            
            if (filesToCombine.instrumentos.length > 0) {
                html += `
                    <div style="margin-bottom: var(--spacing-lg);">
                        <h4 style="color: var(--accent-red); margin-bottom: var(--spacing-md);">🎸 Instrumentos (${filesToCombine.instrumentos.length})</h4>
                        ${filesToCombine.instrumentos.map((file, index) => `
                            <div class="preview-file-item">
                                <div class="file-order">${index + 1}</div>
                                <div class="file-info" style="flex: 1;">
                                    <div class="file-name">${file.name}</div>
                                    <div class="file-meta">${file.size}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            if (filesToCombine.voces.length > 0) {
                html += `
                    <div style="margin-bottom: var(--spacing-lg);">
                        <h4 style="color: var(--accent-red); margin-bottom: var(--spacing-md);">🎤 Voces (${filesToCombine.voces.length})</h4>
                        ${filesToCombine.voces.map((file, index) => `
                            <div class="preview-file-item">
                                <div class="file-order">${index + 1}</div>
                                <div class="file-info" style="flex: 1;">
                                    <div class="file-name">${file.name}</div>
                                    <div class="file-meta">${file.size}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            
            previewList.innerHTML = html;
        }

        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    closePreview() {
        const modal = document.getElementById('preview-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    combineFiles() {
        this.showPreview();
    }

    async confirmCombination() {
        const filesToCombine = this.getFilesToCombine();
        
        const totalFiles = filesToCombine.instrumentos.length + filesToCombine.voces.length;
        
        if (totalFiles === 0) {
            this.showError('No hay archivos confirmados para combinar');
            return;
        }

        this.state.isProcessing = true;
        this.closePreview();
        
        try {
            if (!window.RealPDFCombiner) {
                throw new Error('Combinador real de PDFs no está disponible');
            }

            if (!window.RealPDFCombiner.isCompatible()) {
                throw new Error('Tu navegador no es compatible con la combinación de PDFs');
            }

            this.showDualProcessingModal(filesToCombine);
            
            const results = [];
            
            if (filesToCombine.instrumentos.length > 0) {
                console.log('🎸 Combinando instrumentos...');
                const instrumentosPDF = await window.RealPDFCombiner.combineFiles(
                    filesToCombine.instrumentos,
                    (current, total, message) => {
                        this.updateDualProgress('instrumentos', current, total, message);
                    }
                );
                results.push({ type: 'instrumentos', blob: instrumentosPDF, count: filesToCombine.instrumentos.length });
            }
            
            if (filesToCombine.voces.length > 0) {
                console.log('🎤 Combinando voces...');
                const vocesPDF = await window.RealPDFCombiner.combineFiles(
                    filesToCombine.voces,
                    (current, total, message) => {
                        this.updateDualProgress('voces', current, total, message);
                    }
                );
                results.push({ type: 'voces', blob: vocesPDF, count: filesToCombine.voces.length });
            }
            
            this.showDualSuccessModal(results);
            
        } catch (error) {
            console.error('❌ Error combinando PDFs:', error);
            this.showRealError(`Error al combinar PDFs: ${error.message}`);
        } finally {
            this.state.isProcessing = false;
        }
    }

    showDualProcessingModal(files) {
        const modal = document.createElement('div');
        modal.className = 'loading-overlay show';
        modal.id = 'dual-processing-modal';
        modal.innerHTML = `
            <div class="loading-spinner">
                <h3>🔄 Combinando PDFs por Secciones</h3>
                <div class="dual-progress-container">
                    ${files.instrumentos.length > 0 ? `
                        <div class="section-progress">
                            <h4>🎸 Instrumentos (${files.instrumentos.length} archivos)</h4>
                            <div class="progress-bar-container">
                                <div id="progress-bar-instrumentos" class="progress-bar">0%</div>
                            </div>
                            <p id="message-instrumentos">Preparando...</p>
                        </div>
                    ` : ''}
                    
                    ${files.voces.length > 0 ? `
                        <div class="section-progress">
                            <h4>🎤 Voces (${files.voces.length} archivos)</h4>
                            <div class="progress-bar-container">
                                <div id="progress-bar-voces" class="progress-bar">0%</div>
                            </div>
                            <p id="message-voces">Preparando...</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    updateDualProgress(section, current, total, message) {
        const progressBar = document.getElementById(`progress-bar-${section}`);
        const progressMessage = document.getElementById(`message-${section}`);
        
        if (progressBar && progressMessage) {
            const percentage = Math.round((current / total) * 100);
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
            progressMessage.textContent = message;
        }
    }

    showDualSuccessModal(results) {
        const processingModal = document.getElementById('dual-processing-modal');
        if (processingModal) {
            processingModal.remove();
        }
        
        const timestamp = new Date().toLocaleString('es-ES');
        
        const modal = document.createElement('div');
        modal.className = 'loading-overlay show';
        modal.innerHTML = `
            <div class="loading-spinner">
                <h3>✅ PDFs Combinados Exitosamente</h3>
                <div style="font-size: 3rem; margin: var(--spacing-lg) 0;">📄📄</div>
                
                <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); margin: var(--spacing-lg) 0;">
                    <h4 style="color: var(--text-primary); margin-bottom: var(--spacing-md);">PDFs Generados:</h4>
                    ${results.map(result => {
                        const sizeMB = (result.blob.size / 1024 / 1024).toFixed(2);
                        const icon = result.type === 'instrumentos' ? '🎸' : '🎤';
                        const sectionName = result.type === 'instrumentos' ? 'Instrumentos' : 'Voces';
                        return `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-sm); padding: var(--spacing-sm); background: var(--medium-gray); border-radius: var(--radius-sm);">
                                <span>${icon} ${sectionName} - ${result.count} archivos</span>
                                <span>${sizeMB} MB</span>
                                <button class="btn small" onclick="CombinerModule.downloadSpecificPDF('${result.type}')">
                                    📥 Descargar
                                </button>
                            </div>
                        `;
                    }).join('')}
                    <div style="margin-top: var(--spacing-md); color: var(--text-muted); font-size: 0.9rem;">
                        <strong>Fecha:</strong> ${timestamp}
                    </div>
                </div>
                
                <div style="display: flex; gap: var(--spacing-md); justify-content: center; margin-top: var(--spacing-lg);">
                    <button class="btn secondary" onclick="this.closest('.loading-overlay').remove()">
                        ✨ Cerrar
                    </button>
                    <button class="btn" onclick="CombinerModule.downloadAllPDFs(); this.closest('.loading-overlay').remove();">
                        📥 Descargar Todos
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.lastCombinedPDFs = {};
        results.forEach(result => {
            this.lastCombinedPDFs[result.type] = result.blob;
        });
    }

    downloadSpecificPDF(type) {
        if (this.lastCombinedPDFs && this.lastCombinedPDFs[type]) {
            const filename = this.generateSpecificPDFFilename(type);
            window.RealPDFCombiner.downloadCombinedPDF(this.lastCombinedPDFs[type], filename);
            this.showSuccess(`PDF de ${type} descargado exitosamente!`);
        }
    }

    downloadAllPDFs() {
        if (this.lastCombinedPDFs) {
            Object.entries(this.lastCombinedPDFs).forEach(([type, blob]) => {
                const filename = this.generateSpecificPDFFilename(type);
                window.RealPDFCombiner.downloadCombinedPDF(blob, filename);
            });
            this.showSuccess('Todos los PDFs descargados exitosamente!');
        }
    }

    generateSpecificPDFFilename(type) {
        const mode = this.state.currentMode;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const sectionName = type === 'instrumentos' ? 'Instrumentos' : 'Voces';
        
        return `PDFs_${sectionName}_${mode}_${timestamp}.pdf`;
    }

    showRealError(message) {
        const processingModal = document.getElementById('dual-processing-modal');
        if (processingModal) {
            processingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'loading-overlay show';
        modal.innerHTML = `
            <div class="loading-spinner">
                <h3>❌ Error en Combinación</h3>
                <div style="font-size: 3rem; margin: var(--spacing-lg) 0; color: var(--accent-red);">⚠️</div>
                <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); margin: var(--spacing-lg) 0;">
                    <p style="color: var(--text-primary); margin-bottom: var(--spacing-md);"><strong>Detalles del error:</strong></p>
                    <p style="color: var(--accent-red); font-family: monospace; font-size: 0.9rem;">${message}</p>
                </div>
                
                <div style="display: flex; gap: var(--spacing-md); justify-content: center; margin-top: var(--spacing-lg);">
                    <button class="btn secondary" onclick="this.closest('.loading-overlay').remove()">
                        ❌ Cerrar
                    </button>
                    <button class="btn" onclick="this.closest('.loading-overlay').remove(); CombinerModule.showPreview();">
                        🔄 Intentar de Nuevo
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    clearAll() {
        if (this.state.currentMode === 'manual') {
            this.clearAllSelections();
            const searchInput = document.getElementById('manual-search-input');
            if (searchInput) {
                searchInput.value = '';
                this.state.manualSearchQuery = '';
                this.filterCurrentSectionFiles();
                this.renderAvailableFiles();
            }
        } else {
            const textarea = document.getElementById('song-list-textarea');
            if (textarea) {
                textarea.value = '';
            }
            this.state.searchResults = [];
            this.renderSearchResults();
            this.updateActionButtons();
        }
    }

    showError(message) {
        console.error('❌', message);
        if (window.UIHandlers && window.UIHandlers.showNotification) {
            window.UIHandlers.showNotification(message, 'error');
        } else {
            alert('Error: ' + message);
        }
    }

    showSuccess(message) {
        console.log('✅', message);
        if (window.UIHandlers && window.UIHandlers.showNotification) {
            window.UIHandlers.showNotification(message, 'success');
        } else {
            alert('Éxito: ' + message);
        }
    }
}

// === EXPORTAR MÓDULO ===
const CombinerModule = new PDFCombiner();

// Funciones globales para el HTML
window.CombinerModule = {
    switchMode: (mode) => CombinerModule.switchMode(mode),
    switchSection: (section) => CombinerModule.switchSection(section),
    toggleFileSelection: (fileId) => CombinerModule.toggleFileSelection(fileId),
    removeSelectedFile: (fileId) => CombinerModule.removeSelectedFile(fileId),
    clearAllSelections: () => CombinerModule.clearAllSelections(),
    searchSongs: () => CombinerModule.searchSongs(),
    selectAlternativeMatch: (resultIndex, sectionType, matchIndex) => CombinerModule.selectAlternativeMatch(resultIndex, sectionType, matchIndex),
    toggleSectionConfirmation: (resultIndex, sectionType) => CombinerModule.toggleSectionConfirmation(resultIndex, sectionType),
    showPreview: () => CombinerModule.showPreview(),
    closePreview: () => CombinerModule.closePreview(),
    combineFiles: () => CombinerModule.combineFiles(),
    confirmCombination: () => CombinerModule.confirmCombination(),
    downloadSpecificPDF: (type) => CombinerModule.downloadSpecificPDF(type),
    downloadAllPDFs: () => CombinerModule.downloadAllPDFs(),
    clearAll: () => CombinerModule.clearAll(),
    init: () => CombinerModule.init(),
    debugSearchResults: () => CombinerModule.debugSearchResults(),
    getState: () => CombinerModule.state
    
};

console.log('🔗 Combiner Module cargado - VERSIÓN CORREGIDA');
/**
 * MUSIC PDF MANAGER - COMBINER MODULE - MEJORADO
 * Módulo para combinar múltiples PDFs en uno solo con switch mejorado
 */

class PDFCombiner {
    constructor() {
        this.state = {
            currentMode: 'manual',
            currentSection: 'instrumentos', // Nueva propiedad para el modo manual
            availableFiles: { instrumentos: [], voces: [] },
            selectedFiles: [],
            searchResults: [],
            similarityThreshold: 0.6,
            isProcessing: false
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAvailableFiles();
        this.updateSimilarityDisplay();
        this.updateModeDescription();
        this.updateSectionDisplay(); // Nueva función
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

    // === SWITCH DE MODO PRINCIPAL ===
    switchMode(mode) {
        if (this.state.currentMode === mode) return;
        
        this.state.currentMode = mode;

        // Actualizar botones del switch principal
        document.querySelectorAll('.mode-switch-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-mode="${mode}"]`).classList.add('active');

        // Mostrar/ocultar contenido correspondiente
        document.querySelectorAll('.mode-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${mode}-mode`).classList.add('active');

        this.updateModeDescription();
        this.updateActionButtons();
        
        // Si cambiamos a modo manual, actualizar la vista de archivos
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

    // === SWITCH DE SECCIÓN (Para modo manual) ===
    switchSection(section) {
        if (this.state.currentSection === section) return;
        
        this.state.currentSection = section;

        // Actualizar botones del switch de sección
        document.querySelectorAll('.section-switch-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        this.updateSectionDisplay();
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
            const files = this.state.availableFiles[this.state.currentSection] || [];
            count.textContent = `${files.length} archivo${files.length !== 1 ? 's' : ''}`;
        }
    }

    loadAvailableFiles() {
        if (window.AppState && window.AppState.files) {
            this.state.availableFiles = window.AppState.files;
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
            console.log('⚠️ Usando datos de prueba para desarrollo');
        }

        this.renderAvailableFiles();
        this.updateSectionDisplay();
    }

    renderAvailableFiles() {
        const container = document.getElementById('available-files');
        if (!container) return;

        // Obtener archivos de la sección actual
        const currentFiles = this.state.availableFiles[this.state.currentSection] || [];

        if (currentFiles.length === 0) {
            container.innerHTML = `
                <div class="placeholder">
                    <div class="placeholder-icon">📄</div>
                    <p>No hay archivos en ${this.state.currentSection}</p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">
                        Verifica la conexión con Google Drive
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
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">${this.state.currentSection} • ${file.size}</div>
                </div>
            </div>
        `).join('');

        // Marcar archivos ya seleccionados
        this.updateSelectedStates();
    }

    updateSelectedStates() {
        // Actualizar estados visuales de los archivos seleccionados
        this.state.selectedFiles.forEach(selectedFile => {
            const fileElement = document.querySelector(`[data-file-id="${selectedFile.id}"]`);
            const checkbox = document.getElementById(`check-${selectedFile.id}`);
            
            if (fileElement && selectedFile.section === this.state.currentSection) {
                fileElement.classList.add('selected');
                if (checkbox) checkbox.checked = true;
            }
        });
    }

    // === MODO MANUAL ===
    toggleFileSelection(fileId) {
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        const checkbox = document.getElementById(`check-${fileId}`);
        
        if (this.state.selectedFiles.find(f => f.id === fileId)) {
            // Deseleccionar
            this.state.selectedFiles = this.state.selectedFiles.filter(f => f.id !== fileId);
            if (fileElement) fileElement.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        } else {
            // Seleccionar
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
        
        // Actualizar UI en todas las vistas
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
        
        // Limpiar checkboxes y clases
        document.querySelectorAll('.file-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        document.querySelectorAll('.combiner-file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        this.updateSelectedFilesList();
        this.updateActionButtons();
    }

    // === MODO AUTOMÁTICO ===
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

        console.log('🔍 Buscando canciones:', songNames);
        this.state.searchResults = [];

        // Combinar archivos de ambas secciones para búsqueda automática
        const allFiles = [
            ...this.state.availableFiles.instrumentos.map(f => ({...f, section: 'instrumentos'})),
            ...this.state.availableFiles.voces.map(f => ({...f, section: 'voces'}))
        ];

        songNames.forEach((songName, index) => {
            const matches = this.findSimilarFiles(songName, allFiles);
            
            if (matches.length > 0) {
                const bestMatch = matches[0];
                const isConfirmed = bestMatch.similarity >= 0.8; // Auto-confirmar si >= 80%
                
                this.state.searchResults.push({
                    searchTerm: songName,
                    order: index + 1,
                    matches: matches,
                    selectedMatch: bestMatch,
                    confirmed: isConfirmed,
                    manualSelection: false
                });
            } else {
                this.state.searchResults.push({
                    searchTerm: songName,
                    order: index + 1,
                    matches: [],
                    selectedMatch: null,
                    confirmed: false,
                    manualSelection: false
                });
            }
        });

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

        // Ordenar por similitud descendente
        return matches.sort((a, b) => b.similarity - a.similarity);
    }

    calculateSimilarity(text1, text2) {
        // Implementación basada en el algoritmo Python
        const normalized1 = this.normalizeText(text1);
        const normalized2 = this.normalizeText(text2);
        
        // Similitud exacta
        const exactSimilarity = this.sequenceMatcher(normalized1, normalized2);
        
        // Similitud por palabras
        const words1 = new Set(normalized1.split(' ').filter(w => w.length > 0));
        const words2 = new Set(normalized2.split(' ').filter(w => w.length > 0));
        
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        
        const wordSimilarity = union.size > 0 ? intersection.size / union.size : 0;
        
        // Bonus por palabras importantes
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
            .replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^\w\s]/g, ' ') // Solo letras, números y espacios
            .replace(/\s+/g, ' ') // Normalizar espacios
            .trim();
    }

    sequenceMatcher(str1, str2) {
        // Implementación simple de similitud de secuencias
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

    renderSearchResults() {
        const container = document.getElementById('search-results');
        const countElement = document.getElementById('matches-count');
        
        if (!container) return;
        
        const confirmedCount = this.state.searchResults.filter(r => r.confirmed).length;
        if (countElement) {
            countElement.textContent = `${confirmedCount}/${this.state.searchResults.length}`;
        }

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

        container.innerHTML = this.state.searchResults.map((result, index) => {
            if (result.matches.length === 0) {
                return `
                    <div class="search-result-item">
                        <div class="similarity-score low">0%</div>
                        <div class="file-info" style="flex: 1;">
                            <div class="file-name">"${result.searchTerm}"</div>
                            <div class="match-status" style="color: var(--accent-red);">
                                ❌ Sin coincidencias encontradas
                            </div>
                        </div>
                    </div>
                `;
            }

            const bestMatch = result.selectedMatch;
            const similarityPercent = Math.round(bestMatch.similarity * 100);
            
            return `
                <div class="search-result-item">
                    <div class="similarity-score ${bestMatch.matchType}">${similarityPercent}%</div>
                    <div class="file-info" style="flex: 1;">
                        <div class="file-name">${bestMatch.name}</div>
                        <div class="match-status ${result.confirmed ? 'confirmed' : 'suggested'}">
                            ${result.confirmed ? '✅ Confirmado automáticamente' : '⚠️ Requiere confirmación'}
                            • Buscando: "${result.searchTerm}"
                            • Sección: ${bestMatch.section}
                        </div>
                        ${result.matches.length > 1 ? `
                            <select class="alternative-select" onchange="CombinerModule.selectAlternativeMatch(${index}, this.value)">
                                ${result.matches.map((match, matchIndex) => `
                                    <option value="${matchIndex}" ${matchIndex === 0 ? 'selected' : ''}>
                                        ${match.name} (${Math.round(match.similarity * 100)}%) - ${match.section}
                                    </option>
                                `).join('')}
                            </select>
                        ` : ''}
                    </div>
                    <div>
                        <button 
                            class="btn confirm-btn ${result.confirmed ? 'secondary' : ''}" 
                            onclick="CombinerModule.toggleConfirmation(${index})">
                            ${result.confirmed ? '✅' : '❓'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    selectAlternativeMatch(resultIndex, matchIndex) {
        const result = this.state.searchResults[resultIndex];
        result.selectedMatch = result.matches[parseInt(matchIndex)];
        result.manualSelection = true;
        
        this.renderSearchResults();
    }

    toggleConfirmation(resultIndex) {
        const result = this.state.searchResults[resultIndex];
        result.confirmed = !result.confirmed;
        
        this.renderSearchResults();
        this.updateActionButtons();
    }

    // === UTILIDADES ===
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
            hasSelection = this.state.searchResults.some(r => r.confirmed);
        }
        
        if (previewBtn) previewBtn.disabled = !hasSelection;
        if (combineBtn) combineBtn.disabled = !hasSelection;
        
        this.updateSearchButton();
    }

    getFilesToCombine() {
        if (this.state.currentMode === 'manual') {
            return this.state.selectedFiles;
        } else {
            return this.state.searchResults
                .filter(result => result.confirmed && result.selectedMatch)
                .sort((a, b) => a.order - b.order)
                .map(result => result.selectedMatch);
        }
    }

    // === VISTA PREVIA Y COMBINACIÓN ===
    showPreview() {
        const filesToCombine = this.getFilesToCombine();
        
        if (filesToCombine.length === 0) {
            this.showError('No hay archivos seleccionados para combinar');
            return;
        }

        const countElement = document.getElementById('preview-count');
        if (countElement) {
            countElement.textContent = filesToCombine.length;
        }
        
        const previewList = document.getElementById('preview-list');
        if (previewList) {
            previewList.innerHTML = filesToCombine.map((file, index) => `
                <div class="preview-file-item">
                    <div class="file-order">${index + 1}</div>
                    <div class="file-info" style="flex: 1;">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${file.section} • ${file.size}</div>
                    </div>
                </div>
            `).join('');
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
        
        if (filesToCombine.length === 0) {
            this.showError('No hay archivos para combinar');
            return;
        }

        this.state.isProcessing = true;
        this.closePreview();
        
        try {
            // Verificar si RealPDFCombiner está disponible
            if (!window.RealPDFCombiner) {
                throw new Error('Combinador real de PDFs no está disponible');
            }

            // Verificar compatibilidad del navegador
            if (!window.RealPDFCombiner.isCompatible()) {
                throw new Error('Tu navegador no es compatible con la combinación de PDFs');
            }

            // Estimar tamaño y verificar memoria
            const estimatedSize = window.RealPDFCombiner.estimateCombinedSize(filesToCombine);
            const memoryCheck = window.RealPDFCombiner.checkMemoryAvailability(estimatedSize);
            
            if (!memoryCheck.canProceed) {
                throw new Error(memoryCheck.warning);
            }

            if (memoryCheck.warning) {
                console.warn('⚠️', memoryCheck.warning);
            }

            // Mostrar progreso real
            this.showRealProcessingModal(filesToCombine);
            
            // ¡COMBINACIÓN REAL!
            const combinedPDFBlob = await window.RealPDFCombiner.combineFiles(
                filesToCombine,
                (current, total, message) => {
                    this.updateRealProgress(current, total, message);
                }
            );
            
            // Éxito - mostrar modal de descarga
            this.showSuccessModalWithRealPDF(filesToCombine, combinedPDFBlob);
            
        } catch (error) {
            console.error('❌ Error combinando PDFs:', error);
            this.showRealError(`Error al combinar PDFs: ${error.message}`);
        } finally {
            this.state.isProcessing = false;
        }
    }

    showRealProcessingModal(files) {
        const modal = document.createElement('div');
        modal.className = 'loading-overlay show';
        modal.id = 'real-processing-modal';
        modal.innerHTML = `
            <div class="loading-spinner">
                <h3>🔄 Combinando PDFs Realmente</h3>
                <div class="spinner"></div>
                <div id="real-progress-container" style="margin: var(--spacing-lg) 0; width: 300px;">
                    <div style="background: var(--dark-gray); border-radius: var(--radius-md); padding: 4px;">
                        <div id="real-progress-bar" style="
                            background: var(--accent-red); 
                            height: 20px; 
                            border-radius: var(--radius-sm); 
                            width: 0%; 
                            transition: width 0.3s ease;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 0.8rem;
                            font-weight: 600;
                        ">0%</div>
                    </div>
                </div>
                <p id="real-processing-message">Preparando combinación de ${files.length} archivos...</p>
                <div style="margin-top: var(--spacing-md); color: var(--text-muted); font-size: 0.9rem;">
                    <div>📄 Total de archivos: ${files.length}</div>
                    <div>💾 Tamaño estimado: ${this.formatBytes(window.RealPDFCombiner.estimateCombinedSize(files))}</div>
                    <div>🔄 Modo: ${this.state.currentMode === 'manual' ? 'Manual' : 'Automático'}</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    updateRealProgress(current, total, message) {
        const progressBar = document.getElementById('real-progress-bar');
        const progressMessage = document.getElementById('real-processing-message');
        
        if (progressBar && progressMessage) {
            const percentage = Math.round((current / total) * 100);
            progressBar.style.width = `${percentage}%`;
            progressBar.textContent = `${percentage}%`;
            progressMessage.textContent = message;
        }
    }

    showSuccessModalWithRealPDF(files, pdfBlob) {
        const processingModal = document.getElementById('real-processing-modal');
        if (processingModal) {
            processingModal.remove();
        }
        
        const fileSizeMB = (pdfBlob.size / 1024 / 1024).toFixed(2);
        const timestamp = new Date().toLocaleString('es-ES');
        const mode = this.state.currentMode === 'manual' ? 'Manual' : 'Automático';
        
        const modal = document.createElement('div');
        modal.className = 'loading-overlay show';
        modal.innerHTML = `
            <div class="loading-spinner">
                <h3>✅ PDF Combinado Exitosamente</h3>
                <div style="font-size: 4rem; margin: var(--spacing-lg) 0;">📄</div>
                
                <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); margin: var(--spacing-lg) 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); text-align: left;">
                        <div><strong>Modo:</strong> ${mode}</div>
                        <div><strong>Archivos:</strong> ${files.length}</div>
                        <div><strong>Tamaño:</strong> ${fileSizeMB} MB</div>
                        <div><strong>Fecha:</strong> ${timestamp}</div>
                    </div>
                </div>
                
                <div style="margin: var(--spacing-md) 0; padding: var(--spacing-md); background: var(--accent-red-light); border-radius: var(--radius-md);">
                    <p style="color: var(--accent-red); font-weight: 600; margin: 0;">
                        🎉 ¡Tu PDF combinado está listo para descargar!
                    </p>
                </div>
                
                <div style="display: flex; gap: var(--spacing-md); justify-content: center; margin-top: var(--spacing-lg);">
                    <button class="btn secondary" onclick="this.closest('.loading-overlay').remove()">
                        ✨ Cerrar
                    </button>
                    <button class="btn" onclick="CombinerModule.downloadRealPDF(); this.closest('.loading-overlay').remove();">
                        📥 Descargar PDF (${fileSizeMB} MB)
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Guardar referencia del blob para descarga
        this.lastCombinedPDF = pdfBlob;
    }

    downloadRealPDF() {
        if (this.lastCombinedPDF) {
            try {
                const filename = this.generatePDFFilename();
                window.RealPDFCombiner.downloadCombinedPDF(this.lastCombinedPDF, filename);
                this.showSuccess('¡PDF descargado exitosamente!');
                
                // Limpiar referencia
                this.lastCombinedPDF = null;
                
            } catch (error) {
                console.error('❌ Error descargando PDF:', error);
                this.showError('Error al descargar el PDF');
            }
        } else {
            this.showError('No hay PDF para descargar');
        }
    }

    generatePDFFilename() {
        const mode = this.state.currentMode;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        
        if (mode === 'manual') {
            const count = this.state.selectedFiles.length;
            return `PDFs_Combinados_Manual_${count}archivos_${timestamp}.pdf`;
        } else {
            const confirmedCount = this.state.searchResults.filter(r => r.confirmed).length;
            return `PDFs_Combinados_Auto_${confirmedCount}archivos_${timestamp}.pdf`;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showRealError(message) {
        const processingModal = document.getElementById('real-processing-modal');
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
                
                <div style="background: var(--medium-gray); padding: var(--spacing-md); border-radius: var(--radius-md); margin: var(--spacing-lg) 0;">
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 0;">
                        💡 <strong>Posibles soluciones:</strong><br>
                        • Verificar que todos los archivos sean PDFs válidos<br>
                        • Reducir el número de archivos a combinar<br>
                        • Verificar la conexión a Google Drive<br>
                        • Intentar con archivos más pequeños
                    </p>
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

    // === MENSAJES ===
    showError(message) {
        console.error('❌', message);
        alert('Error: ' + message);
    }

    showSuccess(message) {
        console.log('✅', message);
        alert('Éxito: ' + message);
    }
}

// === EXPORTAR MÓDULO ===
const CombinerModule = new PDFCombiner();

// Funciones globales para el HTML
window.CombinerModule = {
    // Funciones del switch principal
    switchMode: (mode) => CombinerModule.switchMode(mode),
    
    // Funciones del switch de sección
    switchSection: (section) => CombinerModule.switchSection(section),
    
    // Funciones de modo manual
    toggleFileSelection: (fileId) => CombinerModule.toggleFileSelection(fileId),
    removeSelectedFile: (fileId) => CombinerModule.removeSelectedFile(fileId),
    clearAllSelections: () => CombinerModule.clearAllSelections(),
    
    // Funciones de modo automático
    searchSongs: () => CombinerModule.searchSongs(),
    selectAlternativeMatch: (resultIndex, matchIndex) => CombinerModule.selectAlternativeMatch(resultIndex, matchIndex),
    toggleConfirmation: (resultIndex) => CombinerModule.toggleConfirmation(resultIndex),
    
    // Funciones de vista previa y combinación
    showPreview: () => CombinerModule.showPreview(),
    closePreview: () => CombinerModule.closePreview(),
    combineFiles: () => CombinerModule.combineFiles(),
    confirmCombination: () => CombinerModule.confirmCombination(),
    downloadRealPDF: () => CombinerModule.downloadRealPDF(),
    
    // Funciones generales
    clearAll: () => CombinerModule.clearAll(),
    init: () => CombinerModule.init(),
    getState: () => CombinerModule.state
};

console.log('🔗 Combiner Module cargado - VERSIÓN MEJORADA con switch de sección');
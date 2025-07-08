/**
 * MUSIC PDF MANAGER - MANUAL CHORD INPUT
 * Componente para entrada manual de acordes cuando la extracción automática falla
 */

class ManualChordInput {
    constructor() {
        this.isVisible = false;
        this.currentCallback = null;
        this.chordHistory = [];
        
        this.init();
    }

    /**
     * Inicializa el componente
     */
    init() {
        this.createModal();
        this.setupEventListeners();
    }

    /**
     * Crea el modal de entrada manual
     */
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'manual-chord-modal';
        modal.className = 'loading-overlay';
        modal.style.display = 'none';
        
        modal.innerHTML = `
            <div class="loading-spinner" style="max-width: 600px; width: 90%;">
                <div class="config-header">
                    <h3>🎼 Entrada Manual de Acordes</h3>
                    <button class="control-btn" data-action="close-manual-input">✕</button>
                </div>
                
                <div class="manual-input-content">
                    <div class="help-section">
                        <h4>📄 Archivo sin texto extraíble detectado</h4>
                        <p>Este PDF contiene acordes como imagen. Puedes:</p>
                        <ul>
                            <li>✏️ Escribir los acordes manualmente abajo</li>
                            <li>🔄 Usar otro PDF con texto seleccionable</li>
                            <li>👁️ Solo visualizar el PDF sin funciones de transposición</li>
                        </ul>
                    </div>
                    
                    <div class="input-section">
                        <h4>🎯 Escribir Acordes</h4>
                        <div class="chord-input-area">
                            <textarea 
                                id="manual-chord-textarea" 
                                placeholder="Escribe los acordes separados por espacios o líneas nuevas:
Ejemplo: Am F C G
O línea por línea:
Am - F
C - G - Am"
                                rows="6"
                            ></textarea>
                        </div>
                        
                        <div class="chord-suggestions">
                            <h5>💡 Acordes comunes:</h5>
                            <div class="chord-buttons">
                                <button class="chord-btn" data-chord="C">C</button>
                                <button class="chord-btn" data-chord="D">D</button>
                                <button class="chord-btn" data-chord="E">E</button>
                                <button class="chord-btn" data-chord="F">F</button>
                                <button class="chord-btn" data-chord="G">G</button>
                                <button class="chord-btn" data-chord="A">A</button>
                                <button class="chord-btn" data-chord="B">B</button>
                                <button class="chord-btn" data-chord="Am">Am</button>
                                <button class="chord-btn" data-chord="Dm">Dm</button>
                                <button class="chord-btn" data-chord="Em">Em</button>
                                <button class="chord-btn" data-chord="Fm">Fm</button>
                                <button class="chord-btn" data-chord="Gm">Gm</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="actions-section">
                        <button id="process-manual-chords" class="control-btn primary">
                            🎵 Procesar Acordes
                        </button>
                        <button id="skip-chord-detection" class="control-btn secondary">
                            👁️ Solo Visualizar PDF
                        </button>
                        <button id="cancel-manual-input" class="control-btn">
                            ❌ Cancelar
                        </button>
                    </div>
                    
                    <div class="preview-section" id="chord-preview" style="display: none;">
                        <h4>🔍 Vista Previa</h4>
                        <div id="chord-preview-content"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
    }

    /**
     * Configura event listeners
     */
    setupEventListeners() {
        // Cerrar modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal || e.target.dataset.action === 'close-manual-input') {
                this.hide();
            }
        });

        // Botones de acordes sugeridos
        this.modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('chord-btn')) {
                this.addChordToTextarea(e.target.dataset.chord);
            }
        });

        // Botón procesar acordes
        document.getElementById('process-manual-chords').addEventListener('click', () => {
            this.processManualChords();
        });

        // Botón solo visualizar
        document.getElementById('skip-chord-detection').addEventListener('click', () => {
            this.skipChordDetection();
        });

        // Botón cancelar
        document.getElementById('cancel-manual-input').addEventListener('click', () => {
            this.hide();
        });

        // Preview en tiempo real
        document.getElementById('manual-chord-textarea').addEventListener('input', () => {
            this.updatePreview();
        });

        // Atajos de teclado
        document.addEventListener('keydown', (e) => {
            if (this.isVisible) {
                if (e.key === 'Escape') {
                    this.hide();
                } else if (e.key === 'Enter' && e.ctrlKey) {
                    this.processManualChords();
                }
            }
        });
    }

    /**
     * Muestra el modal
     */
    show(callback = null) {
        this.currentCallback = callback;
        this.isVisible = true;
        this.modal.style.display = 'flex';
        
        // Focus en textarea
        setTimeout(() => {
            document.getElementById('manual-chord-textarea').focus();
        }, 100);
    }

    /**
     * Oculta el modal
     */
    hide() {
        this.isVisible = false;
        this.modal.style.display = 'none';
        this.currentCallback = null;
        
        // Limpiar textarea
        document.getElementById('manual-chord-textarea').value = '';
        document.getElementById('chord-preview').style.display = 'none';
    }

    /**
     * Agrega acorde al textarea
     */
    addChordToTextarea(chord) {
        const textarea = document.getElementById('manual-chord-textarea');
        const currentValue = textarea.value;
        const newValue = currentValue + (currentValue ? ' ' : '') + chord;
        
        textarea.value = newValue;
        textarea.focus();
        
        this.updatePreview();
    }

    /**
     * Actualiza la vista previa
     */
    updatePreview() {
        const textarea = document.getElementById('manual-chord-textarea');
        const text = textarea.value.trim();
        const previewSection = document.getElementById('chord-preview');
        const previewContent = document.getElementById('chord-preview-content');
        
        if (!text) {
            previewSection.style.display = 'none';
            return;
        }

        // Parsear acordes
        const chords = this.parseChords(text);
        
        if (chords.length > 0) {
            previewSection.style.display = 'block';
            
            const chordsHtml = chords.map(chord => 
                `<span class="chord-preview-item">${chord}</span>`
            ).join(' ');
            
            previewContent.innerHTML = `
                <div class="chord-preview-list">${chordsHtml}</div>
                <div class="chord-preview-stats">
                    📊 ${chords.length} acordes detectados
                    ${chords.length > 0 ? '| 🎵 ' + this.detectKey(chords) : ''}
                </div>
            `;
        } else {
            previewSection.style.display = 'none';
        }
    }

    /**
     * Parsea acordes del texto
     */
    parseChords(text) {
        // Dividir por espacios, saltos de línea y caracteres comunes
        const words = text
            .split(/[\s\n\r\-\|,;]+/)
            .map(word => word.trim())
            .filter(word => word.length > 0);
        
        // Filtrar solo acordes válidos
        const chordPattern = /^[A-G][#b]?(m|maj|dim|aug|sus[24]?|add\d+|\d+)*$/i;
        
        return words.filter(word => chordPattern.test(word));
    }

    /**
     * Detecta tonalidad básica
     */
    detectKey(chords) {
        // Análisis muy básico - contar acordes más frecuentes
        const chordCounts = {};
        chords.forEach(chord => {
            const root = chord.replace(/[^A-G#b]/g, '');
            chordCounts[root] = (chordCounts[root] || 0) + 1;
        });
        
        const mostCommon = Object.entries(chordCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        return mostCommon ? `Posible tonalidad: ${mostCommon[0]}` : 'Tonalidad no determinada';
    }

    /**
     * Procesa acordes manuales
     */
    processManualChords() {
        const textarea = document.getElementById('manual-chord-textarea');
        const text = textarea.value.trim();
        
        if (!text) {
            alert('⚠️ Por favor escribe algunos acordes');
            return;
        }

        const chords = this.parseChords(text);
        
        if (chords.length === 0) {
            alert('⚠️ No se detectaron acordes válidos. Verifica el formato (ej: C, Am, F, G7)');
            return;
        }

        // Guardar en historial
        this.chordHistory.push({
            text,
            chords,
            timestamp: new Date().toISOString()
        });

        // Simular resultado de detección automática
        const result = {
            text: text,
            chords: chords.map((chord, index) => ({
                chord: chord,
                position: index * 10, // Posición aproximada
                confidence: 1.0,
                note: chord.replace(/[^A-G#b]/g, ''),
                suffix: chord.replace(/^[A-G][#b]?/, ''),
                type: 'manual'
            })),
            detectedKey: this.detectKey(chords),
            extractionMethod: 'MANUAL',
            source: 'user_input'
        };

        // Llamar callback con resultado
        if (this.currentCallback) {
            this.currentCallback(result);
        }

        this.hide();
    }

    /**
     * Salta detección de acordes
     */
    skipChordDetection() {
        const result = {
            text: '',
            chords: [],
            detectedKey: null,
            extractionMethod: 'SKIPPED',
            source: 'user_choice'
        };

        if (this.currentCallback) {
            this.currentCallback(result);
        }

        this.hide();
    }

    /**
     * Obtiene historial de acordes
     */
    getHistory() {
        return this.chordHistory;
    }

    /**
     * Limpia historial
     */
    clearHistory() {
        this.chordHistory = [];
    }
}

// CSS adicional para el componente
const manualChordCSS = `
    .manual-input-content {
        text-align: left;
        padding: var(--spacing-lg);
    }

    .help-section {
        background: var(--dark-gray);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        margin-bottom: var(--spacing-lg);
    }

    .help-section h4 {
        color: var(--accent-red);
        margin-bottom: var(--spacing-sm);
    }

    .help-section ul {
        list-style: none;
        padding: 0;
    }

    .help-section li {
        padding: var(--spacing-sm) 0;
        border-bottom: 1px solid var(--medium-gray);
    }

    .input-section {
        margin-bottom: var(--spacing-lg);
    }

    .chord-input-area textarea {
        width: 100%;
        padding: var(--spacing-md);
        background: var(--dark-gray);
        border: 2px solid var(--medium-gray);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-family: 'Courier New', monospace;
        font-size: 1rem;
        resize: vertical;
        min-height: 120px;
    }

    .chord-input-area textarea:focus {
        border-color: var(--accent-red);
        outline: none;
    }

    .chord-suggestions {
        margin-top: var(--spacing-md);
    }

    .chord-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm);
        margin-top: var(--spacing-sm);
    }

    .chord-btn {
        background: var(--medium-gray);
        border: none;
        color: var(--text-primary);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s ease;
    }

    .chord-btn:hover {
        background: var(--accent-red);
        transform: translateY(-1px);
    }

    .actions-section {
        display: flex;
        gap: var(--spacing-md);
        justify-content: center;
        flex-wrap: wrap;
    }

    .control-btn.primary {
        background: var(--accent-red);
        color: white;
    }

    .control-btn.secondary {
        background: var(--medium-gray);
        color: var(--text-primary);
    }

    .preview-section {
        background: var(--dark-gray);
        padding: var(--spacing-md);
        border-radius: var(--radius-md);
        margin-top: var(--spacing-lg);
    }

    .chord-preview-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-sm);
        margin-bottom: var(--spacing-sm);
    }

    .chord-preview-item {
        background: var(--accent-red);
        color: white;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-weight: bold;
        font-size: 0.9rem;
    }

    .chord-preview-stats {
        color: var(--text-muted);
        font-size: 0.9rem;
        border-top: 1px solid var(--medium-gray);
        padding-top: var(--spacing-sm);
    }

    @media (max-width: 768px) {
        .actions-section {
            flex-direction: column;
        }
        
        .chord-buttons {
            justify-content: center;
        }
    }
`;

// Inyectar CSS
const style = document.createElement('style');
style.textContent = manualChordCSS;
document.head.appendChild(style);

// Exportar para uso global
window.ManualChordInput = ManualChordInput;
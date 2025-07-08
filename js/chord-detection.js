/**
 * MUSIC PDF MANAGER - CHORD DETECTION
 * Sistema de detección de acordes en texto musical
 */

class ChordDetector {
    constructor() {
        // Notas musicales en notación americana
        this.notes = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
        
        // Patrones de acordes básicos
        this.basicChordSuffixes = [
            '', 'm', 'maj', 'min', 'dim', 'aug', 'sus2', 'sus4'
        ];
        
        // Patrones de acordes extendidos
        this.extendedChordSuffixes = [
            '2', '4', '5', '6', '7', '9', '11', '13',
            'maj7', 'min7', 'm7', 'maj9', 'min9', 'm9',
            'add2', 'add4', 'add9', 'add11',
            'sus2', 'sus4', 'dim7', 'aug7', 'aug9',
            '7sus4', '9sus4', 'maj7sus4',
            'dim', 'aug', '+', '°', 'ø',
            'b5', '#5', 'b9', '#9', '#11', 'b13'
        ];
        
        // Círculo de quintas para detección de tonalidad
        this.circleOfFifths = [
            'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'
        ];
        
        // Patrones de acordes comunes por tonalidad
        this.keyPatterns = {
            'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
            'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
            'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
            'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
            'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
            'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim']
        };
        
        this.initializePatterns();
    }

    /**
     * Inicializa patrones de expresiones regulares
     */
    initializePatterns() {
        // Crear patrón para todas las notas
        const notePattern = this.notes.join('|');
        
        // Patrón para acordes básicos
        const basicSuffixPattern = this.basicChordSuffixes.join('|');
        
        // Patrón para acordes extendidos
        const extendedSuffixPattern = this.extendedChordSuffixes.join('|');
        
        // Patrón completo para acordes con nota de bajo opcional
        this.chordPattern = new RegExp(
            `\\b(${notePattern})` +                    // Nota fundamental
            `(${extendedSuffixPattern}|${basicSuffixPattern})?` +  // Sufijo de acorde
            `(?:\\/(${notePattern}))?` +               // Nota de bajo opcional (/E)
            `\\b`,
            'g'
        );
        
        // Patrón más estricto para evitar falsos positivos
        this.strictChordPattern = new RegExp(
            `(?:^|\\s)(${notePattern})` +
            `(${extendedSuffixPattern}|${basicSuffixPattern})` +
            `(?:\\/(${notePattern}))?` +
            `(?=\\s|$|[,.!?;:])`
        );
    }

    /**
     * Detecta acordes en un texto
     */
    detectChords(text, config = {}) {
        console.log('🎯 Iniciando detección de acordes...');
        
        const {
            detectComplexChords = true,
            highlightBassNotes = true,
            minConfidence = 0.7
        } = config;

        const detectedChords = [];
        const processedText = this.preprocessText(text);
        
        // Usar patrón apropiado según configuración
        const pattern = detectComplexChords ? this.chordPattern : this.strictChordPattern;
        let match;
        
        // Reset del patrón para nueva búsqueda
        pattern.lastIndex = 0;
        
        while ((match = pattern.exec(processedText)) !== null) {
            const fullMatch = match[0].trim();
            const note = match[1];
            const suffix = match[2] || '';
            const bassNote = match[3] || null;
            
            // Validar que es realmente un acorde
            const confidence = this.calculateChordConfidence(fullMatch, note, suffix, processedText, match.index);
            
            if (confidence >= minConfidence) {
                const chordInfo = {
                    original: fullMatch,
                    transposed: fullMatch, // Inicialmente igual al original
                    note: note,
                    suffix: suffix,
                    bassNote: bassNote,
                    type: this.classifyChordType(suffix),
                    position: match.index,
                    length: fullMatch.length,
                    confidence: confidence,
                    isComplex: this.isComplexChord(suffix),
                    hasBassNote: !!bassNote
                };
                
                detectedChords.push(chordInfo);
            }
        }
        
        // Filtrar duplicados y acordes superpuestos
        const filteredChords = this.filterDuplicateChords(detectedChords);
        
        console.log(`🎵 Detectados ${filteredChords.length} acordes únicos`);
        
        return filteredChords;
    }

    /**
     * Preprocesa el texto para mejorar la detección
     */
    preprocessText(text) {
        return text
            .replace(/\r\n/g, '\n')           // Normalizar saltos de línea
            .replace(/\t/g, ' ')              // Convertir tabs a espacios
            .replace(/\s+/g, ' ')             // Normalizar espacios múltiples
            .trim();
    }

    /**
     * Calcula la confianza de que un texto sea un acorde
     */
    calculateChordConfidence(fullMatch, note, suffix, text, position) {
        let confidence = 0.5; // Base confidence
        
        // Incrementar confianza si la nota es válida
        if (this.isValidNote(note)) {
            confidence += 0.3;
        }
        
        // Incrementar si el sufijo es conocido
        if (this.isKnownSuffix(suffix)) {
            confidence += 0.2;
        }
        
        // Analizar contexto
        const context = this.getContext(text, position, 20);
        
        // Incrementar si está en línea con otros acordes
        if (this.hasMusicalContext(context)) {
            confidence += 0.2;
        }
        
        // Reducir si parece ser parte de una palabra
        if (this.isPartOfWord(text, position, fullMatch.length)) {
            confidence -= 0.3;
        }
        
        // Incrementar si está al inicio de línea o después de espacio
        if (this.isAtGoodPosition(text, position)) {
            confidence += 0.1;
        }
        
        return Math.min(1.0, Math.max(0.0, confidence));
    }

    /**
     * Verifica si una nota es válida
     */
    isValidNote(note) {
        return this.notes.includes(note);
    }

    /**
     * Verifica si un sufijo es conocido
     */
    isKnownSuffix(suffix) {
        return this.basicChordSuffixes.includes(suffix) || 
               this.extendedChordSuffixes.includes(suffix);
    }

    /**
     * Obtiene contexto alrededor de una posición
     */
    getContext(text, position, radius) {
        const start = Math.max(0, position - radius);
        const end = Math.min(text.length, position + radius);
        return text.slice(start, end);
    }

    /**
     * Verifica si el contexto tiene características musicales
     */
    hasMusicalContext(context) {
        // Buscar otros acordes en el contexto
        const otherChords = context.match(this.chordPattern);
        return otherChords && otherChords.length > 1;
    }

    /**
     * Verifica si el acorde es parte de una palabra más larga
     */
    isPartOfWord(text, position, length) {
        const before = text[position - 1];
        const after = text[position + length];
        
        return (before && /[a-zA-Z]/.test(before)) || 
               (after && /[a-zA-Z]/.test(after));
    }

    /**
     * Verifica si el acorde está en una buena posición
     */
    isAtGoodPosition(text, position) {
        const before = text[position - 1];
        return !before || /[\s\n\r]/.test(before);
    }

    /**
     * Clasifica el tipo de acorde
     */
    classifyChordType(suffix) {
        if (!suffix) return 'major';
        if (suffix.includes('m') && !suffix.includes('maj')) return 'minor';
        if (suffix.includes('dim') || suffix.includes('°')) return 'diminished';
        if (suffix.includes('aug') || suffix.includes('+')) return 'augmented';
        if (suffix.includes('sus')) return 'suspended';
        if (suffix.includes('7') || suffix.includes('9') || suffix.includes('11') || suffix.includes('13')) return 'extended';
        if (suffix.includes('add')) return 'added';
        return 'major';
    }

    /**
     * Verifica si es un acorde complejo
     */
    isComplexChord(suffix) {
        return suffix && (
            suffix.includes('7') || suffix.includes('9') || 
            suffix.includes('11') || suffix.includes('13') ||
            suffix.includes('add') || suffix.includes('sus') ||
            suffix.includes('dim') || suffix.includes('aug')
        );
    }

    /**
     * Filtra acordes duplicados y superpuestos
     */
    filterDuplicateChords(chords) {
        // Ordenar por posición
        chords.sort((a, b) => a.position - b.position);
        
        const filtered = [];
        let lastEnd = -1;
        
        for (const chord of chords) {
            // Evitar superposiciones
            if (chord.position >= lastEnd) {
                filtered.push(chord);
                lastEnd = chord.position + chord.length;
            }
        }
        
        return filtered;
    }

    /**
     * Detecta la tonalidad principal del texto
     */
    detectKey(chords) {
        if (!chords || chords.length === 0) return null;
        
        console.log('🎯 Analizando tonalidad...');
        
        // Contar frecuencia de cada nota fundamental
        const noteFrequency = {};
        chords.forEach(chord => {
            const note = chord.note;
            noteFrequency[note] = (noteFrequency[note] || 0) + 1;
        });
        
        // Analizar patrones de acordes por cada tonalidad posible
        const keyScores = {};
        
        for (const [key, pattern] of Object.entries(this.keyPatterns)) {
            let score = 0;
            
            // Puntuación por acordes que coinciden con el patrón
            chords.forEach(chord => {
                const chordName = chord.note + chord.suffix;
                if (pattern.some(p => chordName.startsWith(p.replace('dim', 'dim')))) {
                    score += 2;
                }
                if (pattern.includes(chord.note)) {
                    score += 1;
                }
            });
            
            keyScores[key] = score;
        }
        
        // Encontrar la tonalidad con mayor puntuación
        const detectedKey = Object.entries(keyScores)
            .sort(([,a], [,b]) => b - a)[0];
        
        const result = detectedKey && detectedKey[1] > 0 ? detectedKey[0] : null;
        
        console.log(`🎵 Tonalidad detectada: ${result || 'No detectada'}`);
        console.log('📊 Puntuaciones:', keyScores);
        
        return result;
    }

    /**
     * Analiza la progresión de acordes
     */
    analyzeProgression(chords) {
        if (chords.length < 2) return null;
        
        const progression = chords.map(chord => chord.note + chord.suffix);
        
        // Patrones comunes
        const commonProgressions = {
            'I-V-vi-IV': ['C', 'G', 'Am', 'F'],
            'vi-IV-I-V': ['Am', 'F', 'C', 'G'],
            'I-vi-IV-V': ['C', 'Am', 'F', 'G'],
            'ii-V-I': ['Dm', 'G', 'C']
        };
        
        // Buscar patrones conocidos
        for (const [name, pattern] of Object.entries(commonProgressions)) {
            if (this.matchesProgression(progression, pattern)) {
                return { name, pattern, confidence: 0.8 };
            }
        }
        
        return { name: 'custom', pattern: progression, confidence: 0.5 };
    }

    /**
     * Verifica si una progresión coincide con un patrón
     */
    matchesProgression(progression, pattern) {
        if (progression.length < pattern.length) return false;
        
        for (let i = 0; i <= progression.length - pattern.length; i++) {
            let matches = 0;
            for (let j = 0; j < pattern.length; j++) {
                if (progression[i + j] === pattern[j]) {
                    matches++;
                }
            }
            if (matches >= pattern.length * 0.75) return true;
        }
        
        return false;
    }

    /**
     * Obtiene sugerencias de acordes basado en la tonalidad
     */
    getSuggestedChords(key) {
        if (!key || !this.keyPatterns[key]) return [];
        
        return this.keyPatterns[key].map(chord => ({
            chord,
            function: this.getChordFunction(chord, key),
            degree: this.getScaleDegree(chord, key)
        }));
    }

    /**
     * Obtiene la función armónica de un acorde
     */
    getChordFunction(chord, key) {
        const pattern = this.keyPatterns[key];
        const index = pattern.indexOf(chord);
        
        const functions = ['Tónica', 'Supertónica', 'Mediante', 'Subdominante', 'Dominante', 'Superdominante', 'Sensible'];
        return index >= 0 ? functions[index] : 'Desconocida';
    }

    /**
     * Obtiene el grado de la escala
     */
    getScaleDegree(chord, key) {
        const pattern = this.keyPatterns[key];
        const index = pattern.indexOf(chord);
        
        const degrees = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
        return index >= 0 ? degrees[index] : '?';
    }

    /**
     * Valida un acorde manualmente
     */
    validateChord(chordText) {
        const match = chordText.match(this.chordPattern);
        if (!match) return null;
        
        return {
            isValid: true,
            note: match[1],
            suffix: match[2] || '',
            bassNote: match[3] || null,
            type: this.classifyChordType(match[2] || ''),
            isComplex: this.isComplexChord(match[2] || '')
        };
    }

    /**
     * Obtiene estadísticas de detección
     */
    getDetectionStats(chords) {
        const stats = {
            total: chords.length,
            byType: {},
            byNote: {},
            complexity: {
                basic: 0,
                complex: 0
            },
            avgConfidence: 0
        };
        
        chords.forEach(chord => {
            // Por tipo
            stats.byType[chord.type] = (stats.byType[chord.type] || 0) + 1;
            
            // Por nota
            stats.byNote[chord.note] = (stats.byNote[chord.note] || 0) + 1;
            
            // Complejidad
            if (chord.isComplex) {
                stats.complexity.complex++;
            } else {
                stats.complexity.basic++;
            }
            
            // Confianza promedio
            stats.avgConfidence += chord.confidence;
        });
        
        if (chords.length > 0) {
            stats.avgConfidence /= chords.length;
        }
        
        return stats;
    }
}

// === EXPORTAR ===
window.ChordDetector = ChordDetector;
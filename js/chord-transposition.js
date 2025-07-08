/**
 * MUSIC PDF MANAGER - CHORD TRANSPOSITION
 * Sistema de transposición musical usando teoría musical
 */

class ChordTransposer {
    constructor() {
        // Círculo cromático - todas las notas en orden de semitonos
        this.chromaticScale = [
            'C', 'C#', 'D', 'D#', 'E', 'F', 
            'F#', 'G', 'G#', 'A', 'A#', 'B'
        ];
        
        // Equivalencias enarmónicas (notas que suenan igual pero se escriben diferente)
        this.enharmonicEquivalents = {
            'C#': 'Db', 'Db': 'C#',
            'D#': 'Eb', 'Eb': 'D#',
            'F#': 'Gb', 'Gb': 'F#',
            'G#': 'Ab', 'Ab': 'G#',
            'A#': 'Bb', 'Bb': 'A#'
        };
        
        // Círculo de quintas para determinar tonalidades preferidas
        this.circleOfFifths = [
            'C', 'G', 'D', 'A', 'E', 'B', 'F#',
            'Db', 'Ab', 'Eb', 'Bb', 'F'
        ];
        
        // Tonalidades menores relativas
        this.relativeMinors = {
            'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m',
            'E': 'C#m', 'B': 'G#m', 'F#': 'D#m',
            'Db': 'Bbm', 'Ab': 'Fm', 'Eb': 'Cm', 'Bb': 'Gm', 'F': 'Dm'
        };
        
        // Preferencias de notación por tonalidad (sharp vs flat)
        this.keyPreferences = {
            sharp: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'],
            flat: ['F', 'Bb', 'Eb', 'Ab', 'Db']
        };
        
        this.initializeTranspositionTable();
    }

    /**
     * Inicializa tabla de transposición para optimización
     */
    initializeTranspositionTable() {
        this.transpositionTable = {};
        
        // Generar tabla para todos los semitonos posibles
        for (let semitones = -12; semitones <= 12; semitones++) {
            this.transpositionTable[semitones] = {};
            
            this.chromaticScale.forEach((note, index) => {
                let newIndex = (index + semitones) % 12;
                if (newIndex < 0) newIndex += 12;
                this.transpositionTable[semitones][note] = this.chromaticScale[newIndex];
            });
            
            // Incluir equivalencias enarmónicas
            Object.entries(this.enharmonicEquivalents).forEach(([original, equivalent]) => {
                const originalIndex = this.chromaticScale.indexOf(original);
                if (originalIndex !== -1) {
                    let newIndex = (originalIndex + semitones) % 12;
                    if (newIndex < 0) newIndex += 12;
                    this.transpositionTable[semitones][equivalent] = this.chromaticScale[newIndex];
                }
            });
        }
    }

    /**
     * Transpone una lista de acordes
     */
    transposeChords(chords, semitones) {
        console.log(`🎼 Transponiendo ${chords.length} acordes por ${semitones} semitonos`);
        
        if (!semitones || semitones === 0) return chords;
        
        return chords.map(chord => this.transposeChord(chord, semitones));
    }

    /**
     * Transpone un acorde individual
     */
    transposeChord(chord, semitones) {
        const transposedNote = this.transposeNote(chord.note, semitones);
        const transposedBassNote = chord.bassNote ? 
            this.transposeNote(chord.bassNote, semitones) : null;
        
        // Crear acorde transpuesto
        const transposedChord = {
            ...chord,
            note: transposedNote,
            bassNote: transposedBassNote,
            transposed: this.buildChordString(transposedNote, chord.suffix, transposedBassNote)
        };
        
        return transposedChord;
    }

    /**
     * Transpone una nota individual
     */
    transposeNote(note, semitones) {
        if (!note) return note;
        
        // Normalizar entrada
        const normalizedNote = note.trim();
        
        // Buscar en tabla de transposición
        if (this.transpositionTable[semitones] && this.transpositionTable[semitones][normalizedNote]) {
            return this.transpositionTable[semitones][normalizedNote];
        }
        
        // Fallback: cálculo manual
        let noteIndex = this.chromaticScale.indexOf(normalizedNote);
        
        // Si no se encuentra, intentar con equivalencias enarmónicas
        if (noteIndex === -1 && this.enharmonicEquivalents[normalizedNote]) {
            noteIndex = this.chromaticScale.indexOf(this.enharmonicEquivalents[normalizedNote]);
        }
        
        if (noteIndex === -1) {
            console.warn(`⚠️ No se puede transponer la nota: ${note}`);
            return note;
        }
        
        let newIndex = (noteIndex + semitones) % 12;
        if (newIndex < 0) newIndex += 12;
        
        return this.chromaticScale[newIndex];
    }

    /**
     * Construye string de acorde a partir de componentes
     */
    buildChordString(note, suffix, bassNote) {
        let chordString = note + (suffix || '');
        if (bassNote) {
            chordString += '/' + bassNote;
        }
        return chordString;
    }

    /**
     * Transpone una tonalidad
     */
    transposeKey(key, semitones) {
        if (!key) return null;
        
        // Separar si es mayor o menor
        const isMinor = key.includes('m') && !key.includes('maj');
        const rootNote = isMinor ? key.replace('m', '') : key;
        
        const transposedRoot = this.transposeNote(rootNote, semitones);
        if (!transposedRoot) return key;
        
        return isMinor ? transposedRoot + 'm' : transposedRoot;
    }

    /**
     * Obtiene la tonalidad preferida basada en el círculo de quintas
     */
    getPreferredKey(key, semitones) {
        const transposedKey = this.transposeKey(key, semitones);
        
        // Si la tonalidad transpuesta usa muchos accidentales, sugerir enarmónica
        if (this.hasComplexAccidentals(transposedKey)) {
            const enharmonic = this.getEnharmonicEquivalent(transposedKey);
            if (enharmonic && this.isPreferredKey(enharmonic)) {
                return enharmonic;
            }
        }
        
        return transposedKey;
    }

    /**
     * Verifica si una tonalidad tiene muchos accidentales
     */
    hasComplexAccidentals(key) {
        if (!key) return false;
        
        const complexKeys = ['F#', 'C#', 'G#', 'D#', 'A#', 'Db', 'Gb', 'Cb'];
        const rootNote = key.replace('m', '');
        
        return complexKeys.includes(rootNote);
    }

    /**
     * Obtiene equivalente enarmónico de una tonalidad
     */
    getEnharmonicEquivalent(key) {
        if (!key) return null;
        
        const isMinor = key.includes('m');
        const rootNote = key.replace('m', '');
        const enharmonicRoot = this.enharmonicEquivalents[rootNote];
        
        return enharmonicRoot ? enharmonicRoot + (isMinor ? 'm' : '') : null;
    }

    /**
     * Verifica si una tonalidad es preferida (menos accidentales)
     */
    isPreferredKey(key) {
        if (!key) return false;
        
        const rootNote = key.replace('m', '');
        return this.circleOfFifths.includes(rootNote);
    }

    /**
     * Optimiza la notación de acordes según la tonalidad
     */
    optimizeChordNotation(chords, targetKey) {
        const useFlats = this.shouldUseFlats(targetKey);
        
        return chords.map(chord => {
            const optimizedNote = this.optimizeNoteNotation(chord.note, useFlats);
            const optimizedBassNote = chord.bassNote ? 
                this.optimizeNoteNotation(chord.bassNote, useFlats) : null;
            
            return {
                ...chord,
                note: optimizedNote,
                bassNote: optimizedBassNote,
                transposed: this.buildChordString(optimizedNote, chord.suffix, optimizedBassNote)
            };
        });
    }

    /**
     * Determina si una tonalidad debe usar bemoles
     */
    shouldUseFlats(key) {
        if (!key) return false;
        
        const rootNote = key.replace('m', '');
        return this.keyPreferences.flat.includes(rootNote);
    }

    /**
     * Optimiza notación de una nota
     */
    optimizeNoteNotation(note, useFlats) {
        if (!note || !note.includes('#') && !note.includes('b')) return note;
        
        if (useFlats && note.includes('#')) {
            return this.enharmonicEquivalents[note] || note;
        } else if (!useFlats && note.includes('b')) {
            return this.enharmonicEquivalents[note] || note;
        }
        
        return note;
    }

    /**
     * Obtiene nombre del intervalo musical
     */
    getIntervalName(semitones) {
        const intervalNames = {
            0: 'Unísono',
            1: 'Segunda menor',
            2: 'Segunda mayor', 
            3: 'Tercera menor',
            4: 'Tercera mayor',
            5: 'Cuarta justa',
            6: 'Tritono',
            7: 'Quinta justa',
            8: 'Sexta menor',
            9: 'Sexta mayor',
            10: 'Séptima menor',
            11: 'Séptima mayor'
        };
        
        const normalizedSemitones = ((semitones % 12) + 12) % 12;
        return intervalNames[normalizedSemitones] || 'Desconocido';
    }

    /**
     * Sugiere mejores tonalidades para transposición
     */
    suggestBetterKeys(originalKey, semitones) {
        if (!originalKey) return [];
        
        const suggestions = [];
        
        // Probar diferentes opciones
        for (let alternative = -2; alternative <= 2; alternative++) {
            if (alternative === 0) continue;
            
            const alternativeKey = this.transposeKey(originalKey, semitones + alternative);
            const difficulty = this.calculateKeyDifficulty(alternativeKey);
            
            suggestions.push({
                key: alternativeKey,
                semitones: semitones + alternative,
                difficulty,
                reason: this.getTranspositionReason(alternative)
            });
        }
        
        return suggestions.sort((a, b) => a.difficulty - b.difficulty);
    }

    /**
     * Calcula dificultad de una tonalidad (número de accidentales)
     */
    calculateKeyDifficulty(key) {
        if (!key) return 10;
        
        const rootNote = key.replace('m', '');
        const keyIndex = this.circleOfFifths.indexOf(rootNote);
        
        if (keyIndex === -1) return 8; // Tonalidad muy rara
        
        // Basado en posición en círculo de quintas
        if (keyIndex <= 6) {
            return keyIndex; // 0-6 sharps
        } else {
            return 12 - keyIndex; // flats
        }
    }

    /**
     * Obtiene razón para una transposición alternativa
     */
    getTranspositionReason(alternative) {
        const reasons = {
            1: 'Un semitono más alto (más brillante)',
            2: 'Un tono más alto (registro más agudo)',
            '-1': 'Un semitono más bajo (más cálido)', 
            '-2': 'Un tono más bajo (registro más grave)'
        };
        
        return reasons[alternative] || 'Alternativa';
    }

    /**
     * Analiza compatibilidad vocal para una tonalidad
     */
    analyzeVocalRange(key) {
        const vocalRanges = {
            'C': { soprano: 'Cómodo', alto: 'Alto', tenor: 'Bajo', bass: 'Muy bajo' },
            'D': { soprano: 'Alto', alto: 'Cómodo', tenor: 'Cómodo', bass: 'Bajo' },
            'E': { soprano: 'Muy alto', alto: 'Alto', tenor: 'Cómodo', bass: 'Cómodo' },
            'F': { soprano: 'Extremo', alto: 'Muy alto', tenor: 'Alto', bass: 'Cómodo' },
            'G': { soprano: 'Cómodo', alto: 'Cómodo', tenor: 'Alto', bass: 'Alto' },
            'A': { soprano: 'Bajo', alto: 'Bajo', tenor: 'Muy alto', bass: 'Muy alto' },
            'Bb': { soprano: 'Muy bajo', alto: 'Muy bajo', tenor: 'Extremo', bass: 'Extremo' }
        };
        
        const rootNote = key ? key.replace('m', '') : 'C';
        return vocalRanges[rootNote] || vocalRanges['C'];
    }

    /**
     * Genera reporte de transposición
     */
    generateTranspositionReport(originalKey, transposedKey, semitones, chords) {
        const report = {
            original: {
                key: originalKey,
                difficulty: this.calculateKeyDifficulty(originalKey),
                chordCount: chords ? chords.length : 0
            },
            transposed: {
                key: transposedKey,
                difficulty: this.calculateKeyDifficulty(transposedKey),
                semitones: semitones,
                interval: this.getIntervalName(Math.abs(semitones))
            },
            changes: {
                easier: this.calculateKeyDifficulty(transposedKey) < this.calculateKeyDifficulty(originalKey),
                vocalRange: this.analyzeVocalRange(transposedKey),
                accidentals: chords ? this.countAccidentals(chords) : { sharps: 0, flats: 0, total: 0 }
            },
            suggestions: this.suggestBetterKeys(originalKey, semitones).slice(0, 3)
        };
        
        return report;
    }

    /**
     * Cuenta accidentales en lista de acordes
     */
    countAccidentals(chords) {
        let sharps = 0;
        let flats = 0;
        
        chords.forEach(chord => {
            if (chord.note && chord.note.includes('#')) sharps++;
            if (chord.note && chord.note.includes('b')) flats++;
            if (chord.bassNote) {
                if (chord.bassNote.includes('#')) sharps++;
                if (chord.bassNote.includes('b')) flats++;
            }
        });
        
        return { sharps, flats, total: sharps + flats };
    }

    /**
     * Valida transposición propuesta
     */
    validateTransposition(semitones) {
        const validation = {
            isValid: true,
            warnings: [],
            recommendations: []
        };
        
        if (Math.abs(semitones) > 6) {
            validation.warnings.push('Transposición muy grande (>6 semitonos)');
            validation.recommendations.push('Considera transponer en dirección opuesta');
        }
        
        if (semitones === 0) {
            validation.warnings.push('Sin transposición');
        }
        
        if (Math.abs(semitones) === 6) {
            validation.warnings.push('Tritono - cambio radical de sonoridad');
        }
        
        return validation;
    }

    /**
     * Obtiene estadísticas de transposición
     */
    getTranspositionStats(originalChords, transposedChords) {
        const changedChords = transposedChords.filter((chord, i) => 
            originalChords[i] && chord.transposed !== originalChords[i].original
        ).length;
        
        return {
            totalChords: originalChords.length,
            changedChords: changedChords,
            newAccidentals: this.countAccidentals(transposedChords).total,
            originalAccidentals: this.countAccidentals(originalChords).total,
            complexity: {
                original: this.calculateAverageComplexity(originalChords),
                transposed: this.calculateAverageComplexity(transposedChords)
            }
        };
    }

    /**
     * Calcula complejidad promedio de acordes
     */
    calculateAverageComplexity(chords) {
        if (chords.length === 0) return 0;
        
        const totalComplexity = chords.reduce((sum, chord) => {
            let complexity = 1; // Base
            if (chord.suffix && chord.suffix.length > 0) complexity += 1;
            if (chord.isComplex) complexity += 1;
            if (chord.bassNote) complexity += 1;
            return sum + complexity;
        }, 0);
        
        return totalComplexity / chords.length;
    }
}

// === EXPORTAR ===
window.ChordTransposer = ChordTransposer;

// DEBUG TEMPORAL - Verificar que se carga correctamente
console.log('🎼 ChordTransposer exportado:', typeof window.ChordTransposer);
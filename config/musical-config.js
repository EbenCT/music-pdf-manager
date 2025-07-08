/**
 * MUSIC PDF MANAGER - MUSICAL MODULE CONFIGURATION
 * Configuración específica para el módulo musical instructivo
 */

// === CONFIGURACIÓN DEL MÓDULO MUSICAL ===
const MUSICAL_CONFIG = {
    // Configuración de detección de acordes
    CHORD_DETECTION: {
        MIN_CONFIDENCE: 0.7,
        DETECT_COMPLEX_CHORDS: true,
        HIGHLIGHT_BASS_NOTES: true,
        CASE_SENSITIVE: false,
        ALLOW_FUZZY_MATCHING: true,
        
        // Patrones de acordes personalizados
        CUSTOM_PATTERNS: {
            // Acordes especiales latinos
            'sus': ['sus2', 'sus4', 'sus'],
            'add': ['add2', 'add4', 'add9', 'add11'],
            'alterations': ['b5', '#5', 'b9', '#9', '#11', 'b13']
        },
        
        // Exclusiones (palabras que no son acordes)
        EXCLUSIONS: [
            'DE', 'LA', 'EL', 'Y', 'EN', 'CON', 'POR', 'PARA',
            'QUE', 'UN', 'UNA', 'NO', 'SE', 'MI', 'TU', 'SU',
            'LO', 'LE', 'NOS', 'OS', 'LES', 'YO', 'TE', 'ME'
        ]
    },
    
    // Configuración de transposición
    TRANSPOSITION: {
        MAX_SEMITONES: 12,
        MIN_SEMITONES: -12,
        DEFAULT_STEP: 1,
        PRESERVE_ENHARMONICS: true,
        SMART_KEY_SELECTION: true,
        
        // Preferencias por tonalidad
        KEY_PREFERENCES: {
            MAJOR_SHARP_KEYS: ['C', 'G', 'D', 'A', 'E', 'B', 'F#'],
            MAJOR_FLAT_KEYS: ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'],
            MINOR_SHARP_KEYS: ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m'],
            MINOR_FLAT_KEYS: ['Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm']
        },
        
        // Sugerencias de transposición para voces
        VOCAL_RANGES: {
            SOPRANO: { min: 'C4', max: 'C6', comfortable: ['C', 'D', 'Eb', 'F', 'G'] },
            ALTO: { min: 'G3', max: 'F5', comfortable: ['A', 'Bb', 'C', 'D', 'Eb'] },
            TENOR: { min: 'C3', max: 'A4', comfortable: ['D', 'E', 'F', 'G', 'A'] },
            BASS: { min: 'E2', max: 'E4', comfortable: ['F', 'G', 'A', 'Bb', 'C'] }
        }
    },
    
    // Configuración de extracción de texto
    TEXT_EXTRACTION: {
        PRESERVE_SPACING: true,
        INCLUDE_POSITIONS: true,
        MERGE_LINES: true,
        NORMALIZE_WHITESPACE: false,
        EXTRACT_METADATA: true,
        
        // Configuración específica para partituras
        MUSICAL_TEXT_HINTS: {
            CHORD_LINE_INDICATORS: [':', '-', '|', '/'],
            VERSE_INDICATORS: ['Verso', 'Estrofa', 'Verse', 'V'],
            CHORUS_INDICATORS: ['Coro', 'Chorus', 'Estribillo', 'C'],
            BRIDGE_INDICATORS: ['Puente', 'Bridge', 'B'],
            INTRO_INDICATORS: ['Intro', 'Introducción', 'I'],
            OUTRO_INDICATORS: ['Outro', 'Final', 'Coda', 'O']
        }
    },
    
    // Configuración de renderizado
    RENDERING: {
        DEFAULT_CHORD_STYLE: 'bold-red',
        SHOW_TOOLTIPS: true,
        ANIMATE_TRANSITIONS: true,
        HIGHLIGHT_ON_HOVER: true,
        
        // Estilos de acordes disponibles
        CHORD_STYLES: {
            'bold-red': {
                color: '#dc3545',
                fontWeight: 'bold',
                background: 'rgba(220, 53, 69, 0.1)',
                borderBottom: '2px solid #dc3545'
            },
            'bold-blue': {
                color: '#007bff',
                fontWeight: 'bold',
                background: 'rgba(0, 123, 255, 0.1)',
                borderBottom: '2px solid #007bff'
            },
            'highlight': {
                background: '#ffeb3b',
                color: '#000',
                padding: '2px 4px',
                borderRadius: '3px'
            },
            'underline': {
                textDecoration: 'underline',
                textDecorationColor: '#dc3545',
                textDecorationThickness: '2px'
            }
        },
        
        // Configuración de fuentes
        FONT_CONFIG: {
            DEFAULT_SIZE: 16,
            MIN_SIZE: 12,
            MAX_SIZE: 24,
            STEP_SIZE: 1,
            FONT_FAMILY: "'Courier New', 'Monaco', monospace"
        }
    },
    
    // Configuración de interface
    UI: {
        SEARCH_DEBOUNCE: 300,
        ANIMATION_DURATION: 300,
        TOOLTIP_DELAY: 500,
        
        // Atajos de teclado
        KEYBOARD_SHORTCUTS: {
            TRANSPOSE_UP: 'ArrowUp',
            TRANSPOSE_DOWN: 'ArrowDown',
            TRANSPOSE_UP_HALF: 'ArrowRight',
            TRANSPOSE_DOWN_HALF: 'ArrowLeft',
            RESET_TRANSPOSITION: 'KeyR',
            OPEN_CONFIG: 'KeyC',
            FOCUS_SEARCH: 'KeyF'
        },
        
        // Mensajes de la interfaz
        MESSAGES: {
            LOADING: 'Cargando archivo musical...',
            PROCESSING: 'Detectando acordes y analizando...',
            TRANSPOSING: 'Transponiendo acordes...',
            ERROR_LOADING: 'Error al cargar el archivo musical',
            ERROR_PROCESSING: 'Error procesando el contenido musical',
            ERROR_TRANSPOSING: 'Error en la transposición',
            NO_CHORDS_FOUND: 'No se detectaron acordes en este archivo',
            SUCCESS_TRANSPOSED: 'Acordes transpuestos correctamente'
        }
    },
    
    // Configuración de caché
    CACHE: {
        ENABLE_EXTRACTION_CACHE: true,
        CACHE_EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 horas
        MAX_CACHE_SIZE: 50, // máximo 50 archivos en cache
        CLEAR_ON_MEMORY_PRESSURE: true
    },
    
    // Configuración de debug
    DEBUG: {
        LOG_CHORD_DETECTION: false,
        LOG_TRANSPOSITION: false,
        LOG_TEXT_EXTRACTION: false,
        LOG_RENDERING: false,
        SHOW_CONFIDENCE_SCORES: false,
        HIGHLIGHT_LOW_CONFIDENCE: false
    }
};

// === UTILIDADES DE CONFIGURACIÓN MUSICAL ===
const MusicalConfigUtils = {
    /**
     * Obtiene configuración completa del módulo musical
     */
    getConfig() {
        return MUSICAL_CONFIG;
    },
    
    /**
     * Obtiene configuración específica de una sección
     */
    getSection(sectionName) {
        return MUSICAL_CONFIG[sectionName] || {};
    },
    
    /**
     * Verifica si un acorde debe ser excluido
     */
    isChordExcluded(chord) {
        const exclusions = MUSICAL_CONFIG.CHORD_DETECTION.EXCLUSIONS;
        return exclusions.includes(chord.toUpperCase());
    },
    
    /**
     * Obtiene estilo de acorde
     */
    getChordStyle(styleName) {
        return MUSICAL_CONFIG.RENDERING.CHORD_STYLES[styleName] || 
               MUSICAL_CONFIG.RENDERING.CHORD_STYLES[MUSICAL_CONFIG.RENDERING.DEFAULT_CHORD_STYLE];
    },
    
    /**
     * Obtiene rango vocal recomendado
     */
    getVocalRange(voiceType) {
        return MUSICAL_CONFIG.TRANSPOSITION.VOCAL_RANGES[voiceType.toUpperCase()];
    },
    
    /**
     * Verifica si una tonalidad prefiere sostenidos
     */
    prefersSharpKeys(key) {
        const sharpKeys = [
            ...MUSICAL_CONFIG.TRANSPOSITION.KEY_PREFERENCES.MAJOR_SHARP_KEYS,
            ...MUSICAL_CONFIG.TRANSPOSITION.KEY_PREFERENCES.MINOR_SHARP_KEYS
        ];
        return sharpKeys.includes(key);
    },
    
    /**
     * Obtiene mensaje de UI
     */
    getMessage(messageKey) {
        return MUSICAL_CONFIG.UI.MESSAGES[messageKey] || messageKey;
    },
    
    /**
     * Obtiene configuración de atajo de teclado
     */
    getKeyboardShortcut(action) {
        return MUSICAL_CONFIG.UI.KEYBOARD_SHORTCUTS[action];
    },
    
    /**
     * Valida configuración personalizada
     */
    validateConfig(customConfig) {
        const errors = [];
        
        if (customConfig.CHORD_DETECTION?.MIN_CONFIDENCE) {
            const confidence = customConfig.CHORD_DETECTION.MIN_CONFIDENCE;
            if (confidence < 0 || confidence > 1) {
                errors.push('MIN_CONFIDENCE debe estar entre 0 y 1');
            }
        }
        
        if (customConfig.RENDERING?.FONT_CONFIG?.DEFAULT_SIZE) {
            const size = customConfig.RENDERING.FONT_CONFIG.DEFAULT_SIZE;
            const min = MUSICAL_CONFIG.RENDERING.FONT_CONFIG.MIN_SIZE;
            const max = MUSICAL_CONFIG.RENDERING.FONT_CONFIG.MAX_SIZE;
            
            if (size < min || size > max) {
                errors.push(`DEFAULT_SIZE debe estar entre ${min} y ${max}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    },
    
    /**
     * Combina configuración personalizada con la por defecto
     */
    mergeConfig(customConfig) {
        const merged = JSON.parse(JSON.stringify(MUSICAL_CONFIG));
        
        // Merge profundo de configuración
        const deepMerge = (target, source) => {
            for (const key in source) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    target[key] = target[key] || {};
                    deepMerge(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            }
        };
        
        deepMerge(merged, customConfig);
        return merged;
    },
    
    /**
     * Exporta configuración como JSON
     */
    exportConfig() {
        return JSON.stringify(MUSICAL_CONFIG, null, 2);
    },
    
    /**
     * Importa configuración desde JSON
     */
    importConfig(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            const validation = this.validateConfig(imported);
            
            if (!validation.isValid) {
                throw new Error('Configuración inválida: ' + validation.errors.join(', '));
            }
            
            return this.mergeConfig(imported);
        } catch (error) {
            throw new Error('Error importando configuración: ' + error.message);
        }
    },
    
    /**
     * Obtiene configuración para desarrollo/producción
     */
    getEnvironmentConfig(isDevelopment = false) {
        const config = { ...MUSICAL_CONFIG };
        
        if (isDevelopment) {
            config.DEBUG = {
                LOG_CHORD_DETECTION: true,
                LOG_TRANSPOSITION: true,
                LOG_TEXT_EXTRACTION: true,
                LOG_RENDERING: true,
                SHOW_CONFIDENCE_SCORES: true,
                HIGHLIGHT_LOW_CONFIDENCE: true
            };
        }
        
        return config;
    }
};

// === EXPORTAR ===
window.MUSICAL_CONFIG = MUSICAL_CONFIG;
window.MusicalConfigUtils = MusicalConfigUtils;

console.log('🎼 Configuración del módulo musical cargada');
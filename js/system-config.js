/**
 * MUSIC PDF MANAGER - CONFIGURACIÓN CORREGIDA
 * Solución para problemas de CSP y carga de dependencias
 */

// === CONFIGURACIÓN DE CSP CORREGIDA ===
const CSP_APPROVED_SOURCES = {
    scripts: [
        'https://cdnjs.cloudflare.com'  // ✅ Permitido por CSP
    ],
    blocked: [
        'https://cdn.jsdelivr.net'      // ❌ Bloqueado por CSP
    ]
};

// === CONFIGURACIÓN DE DEPENDENCIAS ===
const DEPENDENCY_CONFIG = {
    tesseract: {
        // CORREGIDO: Usar cdnjs.cloudflare.com
        mainScript: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/tesseract.min.js',
        workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/worker.min.js',
        coreScript: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/tesseract-core.wasm.js',
        // IMPORTANTE: NO usar jsdelivr
        blockedSources: [
            'https://cdn.jsdelivr.net/npm/tesseract.js@v4.1.4/dist/worker.min.js'
        ]
    },
    
    pdfjs: {
        main: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
        worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
        cmaps: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/'
    }
};

// === VERIFICADOR DE CSP ===
class CSPValidator {
    static validateSource(url) {
        const domain = new URL(url).origin;
        const isAllowed = CSP_APPROVED_SOURCES.scripts.includes(domain);
        const isBlocked = CSP_APPROVED_SOURCES.blocked.includes(domain);
        
        if (isBlocked) {
            console.error(`❌ CSP VIOLATION: ${url} está bloqueado por Content Security Policy`);
            console.log(`💡 Usar alternativa desde: ${CSP_APPROVED_SOURCES.scripts[0]}`);
            return false;
        }
        
        if (!isAllowed) {
            console.warn(`⚠️ CSP WARNING: ${url} no está en la lista de fuentes aprobadas`);
        }
        
        return isAllowed;
    }
    
    static getApprovedAlternative(blockedUrl) {
        // Mapeo de URLs bloqueadas a alternativas aprobadas
        const alternatives = {
            'https://cdn.jsdelivr.net/npm/tesseract.js@v4.1.4/dist/tesseract.min.js': 
                'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/tesseract.min.js',
            'https://cdn.jsdelivr.net/npm/tesseract.js@v4.1.4/dist/worker.min.js':
                'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/worker.min.js'
        };
        
        return alternatives[blockedUrl] || null;
    }
}

// === CARGADOR DE DEPENDENCIAS CORREGIDO ===
class DependencyLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.loadingPromises = new Map();
    }
    
    /**
     * ✅ CORREGIDO: Carga script verificando CSP
     */
    async loadScript(url, options = {}) {
        // Verificar CSP
        if (!CSPValidator.validateSource(url)) {
            const alternative = CSPValidator.getApprovedAlternative(url);
            if (alternative) {
                console.log(`🔄 Usando alternativa aprobada: ${alternative}`);
                url = alternative;
            } else {
                throw new Error(`CSP violation: No hay alternativa aprobada para ${url}`);
            }
        }
        
        // Evitar cargar el mismo script múltiples veces
        if (this.loadedScripts.has(url)) {
            console.log(`✅ Script ya cargado: ${url}`);
            return;
        }
        
        // Si ya está cargando, esperar la promesa existente
        if (this.loadingPromises.has(url)) {
            console.log(`⏳ Esperando carga en progreso: ${url}`);
            return this.loadingPromises.get(url);
        }
        
        // Crear nueva promesa de carga
        const loadPromise = this._loadScriptInternal(url, options);
        this.loadingPromises.set(url, loadPromise);
        
        try {
            await loadPromise;
            this.loadedScripts.add(url);
            console.log(`✅ Script cargado exitosamente: ${url}`);
        } catch (error) {
            console.error(`❌ Error cargando script: ${url}`, error);
            throw error;
        } finally {
            this.loadingPromises.delete(url);
        }
    }
    
    /**
     * ✅ INTERNO: Carga real del script
     */
    _loadScriptInternal(url, options) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.crossOrigin = 'anonymous';
            
            // Aplicar opciones adicionales
            if (options.async !== undefined) script.async = options.async;
            if (options.defer !== undefined) script.defer = options.defer;
            
            script.onload = () => {
                console.log(`📥 Script descargado: ${url}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`💥 Error descargando script: ${url}`, error);
                reject(new Error(`Failed to load script: ${url}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * ✅ NUEVO: Carga Tesseract con configuración corregida
     */
    async loadTesseract() {
        try {
            console.log('🤖 Cargando Tesseract.js con configuración CSP corregida...');
            
            // Cargar script principal
            await this.loadScript(DEPENDENCY_CONFIG.tesseract.mainScript);
            
            // Verificar que se cargó correctamente
            if (typeof Tesseract === 'undefined') {
                throw new Error('Tesseract.js no se cargó correctamente');
            }
            
            console.log('✅ Tesseract.js cargado correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error cargando Tesseract.js:', error);
            throw error;
        }
    }
    
    /**
     * ✅ NUEVO: Configurar Tesseract con rutas corregidas
     */
    configureTesseract() {
        if (typeof Tesseract !== 'undefined') {
            // Configurar rutas usando cdnjs.cloudflare.com
            Tesseract.setLogging(true);
            
            // Configuración global para workers
            window.TesseractConfig = {
                workerPath: DEPENDENCY_CONFIG.tesseract.workerScript,
                corePath: DEPENDENCY_CONFIG.tesseract.coreScript,
                langPath: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.4/lang-data'
            };
            
            console.log('⚙️ Tesseract configurado con rutas CSP-compatibles');
        }
    }
    
    /**
     * ✅ NUEVO: Carga PDF.js con configuración corregida
     */
    async loadPDFJS() {
        try {
            console.log('📄 Cargando PDF.js...');
            
            await this.loadScript(DEPENDENCY_CONFIG.pdfjs.main);
            
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js no se cargó correctamente');
            }
            
            // Configurar worker
            pdfjsLib.GlobalWorkerOptions.workerSrc = DEPENDENCY_CONFIG.pdfjs.worker;
            
            console.log('✅ PDF.js cargado y configurado');
            return true;
            
        } catch (error) {
            console.error('❌ Error cargando PDF.js:', error);
            throw error;
        }
    }
    
    /**
     * ✅ NUEVO: Carga todas las dependencias en orden
     */
    async loadAllDependencies() {
        const dependencies = [
            { name: 'PDF.js', loader: () => this.loadPDFJS() },
            { name: 'Tesseract.js', loader: () => this.loadTesseract() }
        ];
        
        console.log('📦 Iniciando carga de dependencias corregidas...');
        
        for (const dep of dependencies) {
            try {
                console.log(`⏳ Cargando ${dep.name}...`);
                await dep.loader();
                console.log(`✅ ${dep.name} cargado exitosamente`);
            } catch (error) {
                console.error(`❌ Error cargando ${dep.name}:`, error);
                // Continuar con las siguientes dependencias
            }
        }
        
        // Configurar después de cargar
        this.configureTesseract();
        
        console.log('📦 Carga de dependencias completada');
    }
}

// === CONFIGURACIÓN MEJORADA DEL MÓDULO ===
const MODULE_CONFIG = {
    musical: {
        // Configuración para extracción de texto
        textExtraction: {
            useOCRFallback: true,
            ocrLanguages: ['eng', 'spa'],
            maxRetries: 3,
            timeoutMs: 30000,
            enableManualInput: true
        },
        
        // Configuración para detección de acordes
        chordDetection: {
            enableComplexChords: true,
            enableBassNotes: true,
            strictMode: false,
            minimumConfidence: 0.7
        },
        
        // Configuración para manejo de errores
        errorHandling: {
            enableRetries: true,
            maxRetries: 2,
            enableFallbacks: true,
            showDetailedErrors: true
        },
        
        // Configuración de interfaz
        ui: {
            showProcessingStatus: true,
            enableDebugMode: true,
            animationDuration: 300
        }
    }
};

// === VERIFICADOR DE ESTADO ===
class SystemStatusChecker {
    static async checkDependencies() {
        const status = {
            pdfjs: typeof pdfjsLib !== 'undefined',
            tesseract: typeof Tesseract !== 'undefined',
            driveAPI: window.AppState?.driveAPI != null,
            musicalComponents: {
                chordDetector: typeof ChordDetector !== 'undefined',
                chordTransposer: typeof ChordTransposer !== 'undefined',
                musicalRenderer: typeof MusicalRenderer !== 'undefined'
            }
        };
        
        const allDepsLoaded = status.pdfjs && 
                            status.tesseract && 
                            status.driveAPI &&
                            Object.values(status.musicalComponents).every(loaded => loaded);
        
        console.log('🔍 Estado de dependencias:', status);
        console.log(`📊 Sistema completo: ${allDepsLoaded ? '✅' : '❌'}`);
        
        return { status, allLoaded: allDepsLoaded };
    }
    
    static async initializeWithDependencyCheck() {
        console.log('🚀 Iniciando verificación e inicialización del sistema...');
        
        // Cargar dependencias
        const loader = new DependencyLoader();
        await loader.loadAllDependencies();
        
        // Verificar estado
        const { status, allLoaded } = await this.checkDependencies();
        
        if (!allLoaded) {
            console.warn('⚠️ Algunas dependencias no están disponibles');
            const missing = [];
            
            if (!status.pdfjs) missing.push('PDF.js');
            if (!status.tesseract) missing.push('Tesseract.js');
            if (!status.driveAPI) missing.push('Drive API');
            
            Object.entries(status.musicalComponents).forEach(([name, loaded]) => {
                if (!loaded) missing.push(name);
            });
            
            console.error('❌ Dependencias faltantes:', missing);
            return { success: false, missing };
        }
        
        console.log('✅ Todas las dependencias están disponibles');
        return { success: true, missing: [] };
    }
}

// === EXPORTAR CONFIGURACIÓN ===
window.CSPValidator = CSPValidator;
window.DependencyLoader = DependencyLoader;
window.SystemStatusChecker = SystemStatusChecker;
window.MODULE_CONFIG = MODULE_CONFIG;
window.DEPENDENCY_CONFIG = DEPENDENCY_CONFIG;

// === AUTO-INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔧 Inicializando configuración corregida del sistema...');
    
    try {
        const result = await SystemStatusChecker.initializeWithDependencyCheck();
        
        if (result.success) {
            console.log('🎉 Sistema inicializado correctamente con todas las dependencias');
            
            // Disparar evento personalizado para notificar que el sistema está listo
            const event = new CustomEvent('systemReady', {
                detail: { 
                    timestamp: Date.now(),
                    config: MODULE_CONFIG,
                    dependencies: DEPENDENCY_CONFIG
                }
            });
            document.dispatchEvent(event);
            
        } else {
            console.error('💥 Fallo en la inicialización:', result.missing);
            
            // Disparar evento de error
            const errorEvent = new CustomEvent('systemError', {
                detail: {
                    error: 'Missing dependencies',
                    missing: result.missing,
                    timestamp: Date.now()
                }
            });
            document.dispatchEvent(errorEvent);
        }
        
    } catch (error) {
        console.error('💥 Error crítico en la inicialización:', error);
    }
});

console.log('⚙️ Configuración corregida cargada - CSP y dependencias solucionadas');
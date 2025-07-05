/**
 * GOOGLE DRIVE UTILITIES MODULE
 * Utilidades y helpers para Google Drive
 */

class DriveUtils {
    /**
     * Extrae file ID de URL de Google Drive
     */
    static extractFileId(url) {
        const patterns = [
            /\/file\/d\/([a-zA-Z0-9-_]+)/,
            /id=([a-zA-Z0-9-_]+)/,
            /\/folders\/([a-zA-Z0-9-_]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }

        return null;
    }

    /**
     * Valida ID de carpeta/archivo de Google Drive
     */
    static validateId(id) {
        return /^[a-zA-Z0-9-_]{28,}$/.test(id);
    }

    /**
     * Obtiene URL de vista previa
     */
    static getPreviewUrl(fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    /**
     * Obtiene URL de descarga directa
     */
    static getDownloadUrl(fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    /**
     * Obtiene URL de carpeta
     */
    static getFolderUrl(folderId) {
        return `https://drive.google.com/drive/folders/${folderId}`;
    }

    /**
     * Convierte blob a URL para PDF.js
     */
    static createBlobURL(blob) {
        return URL.createObjectURL(blob);
    }

    /**
     * Libera memoria de blob URL
     */
    static revokeBlobURL(url) {
        if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Verifica si es archivo PDF
     */
    static isPDFFile(fileName) {
        return fileName.toLowerCase().endsWith('.pdf');
    }

    /**
     * Formatea fecha de Google Drive
     */
    static formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    }

    /**
     * Formatea tamaño de archivo
     */
    static formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Genera hash simple para cache
     */
    static generateHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        return Math.abs(hash).toString(36);
    }

    /**
     * Debounce function
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    /**
     * Throttle function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Retry function con backoff exponencial
     */
    static async retry(fn, maxRetries = 3, baseDelay = 1000) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (i === maxRetries) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, i);
                console.log(`🔄 Retry ${i + 1}/${maxRetries} en ${delay}ms...`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    /**
     * Valida respuesta de Google API
     */
    static validateApiResponse(response) {
        if (!response) {
            throw new Error('Respuesta vacía de Google API');
        }

        if (response.error) {
            throw new Error(`Google API Error: ${response.error.message}`);
        }

        if (!response.result) {
            throw new Error('Respuesta sin datos de Google API');
        }

        return true;
    }

    /**
     * Obtiene mensaje de error amigable
     */
    static getFriendlyErrorMessage(error) {
        if (!error) return 'Error desconocido';

        // Errores de red
        if (error.name === 'NetworkError' || error.message.includes('network')) {
            return 'Error de conexión. Verifica tu internet.';
        }

        // Errores de Google API
        if (error.result && error.result.error) {
            const gError = error.result.error;
            switch (gError.code) {
                case 401:
                    return 'Sesión expirada. Inicia sesión nuevamente.';
                case 403:
                    return 'Sin permisos para acceder al archivo.';
                case 404:
                    return 'Archivo o carpeta no encontrada.';
                case 429:
                    return 'Límite de requests excedido. Intenta más tarde.';
                case 500:
                    return 'Error interno de Google. Intenta más tarde.';
                default:
                    return `Error ${gError.code}: ${gError.message}`;
            }
        }

        // Errores de autenticación
        if (error.message.includes('auth') || error.message.includes('token')) {
            return 'Error de autenticación. Inicia sesión nuevamente.';
        }

        // Errores de PDF
        if (error.message.includes('PDF') || error.message.includes('pdf')) {
            return 'Error cargando PDF. El archivo puede estar dañado.';
        }

        return error.message || 'Error desconocido';
    }

    /**
     * Logger con niveles
     */
    static logger = {
        debug: (message, ...args) => {
            if (window.APP_CONFIG?.DEBUG_MODE) {
                console.log(`🔍 ${message}`, ...args);
            }
        },
        
        info: (message, ...args) => {
            console.log(`ℹ️ ${message}`, ...args);
        },
        
        warn: (message, ...args) => {
            console.warn(`⚠️ ${message}`, ...args);
        },
        
        error: (message, ...args) => {
            console.error(`❌ ${message}`, ...args);
        },
        
        success: (message, ...args) => {
            console.log(`✅ ${message}`, ...args);
        }
    };

    /**
     * Verifica capacidades del navegador
     */
    static checkBrowserSupport() {
        const capabilities = {
            fileAPI: !!window.File,
            blobURL: !!window.URL && !!window.URL.createObjectURL,
            localStorage: !!window.localStorage,
            fetch: !!window.fetch,
            promises: !!window.Promise,
            pdfjsSupport: typeof pdfjsLib !== 'undefined'
        };

        const missing = Object.entries(capabilities)
            .filter(([key, supported]) => !supported)
            .map(([key]) => key);

        if (missing.length > 0) {
            console.warn('⚠️ Capacidades faltantes:', missing);
        }

        return {
            isSupported: missing.length === 0,
            capabilities,
            missing
        };
    }

    /**
     * Cache simple en memoria
     */
    static cache = {
        data: new Map(),
        
        set(key, value, ttl = 300000) { // 5 min default
            this.data.set(key, {
                value,
                expires: Date.now() + ttl
            });
        },
        
        get(key) {
            const item = this.data.get(key);
            if (!item) return null;
            
            if (Date.now() > item.expires) {
                this.data.delete(key);
                return null;
            }
            
            return item.value;
        },
        
        has(key) {
            return this.get(key) !== null;
        },
        
        delete(key) {
            return this.data.delete(key);
        },
        
        clear() {
            this.data.clear();
        },
        
        size() {
            return this.data.size;
        }
    };

    /**
     * Utilidades de desarrollo
     */
    static dev = {
        /**
         * Simula delay de red
         */
        async simulateNetworkDelay(min = 500, max = 2000) {
            if (!window.APP_CONFIG?.DEBUG_MODE) return;
            
            const delay = Math.random() * (max - min) + min;
            await new Promise(resolve => setTimeout(resolve, delay));
        },

        /**
         * Genera datos mock para testing
         */
        generateMockFile(name = 'test.pdf', id = null) {
            return {
                id: id || 'mock_' + Math.random().toString(36).substr(2, 9),
                name: name,
                size: DriveUtils.formatFileSize(Math.random() * 5000000),
                modifiedTime: new Date().toISOString(),
                downloadUrl: '#mock-pdf-' + (id || 'test'),
                webViewLink: '#mock-view',
                thumbnailLink: null,
                mimeType: 'application/pdf'
            };
        },

        /**
         * Logs estado completo del sistema
         */
        dumpSystemState() {
            console.group('🔍 SYSTEM STATE DUMP');
            
            console.log('App State:', window.AppState);
            console.log('Drive Config:', window.DRIVE_CONFIG);
            console.log('Browser Support:', this.checkBrowserSupport());
            console.log('Cache Size:', this.cache.size());
            console.log('Local Storage:', {
                used: Object.keys(localStorage).length,
                items: Object.keys(localStorage)
            });
            
            console.groupEnd();
        }
    };
}

// Exportar
window.DriveUtils = DriveUtils;
/**
 * MUSIC PDF MANAGER - DRIVE CONFIGURATION (SOLO DRIVE REAL)
 * Configuración SOLO para Google Drive API - Sin datos simulados
 */

// === CONFIGURACIÓN DE GOOGLE DRIVE API ===
const DRIVE_CONFIG = {
    // Google Drive API Configuration
    API_KEY: 'AIzaSyBCckvzf00l5jUDfqOhjjt25qeqRa2CAeI',
    CLIENT_ID: '174351007107-pnhn3g2mqijl4p3omgp9frg37mt9l8g5.apps.googleusercontent.com',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.readonly',
    
    // IDs de carpetas reales
    FOLDERS: {
        INSTRUMENTOS: '1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV',
        VOCES: '1joKAru0Z_jrgOracNjZzQZXbb2mpxCi7'
    },
    
    // Configuración de archivos
    FILE_TYPES: ['pdf'],
    MAX_RESULTS: 100,
    ORDER_BY: 'name',
    
    // URLs de verificación
    FOLDER_URLS: {
        INSTRUMENTOS: 'https://drive.google.com/drive/folders/1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV',
        VOCES: 'https://drive.google.com/drive/folders/1joKAru0Z_jrgOracNjZzQZXbb2mpxCi7'
    }
};

// === CONFIGURACIÓN DE LA APLICACIÓN ===
const APP_CONFIG = {
    // Configuración del visualizador PDF
    PDF_VIEWER: {
        DEFAULT_SCALE: 1.0,
        MIN_SCALE: 0.5,
        MAX_SCALE: 3.0,
        SCALE_STEP: 0.25
    },
    
    // Configuración de búsqueda
    SEARCH: {
        MIN_QUERY_LENGTH: 2,
        DEBOUNCE_DELAY: 300,
        MAX_RESULTS: 10,
        FUZZY_THRESHOLD: 0.6
    },
    
    // Configuración de UI
    UI: {
        ANIMATION_DURATION: 300,
        LOADING_DELAY: 500,
        AUTO_SAVE_DELAY: 2000
    },
    
    // Mensajes de la aplicación
    MESSAGES: {
        LOADING: 'Cargando archivos desde Google Drive...',
        AUTH_REQUIRED: 'Iniciando sesión con Google...',
        NO_FILES: 'No se encontraron archivos PDF en esta carpeta',
        SEARCH_PLACEHOLDER: '🔍 Buscar archivos...',
        ERROR_LOADING: 'Error al cargar archivos desde Google Drive',
        ERROR_AUTH: 'Error de autenticación con Google',
        ERROR_VIEWING: 'Error al visualizar el PDF',
        PDF_LOADING: 'Cargando PDF desde Google Drive...'
    }
};

// === UTILIDADES DE CONFIGURACIÓN ===
const ConfigUtils = {
    /**
     * SIEMPRE USAR GOOGLE DRIVE REAL - NO MÁS MODO DESARROLLO
     */
    isDevelopmentMode() {
        return false; // FORZAR SIEMPRE GOOGLE DRIVE REAL
    },
    
    /**
     * Verificar que las credenciales estén configuradas
     */
    areCredentialsValid() {
        return !!(DRIVE_CONFIG.API_KEY && 
                 DRIVE_CONFIG.CLIENT_ID && 
                 !DRIVE_CONFIG.API_KEY.includes('YOUR_') &&
                 !DRIVE_CONFIG.CLIENT_ID.includes('YOUR_'));
    },
    
    /**
     * Obtiene la configuración completa
     */
    getConfig() {
        return {
            drive: DRIVE_CONFIG,
            app: APP_CONFIG,
            isDev: false, // SIEMPRE FALSE
            credentialsValid: this.areCredentialsValid()
        };
    },
    
    /**
     * Formatea el tamaño de archivo
     */
    formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    /**
     * Formatea la fecha de modificación
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    /**
     * Log de debug para Google Drive
     */
    logDriveStatus() {
        console.log('🔧 CONFIGURACIÓN GOOGLE DRIVE:');
        console.log('📊 API Key válida:', !!DRIVE_CONFIG.API_KEY);
        console.log('📊 Client ID válido:', !!DRIVE_CONFIG.CLIENT_ID);
        console.log('📊 Credenciales válidas:', this.areCredentialsValid());
        console.log('📊 Modo desarrollo:', this.isDevelopmentMode());
        console.log('📊 URLs de carpetas:', DRIVE_CONFIG.FOLDER_URLS);
    }
};

// === EXPORTAR CONFIGURACIÓN ===
window.DRIVE_CONFIG = DRIVE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.ConfigUtils = ConfigUtils;

// Log inicial
ConfigUtils.logDriveStatus();

console.log('⚙️ Configuración cargada: SOLO GOOGLE DRIVE REAL');
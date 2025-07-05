/**
 * MUSIC PDF MANAGER - DRIVE CONFIGURATION
 * Configuración para Google Drive API - Versión optimizada
 */

// === CONFIGURACIÓN DE GOOGLE DRIVE API ===
const DRIVE_CONFIG = {
    API_KEY: 'AIzaSyBCckvzf00l5jUDfqOhjjt25qeqRa2CAeI',
    CLIENT_ID: '174351007107-7h8ud8a89u46cas99cidr9kc15kof02b.apps.googleusercontent.com',
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.readonly',
    
    FOLDERS: {
        INSTRUMENTOS: '1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV',
        VOCES: '1joKAru0Z_jrgOracNjZzQZXbb2mpxCi7'
    },
    
    FILE_TYPES: ['pdf'],
    MAX_RESULTS: 100,
    ORDER_BY: 'name',
    
    FOLDER_URLS: {
        INSTRUMENTOS: 'https://drive.google.com/drive/folders/1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV',
        VOCES: 'https://drive.google.com/drive/folders/1joKAru0Z_jrgOracNjZzQZXbb2mpxCi7'
    }
};

// === CONFIGURACIÓN DE LA APLICACIÓN ===
const APP_CONFIG = {
    PDF_VIEWER: {
        DEFAULT_SCALE: 1.0,
        MIN_SCALE: 0.5,
        MAX_SCALE: 3.0,
        SCALE_STEP: 0.25
    },
    
    SEARCH: {
        MIN_QUERY_LENGTH: 2,
        DEBOUNCE_DELAY: 300,
        MAX_RESULTS: 10,
        FUZZY_THRESHOLD: 0.6
    },
    
    UI: {
        ANIMATION_DURATION: 300,
        LOADING_DELAY: 500,
        AUTO_SAVE_DELAY: 2000
    },
    
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
    isDevelopmentMode() {
        return false;
    },
    
    areCredentialsValid() {
        return !!(DRIVE_CONFIG.API_KEY && 
                 DRIVE_CONFIG.CLIENT_ID && 
                 !DRIVE_CONFIG.API_KEY.includes('YOUR_') &&
                 !DRIVE_CONFIG.CLIENT_ID.includes('YOUR_'));
    },
    
    areFolderIdsValid() {
        const instrumentosId = DRIVE_CONFIG.FOLDERS.INSTRUMENTOS;
        const vocesId = DRIVE_CONFIG.FOLDERS.VOCES;
        
        const isValidId = (id) => {
            return id && 
                   typeof id === 'string' && 
                   id.length >= 25 && 
                   !id.includes('http') && 
                   !id.includes('drive.google.com');
        };
        
        return isValidId(instrumentosId) && isValidId(vocesId);
    },
    
    getConfig() {
        return {
            drive: DRIVE_CONFIG,
            app: APP_CONFIG,
            isDev: false,
            credentialsValid: this.areCredentialsValid(),
            folderIdsValid: this.areFolderIdsValid()
        };
    },
    
    formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },
    
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
    
    logDriveStatus() {
        console.log('☁️ Google Drive API: CONFIGURADO');
        
        if (!this.areFolderIdsValid()) {
            console.error('❌ ERROR: IDs de carpetas no válidos');
        }
    }
};

// === EXPORTAR CONFIGURACIÓN ===
window.DRIVE_CONFIG = DRIVE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.ConfigUtils = ConfigUtils;

ConfigUtils.logDriveStatus();

console.log('⚙️ Configuración cargada - Versión optimizada');
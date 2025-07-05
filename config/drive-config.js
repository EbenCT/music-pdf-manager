/**
 * MUSIC PDF MANAGER - DRIVE CONFIGURATION
 * Configuración optimizada - SIN LÍMITES + AUTH PERMANENTE
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
    MAX_RESULTS: 1000,  // ← AUMENTADO (Google permite hasta 1000 por request)
    ORDER_BY: 'name',
    
    // ← NUEVO: Configuración para carga completa
    LOAD_ALL_FILES: true,
    BATCH_SIZE: 1000,
    
    // ← NUEVO: Auth permanente 
    PERSISTENT_AUTH: true,
    TOKEN_REFRESH_THRESHOLD: 7 * 24 * 60 * 60 * 1000, // 7 días en ms
    
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
        MAX_RESULTS: 50,  // ← AUMENTADO para búsquedas
        FUZZY_THRESHOLD: 0.6
    },
    
    UI: {
        ANIMATION_DURATION: 300,
        LOADING_DELAY: 500,
        AUTO_SAVE_DELAY: 2000
    },
    
    // ← NUEVO: Configuración de carga
    LOADING: {
        SHOW_PROGRESS: true,
        BATCH_DELAY: 100, // ms entre batches
        MAX_CONCURRENT_REQUESTS: 3
    },
    
    MESSAGES: {
        LOADING: 'Cargando todos los archivos PDF...',
        LOADING_PROGRESS: 'Cargados {current} de {total} archivos...',
        AUTH_REQUIRED: 'Iniciando sesión permanente con Google...',
        NO_FILES: 'No se encontraron archivos PDF en esta carpeta',
        SEARCH_PLACEHOLDER: '🔍 Buscar entre todos los archivos...',
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
        console.log('☁️ Google Drive API: CONFIGURADO PARA CARGA COMPLETA');
        console.log(`📊 Configuración: MAX_RESULTS=${DRIVE_CONFIG.MAX_RESULTS}, LOAD_ALL=${DRIVE_CONFIG.LOAD_ALL_FILES}`);
        console.log(`🔐 Auth Permanente: ${DRIVE_CONFIG.PERSISTENT_AUTH ? 'ACTIVADO' : 'DESACTIVADO'}`);
        
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

console.log('⚙️ Configuración optimizada cargada: SIN LÍMITES + AUTH PERMANENTE');
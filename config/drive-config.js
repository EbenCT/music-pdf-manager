/**
 * MUSIC PDF MANAGER - DRIVE CONFIGURATION
 * Configuración para Google Drive API y datos simulados para desarrollo
 */

// === CONFIGURACIÓN DE GOOGLE DRIVE API ===
const DRIVE_CONFIG = {
    // Google Drive API Configuration
    API_KEY: 'AIzaSyBCckvzf00l5jUDfqOhjjt25qeqRa2CAeI', // Reemplazar con tu API key real
    CLIENT_ID: '174351007107-pnhn3g2mqijl4p3omgp9frg37mt9l8g5.apps.googleusercontent.com', // Reemplazar con tu Client ID real
    DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
    SCOPES: 'https://www.googleapis.com/auth/drive.readonly',
    
    // Folder IDs (reemplazar con IDs reales de tus carpetas compartidas)
    FOLDERS: {
        INSTRUMENTOS: '1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV', // ID de carpeta "Instrumentos"https://drive.google.com/drive/folders/1tdyXTT-p7ZV1eUcvfrcvjch0Y1yC-wpV?usp=sharing
        VOCES: '1joKAru0Z_jrgOracNjZzQZXbb2mpxCi7'       // ID de carpeta "Voces"
    },
    
    // Configuración de archivos
    FILE_TYPES: ['pdf'],
    MAX_RESULTS: 100,
    ORDER_BY: 'name'
};

// === DATOS SIMULADOS PARA DESARROLLO ===
// Esto se usa mientras no tengamos configurado Google Drive API
const MOCK_DATA = {
    instrumentos: [
        {
            id: 'inst_001',
            name: 'Acercate Más - Nat King Cole.pdf',
            size: '245 KB',
            modifiedTime: '2024-01-15T10:30:00Z',
            downloadUrl: 'https://drive.google.com/file/d/sample1/view',
            thumbnailLink: null
        },
        {
            id: 'inst_002',
            name: 'All of Me - John Legend.pdf',
            size: '198 KB',
            modifiedTime: '2024-01-14T15:45:00Z',
            downloadUrl: 'https://drive.google.com/file/d/sample2/view',
            thumbnailLink: null
        },
        {
            id: 'inst_003',
            name: 'Bésame Mucho - Consuelo Velázquez.pdf',
            size: '312 KB',
            modifiedTime: '2024-01-13T09:20:00Z',
            downloadUrl: 'https://drive.google.com/file/d/sample3/view',
            thumbnailLink: null
        },
        {
            id: 'inst_004',
            name: 'Despacito - Luis Fonsi.pdf',
            size: '167 KB',
            modifiedTime: '2024-01-12T14:15:00Z',
            downloadUrl: 'https://drive.google.com/file/d/sample4/view',
            thumbnailLink: null
        },
        {
            id: 'inst_005',
            name: 'Estoy Aquí - Shakira.pdf',
            size: '289 KB',
            modifiedTime: '2024-01-11T11:30:00Z',
            downloadUrl: 'https://drive.google.com/file/d/sample5/view',
            thumbnailLink: null
        },
        {
            id: 'inst_006',
            name: 'La Vida es Una Flor - Ace of Base.pdf',
            size: '221 KB',
            modifiedTime: '2024-01-10T16:45:00Z',
            downloadUrl: 'https://drive.google.com/file/d/sample6/view',
            thumbnailLink: null
        },
        {
            id: 'inst_007',
            name: 'Mañana Será Bonito - Karol G.pdf',
            size: '203 KB',
            modifiedTime: '2024-01-09T13:20:00Z',
            downloadUrl: 'https://drive.google.com/file/d/sample7/view',
            thumbnailLink: null
        },
        {
            id: 'inst_008',
            name: 'Perfect - Ed Sheeran.pdf',
            size: '178 KB',
            modifiedTime: '2024-01-08T12:10:00Z',
            downloadUrl: 'https://drive.google.com/file/d/sample8/view',
            thumbnailLink: null
        }
    ],
    
    voces: [
        {
            id: 'voc_001',
            name: 'Amazing Grace - Himno Tradicional.pdf',
            size: '156 KB',
            modifiedTime: '2024-01-15T08:15:00Z',
            downloadUrl: 'https://drive.google.com/file/d/vocal1/view',
            thumbnailLink: null
        },
        {
            id: 'voc_002',
            name: 'Ave María - Franz Schubert.pdf',
            size: '234 KB',
            modifiedTime: '2024-01-14T17:30:00Z',
            downloadUrl: 'https://drive.google.com/file/d/vocal2/view',
            thumbnailLink: null
        },
        {
            id: 'voc_003',
            name: 'Canto a la Vida - Marta Gómez.pdf',
            size: '187 KB',
            modifiedTime: '2024-01-13T14:45:00Z',
            downloadUrl: 'https://drive.google.com/file/d/vocal3/view',
            thumbnailLink: null
        },
        {
            id: 'voc_004',
            name: 'Himno de la Alegría - Ludwig van Beethoven.pdf',
            size: '298 KB',
            modifiedTime: '2024-01-12T10:20:00Z',
            downloadUrl: 'https://drive.google.com/file/d/vocal4/view',
            thumbnailLink: null
        },
        {
            id: 'voc_005',
            name: 'Libre Soy - Frozen OST.pdf',
            size: '212 KB',
            modifiedTime: '2024-01-11T15:10:00Z',
            downloadUrl: 'https://drive.google.com/file/d/vocal5/view',
            thumbnailLink: null
        },
        {
            id: 'voc_006',
            name: 'Noche de Paz - Franz Gruber.pdf',
            size: '145 KB',
            modifiedTime: '2024-01-10T09:30:00Z',
            downloadUrl: 'https://drive.google.com/file/d/vocal6/view',
            thumbnailLink: null
        }
    ]
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
        LOADING: 'Cargando archivos...',
        NO_FILES: 'No se encontraron archivos PDF',
        SEARCH_PLACEHOLDER: '🔍 Buscar archivos...',
        ERROR_LOADING: 'Error al cargar los archivos',
        ERROR_VIEWING: 'Error al visualizar el PDF',
        PDF_LOADING: 'Cargando PDF...'
    }
};

// === UTILIDADES DE CONFIGURACIÓN ===
const ConfigUtils = {
    /**
     * Verifica si estamos en modo desarrollo (usando datos simulados)
     */
    isDevelopmentMode() {
        return !DRIVE_CONFIG.API_KEY || DRIVE_CONFIG.API_KEY.includes('YOUR_');
    },
    
    /**
     * Obtiene la configuración completa
     */
    getConfig() {
        return {
            drive: DRIVE_CONFIG,
            app: APP_CONFIG,
            mockData: MOCK_DATA,
            isDev: this.isDevelopmentMode()
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
    }
};

// === EXPORTAR CONFIGURACIÓN ===
// En un entorno real, esto se haría con módulos ES6
window.DRIVE_CONFIG = DRIVE_CONFIG;
window.APP_CONFIG = APP_CONFIG;
window.MOCK_DATA = MOCK_DATA;
window.ConfigUtils = ConfigUtils;

// === NOTAS PARA PRODUCCIÓN ===
/*
PARA CONFIGURAR GOOGLE DRIVE API EN PRODUCCIÓN:

1. Ir a Google Cloud Console (console.cloud.google.com)
2. Crear un nuevo proyecto o seleccionar uno existente
3. Habilitar Google Drive API
4. Crear credenciales:
   - API Key para acceso público
   - OAuth 2.0 Client ID para autenticación
5. Configurar pantalla de consentimiento OAuth
6. Agregar dominios autorizados
7. Reemplazar los valores en DRIVE_CONFIG con los reales
8. Configurar los IDs de las carpetas compartidas
9. Probar la integración

PERMISOS NECESARIOS:
- Las carpetas de Drive deben ser compartidas públicamente o
- El usuario debe autenticarse con OAuth 2.0

ESTRUCTURA DE CARPETAS RECOMENDADA:
📁 Music PDF Manager (Carpeta principal)
├── 📁 Instrumentos
│   ├── 📄 Canción 1.pdf
│   ├── 📄 Canción 2.pdf
│   └── ...
└── 📁 Voces
    ├── 📄 Vocal 1.pdf
    ├── 📄 Vocal 2.pdf
    └── ...
*/
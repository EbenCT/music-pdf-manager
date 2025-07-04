/**
 * MUSIC PDF MANAGER - GOOGLE DRIVE API INTEGRATION
 * Maneja la integración con Google Drive API para obtener archivos PDF
 */

class DriveAPI {
    constructor() {
        this.isInitialized = false;
        this.isSignedIn = false;
        this.gapi = null;
        this.config = window.DRIVE_CONFIG;
    }

    /**
     * Inicializa Google API
     */
    async init() {
        try {
            if (this.isInitialized) return true;

            console.log('☁️ Inicializando Google Drive API...');

            // Cargar Google API
            await this.loadGoogleAPI();

            // Inicializar Google API Client
            await this.gapi.load('client:auth2', async () => {
                await this.gapi.client.init({
                    apiKey: this.config.API_KEY,
                    clientId: this.config.CLIENT_ID,
                    discoveryDocs: [this.config.DISCOVERY_DOC],
                    scope: this.config.SCOPES
                });

                // Configurar estado de autenticación
                this.authInstance = this.gapi.auth2.getAuthInstance();
                this.isSignedIn = this.authInstance.isSignedIn.get();

                this.isInitialized = true;
                console.log('✅ Google Drive API inicializada');
            });

            return true;

        } catch (error) {
            console.error('❌ Error inicializando Google Drive API:', error);
            throw new Error('No se pudo inicializar Google Drive API');
        }
    }

    /**
     * Carga la librería de Google API
     */
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (typeof gapi !== 'undefined') {
                this.gapi = gapi;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = () => {
                this.gapi = gapi;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Autentica al usuario si es necesario
     */
    async authenticate() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            if (!this.isSignedIn) {
                console.log('🔐 Solicitando autenticación...');
                await this.authInstance.signIn();
                this.isSignedIn = true;
                console.log('✅ Usuario autenticado');
            }

            return true;

        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            throw new Error('Autenticación fallida');
        }
    }

    /**
     * Obtiene archivos PDF de una carpeta específica
     * @param {string} folderType - 'instrumentos' o 'voces'
     * @returns {Array} Lista de archivos PDF
     */
    async getFiles(folderType) {
        try {
            // En modo desarrollo, usar datos simulados
            if (ConfigUtils.isDevelopmentMode()) {
                console.log(`🔧 Modo desarrollo: obteniendo ${folderType} simulados`);
                return this.getMockFiles(folderType);
            }

            // Autenticar si es necesario
            await this.authenticate();

            // Obtener ID de carpeta
            const folderId = this.getFolderId(folderType);
            if (!folderId) {
                throw new Error(`ID de carpeta no configurado para: ${folderType}`);
            }

            console.log(`📁 Obteniendo archivos de ${folderType}...`);

            // Construir query para buscar PDFs en la carpeta
            const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;

            // Realizar petición a Google Drive API
            const response = await this.gapi.client.drive.files.list({
                q: query,
                fields: 'files(id,name,size,modifiedTime,webViewLink,thumbnailLink)',
                orderBy: this.config.ORDER_BY,
                pageSize: this.config.MAX_RESULTS
            });

            const files = response.result.files || [];
            console.log(`📊 ${files.length} archivos encontrados en ${folderType}`);

            // Procesar archivos
            return files.map(file => this.processFile(file));

        } catch (error) {
            console.error(`❌ Error obteniendo archivos de ${folderType}:`, error);
            
            // Fallback a datos simulados en caso de error
            console.log('🔄 Usando datos simulados como fallback...');
            return this.getMockFiles(folderType);
        }
    }

    /**
     * Obtiene archivos simulados para desarrollo
     */
    getMockFiles(folderType) {
        const mockData = window.MOCK_DATA;
        
        if (!mockData || !mockData[folderType]) {
            console.warn(`⚠️ No hay datos simulados para: ${folderType}`);
            return [];
        }

        // Simular delay de red
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([...mockData[folderType]]);
            }, 500 + Math.random() * 1000); // 500-1500ms delay
        });
    }

    /**
     * Obtiene el ID de carpeta según el tipo
     */
    getFolderId(folderType) {
        const folderMap = {
            'instrumentos': this.config.FOLDERS.INSTRUMENTOS,
            'voces': this.config.FOLDERS.VOCES
        };

        return folderMap[folderType.toLowerCase()];
    }

    /**
     * Procesa un archivo de Google Drive
     */
    processFile(file) {
        return {
            id: file.id,
            name: file.name,
            size: this.formatFileSize(file.size),
            modifiedTime: file.modifiedTime,
            downloadUrl: file.webViewLink,
            thumbnailLink: file.thumbnailLink || null,
            mimeType: 'application/pdf'
        };
    }

    /**
     * Formatea el tamaño de archivo
     */
    formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
        
        return `${size} ${sizes[i]}`;
    }

    /**
     * Descarga un archivo PDF
     * @param {string} fileId - ID del archivo en Google Drive
     * @returns {Blob} Archivo PDF como blob
     */
    async downloadFile(fileId) {
        try {
            if (ConfigUtils.isDevelopmentMode()) {
                throw new Error('Descarga no disponible en modo desarrollo');
            }

            await this.authenticate();

            console.log(`⬇️ Descargando archivo: ${fileId}`);

            const response = await this.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            // Convertir respuesta a blob
            const blob = new Blob([response.body], { type: 'application/pdf' });
            
            console.log('✅ Archivo descargado exitosamente');
            return blob;

        } catch (error) {
            console.error('❌ Error descargando archivo:', error);
            throw new Error('No se pudo descargar el archivo');
        }
    }

    /**
     * Obtiene la URL directa de visualización de un PDF
     * @param {string} fileId - ID del archivo
     * @returns {string} URL para visualizar el PDF
     */
    getViewerURL(fileId) {
        if (ConfigUtils.isDevelopmentMode()) {
            return `#demo-pdf-${fileId}`;
        }

        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    /**
     * Verifica permisos de acceso a una carpeta
     * @param {string} folderId - ID de la carpeta
     * @returns {boolean} True si tiene acceso
     */
    async checkFolderAccess(folderId) {
        try {
            if (ConfigUtils.isDevelopmentMode()) {
                return true;
            }

            await this.authenticate();

            const response = await this.gapi.client.drive.files.get({
                fileId: folderId,
                fields: 'id,name,permissions'
            });

            return response.result && response.result.id === folderId;

        } catch (error) {
            console.error('❌ Error verificando acceso a carpeta:', error);
            return false;
        }
    }

    /**
     * Obtiene información de una carpeta
     * @param {string} folderId - ID de la carpeta
     * @returns {Object} Información de la carpeta
     */
    async getFolderInfo(folderId) {
        try {
            if (ConfigUtils.isDevelopmentMode()) {
                return {
                    id: folderId,
                    name: 'Carpeta Demo',
                    fileCount: 0
                };
            }

            await this.authenticate();

            const response = await this.gapi.client.drive.files.get({
                fileId: folderId,
                fields: 'id,name,createdTime,modifiedTime'
            });

            return response.result;

        } catch (error) {
            console.error('❌ Error obteniendo información de carpeta:', error);
            return null;
        }
    }

    /**
     * Busca archivos por nombre en todas las carpetas
     * @param {string} query - Término de búsqueda
     * @returns {Array} Archivos encontrados
     */
    async searchFiles(query) {
        try {
            if (ConfigUtils.isDevelopmentMode()) {
                return this.searchMockFiles(query);
            }

            await this.authenticate();

            const instrumentosId = this.config.FOLDERS.INSTRUMENTOS;
            const vocesId = this.config.FOLDERS.VOCES;

            // Buscar en ambas carpetas
            const searchQuery = `(('${instrumentosId}' in parents) or ('${vocesId}' in parents)) and name contains '${query}' and mimeType='application/pdf' and trashed=false`;

            const response = await this.gapi.client.drive.files.list({
                q: searchQuery,
                fields: 'files(id,name,size,modifiedTime,webViewLink,parents)',
                orderBy: 'name',
                pageSize: 20
            });

            const files = response.result.files || [];
            
            // Determinar a qué sección pertenece cada archivo
            return files.map(file => {
                const section = file.parents.includes(instrumentosId) ? 'instrumentos' : 'voces';
                return {
                    ...this.processFile(file),
                    section
                };
            });

        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            return this.searchMockFiles(query);
        }
    }

    /**
     * Busca en archivos simulados
     */
    searchMockFiles(query) {
        const mockData = window.MOCK_DATA;
        const results = [];

        // Buscar en instrumentos
        mockData.instrumentos.forEach(file => {
            if (file.name.toLowerCase().includes(query.toLowerCase())) {
                results.push({ ...file, section: 'instrumentos' });
            }
        });

        // Buscar en voces
        mockData.voces.forEach(file => {
            if (file.name.toLowerCase().includes(query.toLowerCase())) {
                results.push({ ...file, section: 'voces' });
            }
        });

        return results;
    }

    /**
     * Limpia la autenticación
     */
    async signOut() {
        try {
            if (this.isInitialized && this.authInstance) {
                await this.authInstance.signOut();
                this.isSignedIn = false;
                console.log('👋 Usuario desconectado');
            }
        } catch (error) {
            console.error('❌ Error cerrando sesión:', error);
        }
    }

    /**
     * Obtiene información del usuario autenticado
     */
    getUserInfo() {
        if (!this.isSignedIn || !this.authInstance) {
            return null;
        }

        const profile = this.authInstance.currentUser.get().getBasicProfile();
        return {
            id: profile.getId(),
            name: profile.getName(),
            email: profile.getEmail(),
            imageUrl: profile.getImageUrl()
        };
    }
}

// === UTILIDADES ADICIONALES ===
const DriveUtils = {
    /**
     * Convierte ID de URL de Google Drive a ID de archivo
     */
    extractFileId(url) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    },

    /**
     * Valida si un ID de carpeta es válido
     */
    validateFolderId(folderId) {
        return /^[a-zA-Z0-9-_]{28,}$/.test(folderId);
    },

    /**
     * Genera URL de vista previa
     */
    getPreviewUrl(fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    },

    /**
     * Genera URL de descarga directa
     */
    getDownloadUrl(fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
};

// === EXPORTAR ===
window.DriveAPI = DriveAPI;
window.DriveUtils = DriveUtils;
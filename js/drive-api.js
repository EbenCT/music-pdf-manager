/**
 * MUSIC PDF MANAGER - GOOGLE DRIVE API INTEGRATION (SOLO DRIVE REAL)
 * Maneja la integración EXCLUSIVA con Google Drive API
 */

class DriveAPI {
    constructor() {
        this.isInitialized = false;
        this.isSignedIn = false;
        this.gapi = null;
        this.config = window.DRIVE_CONFIG;
        this.authInstance = null;
    }

    /**
     * Inicializa Google API - OBLIGATORIO
     */
    async init() {
        try {
            if (this.isInitialized) return true;

            console.log('☁️ Inicializando Google Drive API...');

            // Verificar credenciales
            if (!this.config.API_KEY || !this.config.CLIENT_ID) {
                throw new Error('Credenciales de Google Drive no configuradas');
            }

            // Cargar Google API
            await this.loadGoogleAPI();

            // Verificar que gapi se cargó
            if (!this.gapi || typeof this.gapi.load !== 'function') {
                throw new Error('Google API no se cargó correctamente');
            }

            // Inicializar con Promise para manejo de errores
            await new Promise((resolve, reject) => {
                this.gapi.load('client:auth2', async () => {
                    try {
                        console.log('🔧 Configurando cliente Google API...');
                        
                        await this.gapi.client.init({
                            apiKey: this.config.API_KEY,
                            clientId: this.config.CLIENT_ID,
                            discoveryDocs: [this.config.DISCOVERY_DOC],
                            scope: this.config.SCOPES
                        });

                        // Obtener instancia de autenticación
                        this.authInstance = this.gapi.auth2.getAuthInstance();
                        
                        if (!this.authInstance) {
                            throw new Error('No se pudo obtener instancia de autenticación');
                        }

                        // Verificar estado de autenticación
                        this.isSignedIn = this.authInstance.isSignedIn.get();
                        this.isInitialized = true;

                        console.log('✅ Google Drive API inicializada correctamente');
                        console.log('🔐 Usuario ya autenticado:', this.isSignedIn);

                        resolve();
                    } catch (error) {
                        console.error('❌ Error en init de gapi.client:', error);
                        reject(error);
                    }
                });
            });

            return true;

        } catch (error) {
            console.error('❌ Error inicializando Google Drive API:', error);
            throw new Error(`No se pudo inicializar Google Drive API: ${error.message}`);
        }
    }

    /**
     * Carga la librería de Google API
     */
    loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargado
            if (typeof gapi !== 'undefined' && gapi.load) {
                this.gapi = gapi;
                console.log('✅ Google API ya estaba cargado');
                resolve();
                return;
            }

            console.log('📦 Cargando Google API library...');
            
            // Crear y cargar script
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                if (typeof gapi !== 'undefined') {
                    this.gapi = gapi;
                    console.log('✅ Google API library cargada correctamente');
                    resolve();
                } else {
                    reject(new Error('Google API no está disponible después de cargar el script'));
                }
            };
            
            script.onerror = (error) => {
                console.error('❌ Error cargando Google API script:', error);
                reject(new Error('No se pudo cargar Google API script'));
            };
            
            // Timeout de seguridad
            setTimeout(() => {
                if (!this.gapi) {
                    reject(new Error('Timeout cargando Google API'));
                }
            }, 10000);
            
            document.head.appendChild(script);
        });
    }

    /**
     * Autentica al usuario - OBLIGATORIO para acceder a Drive
     */
    async authenticate() {
        try {
            console.log('🔐 Iniciando proceso de autenticación...');

            // Asegurar que Google API esté inicializada
            if (!this.isInitialized) {
                await this.init();
            }

            // Verificar authInstance
            if (!this.authInstance) {
                throw new Error('Instancia de autenticación no disponible');
            }

            // Si no está autenticado, solicitar autenticación
            if (!this.isSignedIn) {
                console.log('🔑 Solicitando autorización del usuario...');
                
                try {
                    const authResult = await this.authInstance.signIn({
                        prompt: 'select_account'
                    });
                    
                    if (authResult && authResult.isSignedIn()) {
                        this.isSignedIn = true;
                        console.log('✅ Usuario autenticado exitosamente');
                        
                        // Log de usuario autenticado
                        const profile = authResult.getBasicProfile();
                        console.log('👤 Usuario:', profile.getName(), profile.getEmail());
                    } else {
                        throw new Error('El usuario no completó la autenticación');
                    }
                } catch (signInError) {
                    console.error('❌ Error en signIn:', signInError);
                    throw new Error('El usuario rechazó la autenticación o hubo un error');
                }
            } else {
                console.log('✅ Usuario ya estaba autenticado');
            }

            return true;

        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            throw new Error(`Autenticación fallida: ${error.message}`);
        }
    }

    /**
     * Obtiene archivos PDF de una carpeta específica - SOLO DRIVE REAL
     */
    async getFiles(folderType) {
        try {
            console.log(`📁 Obteniendo archivos reales de ${folderType} desde Google Drive...`);

            // OBLIGATORIO: Autenticar usuario
            await this.authenticate();

            // Obtener ID de carpeta
            const folderId = this.getFolderId(folderType);
            if (!folderId) {
                throw new Error(`ID de carpeta no configurado para: ${folderType}`);
            }

            console.log(`🔍 Buscando PDFs en carpeta ${folderType} (${folderId})...`);

            // Construir query para buscar PDFs en la carpeta
            const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;

            // Realizar petición a Google Drive API
            const response = await this.gapi.client.drive.files.list({
                q: query,
                fields: 'files(id,name,size,modifiedTime,webViewLink,thumbnailLink,parents)',
                orderBy: this.config.ORDER_BY,
                pageSize: this.config.MAX_RESULTS
            });

            if (!response || !response.result) {
                throw new Error('Respuesta inválida de Google Drive API');
            }

            const files = response.result.files || [];
            console.log(`📊 ${files.length} archivos encontrados en ${folderType}`);

            if (files.length === 0) {
                console.warn(`⚠️ No se encontraron archivos PDF en la carpeta ${folderType}`);
                console.log(`🔗 Verificar carpeta: ${this.config.FOLDER_URLS[folderType.toUpperCase()]}`);
            }

            // Procesar archivos
            return files.map(file => this.processFile(file));

        } catch (error) {
            console.error(`❌ Error obteniendo archivos de ${folderType}:`, error);
            
            // NO HAY FALLBACK - Lanzar error
            throw new Error(`No se pudieron cargar los archivos de ${folderType}: ${error.message}`);
        }
    }

    /**
     * Obtiene el ID de carpeta según el tipo
     */
    getFolderId(folderType) {
        const folderMap = {
            'instrumentos': this.config.FOLDERS.INSTRUMENTOS,
            'voces': this.config.FOLDERS.VOCES
        };

        const folderId = folderMap[folderType.toLowerCase()];
        
        if (!folderId) {
            console.error(`❌ ID de carpeta no encontrado para: ${folderType}`);
            console.log('📋 IDs disponibles:', this.config.FOLDERS);
        }

        return folderId;
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
            downloadUrl: this.getViewerURL(file.id),
            webViewLink: file.webViewLink,
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
     * Obtiene la URL directa de visualización de un PDF
     */
    getViewerURL(fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    /**
     * Descarga un archivo PDF
     */
    async downloadFile(fileId) {
        try {
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
     * Verifica permisos de acceso a una carpeta
     */
    async checkFolderAccess(folderId) {
        try {
            await this.authenticate();

            const response = await this.gapi.client.drive.files.get({
                fileId: folderId,
                fields: 'id,name,permissions'
            });

            const hasAccess = response.result && response.result.id === folderId;
            console.log(`🔐 Acceso a carpeta ${folderId}:`, hasAccess);
            
            return hasAccess;

        } catch (error) {
            console.error(`❌ Error verificando acceso a carpeta ${folderId}:`, error);
            return false;
        }
    }

    /**
     * Obtiene información de una carpeta
     */
    async getFolderInfo(folderId) {
        try {
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
     */
    async searchFiles(query) {
        try {
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
            throw new Error(`Error en búsqueda: ${error.message}`);
        }
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

    /**
     * Verifica el estado de la conexión
     */
    getConnectionStatus() {
        return {
            isInitialized: this.isInitialized,
            isSignedIn: this.isSignedIn,
            hasAuthInstance: !!this.authInstance,
            hasGapi: !!this.gapi,
            userInfo: this.getUserInfo()
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

console.log('🚀 Drive API cargada: SOLO CONEXIÓN REAL');
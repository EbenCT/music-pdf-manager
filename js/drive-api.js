/**
 * MUSIC PDF MANAGER - GOOGLE DRIVE API INTEGRATION (MEJORADA)
 * Maneja la integración EXCLUSIVA con Google Drive API
 */

class DriveAPI {
    constructor() {
        this.isInitialized = false;
        this.isSignedIn = false;
        this.gapi = null;
        this.config = window.DRIVE_CONFIG;
        this.authInstance = null;
        this.initRetries = 0;
        this.maxRetries = 3;
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

            // Inicializar con Promise para manejo de errores mejorado
            await new Promise((resolve, reject) => {
                console.log('🔧 Cargando módulos client:auth2...');
                
                this.gapi.load('client:auth2', async () => {
                    try {
                        console.log('🔧 Configurando cliente Google API...');
                        console.log('🔑 API Key:', this.config.API_KEY.substring(0, 10) + '...');
                        console.log('🔑 Client ID:', this.config.CLIENT_ID.substring(0, 20) + '...');
                        
                        const initConfig = {
                            apiKey: this.config.API_KEY,
                            clientId: this.config.CLIENT_ID,
                            discoveryDocs: [this.config.DISCOVERY_DOC],
                            scope: this.config.SCOPES
                        };

                        console.log('🔧 Llamando a gapi.client.init...');
                        await this.gapi.client.init(initConfig);
                        console.log('✅ gapi.client.init completado');

                        // Obtener instancia de autenticación
                        console.log('🔧 Obteniendo instancia de auth2...');
                        this.authInstance = this.gapi.auth2.getAuthInstance();
                        
                        if (!this.authInstance) {
                            throw new Error('No se pudo obtener instancia de autenticación de gapi.auth2');
                        }

                        console.log('✅ Instancia de auth2 obtenida');

                        // Verificar estado de autenticación
                        this.isSignedIn = this.authInstance.isSignedIn.get();
                        this.isInitialized = true;

                        console.log('✅ Google Drive API inicializada correctamente');
                        console.log('🔐 Usuario ya autenticado:', this.isSignedIn);

                        resolve();
                    } catch (error) {
                        console.error('❌ Error detallado en init de gapi.client:', error);
                        console.error('❌ Tipo de error:', typeof error);
                        console.error('❌ Error stringificado:', JSON.stringify(error, null, 2));
                        
                        // Intentar obtener más detalles del error
                        if (error && error.details) {
                            console.error('❌ Detalles del error:', error.details);
                        }
                        if (error && error.result) {
                            console.error('❌ Resultado del error:', error.result);
                        }
                        
                        reject(new Error(`Error en gapi.client.init: ${error.message || 'Error desconocido'}`));
                    }
                });
            });

            return true;

        } catch (error) {
            console.error('❌ Error inicializando Google Drive API:', error);
            
            // Reintentar si es posible
            if (this.initRetries < this.maxRetries) {
                this.initRetries++;
                console.log(`🔄 Reintentando inicialización (${this.initRetries}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos
                return this.init();
            }
            
            throw new Error(`No se pudo inicializar Google Drive API después de ${this.maxRetries} intentos: ${error.message}`);
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
            
            // Limpiar cualquier script anterior
            const existingScript = document.querySelector('script[src*="apis.google.com/js/api.js"]');
            if (existingScript) {
                existingScript.remove();
            }
            
            // Crear y cargar script
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            
            let resolved = false;
            
            script.onload = () => {
                if (resolved) return;
                resolved = true;
                
                // Esperar un poco para que gapi esté disponible
                setTimeout(() => {
                    if (typeof gapi !== 'undefined' && gapi.load) {
                        this.gapi = gapi;
                        console.log('✅ Google API library cargada correctamente');
                        resolve();
                    } else {
                        reject(new Error('Google API no está disponible después de cargar el script'));
                    }
                }, 100);
            };
            
            script.onerror = (error) => {
                if (resolved) return;
                resolved = true;
                console.error('❌ Error cargando Google API script:', error);
                reject(new Error('No se pudo cargar Google API script - posible bloqueo de CSP'));
            };
            
            // Timeout de seguridad
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error('Timeout cargando Google API (10 segundos)'));
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
                console.log('🔧 Google API no inicializada, inicializando primero...');
                await this.init();
            }

            // Verificar authInstance
            if (!this.authInstance) {
                throw new Error('Instancia de autenticación no disponible - verificar configuración de OAuth');
            }

            // Si no está autenticado, solicitar autenticación
            if (!this.isSignedIn) {
                console.log('🔑 Solicitando autorización del usuario...');
                console.log('🌐 Se abrirá popup de Google para autenticación...');
                
                try {
                    const authResult = await this.authInstance.signIn({
                        prompt: 'select_account'
                    });
                    
                    console.log('🔍 Verificando resultado de autenticación...');
                    
                    if (authResult && authResult.isSignedIn()) {
                        this.isSignedIn = true;
                        console.log('✅ Usuario autenticado exitosamente');
                        
                        // Log de usuario autenticado
                        const profile = authResult.getBasicProfile();
                        console.log('👤 Usuario:', profile.getName(), '(' + profile.getEmail() + ')');
                        
                        // Verificar permisos
                        const authResponse = authResult.getAuthResponse();
                        console.log('🔑 Scopes otorgados:', authResponse.scope);
                        
                    } else {
                        throw new Error('El usuario no completó la autenticación correctamente');
                    }
                } catch (signInError) {
                    console.error('❌ Error en signIn:', signInError);
                    
                    if (signInError.error === 'popup_blocked_by_browser') {
                        throw new Error('Popup bloqueado por el navegador. Habilita popups para este sitio.');
                    } else if (signInError.error === 'access_denied') {
                        throw new Error('El usuario rechazó la autorización');
                    } else {
                        throw new Error(`Error de autenticación: ${signInError.error || signInError.message || 'Error desconocido'}`);
                    }
                }
            } else {
                console.log('✅ Usuario ya estaba autenticado');
                
                // Verificar que el token siga siendo válido
                const currentUser = this.authInstance.currentUser.get();
                if (currentUser && currentUser.isSignedIn()) {
                    const profile = currentUser.getBasicProfile();
                    console.log('👤 Usuario actual:', profile.getName());
                } else {
                    console.warn('⚠️ Token expirado, forzando nueva autenticación...');
                    this.isSignedIn = false;
                    return this.authenticate(); // Recursión para reautenticar
                }
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

            // Verificar acceso a la carpeta primero
            try {
                await this.gapi.client.drive.files.get({
                    fileId: folderId,
                    fields: 'id,name'
                });
                console.log(`✅ Acceso confirmado a carpeta ${folderType}`);
            } catch (accessError) {
                console.error(`❌ Sin acceso a carpeta ${folderType}:`, accessError);
                throw new Error(`No tienes acceso a la carpeta ${folderType}. Verifica que sea pública o que tengas permisos.`);
            }

            // Construir query para buscar PDFs en la carpeta
            const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;

            console.log(`🔍 Query: ${query}`);

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
                console.log(`💡 Asegúrate de que la carpeta contenga archivos PDF y sea accesible`);
            } else {
                // Log de algunos archivos encontrados
                console.log(`📋 Primeros archivos encontrados:`, files.slice(0, 3).map(f => f.name));
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
     * Verifica el estado de la conexión
     */
    getConnectionStatus() {
        return {
            isInitialized: this.isInitialized,
            isSignedIn: this.isSignedIn,
            hasAuthInstance: !!this.authInstance,
            hasGapi: !!this.gapi,
            userInfo: this.getUserInfo(),
            config: {
                hasApiKey: !!this.config.API_KEY,
                hasClientId: !!this.config.CLIENT_ID,
                folders: this.config.FOLDERS
            }
        };
    }

    /**
     * Test completo de la conexión
     */
    async testConnection() {
        console.log('🧪 INICIANDO TEST DE CONEXIÓN COMPLETO...');
        
        try {
            // 1. Verificar configuración
            console.log('1️⃣ Verificando configuración...');
            const status = this.getConnectionStatus();
            console.log('📊 Estado actual:', status);
            
            // 2. Inicializar API
            console.log('2️⃣ Inicializando Google API...');
            await this.init();
            
            // 3. Autenticar
            console.log('3️⃣ Autenticando usuario...');
            await this.authenticate();
            
            // 4. Probar acceso a carpetas
            console.log('4️⃣ Probando acceso a carpetas...');
            const folders = ['instrumentos', 'voces'];
            
            for (const folder of folders) {
                console.log(`📁 Probando carpeta ${folder}...`);
                const files = await this.getFiles(folder);
                console.log(`✅ ${folder}: ${files.length} archivos encontrados`);
            }
            
            console.log('🎉 TEST DE CONEXIÓN COMPLETADO EXITOSAMENTE');
            return true;
            
        } catch (error) {
            console.error('❌ TEST DE CONEXIÓN FALLÓ:', error);
            return false;
        }
    }

    /**
     * Obtiene información del usuario autenticado
     */
    getUserInfo() {
        if (!this.isSignedIn || !this.authInstance) {
            return null;
        }

        try {
            const profile = this.authInstance.currentUser.get().getBasicProfile();
            return {
                id: profile.getId(),
                name: profile.getName(),
                email: profile.getEmail(),
                imageUrl: profile.getImageUrl()
            };
        } catch (error) {
            console.error('❌ Error obteniendo info de usuario:', error);
            return null;
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

console.log('🚀 Drive API cargada: CONEXIÓN REAL MEJORADA');
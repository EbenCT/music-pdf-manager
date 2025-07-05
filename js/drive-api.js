/**
 * MUSIC PDF MANAGER - GOOGLE DRIVE API con Google Identity Services (GIS)
 * Implementación ACTUALIZADA usando la nueva API de Google
 */

class DriveAPIGIS {
    constructor() {
        this.isInitialized = false;
        this.isSignedIn = false;
        this.accessToken = null;
        this.config = window.DRIVE_CONFIG;
        this.tokenClient = null;
        this.gapi = null;
        this.initRetries = 0;
        this.maxRetries = 3;
    }

    /**
     * Inicializa Google API con Google Identity Services (GIS)
     */
    async init() {
        try {
            if (this.isInitialized) return true;

            console.log('☁️ Inicializando Google Drive API con GIS...');

            // Verificar credenciales
            if (!this.config.API_KEY || !this.config.CLIENT_ID) {
                throw new Error('Credenciales de Google Drive no configuradas');
            }

            // Cargar GAPI primero
            await this.loadGoogleAPI();

            // Inicializar GAPI client
            await this.initGapiClient();

            // Inicializar Google Identity Services
            await this.initGoogleIdentity();

            this.isInitialized = true;
            console.log('✅ Google Drive API inicializada correctamente con GIS');

            return true;

        } catch (error) {
            console.error('❌ Error inicializando Google Drive API:', error);
            
            // Reintentar si es posible
            if (this.initRetries < this.maxRetries) {
                this.initRetries++;
                console.log(`🔄 Reintentando inicialización (${this.initRetries}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.init();
            }
            
            throw new Error(`No se pudo inicializar Google Drive API después de ${this.maxRetries} intentos: ${error.message}`);
        }
    }

    /**
     * Carga la librería GAPI (para API calls)
     */
    async loadGoogleAPI() {
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
                reject(new Error('No se pudo cargar Google API script'));
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
     * Inicializa GAPI client (sin auth)
     */
    async initGapiClient() {
        return new Promise((resolve, reject) => {
            console.log('🔧 Inicializando GAPI client...');
            
            this.gapi.load('client', async () => {
                try {
                    await this.gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: [this.config.DISCOVERY_DOC]
                    });
                    
                    console.log('✅ GAPI client inicializado correctamente');
                    resolve();
                } catch (error) {
                    console.error('❌ Error inicializando GAPI client:', error);
                    reject(error);
                }
            });
        });
    }

    /**
     * Inicializa Google Identity Services (GIS)
     */
    async initGoogleIdentity() {
        return new Promise((resolve, reject) => {
            console.log('🔧 Inicializando Google Identity Services...');
            
            // Verificar que google.accounts esté disponible
            if (typeof google === 'undefined' || !google.accounts) {
                reject(new Error('Google Identity Services no está cargado'));
                return;
            }

            try {
                // Crear token client para OAuth2
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.config.CLIENT_ID,
                    scope: this.config.SCOPES,
                    callback: (response) => {
                        if (response.error !== undefined) {
                            console.error('❌ Error en callback de OAuth:', response);
                            this.handleAuthError(response.error);
                            return;
                        }
                        
                        console.log('✅ Token de acceso obtenido exitosamente');
                        this.accessToken = response.access_token;
                        this.isSignedIn = true;
                        
                        // Configurar token en GAPI
                        this.gapi.client.setToken({
                            access_token: this.accessToken
                        });
                        
                        this.onAuthSuccess();
                    }
                });

                console.log('✅ Google Identity Services inicializado correctamente');
                resolve();
                
            } catch (error) {
                console.error('❌ Error inicializando Google Identity Services:', error);
                reject(error);
            }
        });
    }

    /**
     * Autentica al usuario usando GIS
     */
    async authenticate() {
        try {
            console.log('🔐 Iniciando proceso de autenticación con GIS...');

            // Asegurar que esté inicializado
            if (!this.isInitialized) {
                await this.init();
            }

            // Verificar que tokenClient esté disponible
            if (!this.tokenClient) {
                throw new Error('Google Identity Services no está inicializado correctamente');
            }

            // Si ya está autenticado y el token es válido, usar ese
            if (this.isSignedIn && this.accessToken) {
                console.log('✅ Usuario ya está autenticado');
                return true;
            }

            // Solicitar autenticación
            console.log('🔑 Solicitando autorización del usuario...');
            
            // Mostrar botón de autorización si está disponible
            this.showAuthButton();
            
            return new Promise((resolve, reject) => {
                // Configurar callbacks temporales
                const originalCallback = this.tokenClient.callback;
                
                this.tokenClient.callback = (response) => {
                    // Restaurar callback original
                    this.tokenClient.callback = originalCallback;
                    
                    if (response.error !== undefined) {
                        console.error('❌ Error de autenticación:', response);
                        reject(new Error(`Error de autenticación: ${response.error}`));
                        return;
                    }
                    
                    console.log('✅ Autenticación exitosa');
                    resolve(true);
                };
                
                // Solicitar token
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            });

        } catch (error) {
            console.error('❌ Error en autenticación:', error);
            throw new Error(`Autenticación fallida: ${error.message}`);
        }
    }

    /**
     * Maneja el éxito de autenticación
     */
    onAuthSuccess() {
        console.log('🎉 Autenticación completada exitosamente');
        
        // Ocultar botón de auth
        this.hideAuthButton();
        
        // Notificar al app principal
        if (window.app && typeof window.app.onAuthSuccess === 'function') {
            window.app.onAuthSuccess();
        }
        
        // Trigger evento personalizado
        window.dispatchEvent(new CustomEvent('driveAuthSuccess'));
    }

    /**
     * Maneja errores de autenticación
     */
    handleAuthError(error) {
        console.error('❌ Error de autenticación:', error);
        
        let errorMessage = 'Error de autenticación desconocido';
        
        switch (error) {
            case 'popup_blocked_by_browser':
                errorMessage = 'Popup bloqueado por el navegador. Habilita popups para este sitio.';
                break;
            case 'access_denied':
                errorMessage = 'El usuario rechazó la autorización';
                break;
            case 'invalid_client':
                errorMessage = 'Credenciales de cliente inválidas';
                break;
            default:
                errorMessage = `Error de autenticación: ${error}`;
        }
        
        // Mostrar error en UI
        this.showAuthError(errorMessage);
        
        // Notificar al app principal
        if (window.app && typeof window.app.onAuthError === 'function') {
            window.app.onAuthError(errorMessage);
        }
    }

    /**
     * Obtiene archivos PDF de una carpeta específica
     */
    async getFiles(folderType) {
        try {
            console.log(`📁 Obteniendo archivos de ${folderType} desde Google Drive...`);

            // SOLO verificar autenticación, NO autenticar automáticamente
            if (!this.isSignedIn || !this.accessToken) {
                throw new Error(`No autenticado. Llama a authenticate() primero.`);
            }

            // Obtener ID de carpeta
            const folderId = this.getFolderId(folderType);
            if (!folderId) {
                throw new Error(`ID de carpeta no configurado para: ${folderType}`);
            }

            console.log(`🔍 Buscando PDFs en carpeta ${folderType} (${folderId})...`);

            // Verificar acceso a la carpeta
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

            // Construir query para buscar PDFs
            const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;

            // Realizar petición
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
            }

            // Procesar archivos
            return files.map(file => this.processFile(file));

        } catch (error) {
            console.error(`❌ Error obteniendo archivos de ${folderType}:`, error);
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
     * Obtiene la URL directa de visualización
     */
    getViewerURL(fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    /**
     * Muestra botón de autenticación
     */
    showAuthButton() {
        const button = document.getElementById('auth-button');
        if (button) {
            button.style.display = 'inline-flex';
            button.onclick = () => {
                this.tokenClient.requestAccessToken({ prompt: 'consent' });
            };
        }
        
        // Mostrar panel de estado
        const statusPanel = document.getElementById('connection-status');
        if (statusPanel) {
            statusPanel.classList.remove('hidden');
            document.getElementById('status-title').textContent = 'Autorización Requerida';
            document.getElementById('status-message').textContent = 'Haz clic en "Iniciar Sesión" para autorizar el acceso a Google Drive';
        }
    }

    /**
     * Oculta botón de autenticación
     */
    hideAuthButton() {
        const button = document.getElementById('auth-button');
        if (button) {
            button.style.display = 'none';
        }
        
        // Ocultar panel de estado
        const statusPanel = document.getElementById('connection-status');
        if (statusPanel) {
            statusPanel.classList.add('hidden');
        }
    }

    /**
     * Muestra error de autenticación
     */
    showAuthError(message) {
        const statusPanel = document.getElementById('connection-status');
        if (statusPanel) {
            statusPanel.classList.remove('hidden');
            document.getElementById('status-title').textContent = 'Error de Autenticación';
            document.getElementById('status-message').textContent = message;
            
            // Mostrar botón de retry
            const retryButton = document.getElementById('retry-button');
            if (retryButton) {
                retryButton.style.display = 'inline-flex';
            }
        }
    }

    /**
     * Verifica el estado de la conexión
     */
    getConnectionStatus() {
        return {
            isInitialized: this.isInitialized,
            isSignedIn: this.isSignedIn,
            hasAccessToken: !!this.accessToken,
            hasTokenClient: !!this.tokenClient,
            hasGapi: !!this.gapi,
            config: {
                hasApiKey: !!this.config.API_KEY,
                hasClientId: !!this.config.CLIENT_ID,
                folders: this.config.FOLDERS
            }
        };
    }

    /**
     * Cierra sesión
     */
    async signOut() {
        try {
            if (this.accessToken) {
                // Revocar token
                google.accounts.oauth2.revoke(this.accessToken);
                this.accessToken = null;
                this.isSignedIn = false;
                
                // Limpiar token de GAPI
                this.gapi.client.setToken(null);
                
                console.log('👋 Usuario desconectado');
            }
        } catch (error) {
            console.error('❌ Error cerrando sesión:', error);
        }
    }

    /**
     * Test de conexión completo
     */
    async testConnection() {
        console.log('🧪 INICIANDO TEST DE CONEXIÓN CON GIS...');
        
        try {
            // 1. Verificar configuración
            console.log('1️⃣ Verificando configuración...');
            const status = this.getConnectionStatus();
            console.log('📊 Estado actual:', status);
            
            // 2. Inicializar API
            console.log('2️⃣ Inicializando Google API con GIS...');
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
}

// === UTILIDADES ===
const DriveUtils = {
    extractFileId(url) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    },

    validateFolderId(folderId) {
        return /^[a-zA-Z0-9-_]{28,}$/.test(folderId);
    },

    getPreviewUrl(fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    },

    getDownloadUrl(fileId) {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
};

// === EXPORTAR ===
window.DriveAPIGIS = DriveAPIGIS;
window.DriveUtils = DriveUtils;

console.log('🚀 Drive API GIS cargada: NUEVA IMPLEMENTACIÓN CON GOOGLE IDENTITY SERVICES');
/**
 * MUSIC PDF MANAGER - GOOGLE DRIVE API con Google Identity Services (GIS)
 * Implementación CORREGIDA con persistencia de tokens y URLs de descarga
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
        this.tokenExpiryTime = null;
        
        // Configuración de localStorage
        this.STORAGE_KEYS = {
            ACCESS_TOKEN: 'gdrive_access_token',
            EXPIRY_TIME: 'gdrive_token_expiry',
            USER_INFO: 'gdrive_user_info'
        };
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

            // Verificar si hay token guardado y válido
            await this.checkStoredToken();

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
     * Verifica si hay un token almacenado y válido
     */
    async checkStoredToken() {
        try {
            const storedToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            const storedExpiry = localStorage.getItem(this.STORAGE_KEYS.EXPIRY_TIME);
            
            if (!storedToken || !storedExpiry) {
                console.log('📝 No hay token almacenado');
                return false;
            }

            const expiryTime = parseInt(storedExpiry);
            const currentTime = Date.now();
            
            // Verificar si el token ha expirado (con 5 minutos de margen)
            if (currentTime >= (expiryTime - 300000)) {
                console.log('⏰ Token almacenado ha expirado');
                this.clearStoredToken();
                return false;
            }

            // Token válido - configurar
            this.accessToken = storedToken;
            this.tokenExpiryTime = expiryTime;
            this.isSignedIn = true;

            // Configurar token en GAPI
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            console.log('✅ Token almacenado válido restaurado');
            this.updateAuthStatus(true);
            
            return true;

        } catch (error) {
            console.error('❌ Error verificando token almacenado:', error);
            this.clearStoredToken();
            return false;
        }
    }

    /**
     * Guarda el token en localStorage
     */
    storeToken(accessToken, expiresIn) {
        try {
            const expiryTime = Date.now() + (expiresIn * 1000);
            
            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            localStorage.setItem(this.STORAGE_KEYS.EXPIRY_TIME, expiryTime.toString());
            
            this.tokenExpiryTime = expiryTime;
            
            console.log('💾 Token guardado en localStorage');
            
        } catch (error) {
            console.error('❌ Error guardando token:', error);
        }
    }

    /**
     * Limpia el token almacenado
     */
    clearStoredToken() {
        try {
            localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(this.STORAGE_KEYS.EXPIRY_TIME);
            localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
            
            this.accessToken = null;
            this.tokenExpiryTime = null;
            this.isSignedIn = false;
            
            console.log('🗑️ Token almacenado limpiado');
            
        } catch (error) {
            console.error('❌ Error limpiando token:', error);
        }
    }

    /**
     * Actualiza el estado de autenticación en la UI
     */
    updateAuthStatus(isAuthenticated, userInfo = null) {
        const authStatus = document.getElementById('auth-status');
        const authIcon = document.getElementById('auth-icon');
        const authText = document.getElementById('auth-text');
        
        if (authStatus && authIcon && authText) {
            if (isAuthenticated) {
                authStatus.className = 'auth-status authenticated';
                authIcon.textContent = '✅';
                authText.textContent = userInfo ? `${userInfo.name}` : 'Conectado';
            } else {
                authStatus.className = 'auth-status not-authenticated';
                authIcon.textContent = '❌';
                authText.textContent = 'No conectado';
            }
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
                        
                        // Guardar token (expires_in viene en segundos)
                        const expiresIn = response.expires_in || 3600; // Default 1 hora
                        this.storeToken(response.access_token, expiresIn);
                        
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

            // Si ya está autenticado y el token es válido, usar ese
            if (this.isSignedIn && this.accessToken && this.isTokenValid()) {
                console.log('✅ Usuario ya está autenticado con token válido');
                this.onAuthSuccess();
                return true;
            }

            // Verificar que tokenClient esté disponible
            if (!this.tokenClient) {
                throw new Error('Google Identity Services no está inicializado correctamente');
            }

            // Solicitar autenticación
            console.log('🔑 Solicitando autorización del usuario...');
            
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
            this.updateAuthStatus(false);
            throw new Error(`Autenticación fallida: ${error.message}`);
        }
    }

    /**
     * Verifica si el token actual es válido
     */
    isTokenValid() {
        if (!this.tokenExpiryTime) return false;
        
        const currentTime = Date.now();
        const timeLeft = this.tokenExpiryTime - currentTime;
        
        // Considerar válido si quedan más de 5 minutos
        return timeLeft > 300000;
    }

    /**
     * Maneja el éxito de autenticación
     */
    async onAuthSuccess() {
        console.log('🎉 Autenticación completada exitosamente');
        
        try {
            // Obtener información del usuario
            const userInfo = await this.getUserInfo();
            this.updateAuthStatus(true, userInfo);
            
            // Ocultar botón de auth
            this.hideAuthButton();
            
            // Notificar al app principal
            if (window.app && typeof window.app.onAuthSuccess === 'function') {
                window.app.onAuthSuccess();
            }
            
            // Trigger evento personalizado
            window.dispatchEvent(new CustomEvent('driveAuthSuccess'));
            
        } catch (error) {
            console.error('❌ Error obteniendo info del usuario:', error);
            this.updateAuthStatus(true); // Aún mostrar como autenticado
        }
    }

    /**
     * Obtiene información del usuario autenticado
     */
    async getUserInfo() {
        try {
            const response = await this.gapi.client.request({
                path: 'https://www.googleapis.com/oauth2/v2/userinfo'
            });
            
            const userInfo = response.result;
            
            // Guardar info del usuario
            localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
            
            return userInfo;
            
        } catch (error) {
            console.error('❌ Error obteniendo info del usuario:', error);
            return null;
        }
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
        
        this.updateAuthStatus(false);
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

            // Verificar autenticación
            if (!this.isSignedIn || !this.accessToken || !this.isTokenValid()) {
                throw new Error(`No autenticado o token expirado. Llama a authenticate() primero.`);
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
                fields: 'files(id,name,size,modifiedTime,webViewLink,thumbnailLink,parents,downloadUrl)',
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
            
            // Si es un error de token, intentar limpiar
            if (error.message.includes('401') || error.message.includes('token')) {
                console.log('🔄 Token posiblemente inválido, limpiando...');
                this.clearStoredToken();
                this.updateAuthStatus(false);
            }
            
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
            downloadUrl: this.getDirectDownloadURL(file.id), // URL corregida
            webViewLink: file.webViewLink,
            thumbnailLink: file.thumbnailLink || null,
            mimeType: 'application/pdf'
        };
    }

    /**
     * Obtiene la URL directa de descarga para PDF.js
     */
    getDirectDownloadURL(fileId) {
        // Usar la URL de export que permite CORS
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${this.config.API_KEY}`;
    }

    /**
     * Obtiene la URL de descarga con token de autorización
     */
    getAuthenticatedDownloadURL(fileId) {
        // Esta URL requiere el header Authorization
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    /**
     * Descarga un archivo con autenticación
     */
    async downloadFileBlob(fileId) {
        try {
            const response = await fetch(this.getAuthenticatedDownloadURL(fileId), {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.blob();

        } catch (error) {
            console.error('❌ Error descargando archivo:', error);
            throw error;
        }
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
     * Muestra botón de autenticación
     */
    showAuthButton() {
        const button = document.getElementById('auth-button');
        if (button) {
            button.style.display = 'inline-flex';
            button.onclick = () => {
                this.authenticate().catch(error => {
                    console.error('❌ Error en autenticación manual:', error);
                });
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
        
        // Mostrar botón de logout
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.style.display = 'inline-flex';
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
            tokenValid: this.isTokenValid(),
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
                
                // Limpiar estado
                this.clearStoredToken();
                
                // Limpiar token de GAPI
                this.gapi.client.setToken(null);
                
                // Actualizar UI
                this.updateAuthStatus(false);
                this.showAuthButton();
                
                console.log('👋 Usuario desconectado');
                
                // Notificar al app principal
                if (window.app && typeof window.app.onSignOut === 'function') {
                    window.app.onSignOut();
                }
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
    },

    /**
     * Convierte blob a URL para PDF.js
     */
    createBlobURL(blob) {
        return URL.createObjectURL(blob);
    },

    /**
     * Libera memoria de blob URL
     */
    revokeBlobURL(url) {
        URL.revokeObjectURL(url);
    }
};

// === EXPORTAR ===
window.DriveAPIGIS = DriveAPIGIS;
window.DriveUtils = DriveUtils;

console.log('🚀 Drive API GIS cargada: VERSIÓN CORREGIDA con persistencia y URLs directas');
/**
 * GOOGLE DRIVE AUTHENTICATION MODULE
 * Maneja toda la lógica de autenticación con Google Identity Services
 */

class DriveAuth {
    constructor(config) {
        this.config = config;
        this.isInitialized = false;
        this.isSignedIn = false;
        this.accessToken = null;
        this.tokenClient = null;
        this.gapi = null;
        this.tokenExpiryTime = null;
        this.isAuthenticating = false;
        
        // Configuración de localStorage
        this.STORAGE_KEYS = {
            ACCESS_TOKEN: 'gdrive_access_token',
            EXPIRY_TIME: 'gdrive_token_expiry',
            USER_INFO: 'gdrive_user_info'
        };
    }

    /**
     * Inicializa Google API con Google Identity Services
     */
    async init() {
        try {
            if (this.isInitialized) return true;

            console.log('🔐 Inicializando autenticación Google Drive...');

            // Verificar credenciales
            if (!this.config.API_KEY || !this.config.CLIENT_ID) {
                throw new Error('Credenciales de Google Drive no configuradas');
            }

            // Cargar GAPI
            await this.loadGoogleAPI();
            
            // Inicializar GAPI client
            await this.initGapiClient();
            
            // Inicializar Google Identity Services
            await this.initGoogleIdentity();
            
            // Verificar token guardado
            await this.checkStoredToken();

            this.isInitialized = true;
            console.log('✅ Autenticación Google Drive inicializada');

            return true;

        } catch (error) {
            console.error('❌ Error inicializando autenticación:', error);
            throw error;
        }
    }

    /**
     * Carga la librería GAPI
     */
    async loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (typeof gapi !== 'undefined' && gapi.load) {
                this.gapi = gapi;
                console.log('✅ Google API ya estaba cargado');
                resolve();
                return;
            }

            console.log('📦 Cargando Google API library...');
            
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                setTimeout(() => {
                    if (typeof gapi !== 'undefined' && gapi.load) {
                        this.gapi = gapi;
                        console.log('✅ Google API library cargada');
                        resolve();
                    } else {
                        reject(new Error('Google API no disponible'));
                    }
                }, 100);
            };
            
            script.onerror = () => reject(new Error('Error cargando Google API'));
            document.head.appendChild(script);
        });
    }

    /**
     * Inicializa GAPI client
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
                    
                    console.log('✅ GAPI client inicializado');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Inicializa Google Identity Services
     */
    async initGoogleIdentity() {
        return new Promise((resolve, reject) => {
            console.log('🔧 Inicializando Google Identity Services...');
            
            if (typeof google === 'undefined' || !google.accounts) {
                reject(new Error('Google Identity Services no cargado'));
                return;
            }

            try {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.config.CLIENT_ID,
                    scope: this.config.SCOPES,
                    callback: (response) => this.handleTokenResponse(response)
                });

                console.log('✅ Google Identity Services inicializado');
                resolve();
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Verifica token almacenado
     */
    async checkStoredToken() {
        try {
            const storedToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            const storedExpiry = localStorage.getItem(this.STORAGE_KEYS.EXPIRY_TIME);
            
            if (!storedToken || !storedExpiry) {
                return false;
            }

            const expiryTime = parseInt(storedExpiry);
            const currentTime = Date.now();
            
            // Verificar expiración (5 min de margen)
            if (currentTime >= (expiryTime - 300000)) {
                console.log('⏰ Token expirado');
                this.clearStoredToken();
                return false;
            }

            // Token válido
            this.accessToken = storedToken;
            this.tokenExpiryTime = expiryTime;
            this.isSignedIn = true;

            // Configurar en GAPI
            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            console.log('✅ Token válido restaurado');
            this.updateAuthStatus(true);
            
            return true;

        } catch (error) {
            console.error('❌ Error verificando token:', error);
            this.clearStoredToken();
            return false;
        }
    }

    /**
     * Maneja respuesta del token
     */
    handleTokenResponse(response) {
        console.log('🔄 Procesando token...');
        
        if (response.error !== undefined) {
            console.error('❌ Error OAuth:', response);
            this.isAuthenticating = false;
            this.handleAuthError(response.error);
            return;
        }
        
        console.log('✅ Token obtenido');
        
        this.accessToken = response.access_token;
        this.isSignedIn = true;
        this.isAuthenticating = false;
        
        // Guardar token
        const expiresIn = response.expires_in || 3600;
        this.storeToken(response.access_token, expiresIn);
        
        // Configurar en GAPI
        this.gapi.client.setToken({
            access_token: this.accessToken
        });
        
        this.onAuthSuccess();
    }

    /**
     * Autentica usuario
     */
    async authenticate() {
        try {
            if (this.isAuthenticating) {
                console.log('⚠️ Autenticación en progreso...');
                return false;
            }

            console.log('🔐 Iniciando autenticación...');
            this.isAuthenticating = true;

            if (!this.isInitialized) {
                await this.init();
            }

            // Si ya autenticado y token válido
            if (this.isSignedIn && this.accessToken && this.isTokenValid()) {
                console.log('✅ Ya autenticado');
                this.isAuthenticating = false;
                this.onAuthSuccess();
                return true;
            }

            if (!this.tokenClient) {
                throw new Error('Token client no inicializado');
            }

            console.log('🔑 Solicitando autorización...');
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
            
            return true;

        } catch (error) {
            console.error('❌ Error autenticación:', error);
            this.isAuthenticating = false;
            this.updateAuthStatus(false);
            throw error;
        }
    }

    /**
     * Verifica si token es válido
     */
    isTokenValid() {
        if (!this.tokenExpiryTime) return false;
        const timeLeft = this.tokenExpiryTime - Date.now();
        return timeLeft > 300000; // 5 minutos
    }

    /**
     * Guarda token
     */
    storeToken(accessToken, expiresIn) {
        try {
            const expiryTime = Date.now() + (expiresIn * 1000);
            
            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            localStorage.setItem(this.STORAGE_KEYS.EXPIRY_TIME, expiryTime.toString());
            
            this.tokenExpiryTime = expiryTime;
            console.log('💾 Token guardado');
            
        } catch (error) {
            console.error('❌ Error guardando token:', error);
        }
    }

    /**
     * Limpia token
     */
    clearStoredToken() {
        try {
            localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(this.STORAGE_KEYS.EXPIRY_TIME);
            localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
            
            this.accessToken = null;
            this.tokenExpiryTime = null;
            this.isSignedIn = false;
            
            console.log('🗑️ Token limpiado');
            
        } catch (error) {
            console.error('❌ Error limpiando token:', error);
        }
    }

    /**
     * Éxito de autenticación
     */
    async onAuthSuccess() {
        console.log('🎉 Autenticación exitosa');
        
        try {
            const userInfo = await this.getUserInfo();
            this.updateAuthStatus(true, userInfo);
            this.hideAuthButton();
            
            // Disparar evento
            window.dispatchEvent(new CustomEvent('driveAuthSuccess'));
            
            if (window.app && typeof window.app.onAuthSuccess === 'function') {
                window.app.onAuthSuccess();
            }
            
        } catch (error) {
            console.error('❌ Error obteniendo info usuario:', error);
            this.updateAuthStatus(true);
            window.dispatchEvent(new CustomEvent('driveAuthSuccess'));
        }
    }

    /**
     * Obtiene info del usuario
     */
    async getUserInfo() {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const userInfo = await response.json();
            
            localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
            console.log('✅ Info usuario:', userInfo.name);
            
            return userInfo;
            
        } catch (error) {
            console.error('❌ Error info usuario:', error);
            return null;
        }
    }

    /**
     * Maneja errores de auth
     */
    handleAuthError(error) {
        console.error('❌ Error autenticación:', error);
        
        let errorMessage = 'Error de autenticación desconocido';
        
        switch (error) {
            case 'popup_blocked_by_browser':
                errorMessage = 'Popup bloqueado. Habilita popups.';
                break;
            case 'access_denied':
                errorMessage = 'Autorización rechazada';
                break;
            case 'invalid_client':
                errorMessage = 'Credenciales inválidas';
                break;
            default:
                errorMessage = `Error: ${error}`;
        }
        
        this.updateAuthStatus(false);
        this.showAuthError(errorMessage);
        
        if (window.app && typeof window.app.onAuthError === 'function') {
            window.app.onAuthError(errorMessage);
        }
    }

    /**
     * Actualiza estado de auth en UI
     */
    updateAuthStatus(isAuthenticated, userInfo = null) {
        const authStatus = document.getElementById('auth-status');
        const authIcon = document.getElementById('auth-icon');
        const authText = document.getElementById('auth-text');
        
        if (authStatus && authIcon && authText) {
            if (isAuthenticated) {
                authStatus.className = 'auth-status authenticated';
                authIcon.textContent = '✅';
                authText.textContent = userInfo ? userInfo.name : 'Conectado';
            } else {
                authStatus.className = 'auth-status not-authenticated';
                authIcon.textContent = '❌';
                authText.textContent = 'No conectado';
            }
        }
    }

    /**
     * Muestra botón de auth
     */
    showAuthButton() {
        const button = document.getElementById('auth-button');
        if (button) {
            button.style.display = 'inline-flex';
            button.onclick = () => {
                this.authenticate().catch(error => {
                    console.error('❌ Error autenticación manual:', error);
                });
            };
        }
        
        const statusPanel = document.getElementById('connection-status');
        if (statusPanel) {
            statusPanel.classList.remove('hidden');
            document.getElementById('status-title').textContent = 'Autorización Requerida';
            document.getElementById('status-message').textContent = 'Haz clic en "Iniciar Sesión"';
        }
    }

    /**
     * Oculta botón de auth
     */
    hideAuthButton() {
        const button = document.getElementById('auth-button');
        if (button) button.style.display = 'none';
        
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) logoutButton.style.display = 'inline-flex';
        
        const statusPanel = document.getElementById('connection-status');
        if (statusPanel) statusPanel.classList.add('hidden');
    }

    /**
     * Muestra error de auth
     */
    showAuthError(message) {
        const statusPanel = document.getElementById('connection-status');
        if (statusPanel) {
            statusPanel.classList.remove('hidden');
            document.getElementById('status-title').textContent = 'Error de Autenticación';
            document.getElementById('status-message').textContent = message;
            
            const retryButton = document.getElementById('retry-button');
            if (retryButton) retryButton.style.display = 'inline-flex';
        }
    }

    /**
     * Cierra sesión
     */
    async signOut() {
        try {
            if (this.accessToken) {
                google.accounts.oauth2.revoke(this.accessToken);
                this.clearStoredToken();
                this.isAuthenticating = false;
                this.gapi.client.setToken(null);
                this.updateAuthStatus(false);
                this.showAuthButton();
                
                console.log('👋 Desconectado');
                
                if (window.app && typeof window.app.onSignOut === 'function') {
                    window.app.onSignOut();
                }
            }
        } catch (error) {
            console.error('❌ Error cerrando sesión:', error);
        }
    }

    /**
     * Estado de conexión
     */
    getConnectionStatus() {
        return {
            isInitialized: this.isInitialized,
            isSignedIn: this.isSignedIn,
            hasAccessToken: !!this.accessToken,
            tokenValid: this.isTokenValid(),
            isAuthenticating: this.isAuthenticating,
            hasTokenClient: !!this.tokenClient,
            hasGapi: !!this.gapi
        };
    }
}

// Exportar
window.DriveAuth = DriveAuth;
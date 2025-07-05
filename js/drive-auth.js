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
        
        this.STORAGE_KEYS = {
            ACCESS_TOKEN: 'gdrive_access_token',
            EXPIRY_TIME: 'gdrive_token_expiry',
            USER_INFO: 'gdrive_user_info'
        };
    }

    async init() {
        try {
            if (this.isInitialized) return true;

            if (!this.config.API_KEY || !this.config.CLIENT_ID) {
                throw new Error('Credenciales de Google Drive no configuradas');
            }

            await this.loadGoogleAPI();
            await this.initGapiClient();
            await this.initGoogleIdentity();
            await this.checkStoredToken();

            this.isInitialized = true;
            console.log('✅ Autenticación Google Drive inicializada');

            return true;

        } catch (error) {
            console.error('❌ Error inicializando autenticación:', error);
            throw error;
        }
    }

    async loadGoogleAPI() {
        return new Promise((resolve, reject) => {
            if (typeof gapi !== 'undefined' && gapi.load) {
                this.gapi = gapi;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                setTimeout(() => {
                    if (typeof gapi !== 'undefined' && gapi.load) {
                        this.gapi = gapi;
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

    async initGapiClient() {
        return new Promise((resolve, reject) => {
            this.gapi.load('client', async () => {
                try {
                    await this.gapi.client.init({
                        apiKey: this.config.API_KEY,
                        discoveryDocs: [this.config.DISCOVERY_DOC]
                    });
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async initGoogleIdentity() {
        return new Promise((resolve, reject) => {
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

                resolve();
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async checkStoredToken() {
        try {
            const storedToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            const storedExpiry = localStorage.getItem(this.STORAGE_KEYS.EXPIRY_TIME);
            
            if (!storedToken || !storedExpiry) {
                return false;
            }

            const expiryTime = parseInt(storedExpiry);
            const currentTime = Date.now();
            
            if (currentTime >= (expiryTime - 300000)) {
                this.clearStoredToken();
                return false;
            }

            this.accessToken = storedToken;
            this.tokenExpiryTime = expiryTime;
            this.isSignedIn = true;

            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            this.updateAuthStatus(true);
            
            return true;

        } catch (error) {
            this.clearStoredToken();
            return false;
        }
    }

    handleTokenResponse(response) {
        if (response.error !== undefined) {
            console.error('❌ Error OAuth:', response);
            this.isAuthenticating = false;
            this.handleAuthError(response.error);
            return;
        }
        
        this.accessToken = response.access_token;
        this.isSignedIn = true;
        this.isAuthenticating = false;
        
        const expiresIn = response.expires_in || 3600;
        this.storeToken(response.access_token, expiresIn);
        
        this.gapi.client.setToken({
            access_token: this.accessToken
        });
        
        this.onAuthSuccess();
    }

    async authenticate() {
        try {
            if (this.isAuthenticating) return false;

            this.isAuthenticating = true;

            if (!this.isInitialized) {
                await this.init();
            }

            if (this.isSignedIn && this.accessToken && this.isTokenValid()) {
                this.isAuthenticating = false;
                this.onAuthSuccess();
                return true;
            }

            if (!this.tokenClient) {
                throw new Error('Token client no inicializado');
            }

            this.tokenClient.requestAccessToken({ prompt: 'consent' });
            
            return true;

        } catch (error) {
            console.error('❌ Error autenticación:', error);
            this.isAuthenticating = false;
            this.updateAuthStatus(false);
            throw error;
        }
    }

    isTokenValid() {
        if (!this.tokenExpiryTime) return false;
        const timeLeft = this.tokenExpiryTime - Date.now();
        return timeLeft > 300000;
    }

    storeToken(accessToken, expiresIn) {
        try {
            const expiryTime = Date.now() + (expiresIn * 1000);
            
            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            localStorage.setItem(this.STORAGE_KEYS.EXPIRY_TIME, expiryTime.toString());
            
            this.tokenExpiryTime = expiryTime;
            
        } catch (error) {
            console.error('❌ Error guardando token:', error);
        }
    }

    clearStoredToken() {
        try {
            localStorage.removeItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(this.STORAGE_KEYS.EXPIRY_TIME);
            localStorage.removeItem(this.STORAGE_KEYS.USER_INFO);
            
            this.accessToken = null;
            this.tokenExpiryTime = null;
            this.isSignedIn = false;
            
        } catch (error) {
            console.error('❌ Error limpiando token:', error);
        }
    }

    async onAuthSuccess() {
        try {
            const userInfo = await this.getUserInfo();
            this.updateAuthStatus(true, userInfo);
            this.hideAuthButton();
            
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
            
            return userInfo;
            
        } catch (error) {
            return null;
        }
    }

    handleAuthError(error) {
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

    hideAuthButton() {
        const button = document.getElementById('auth-button');
        if (button) button.style.display = 'none';
        
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) logoutButton.style.display = 'inline-flex';
        
        const statusPanel = document.getElementById('connection-status');
        if (statusPanel) statusPanel.classList.add('hidden');
    }

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

    async signOut() {
        try {
            if (this.accessToken) {
                google.accounts.oauth2.revoke(this.accessToken);
                this.clearStoredToken();
                this.isAuthenticating = false;
                this.gapi.client.setToken(null);
                this.updateAuthStatus(false);
                this.showAuthButton();
                
                if (window.app && typeof window.app.onSignOut === 'function') {
                    window.app.onSignOut();
                }
            }
        } catch (error) {
            console.error('❌ Error cerrando sesión:', error);
        }
    }

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
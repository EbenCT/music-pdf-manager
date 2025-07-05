/**
 * GOOGLE DRIVE AUTHENTICATION MODULE - PERMANENTE
 * Auth que se mantiene automáticamente sin volver a pedir login
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
        this.refreshTimer = null;
        
        this.STORAGE_KEYS = {
            ACCESS_TOKEN: 'gdrive_access_token',
            EXPIRY_TIME: 'gdrive_token_expiry',
            USER_INFO: 'gdrive_user_info',
            REFRESH_TOKEN: 'gdrive_refresh_token',  // ← NUEVO
            LAST_AUTH: 'gdrive_last_auth'           // ← NUEVO
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
            
            // ← NUEVO: Intentar recuperar token existente
            const hasValidToken = await this.recoverStoredAuth();
            
            if (!hasValidToken) {
                await this.checkStoredToken();
            }

            // ← NUEVO: Configurar refresh automático
            this.setupAutoRefresh();

            this.isInitialized = true;
            console.log('✅ Autenticación Google Drive inicializada (MODO PERMANENTE)');

            return true;

        } catch (error) {
            console.error('❌ Error inicializando autenticación:', error);
            throw error;
        }
    }

    // ← NUEVO: Recuperar autenticación almacenada
    async recoverStoredAuth() {
        try {
            const storedToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            const storedExpiry = localStorage.getItem(this.STORAGE_KEYS.EXPIRY_TIME);
            const lastAuth = localStorage.getItem(this.STORAGE_KEYS.LAST_AUTH);
            
            if (!storedToken || !storedExpiry) {
                console.log('🔐 No hay tokens almacenados');
                return false;
            }

            const expiryTime = parseInt(storedExpiry);
            const currentTime = Date.now();
            const lastAuthTime = lastAuth ? parseInt(lastAuth) : 0;
            
            // ← NUEVO: Verificar si el token es muy viejo (más de 7 días)
            const tokenAge = currentTime - lastAuthTime;
            const maxAge = this.config.TOKEN_REFRESH_THRESHOLD || (7 * 24 * 60 * 60 * 1000);
            
            if (tokenAge > maxAge) {
                console.log('🔐 Token muy antiguo, renovando...');
                this.clearStoredToken();
                return false;
            }

            // ← VERIFICAR: Si el token está cerca de expirar, renovarlo
            const timeUntilExpiry = expiryTime - currentTime;
            
            if (timeUntilExpiry < 600000) { // Menos de 10 minutos
                console.log('🔐 Token próximo a expirar, renovando...');
                await this.refreshTokenSilently();
                return true;
            }

            // Token válido
            this.accessToken = storedToken;
            this.tokenExpiryTime = expiryTime;
            this.isSignedIn = true;

            this.gapi.client.setToken({
                access_token: this.accessToken
            });

            this.updateAuthStatus(true);
            console.log('✅ Token recuperado exitosamente');
            
            return true;

        } catch (error) {
            console.log('⚠️ Error recuperando token:', error);
            this.clearStoredToken();
            return false;
        }
    }

    // ← NUEVO: Refresh automático silencioso
    async refreshTokenSilently() {
        try {
            console.log('🔄 Renovando token silenciosamente...');
            
            // Usar el método implícito de Google para renovar
            if (!this.tokenClient) {
                await this.initGoogleIdentity();
            }

            return new Promise((resolve) => {
                this.tokenClient.callback = (response) => {
                    if (response.error) {
                        console.error('❌ Error renovando token:', response.error);
                        resolve(false);
                        return;
                    }
                    
                    this.handleTokenResponse(response, true); // silent = true
                    console.log('✅ Token renovado silenciosamente');
                    resolve(true);
                };

                // Renovar sin mostrar popup si es posible
                this.tokenClient.requestAccessToken({ 
                    prompt: '', // ← Sin prompt para renovación silenciosa
                    hint: localStorage.getItem(this.STORAGE_KEYS.USER_INFO) ? 
                          JSON.parse(localStorage.getItem(this.STORAGE_KEYS.USER_INFO)).email : ''
                });
            });

        } catch (error) {
            console.error('❌ Error en refresh silencioso:', error);
            return false;
        }
    }

    // ← NUEVO: Configurar auto-refresh
    setupAutoRefresh() {
        // Limpiar timer anterior si existe
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        // ← NUEVO: Timer que verifica cada 5 minutos
        this.refreshTimer = setInterval(async () => {
            if (this.isSignedIn && this.tokenExpiryTime) {
                const timeLeft = this.tokenExpiryTime - Date.now();
                
                // Si quedan menos de 10 minutos, renovar
                if (timeLeft < 600000 && timeLeft > 0) {
                    console.log('⏰ Auto-renovando token...');
                    await this.refreshTokenSilently();
                }
                // Si ya expiró, limpiar
                else if (timeLeft <= 0) {
                    console.log('⏰ Token expirado, requiere nueva autenticación');
                    this.clearStoredToken();
                    this.updateAuthStatus(false);
                }
            }
        }, 5 * 60 * 1000); // Cada 5 minutos
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
                    callback: (response) => this.handleTokenResponse(response, false)
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

    // ← MODIFICADO: Handle token con opción silenciosa
    handleTokenResponse(response, silent = false) {
        if (response.error !== undefined) {
            console.error('❌ Error OAuth:', response);
            this.isAuthenticating = false;
            if (!silent) {
                this.handleAuthError(response.error);
            }
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
        
        if (!silent) {
            this.onAuthSuccess();
        } else {
            this.updateAuthStatus(true);
        }
    }

    async authenticate() {
        try {
            if (this.isAuthenticating) return false;

            this.isAuthenticating = true;

            if (!this.isInitialized) {
                await this.init();
            }

            // ← NUEVO: Primero intentar con token existente
            if (this.isSignedIn && this.accessToken && this.isTokenValid()) {
                this.isAuthenticating = false;
                this.onAuthSuccess();
                return true;
            }

            if (!this.tokenClient) {
                throw new Error('Token client no inicializado');
            }

            // ← MODIFICADO: Auth más persistente
            this.tokenClient.requestAccessToken({ 
                prompt: 'consent',
                include_granted_scopes: true
            });
            
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
        return timeLeft > 300000; // 5 minutos de margen
    }

    // ← MODIFICADO: Almacenamiento mejorado
    storeToken(accessToken, expiresIn) {
        try {
            const expiryTime = Date.now() + (expiresIn * 1000);
            const currentTime = Date.now();
            
            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
            localStorage.setItem(this.STORAGE_KEYS.EXPIRY_TIME, expiryTime.toString());
            localStorage.setItem(this.STORAGE_KEYS.LAST_AUTH, currentTime.toString());
            
            this.tokenExpiryTime = expiryTime;
            
            console.log(`💾 Token almacenado, expira en ${Math.round(expiresIn/60)} minutos`);
            
        } catch (error) {
            console.error('❌ Error guardando token:', error);
        }
    }

    clearStoredToken() {
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            this.accessToken = null;
            this.tokenExpiryTime = null;
            this.isSignedIn = false;
            
            // Limpiar timer
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
                this.refreshTimer = null;
            }
            
            console.log('🗑️ Tokens limpiados');
            
        } catch (error) {
            console.error('❌ Error limpiando token:', error);
        }
    }

    async onAuthSuccess() {
        try {
            const userInfo = await this.getUserInfo();
            this.updateAuthStatus(true, userInfo);
            this.hideAuthButton();
            
            // ← NUEVO: Configurar refresh automático después de auth exitoso
            this.setupAutoRefresh();
            
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
                
                const timeLeft = this.tokenExpiryTime ? 
                    Math.round((this.tokenExpiryTime - Date.now()) / (1000 * 60 * 60)) : 0;
                
                authText.textContent = userInfo ? 
                    `${userInfo.name} (${timeLeft}h)` : 
                    `Conectado (${timeLeft}h)`;
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
            document.getElementById('status-message').textContent = 'Autorizar una vez para acceso permanente';
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
                
                console.log('👋 Sesión cerrada completamente');
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
            hasGapi: !!this.gapi,
            tokenExpiresIn: this.tokenExpiryTime ? 
                Math.round((this.tokenExpiryTime - Date.now()) / (1000 * 60)) : 0,
            autoRefreshActive: !!this.refreshTimer
        };
    }

    // ← NUEVO: Método para forzar renovación
    async forceRefresh() {
        console.log('🔄 Forzando renovación de token...');
        return await this.refreshTokenSilently();
    }

    // ← NUEVO: Cleanup al destruir
    destroy() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        console.log('🧹 DriveAuth limpiado');
    }
}

// Exportar
window.DriveAuth = DriveAuth;

console.log('🔐 DriveAuth cargado: MODO PERMANENTE activado');
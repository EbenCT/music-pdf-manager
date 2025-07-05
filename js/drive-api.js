/**
 * MUSIC PDF MANAGER - GOOGLE DRIVE API REFACTORIZADO
 * Coordinador principal que usa módulos especializados
 */

class DriveAPIGIS {
    constructor() {
        this.config = window.DRIVE_CONFIG;
        this.driveAuth = null;
        this.driveFiles = null;
        this.isInitialized = false;
        this.initRetries = 0;
        this.maxRetries = 3;
    }

    /**
     * Inicializa Google API con módulos especializados
     */
    async init() {
        try {
            if (this.isInitialized) return true;

            console.log('☁️ Inicializando Google Drive API con módulos...');

            // Verificar dependencias
            if (!window.DriveAuth || !window.DriveFiles) {
                throw new Error('Módulos de Drive no cargados');
            }

            // Inicializar módulos
            this.driveAuth = new DriveAuth(this.config);
            this.driveFiles = new DriveFiles(this.config, this.driveAuth);

            // Inicializar autenticación
            await this.driveAuth.init();

            this.isInitialized = true;
            console.log('✅ Google Drive API inicializada con módulos');

            return true;

        } catch (error) {
            console.error('❌ Error inicializando Drive API:', error);
            
            if (this.initRetries < this.maxRetries) {
                this.initRetries++;
                console.log(`🔄 Reintentando (${this.initRetries}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.init();
            }
            
            throw new Error(`Error después de ${this.maxRetries} intentos: ${error.message}`);
        }
    }

    // === DELEGATES PARA AUTENTICACIÓN ===

    async authenticate() {
        return this.driveAuth.authenticate();
    }

    async signOut() {
        return this.driveAuth.signOut();
    }

    get isSignedIn() {
        return this.driveAuth?.isSignedIn || false;
    }

    get accessToken() {
        return this.driveAuth?.accessToken || null;
    }

    isTokenValid() {
        return this.driveAuth?.isTokenValid() || false;
    }

    updateAuthStatus(isAuthenticated, userInfo = null) {
        if (this.driveAuth) {
            this.driveAuth.updateAuthStatus(isAuthenticated, userInfo);
        }
    }

    showAuthButton() {
        if (this.driveAuth) {
            this.driveAuth.showAuthButton();
        }
    }

    clearStoredToken() {
        if (this.driveAuth) {
            this.driveAuth.clearStoredToken();
        }
    }

    // === DELEGATES PARA ARCHIVOS ===

    async getFiles(folderType) {
        if (!this.driveFiles) {
            throw new Error('Módulo de archivos no inicializado');
        }
        return this.driveFiles.getFiles(folderType);
    }

    async downloadFileBlob(fileId) {
        if (!this.driveFiles) {
            throw new Error('Módulo de archivos no inicializado');
        }
        return this.driveFiles.downloadFileBlob(fileId);
    }

    async searchFiles(query, folderType = null) {
        if (!this.driveFiles) {
            throw new Error('Módulo de archivos no inicializado');
        }
        return this.driveFiles.searchFiles(query, folderType);
    }

    async getFileMetadata(fileId) {
        if (!this.driveFiles) {
            throw new Error('Módulo de archivos no inicializado');
        }
        return this.driveFiles.getFileMetadata(fileId);
    }

    getDirectDownloadURL(fileId) {
        if (!this.driveFiles) {
            return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        }
        return this.driveFiles.getDirectDownloadURL(fileId);
    }

    // === MÉTODOS DE ESTADO ===

    getConnectionStatus() {
        return {
            isInitialized: this.isInitialized,
            auth: this.driveAuth?.getConnectionStatus() || {},
            files: this.driveFiles ? 'initialized' : 'not initialized',
            config: {
                hasApiKey: !!this.config.API_KEY,
                hasClientId: !!this.config.CLIENT_ID,
                folders: this.config.FOLDERS
            }
        };
    }

    // === MÉTODOS DE TESTING ===

    async testConnection() {
        console.log('🧪 INICIANDO TEST DE CONEXIÓN...');
        
        try {
            // 1. Verificar configuración
            console.log('1️⃣ Verificando configuración...');
            const status = this.getConnectionStatus();
            console.log('📊 Estado:', status);
            
            // 2. Inicializar
            console.log('2️⃣ Inicializando...');
            await this.init();
            
            // 3. Autenticar
            console.log('3️⃣ Autenticando...');
            await this.authenticate();
            
            // 4. Probar acceso a carpetas
            console.log('4️⃣ Probando carpetas...');
            const folderTests = await this.driveFiles.testFolderAccess();
            console.log('📁 Resultados:', folderTests);
            
            // 5. Probar carga de archivos
            console.log('5️⃣ Probando archivos...');
            const files = await Promise.all([
                this.getFiles('instrumentos'),
                this.getFiles('voces')
            ]);
            
            console.log(`✅ Test completo: ${files[0].length} instrumentos, ${files[1].length} voces`);
            return true;
            
        } catch (error) {
            console.error('❌ Test falló:', error);
            return false;
        }
    }

    // === DEBUGGING ===

    debugInfo() {
        console.group('🔍 DRIVE API DEBUG INFO');
        console.log('Estado:', this.getConnectionStatus());
        console.log('Auth Module:', this.driveAuth);
        console.log('Files Module:', this.driveFiles);
        console.log('Config:', this.config);
        console.groupEnd();
    }
}

// === FUNCIÓN DE DEBUG MEJORADA ===
window.debugDriveConnection = function() {
    console.log('🔧 DEBUG DE CONEXIÓN A GOOGLE DRIVE:');
    
    const driveAPI = window.AppState?.driveAPI;
    if (!driveAPI) {
        console.error('❌ DriveAPI no disponible');
        return;
    }
    
    // Debug completo
    driveAPI.debugInfo();
    
    // Test adicional si está autenticado
    if (driveAPI.isSignedIn) {
        console.log('✅ Usuario autenticado - Probando descarga...');
        
        const files = window.AppState?.files;
        if (files && files.instrumentos && files.instrumentos.length > 0) {
            const testFile = files.instrumentos[0];
            console.log('🧪 Probando descarga:', testFile.name);
            
            driveAPI.downloadFileBlob(testFile.id)
                .then(blob => {
                    console.log('✅ Test descarga exitoso:', blob.size, 'bytes');
                })
                .catch(error => {
                    console.error('❌ Test descarga falló:', error);
                });
        }
    } else {
        console.error('❌ Usuario no autenticado');
    }
};

// === EXPORTAR ===
window.DriveAPIGIS = DriveAPIGIS;

console.log('🚀 Drive API GIS cargada: VERSIÓN REFACTORIZADA - MÓDULOS SEPARADOS');
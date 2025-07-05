/**
 * GOOGLE DRIVE FILES MODULE - SIN LÍMITES
 * Carga TODOS los archivos PDF sin restricciones
 */

class DriveFiles {
    constructor(config, driveAuth) {
        this.config = config;
        this.driveAuth = driveAuth;
        this.loadingProgress = { current: 0, total: 0 };
    }

    // ← MÉTODO PRINCIPAL - CARGA TODOS LOS ARCHIVOS
    async getFiles(folderType) {
        try {
            if (!this.driveAuth.isSignedIn || !this.driveAuth.accessToken || !this.driveAuth.isTokenValid()) {
                throw new Error('No autenticado o token expirado');
            }

            const folderId = this.getFolderId(folderType);
            if (!folderId) {
                throw new Error(`ID de carpeta no configurado para: ${folderType}`);
            }

            // Verificar acceso a la carpeta
            await this.verifyFolderAccess(folderId, folderType);

            // ← CARGAR TODOS LOS ARCHIVOS SIN LÍMITE
            const allFiles = await this.loadAllFilesFromFolder(folderId, folderType);
            
            console.log(`✅ Cargados ${allFiles.length} archivos de ${folderType}`);
            return allFiles.map(file => this.processFile(file));

        } catch (error) {
            console.error(`❌ Error obteniendo archivos de ${folderType}:`, error);
            
            if (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401)) {
                this.driveAuth.clearStoredToken();
                this.driveAuth.updateAuthStatus(false);
                throw new Error('Token expirado. Inicia sesión nuevamente.');
            }
            
            throw this.handleApiError(error, folderType);
        }
    }

    // ← NUEVO: Cargar TODOS los archivos con paginación automática
    async loadAllFilesFromFolder(folderId, folderType) {
        const allFiles = [];
        let nextPageToken = null;
        let pageCount = 0;
        
        const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;
        
        do {
            pageCount++;
            this.updateProgress(folderType, `Cargando página ${pageCount}...`);
            
            const requestParams = {
                q: query,
                fields: 'nextPageToken,files(id,name,size,modifiedTime,webViewLink,thumbnailLink,parents)',
                orderBy: this.config.ORDER_BY,
                pageSize: this.config.BATCH_SIZE || 1000
            };
            
            if (nextPageToken) {
                requestParams.pageToken = nextPageToken;
            }
            
            const response = await this.driveAuth.gapi.client.drive.files.list(requestParams);
            
            if (!response || !response.result) {
                throw new Error('Respuesta inválida de Google Drive API');
            }
            
            const files = response.result.files || [];
            allFiles.push(...files);
            
            nextPageToken = response.result.nextPageToken;
            
            this.updateProgress(folderType, `${allFiles.length} archivos cargados...`);
            
            // Pequeña pausa para no saturar la API
            if (nextPageToken && this.config.LOADING?.BATCH_DELAY) {
                await new Promise(resolve => setTimeout(resolve, this.config.LOADING.BATCH_DELAY));
            }
            
        } while (nextPageToken);
        
        return allFiles;
    }

    // ← NUEVO: Actualizar progreso de carga
    updateProgress(folderType, message) {
        if (window.app && window.app.updateLoadingProgress) {
            window.app.updateLoadingProgress(folderType, message);
        } else {
            console.log(`📁 ${folderType}: ${message}`);
        }
    }

    async verifyFolderAccess(folderId, folderType) {
        try {
            await this.driveAuth.gapi.client.drive.files.get({
                fileId: folderId,
                fields: 'id,name'
            });
        } catch (accessError) {
            throw new Error(`No tienes acceso a la carpeta ${folderType}`);
        }
    }

    getFolderId(folderType) {
        const folderMap = {
            'instrumentos': this.config.FOLDERS.INSTRUMENTOS,
            'voces': this.config.FOLDERS.VOCES
        };
        return folderMap[folderType.toLowerCase()];
    }

    processFile(file) {
        return {
            id: file.id,
            name: file.name,
            size: this.formatFileSize(file.size),
            modifiedTime: file.modifiedTime,
            downloadUrl: this.getDirectDownloadURL(file.id),
            webViewLink: file.webViewLink,
            thumbnailLink: file.thumbnailLink || null,
            mimeType: 'application/pdf'
        };
    }

    getDirectDownloadURL(fileId) {
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    getPublicDownloadURL(fileId) {
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${this.config.API_KEY}`;
    }

    // ← MÉTODO DE DESCARGA MEJORADO
    async downloadFileBlob(fileId) {
        try {
            if (!this.driveAuth.isSignedIn || !this.driveAuth.accessToken) {
                throw new Error('No hay sesión activa');
            }

            // Método 1: Con autorización (más confiable)
            const authUrl = this.getDirectDownloadURL(fileId);
            
            try {
                const authResponse = await fetch(authUrl, {
                    headers: {
                        'Authorization': `Bearer ${this.driveAuth.accessToken}`,
                        'X-Goog-Api-Key': this.config.API_KEY
                    }
                });

                if (authResponse.ok) {
                    return await authResponse.blob();
                }
            } catch (authError) {
                console.log('⚠️ Método autorizado falló, intentando método público...');
            }

            // Método 2: URL pública (backup)
            const publicUrl = this.getPublicDownloadURL(fileId);
            
            try {
                const publicResponse = await fetch(publicUrl);
                
                if (publicResponse.ok) {
                    return await publicResponse.blob();
                }
            } catch (publicError) {
                console.log('⚠️ Método público falló, intentando GAPI...');
            }

            // Método 3: GAPI directo (último recurso)
            try {
                const gapiResponse = await this.driveAuth.gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });

                if (gapiResponse.body) {
                    return new Blob([gapiResponse.body], { type: 'application/pdf' });
                }
            } catch (gapiError) {
                console.log('⚠️ GAPI también falló');
            }

            throw new Error('No se pudo descargar el archivo por ningún método disponible');

        } catch (error) {
            console.error('❌ Error descargando archivo:', error);
            throw this.handleDownloadError(error);
        }
    }

    handleApiError(error, folderType) {
        let errorMessage = `Error cargando archivos de ${folderType}`;
        
        if (error.result && error.result.error) {
            const gError = error.result.error;
            switch (gError.code) {
                case 400:
                    errorMessage = `Error en consulta: ${gError.message}`;
                    break;
                case 403:
                    errorMessage = `Sin permisos para ${folderType}`;
                    break;
                case 404:
                    errorMessage = `Carpeta ${folderType} no encontrada`;
                    break;
                default:
                    errorMessage = `Error Google Drive (${gError.code}): ${gError.message}`;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        return new Error(errorMessage);
    }

    handleDownloadError(error) {
        if (error.message.includes('403')) {
            return new Error('Sin permisos para acceder al archivo. Verifica que sea público o que tengas acceso.');
        } else if (error.message.includes('404')) {
            return new Error('Archivo no encontrado. Puede haber sido eliminado o movido.');
        } else if (error.message.includes('401')) {
            return new Error('Sesión expirada. Inicia sesión nuevamente.');
        }
        
        return error;
    }

    async getFileMetadata(fileId) {
        try {
            const response = await this.driveAuth.gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id,name,size,modifiedTime,mimeType,webViewLink,thumbnailLink,parents'
            });

            return response.result;

        } catch (error) {
            console.error('❌ Error obteniendo metadata:', error);
            throw error;
        }
    }

    // ← NUEVO: Búsqueda sin límites
    async searchFiles(query, folderType = null) {
        try {
            let searchQuery = `mimeType='application/pdf' and trashed=false and name contains '${query}'`;
            
            if (folderType) {
                const folderId = this.getFolderId(folderType);
                if (folderId) {
                    searchQuery += ` and '${folderId}' in parents`;
                }
            }

            // Búsqueda sin límites
            const allResults = [];
            let nextPageToken = null;
            
            do {
                const requestParams = {
                    q: searchQuery,
                    fields: 'nextPageToken,files(id,name,size,modifiedTime,webViewLink,thumbnailLink,parents)',
                    orderBy: 'name',
                    pageSize: 1000
                };
                
                if (nextPageToken) {
                    requestParams.pageToken = nextPageToken;
                }

                const response = await this.driveAuth.gapi.client.drive.files.list(requestParams);
                
                const files = response.result.files || [];
                allResults.push(...files);
                
                nextPageToken = response.result.nextPageToken;
                
            } while (nextPageToken);

            return allResults;

        } catch (error) {
            console.error('❌ Error buscando archivos:', error);
            throw error;
        }
    }

    async fileExists(fileName, folderType) {
        try {
            const folderId = this.getFolderId(folderType);
            if (!folderId) return false;

            const query = `'${folderId}' in parents and name='${fileName}' and trashed=false`;

            const response = await this.driveAuth.gapi.client.drive.files.list({
                q: query,
                fields: 'files(id,name)'
            });

            return response.result.files && response.result.files.length > 0;

        } catch (error) {
            console.error('❌ Error verificando archivo:', error);
            return false;
        }
    }

    getPreviewUrl(fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    formatFileSize(bytes) {
        if (!bytes) return 'N/A';
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
        
        return `${size} ${sizes[i]}`;
    }

    // ← NUEVO: Test de acceso a todas las carpetas
    async testFolderAccess() {
        const results = {};
        
        for (const [folderType, folderId] of Object.entries(this.config.FOLDERS)) {
            try {
                const response = await this.driveAuth.gapi.client.drive.files.get({
                    fileId: folderId,
                    fields: 'id,name'
                });
                
                // Contar archivos en la carpeta
                const countResponse = await this.driveAuth.gapi.client.drive.files.list({
                    q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
                    fields: 'files(id)',
                    pageSize: 1
                });
                
                results[folderType.toLowerCase()] = {
                    accessible: true,
                    folderId: folderId,
                    folderName: response.result.name,
                    estimatedFiles: 'Cargando todos...'
                };
                
            } catch (error) {
                results[folderType.toLowerCase()] = {
                    accessible: false,
                    error: error.message,
                    folderId: folderId
                };
            }
        }
        
        return results;
    }

    // ← NUEVO: Obtener estadísticas de carga
    getLoadingStats() {
        return {
            progress: this.loadingProgress,
            config: {
                batchSize: this.config.BATCH_SIZE,
                loadAll: this.config.LOAD_ALL_FILES,
                maxResults: this.config.MAX_RESULTS
            }
        };
    }

    async listAvailableFolders() {
        try {
            const response = await this.driveAuth.gapi.client.drive.files.list({
                q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
                fields: 'files(id,name,parents)',
                orderBy: 'name',
                pageSize: 50
            });

            response.result.files.forEach(folder => {
                console.log(`  ${folder.name} (${folder.id})`);
            });

            return response.result.files;

        } catch (error) {
            console.error('❌ Error listando carpetas:', error);
            return [];
        }
    }
}

// Exportar
window.DriveFiles = DriveFiles;

console.log('📁 DriveFiles cargado: MODO SIN LÍMITES activado');
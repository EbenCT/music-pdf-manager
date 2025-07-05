/**
 * GOOGLE DRIVE FILES MODULE
 * Maneja operaciones con archivos de Google Drive
 */

class DriveFiles {
    constructor(config, driveAuth) {
        this.config = config;
        this.driveAuth = driveAuth;
    }

    async getFiles(folderType) {
        try {
            if (!this.driveAuth.isSignedIn || !this.driveAuth.accessToken || !this.driveAuth.isTokenValid()) {
                throw new Error('No autenticado o token expirado');
            }

            const folderId = this.getFolderId(folderType);
            if (!folderId) {
                throw new Error(`ID de carpeta no configurado para: ${folderType}`);
            }

            try {
                await this.driveAuth.gapi.client.drive.files.get({
                    fileId: folderId,
                    fields: 'id,name'
                });
            } catch (accessError) {
                throw new Error(`No tienes acceso a la carpeta ${folderType}`);
            }

            const query = `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`;

            const response = await this.driveAuth.gapi.client.drive.files.list({
                q: query,
                fields: 'files(id,name,size,modifiedTime,webViewLink,thumbnailLink,parents)',
                orderBy: this.config.ORDER_BY,
                pageSize: this.config.MAX_RESULTS
            });

            if (!response || !response.result) {
                throw new Error('Respuesta inválida de Google Drive API');
            }

            const files = response.result.files || [];
            return files.map(file => this.processFile(file));

        } catch (error) {
            console.error(`❌ Error obteniendo archivos de ${folderType}:`, error);
            
            if (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401)) {
                this.driveAuth.clearStoredToken();
                this.driveAuth.updateAuthStatus(false);
                throw new Error('Token expirado. Inicia sesión nuevamente.');
            }
            
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
            
            throw new Error(errorMessage);
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

    async downloadFileBlob(fileId) {
        try {
            if (!this.driveAuth.isSignedIn || !this.driveAuth.accessToken) {
                throw new Error('No hay sesión activa');
            }

            const authUrl = this.getDirectDownloadURL(fileId);
            
            try {
                const authResponse = await fetch(authUrl, {
                    headers: {
                        'Authorization': `Bearer ${this.driveAuth.accessToken}`,
                        'X-Goog-Api-Key': this.config.API_KEY
                    }
                });

                if (authResponse.ok) {
                    const blob = await authResponse.blob();
                    return blob;
                }
            } catch (authError) {
                console.log('⚠️ Error con auth:', authError.message);
            }

            const publicUrl = this.getPublicDownloadURL(fileId);
            
            try {
                const publicResponse = await fetch(publicUrl);
                
                if (publicResponse.ok) {
                    const blob = await publicResponse.blob();
                    return blob;
                }
            } catch (publicError) {
                console.log('⚠️ Error descarga pública:', publicError.message);
            }

            try {
                const gapiResponse = await this.driveAuth.gapi.client.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });

                if (gapiResponse.body) {
                    const blob = new Blob([gapiResponse.body], { type: 'application/pdf' });
                    return blob;
                }
            } catch (gapiError) {
                console.log('⚠️ Error con GAPI:', gapiError.message);
            }

            throw new Error('No se pudo descargar el archivo. Verifica que el archivo sea público o que tengas permisos de acceso.');

        } catch (error) {
            console.error('❌ Error descargando archivo:', error);
            
            if (error.message.includes('403')) {
                throw new Error('Sin permisos para acceder al archivo. Verifica que sea público o que tengas acceso.');
            } else if (error.message.includes('404')) {
                throw new Error('Archivo no encontrado. Puede haber sido eliminado o movido.');
            } else if (error.message.includes('401')) {
                throw new Error('Sesión expirada. Inicia sesión nuevamente.');
            }
            
            throw error;
        }
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

    async searchFiles(query, folderType = null) {
        try {
            let searchQuery = `mimeType='application/pdf' and trashed=false and name contains '${query}'`;
            
            if (folderType) {
                const folderId = this.getFolderId(folderType);
                if (folderId) {
                    searchQuery += ` and '${folderId}' in parents`;
                }
            }

            const response = await this.driveAuth.gapi.client.drive.files.list({
                q: searchQuery,
                fields: 'files(id,name,size,modifiedTime,webViewLink,thumbnailLink,parents)',
                orderBy: 'name',
                pageSize: 20
            });

            return response.result.files || [];

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

    async testFolderAccess() {
        const results = {};
        
        for (const [folderType, folderId] of Object.entries(this.config.FOLDERS)) {
            try {
                await this.driveAuth.gapi.client.drive.files.get({
                    fileId: folderId,
                    fields: 'id,name'
                });
                
                results[folderType.toLowerCase()] = {
                    accessible: true,
                    folderId: folderId
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
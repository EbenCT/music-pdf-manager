/**
 * MUSIC PDF MANAGER - APP UTILITIES
 * Utilidades y helpers de la aplicación
 */

class AppUtils {
    
    /**
     * Obtiene estadísticas de carga de archivos
     */
    static getLoadingStats() {
        const totalFiles = AppState.files.instrumentos.length + AppState.files.voces.length;
        const loadedSections = Object.values(AppState.loadingProgress)
            .filter(p => p.status === 'completed').length;
        
        return {
            totalFiles,
            sections: {
                instrumentos: AppState.files.instrumentos.length,
                voces: AppState.files.voces.length
            },
            loadingProgress: AppState.loadingProgress,
            completedSections: loadedSections,
            isFullyLoaded: loadedSections === 2,
            loadedModules: Array.from(AppState.loadedModules)
        };
    }

    /**
     * Fuerza recarga completa de archivos
     */
    static async forceFullReload() {
        if (window.clearAppCache) {
            window.clearAppCache();
        }
        
        AppState.files = { instrumentos: [], voces: [] };
        AppState.filteredFiles = { instrumentos: [], voces: [] };
        AppState.isLoadingFiles = false;
        AppState.loadingProgress = {
            instrumentos: { current: 0, total: 0, status: 'waiting' },
            voces: { current: 0, total: 0, status: 'waiting' }
        };
        
        if (window.app && window.app.loadAllFiles) {
            await window.app.loadAllFiles();
        }
    }

    /**
     * Limpia cache de la aplicación (conservando tokens de auth)
     */
    static clearAppCache() {
        if (DriveUtils && DriveUtils.cache) {
            DriveUtils.cache.clear();
        }
        
        if (window.app && window.app.searchManager && window.app.searchManager.clearSearchHistory) {
            window.app.searchManager.clearSearchHistory();
        }
        
        const keysToKeep = [
            'gdrive_access_token', 
            'gdrive_token_expiry', 
            'gdrive_user_info', 
            'gdrive_refresh_token', 
            'gdrive_last_auth'
        ];
        
        Object.keys(localStorage).forEach(key => {
            if (!keysToKeep.includes(key)) {
                localStorage.removeItem(key);
            }
        });
    }

    /**
     * Verifica el estado de la aplicación
     */
    static checkAppHealth() {
        const health = {
            app: !!window.app,
            authenticated: AppState.isAuthenticated,
            filesLoaded: AppState.files.instrumentos.length + AppState.files.voces.length > 0,
            driveAPI: !!AppState.driveAPI,
            pdfViewer: !!AppState.pdfViewer,
            searchManager: !!(window.app && window.app.searchManager)
        };

        const issues = Object.entries(health)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

        return {
            isHealthy: issues.length === 0,
            health,
            issues
        };
    }

    /**
     * Obtiene información del navegador y capacidades
     */
    static getBrowserInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            platform: navigator.platform,
            vendor: navigator.vendor,
            memoryInfo: performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            } : null,
            capabilities: DriveUtils?.checkBrowserSupport()
        };
    }

    /**
     * Exporta configuración y estado de la aplicación
     */
    static exportAppState() {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            appState: {
                currentModule: AppState.currentModule,
                searchQuery: AppState.searchQuery,
                isAuthenticated: AppState.isAuthenticated,
                filesCount: {
                    instrumentos: AppState.files.instrumentos.length,
                    voces: AppState.files.voces.length
                }
            },
            config: {
                drive: window.DRIVE_CONFIG,
                app: window.APP_CONFIG
            },
            health: this.checkAppHealth(),
            browser: this.getBrowserInfo()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `music-pdf-manager-state-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        return exportData;
    }

    /**
     * Genera reporte de archivos
     */
    static generateFilesReport() {
        const report = {
            timestamp: new Date().toISOString(),
            sections: {
                instrumentos: {
                    count: AppState.files.instrumentos.length,
                    files: AppState.files.instrumentos.map(f => ({
                        name: f.name,
                        size: f.size,
                        modified: f.modifiedTime
                    }))
                },
                voces: {
                    count: AppState.files.voces.length,
                    files: AppState.files.voces.map(f => ({
                        name: f.name,
                        size: f.size,
                        modified: f.modifiedTime
                    }))
                }
            },
            totals: {
                totalFiles: AppState.files.instrumentos.length + AppState.files.voces.length,
                lastUpdate: new Date().toLocaleString('es-ES')
            }
        };

        return report;
    }

    /**
     * Valida integridad de archivos
     */
    static validateFiles() {
        const issues = [];

        ['instrumentos', 'voces'].forEach(section => {
            AppState.files[section].forEach((file, index) => {
                if (!file.id) {
                    issues.push(`${section}[${index}]: Falta ID`);
                }
                if (!file.name || !file.name.endsWith('.pdf')) {
                    issues.push(`${section}[${index}]: Nombre inválido`);
                }
                if (!file.downloadUrl) {
                    issues.push(`${section}[${index}]: Falta URL de descarga`);
                }
            });
        });

        return {
            isValid: issues.length === 0,
            issues,
            totalChecked: AppState.files.instrumentos.length + AppState.files.voces.length
        };
    }

    /**
     * Obtiene archivos duplicados
     */
    static findDuplicateFiles() {
        const allFiles = [
            ...AppState.files.instrumentos.map(f => ({ ...f, section: 'instrumentos' })),
            ...AppState.files.voces.map(f => ({ ...f, section: 'voces' }))
        ];

        const nameMap = {};
        const duplicates = [];

        allFiles.forEach(file => {
            const normalizedName = file.name.toLowerCase().trim();
            if (nameMap[normalizedName]) {
                duplicates.push({
                    name: file.name,
                    files: [nameMap[normalizedName], file]
                });
            } else {
                nameMap[normalizedName] = file;
            }
        });

        return duplicates;
    }

    /**
     * Obtiene archivos más recientes
     */
    static getRecentFiles(limit = 10) {
        const allFiles = [
            ...AppState.files.instrumentos.map(f => ({ ...f, section: 'instrumentos' })),
            ...AppState.files.voces.map(f => ({ ...f, section: 'voces' }))
        ];

        return allFiles
            .filter(f => f.modifiedTime)
            .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime))
            .slice(0, limit);
    }

    /**
     * Obtiene archivos más grandes
     */
    static getLargestFiles(limit = 10) {
        const allFiles = [
            ...AppState.files.instrumentos.map(f => ({ ...f, section: 'instrumentos' })),
            ...AppState.files.voces.map(f => ({ ...f, section: 'voces' }))
        ];

        return allFiles
            .map(f => ({
                ...f,
                sizeBytes: this.parseSizeToBytes(f.size)
            }))
            .sort((a, b) => b.sizeBytes - a.sizeBytes)
            .slice(0, limit);
    }

    /**
     * Convierte tamaño legible a bytes
     */
    static parseSizeToBytes(sizeStr) {
        if (!sizeStr) return 0;
        
        const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)/i);
        if (!match) return 0;
        
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        
        const multipliers = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
        return Math.round(value * (multipliers[unit] || 1));
    }

    /**
     * Busca archivos por patrón
     */
    static searchFilesByPattern(pattern, caseSensitive = false) {
        const allFiles = [
            ...AppState.files.instrumentos.map(f => ({ ...f, section: 'instrumentos' })),
            ...AppState.files.voces.map(f => ({ ...f, section: 'voces' }))
        ];

        const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
        
        return allFiles.filter(file => regex.test(file.name));
    }

    /**
     * Obtiene estadísticas avanzadas
     */
    static getAdvancedStats() {
        const duplicates = this.findDuplicateFiles();
        const validation = this.validateFiles();
        const largest = this.getLargestFiles(5);
        const recent = this.getRecentFiles(5);

        return {
            files: {
                total: AppState.files.instrumentos.length + AppState.files.voces.length,
                instrumentos: AppState.files.instrumentos.length,
                voces: AppState.files.voces.length
            },
            duplicates: {
                count: duplicates.length,
                list: duplicates
            },
            validation,
            largest: largest.slice(0, 5),
            recent: recent.slice(0, 5),
            searchActivity: window.app?.searchManager?.getSearchStats?.() || null
        };
    }

    /**
     * Optimiza rendimiento de la aplicación
     */
    static optimizePerformance() {
        // Limpiar cache innecesario
        this.clearAppCache();
        
        // Forzar garbage collection si está disponible
        if (window.gc) {
            window.gc();
        }
        
        // Verificar memoria
        const memInfo = performance.memory;
        if (memInfo) {
            const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
            const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);
            
            if (usedMB > limitMB * 0.8) {
                console.warn('⚠️ Alto uso de memoria detectado');
                return { warning: 'Alto uso de memoria detectado', usedMB, limitMB };
            }
        }
        
        return { status: 'optimized' };
    }
}

// === FUNCIONES GLOBALES DE UTILIDAD ===
window.AppUtils = AppUtils;

// Funciones de conveniencia para debugging (versiones simplificadas)
if (window.APP_CONFIG?.DEBUG_MODE) {
    window.debugApp = () => {
        const health = AppUtils.checkAppHealth();
        const stats = AppUtils.getLoadingStats();
        console.table({ health: health.isHealthy, ...stats });
        return { health, stats };
    };

    window.showStats = () => {
        const stats = AppUtils.getAdvancedStats();
        console.table(stats.files);
        if (stats.duplicates.count > 0) {
            console.warn('⚠️ Archivos duplicados:', stats.duplicates.count);
        }
        return stats;
    };

    window.exportState = () => AppUtils.exportAppState();
    window.forceReload = () => AppUtils.forceFullReload();
    window.clearCache = () => AppUtils.clearAppCache();
}
/**
 * MUSIC PDF MANAGER - PDF VIEWER MEJORADO
 * Sistema de visualización PDF con manejo robusto de errores y DriveUtils
 */

class PDFViewer {
    constructor(containerId = 'pdf-viewer') {
        this.container = document.getElementById(containerId);
        this.currentPDF = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.0;
        this.rotation = 0;
        this.isLoading = false;
        this.currentFile = null;
        this.currentBlobURL = null;
        
        // Configuración
        this.config = window.APP_CONFIG?.PDF_VIEWER || {
            DEFAULT_SCALE: 1.0,
            MIN_SCALE: 0.5,
            MAX_SCALE: 3.0,
            SCALE_STEP: 0.25
        };

        this.init();
    }

    /**
     * Inicializa el visualizador
     */
    init() {
        this.setupCanvas();
        this.setupControls();
        this.setupKeyboardShortcuts();
        console.log('📄 PDF Viewer inicializado con DriveUtils');
    }

    /**
     * Configura el canvas para renderizado
     */
    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'pdf-canvas';
        this.ctx = this.canvas.getContext('2d');
        
        // Estilos del canvas
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
        this.canvas.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
        this.canvas.style.background = '#ffffff';
    }

    /**
     * Configura los controles del visualizador
     */
    setupControls() {
        this.createNavigationControls();
        this.setupZoomControls();
        this.setupDownloadControl(); // FUNCIÓN AGREGADA
    }

    /**
     * Crea controles de navegación de páginas
     */
    createNavigationControls() {
        this.navControls = document.createElement('div');
        this.navControls.className = 'pdf-navigation';
        this.navControls.innerHTML = `
            <button class="nav-btn" id="prev-page" title="Página anterior">‹</button>
            <input type="number" id="page-input" min="1" value="1" title="Número de página">
            <span id="page-info">de 0</span>
            <button class="nav-btn" id="next-page" title="Página siguiente">›</button>
        `;

        // Event listeners
        const prevBtn = this.navControls.querySelector('#prev-page');
        const nextBtn = this.navControls.querySelector('#next-page');
        const pageInput = this.navControls.querySelector('#page-input');

        prevBtn.addEventListener('click', () => this.previousPage());
        nextBtn.addEventListener('click', () => this.nextPage());
        pageInput.addEventListener('change', (e) => this.goToPage(parseInt(e.target.value)));
        pageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.goToPage(parseInt(e.target.value));
            }
        });
    }

    /**
     * Configura controles de zoom
     */
    setupZoomControls() {
        const zoomInBtn = document.getElementById('zoom-in');
        const zoomOutBtn = document.getElementById('zoom-out');

        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', () => this.zoomIn());
        }
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', () => this.zoomOut());
        }
    }

    /**
     * Configura control de descarga - FUNCIÓN AGREGADA
     */
    setupDownloadControl() {
        const downloadBtn = document.getElementById('download-pdf');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadCurrentPDF());
            console.log('📥 Control de descarga configurado');
        } else {
            console.warn('⚠️ Botón de descarga no encontrado en el DOM');
        }
    }

    /**
     * Configura atajos de teclado
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.currentPDF) return;

            // Solo procesar si el foco está en el visualizador o no hay input activo
            if (document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                case 'PageUp':
                    e.preventDefault();
                    this.previousPage();
                    break;
                case 'ArrowRight':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToPage(1);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToPage(this.totalPages);
                    break;
                case '+':
                case '=':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomIn();
                    }
                    break;
                case '-':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.zoomOut();
                    }
                    break;
                case '0':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.resetZoom();
                    }
                    break;
            }
        });
    }

    /**
     * Carga un PDF desde una URL o archivo - MEJORADO CON DRIVEUTILS
     * @param {string|File} source - URL del PDF o objeto File
     * @param {Object} fileInfo - Información del archivo (opcional)
     */
    async loadPDF(source, fileInfo = null) {
        try {
            this.showLoading();
            
            // Guardar información del archivo
            this.currentFile = fileInfo;
            
            // En modo demo, mostrar placeholder
            if (typeof source === 'string' && source.includes('#demo-pdf-')) {
                this.showDemoPlaceholder(source);
                return;
            }

            console.log('📄 Cargando PDF:', fileInfo?.name || source);

            // Verificar PDF.js
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js no está disponible');
            }

            let pdfSource = source;

            // Si es URL de Google Drive, manejar con autenticación usando DriveUtils
            if (typeof source === 'string' && source.includes('googleapis.com')) {
                try {
                    pdfSource = await this.handleGoogleDriveURL(source);
                } catch (driveError) {
                    console.error('❌ Error específico de Google Drive:', driveError);
                    
                    // Intentar método alternativo si falla el primero
                    if (fileInfo && fileInfo.id) {
                        console.log('🔄 Intentando método alternativo...');
                        try {
                            pdfSource = await this.tryAlternativeDownload(fileInfo.id);
                        } catch (altError) {
                            throw driveError; // Usar error original
                        }
                    } else {
                        throw driveError;
                    }
                }
            }

            // Configurar opciones de carga para PDF.js
            const loadingTask = pdfjsLib.getDocument({
                url: pdfSource,
                verbosity: 0, // Reducir logs de PDF.js
                cMapPacked: true,
                cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/'
            });

            // Cargar documento con retry usando DriveUtils
            this.currentPDF = await DriveUtils.retry(async () => {
                return await loadingTask.promise;
            }, 2, 1000);
            
            this.totalPages = this.currentPDF.numPages;
            this.currentPage = 1;
            
            console.log(`📊 PDF cargado: ${this.totalPages} páginas`);

            // Renderizar primera página
            await this.renderPage(1);
            
            // Actualizar controles
            this.updateControls();
            
            // Mostrar controles de navegación si hay más de una página
            if (this.totalPages > 1) {
                this.showNavigationControls();
            }

        } catch (error) {
            console.error('❌ Error cargando PDF:', error);
            this.showError(DriveUtils.getFriendlyErrorMessage(error));
        }
    }

    /**
     * Maneja URLs de Google Drive con autenticación - MEJORADO CON DRIVEUTILS
     */
    async handleGoogleDriveURL(url) {
        try {
            console.log('🔐 Cargando PDF desde Google Drive...');
            
            // Verificar DriveAPI usando DriveUtils
            const driveAPI = window.AppState?.driveAPI;
            if (!driveAPI || !driveAPI.isSignedIn) {
                throw new Error('No hay sesión activa de Google Drive');
            }

            // Extraer file ID usando DriveUtils
            const fileIdMatch = url.match(/files\/([a-zA-Z0-9-_]+)/);
            if (!fileIdMatch) {
                throw new Error('No se pudo extraer ID del archivo');
            }

            const fileId = fileIdMatch[1];
            console.log('📋 File ID:', fileId);

            // Limpiar blob URL anterior usando DriveUtils
            if (this.currentBlobURL) {
                DriveUtils.revokeBlobURL(this.currentBlobURL);
                this.currentBlobURL = null;
            }

            // Descargar archivo con reintentos usando DriveUtils
            const blob = await DriveUtils.retry(async () => {
                return await driveAPI.downloadFileBlob(fileId);
            }, 3, 1000);
            
            // Verificar que sea un PDF válido
            if (blob.type && !blob.type.includes('pdf')) {
                console.warn('⚠️ Archivo no es PDF:', blob.type);
            }

            // Crear blob URL usando DriveUtils
            this.currentBlobURL = DriveUtils.createBlobURL(blob);
            console.log('✅ Blob URL creada:', blob.size, 'bytes');
            
            return this.currentBlobURL;

        } catch (error) {
            console.error('❌ Error procesando Google Drive URL:', error);
            
            // Limpiar estado usando DriveUtils
            if (this.currentBlobURL) {
                DriveUtils.revokeBlobURL(this.currentBlobURL);
                this.currentBlobURL = null;
            }
            
            // Error específico para usuario usando DriveUtils
            throw new Error(DriveUtils.getFriendlyErrorMessage(error));
        }
    }

    /**
     * Método alternativo de descarga cuando falla el principal - MEJORADO
     */
    async tryAlternativeDownload(fileId) {
        console.log('🔄 Probando descarga alternativa...');
        
        const driveAPI = window.AppState?.driveAPI;
        if (!driveAPI) {
            throw new Error('DriveAPI no disponible');
        }

        // Intentar URL pública primero
        try {
            const publicUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${driveAPI.config.API_KEY}`;
            
            const response = await fetch(publicUrl);
            if (response.ok) {
                const blob = await response.blob();
                
                if (this.currentBlobURL) {
                    DriveUtils.revokeBlobURL(this.currentBlobURL);
                }
                
                this.currentBlobURL = DriveUtils.createBlobURL(blob);
                console.log('✅ Descarga alternativa exitosa');
                return this.currentBlobURL;
            }
        } catch (publicError) {
            console.log('⚠️ Descarga pública falló:', publicError);
        }

        // Si falla, intentar con método GAPI
        try {
            console.log('🔄 Intentando con GAPI...');
            
            const response = await driveAPI.driveAuth.gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            if (response.body) {
                const blob = new Blob([response.body], { type: 'application/pdf' });
                
                if (this.currentBlobURL) {
                    DriveUtils.revokeBlobURL(this.currentBlobURL);
                }
                
                this.currentBlobURL = DriveUtils.createBlobURL(blob);
                console.log('✅ Descarga con GAPI exitosa');
                return this.currentBlobURL;
            }
            
        } catch (gapiError) {
            console.log('⚠️ GAPI falló:', gapiError);
        }

        // Último recurso: mostrar URL de viewer
        const viewerUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        throw new Error(`No se pudo cargar el PDF directamente. Puedes intentar abrirlo en: ${viewerUrl}`);
    }

    /**
     * Renderiza una página específica
     * @param {number} pageNum - Número de página (1-indexed)
     */
    async renderPage(pageNum) {
        try {
            if (!this.currentPDF || pageNum < 1 || pageNum > this.totalPages) {
                return;
            }

            this.isLoading = true;
            this.currentPage = pageNum;

            // Obtener la página
            const page = await this.currentPDF.getPage(pageNum);
            
            // Calcular viewport
            const viewport = page.getViewport({ 
                scale: this.scale,
                rotation: this.rotation 
            });

            // Configurar canvas
            this.canvas.height = viewport.height;
            this.canvas.width = viewport.width;

            // Renderizar página
            const renderContext = {
                canvasContext: this.ctx,
                viewport: viewport
            };

            await page.render(renderContext).promise;
            
            this.isLoading = false;
            this.updateControls();
            
            console.log(`📄 Página ${pageNum} renderizada`);

        } catch (error) {
            console.error('❌ Error renderizando página:', error);
            this.showError(`Error renderizando página ${pageNum}`);
            this.isLoading = false;
        }
    }

    /**
     * Descarga el PDF actual - MEJORADO CON DRIVEUTILS
     */
    async downloadCurrentPDF() {
        try {
            if (!this.currentFile) {
                console.warn('⚠️ No hay archivo actual para descargar');
                return;
            }

            console.log('📥 Iniciando descarga del PDF...');

            const driveAPI = window.AppState?.driveAPI;
            if (!driveAPI || !driveAPI.isSignedIn) {
                throw new Error('No hay sesión activa de Google Drive');
            }

            // Mostrar indicador de descarga
            const downloadBtn = document.getElementById('download-pdf');
            if (!downloadBtn) {
                console.warn('⚠️ Botón de descarga no encontrado');
                return;
            }

            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '⏳';
            downloadBtn.disabled = true;

            try {
                // Descargar archivo con retry usando DriveUtils
                const blob = await DriveUtils.retry(async () => {
                    return await driveAPI.downloadFileBlob(this.currentFile.id);
                }, 3, 1000);
                
                // Crear enlace de descarga usando PDFUtils
                PDFUtils.downloadBlob(blob, this.currentFile.name);
                
                console.log('✅ Descarga iniciada');

            } finally {
                // Restaurar botón
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }

        } catch (error) {
            console.error('❌ Error descargando PDF:', error);
            
            // Mostrar error temporal en el botón
            const downloadBtn = document.getElementById('download-pdf');
            if (downloadBtn) {
                const originalText = downloadBtn.innerHTML;
                downloadBtn.innerHTML = '❌';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalText;
                    downloadBtn.disabled = false;
                }, 2000);
            }
        }
    }

    /**
     * Muestra placeholder para PDFs demo
     */
    showDemoPlaceholder(source) {
        const fileId = source.split('-').pop();
        this.container.innerHTML = `
            <div class="pdf-demo-placeholder">
                <div class="placeholder">
                    <div class="placeholder-icon">📄</div>
                    <h3>Vista Previa Demo</h3>
                    <p>Archivo ID: ${fileId}</p>
                    <div style="background: var(--dark-gray); padding: var(--spacing-lg); border-radius: var(--radius-md); max-width: 500px; margin: var(--spacing-lg) auto;">
                        <h4 style="color: var(--accent-red); margin-bottom: var(--spacing-md);">🔧 Modo Desarrollo</h4>
                        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin-bottom: var(--spacing-md);">
                            Esta es una vista previa simulada. Para ver PDFs reales:
                        </p>
                        <ol style="color: var(--text-muted); font-size: 0.8rem; line-height: 1.4; text-align: left;">
                            <li>Configura Google Drive API en drive-config.js</li>
                            <li>Agrega tus credenciales y IDs de carpetas</li>
                            <li>Asegúrate de que las carpetas sean públicas</li>
                            <li>Recarga la aplicación</li>
                        </ol>
                    </div>
                    <div style="margin-top: var(--spacing-lg);">
                        <button class="btn secondary" onclick="this.parentElement.parentElement.parentElement.innerHTML = '<div class=placeholder><div class=placeholder-icon>📄</div><p>Selecciona otro archivo PDF</p></div>'">
                            ← Volver
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Muestra estado de carga
     */
    showLoading() {
        this.container.innerHTML = `
            <div class="pdf-loading">
                <div class="spinner"></div>
                <p>Cargando PDF desde Google Drive...</p>
            </div>
        `;
    }

    /**
     * Muestra error con DriveUtils
     */
    showError(message) {
        this.container.innerHTML = `
            <div class="pdf-error">
                <div class="pdf-error-icon">⚠️</div>
                <h3>Error</h3>
                <p>${message}</p>
                <div style="margin-top: var(--spacing-lg);">
                    <button class="btn secondary" onclick="window.app && window.app.retryLoadFiles ? window.app.retryLoadFiles() : location.reload()">
                        🔄 Reintentar
                    </button>
                    <button class="btn secondary" onclick="window.debugDriveConnection && window.debugDriveConnection()" style="margin-left: var(--spacing-sm);">
                        🔧 Debug
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Muestra el canvas en el contenedor
     */
    showCanvas() {
        // Limpiar contenedor
        this.container.innerHTML = '';
        
        // Agregar canvas
        this.container.appendChild(this.canvas);
        
        // Agregar controles de navegación si existen
        if (this.navControls && this.totalPages > 1) {
            this.container.appendChild(this.navControls);
        }
    }

    /**
     * Muestra controles de navegación
     */
    showNavigationControls() {
        if (this.navControls && !this.container.contains(this.navControls)) {
            this.container.appendChild(this.navControls);
        }
    }

    /**
     * Actualiza los controles de navegación
     */
    updateControls() {
        // Actualizar zoom level
        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel) {
            zoomLevel.textContent = Math.round(this.scale * 100) + '%';
        }

        // Actualizar controles de navegación
        if (this.navControls) {
            const pageInput = this.navControls.querySelector('#page-input');
            const pageInfo = this.navControls.querySelector('#page-info');
            const prevBtn = this.navControls.querySelector('#prev-page');
            const nextBtn = this.navControls.querySelector('#next-page');

            if (pageInput) {
                pageInput.value = this.currentPage;
                pageInput.max = this.totalPages;
            }
            if (pageInfo) pageInfo.textContent = `de ${this.totalPages}`;
            
            if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
            if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
        }

        // Mostrar canvas si no está visible
        if (!this.container.contains(this.canvas) && this.currentPDF) {
            this.showCanvas();
        }

        // Actualizar estado del botón de descarga
        const downloadBtn = document.getElementById('download-pdf');
        if (downloadBtn) {
            downloadBtn.style.display = this.currentFile ? 'inline-flex' : 'none';
        }
    }

    // === MÉTODOS DE NAVEGACIÓN ===

    /**
     * Va a la página anterior
     */
    async previousPage() {
        if (this.currentPage > 1) {
            await this.renderPage(this.currentPage - 1);
        }
    }

    /**
     * Va a la página siguiente
     */
    async nextPage() {
        if (this.currentPage < this.totalPages) {
            await this.renderPage(this.currentPage + 1);
        }
    }

    /**
     * Va a una página específica
     * @param {number} pageNum - Número de página
     */
    async goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            await this.renderPage(pageNum);
        }
    }

    // === MÉTODOS DE ZOOM ===

    /**
     * Aumenta el zoom
     */
    async zoomIn() {
        const newScale = Math.min(this.scale + this.config.SCALE_STEP, this.config.MAX_SCALE);
        await this.setZoom(newScale);
    }

    /**
     * Disminuye el zoom
     */
    async zoomOut() {
        const newScale = Math.max(this.scale - this.config.SCALE_STEP, this.config.MIN_SCALE);
        await this.setZoom(newScale);
    }

    /**
     * Establece un nivel de zoom específico
     * @param {number} scale - Nivel de zoom
     */
    async setZoom(scale) {
        if (scale >= this.config.MIN_SCALE && scale <= this.config.MAX_SCALE) {
            this.scale = scale;
            if (this.currentPDF) {
                await this.renderPage(this.currentPage);
            }
        }
    }

    /**
     * Resetea el zoom al nivel por defecto
     */
    async resetZoom() {
        await this.setZoom(this.config.DEFAULT_SCALE);
    }

    /**
     * Ajusta el zoom para que la página quepa en el contenedor
     */
    async fitToWidth() {
        if (!this.currentPDF) return;

        const page = await this.currentPDF.getPage(this.currentPage);
        const viewport = page.getViewport({ scale: 1.0 });
        
        const containerWidth = this.container.clientWidth - 40; // Margen
        const scale = containerWidth / viewport.width;
        
        await this.setZoom(Math.min(scale, this.config.MAX_SCALE));
    }

    // === MÉTODOS DE ROTACIÓN ===

    /**
     * Rota la página 90 grados en sentido horario
     */
    async rotateClockwise() {
        this.rotation = (this.rotation + 90) % 360;
        if (this.currentPDF) {
            await this.renderPage(this.currentPage);
        }
    }

    /**
     * Rota la página 90 grados en sentido antihorario
     */
    async rotateCounterClockwise() {
        this.rotation = (this.rotation - 90 + 360) % 360;
        if (this.currentPDF) {
            await this.renderPage(this.currentPage);
        }
    }

    // === MÉTODOS DE INFORMACIÓN ===

    /**
     * Obtiene información del PDF actual
     */
    getPDFInfo() {
        if (!this.currentPDF) return null;

        return {
            numPages: this.totalPages,
            currentPage: this.currentPage,
            scale: this.scale,
            rotation: this.rotation,
            isLoading: this.isLoading,
            file: this.currentFile
        };
    }

    /**
     * Limpia el visualizador usando DriveUtils
     */
    clear() {
        // Limpiar blob URL usando DriveUtils
        if (this.currentBlobURL) {
            DriveUtils.revokeBlobURL(this.currentBlobURL);
            this.currentBlobURL = null;
        }

        this.currentPDF = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = this.config.DEFAULT_SCALE;
        this.rotation = 0;
        this.isLoading = false;
        this.currentFile = null;

        // Mostrar placeholder
        this.container.innerHTML = `
            <div class="placeholder">
                <div class="placeholder-icon">📄</div>
                <p>Selecciona un archivo PDF de la lista para visualizarlo aquí</p>
            </div>
        `;

        this.updateControls();
    }

    /**
     * Destruye el visualizador y limpia eventos
     */
    destroy() {
        // Limpiar blob URL usando DriveUtils
        if (this.currentBlobURL) {
            DriveUtils.revokeBlobURL(this.currentBlobURL);
        }

        // Limpiar PDF
        if (this.currentPDF) {
            this.currentPDF.destroy();
        }

        // Limpiar contenedor
        this.container.innerHTML = '';
        
        console.log('🗑️ PDF Viewer destruido');
    }
}

// === UTILIDADES PARA PDF MEJORADAS ===
const PDFUtils = {
    /**
     * Valida si un archivo es PDF
     */
    isPDF(file) {
        return file.type === 'application/pdf' || 
               file.name.toLowerCase().endsWith('.pdf');
    },

    /**
     * Convierte File a ArrayBuffer para PDF.js
     */
    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Crea función de descarga para un blob usando DriveUtils
     */
    downloadBlob(blob, filename) {
        const url = DriveUtils.createBlobURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar URL después de un delay usando DriveUtils
        setTimeout(() => DriveUtils.revokeBlobURL(url), 1000);
    },

    /**
     * Verifica capacidad de PDF.js
     */
    checkPDFSupport() {
        return typeof pdfjsLib !== 'undefined';
    },

    /**
     * Obtiene metadatos de PDF
     */
    async getPDFMetadata(pdfDocument) {
        try {
            const metadata = await pdfDocument.getMetadata();
            return {
                title: metadata.info.Title || 'Sin título',
                author: metadata.info.Author || 'Sin autor',
                subject: metadata.info.Subject || '',
                creator: metadata.info.Creator || '',
                producer: metadata.info.Producer || '',
                creationDate: metadata.info.CreationDate || null,
                modDate: metadata.info.ModDate || null,
                pages: pdfDocument.numPages
            };
        } catch (error) {
            console.error('❌ Error obteniendo metadatos PDF:', error);
            return null;
        }
    }
};

// === EXPORTAR ===
window.PDFViewer = PDFViewer;
window.PDFUtils = PDFUtils;

console.log('📄 PDF Viewer cargado: VERSIÓN CORREGIDA con setupDownloadControl()');
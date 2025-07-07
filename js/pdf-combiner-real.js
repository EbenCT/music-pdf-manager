/**
 * MUSIC PDF MANAGER - PDF COMBINER REAL
 * Implementación real de combinación de PDFs usando PDF-lib
 */

class RealPDFCombiner {
    constructor() {
        this.isProcessing = false;
        this.loadPDFLib();
    }

    async loadPDFLib() {
        try {
            // Verificar si PDF-lib ya está cargado
            if (typeof PDFLib !== 'undefined') {
                console.log('✅ PDF-lib ya está disponible');
                return;
            }

            // Si no está cargado, intentar cargarlo dinámicamente
            console.log('📦 Cargando PDF-lib dinámicamente...');
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
            script.async = true;
            
            return new Promise((resolve, reject) => {
                script.onload = () => {
                    if (typeof PDFLib !== 'undefined') {
                        console.log('✅ PDF-lib cargado exitosamente');
                        resolve();
                    } else {
                        reject(new Error('PDF-lib no se inicializó correctamente'));
                    }
                };
                script.onerror = () => {
                    console.error('❌ Error cargando PDF-lib desde CDN');
                    reject(new Error('Error cargando PDF-lib. Verifica tu conexión a internet.'));
                };
                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('❌ Error cargando PDF-lib:', error);
            throw error;
        }
    }

    /**
     * Combina múltiples PDFs en uno solo
     * @param {Array} files - Array de archivos con {id, name, downloadUrl, section}
     * @param {Function} progressCallback - Callback para mostrar progreso
     * @returns {Blob} - PDF combinado como Blob
     */
    async combineFiles(files, progressCallback = null) {
        if (this.isProcessing) {
            throw new Error('Ya hay una combinación en proceso');
        }

        this.isProcessing = true;

        try {
            // Verificar que PDF-lib esté disponible
            if (typeof PDFLib === 'undefined') {
                console.log('⚠️ PDF-lib no disponible, intentando cargar...');
                await this.loadPDFLib();
                
                // Verificar nuevamente después de la carga
                if (typeof PDFLib === 'undefined') {
                    throw new Error('PDF-lib no pudo ser cargado. Verifica tu conexión a internet y la configuración CSP.');
                }
            }

            const { PDFDocument } = PDFLib;

            // Crear documento PDF combinado
            const mergedPdf = await PDFDocument.create();

            // Metadatos del PDF combinado
            mergedPdf.setTitle('PDFs Combinados - Music PDF Manager');
            mergedPdf.setSubject('Combinación de partituras musicales');
            mergedPdf.setCreator('Music PDF Manager');
            mergedPdf.setProducer('PDF-lib + Music PDF Manager');
            mergedPdf.setCreationDate(new Date());

            if (progressCallback) {
                progressCallback(0, files.length, 'Iniciando combinación...');
            }

            // Procesar cada archivo
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                try {
                    if (progressCallback) {
                        progressCallback(i, files.length, `Procesando: ${file.name}`);
                    }

                    console.log(`📄 Procesando archivo ${i + 1}/${files.length}: ${file.name}`);

                    // Descargar el PDF
                    const pdfBytes = await this.downloadPDFBytes(file);
                    
                    // Cargar el PDF
                    const pdfDoc = await PDFDocument.load(pdfBytes);
                    
                    // Copiar todas las páginas
                    const pageIndices = pdfDoc.getPageIndices();
                    const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices);
                    
                    // Agregar páginas al documento combinado
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                    
                    console.log(`✅ Archivo procesado: ${file.name} (${copiedPages.length} páginas)`);

                } catch (fileError) {
                    console.error(`❌ Error procesando ${file.name}:`, fileError);
                    
                    // Agregar página de error en lugar de fallar completamente
                    await this.addErrorPage(mergedPdf, file.name, fileError.message);
                }
            }

            if (progressCallback) {
                progressCallback(files.length, files.length, 'Generando PDF final...');
            }

            // Generar el PDF final
            console.log('🔄 Generando PDF combinado...');
            const mergedPdfBytes = await mergedPdf.save();

            // Crear Blob para descarga
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

            console.log(`✅ PDF combinado generado: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

            if (progressCallback) {
                progressCallback(files.length, files.length, '¡Combinación completada!');
            }

            return blob;

        } catch (error) {
            console.error('❌ Error en combinación de PDFs:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Descarga un PDF y lo convierte a bytes
     */
    async downloadPDFBytes(file) {
        try {
            // Obtener acceso al DriveAPI
            const driveAPI = window.AppState?.driveAPI;
            
            if (!driveAPI || !driveAPI.isSignedIn) {
                throw new Error('No hay sesión activa de Google Drive');
            }

            // Usar el método existente de descarga
            const blob = await driveAPI.downloadFileBlob(file.id);
            
            // Convertir blob a ArrayBuffer
            return await blob.arrayBuffer();

        } catch (error) {
            console.error(`❌ Error descargando ${file.name}:`, error);
            throw new Error(`No se pudo descargar ${file.name}: ${error.message}`);
        }
    }

    /**
     * Agrega una página de error al PDF combinado
     */
    async addErrorPage(pdfDoc, fileName, errorMessage) {
        try {
            const { rgb, StandardFonts } = PDFLib;
            
            // Agregar página en blanco
            const errorPage = pdfDoc.addPage([612, 792]); // Tamaño carta
            
            // Fuente
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            
            // Título de error
            errorPage.drawText('⚠️ ERROR AL PROCESAR ARCHIVO', {
                x: 50,
                y: 700,
                size: 20,
                font: boldFont,
                color: rgb(0.8, 0.2, 0.2)
            });
            
            // Nombre del archivo
            errorPage.drawText(`Archivo: ${fileName}`, {
                x: 50,
                y: 650,
                size: 14,
                font: boldFont,
                color: rgb(0, 0, 0)
            });
            
            // Mensaje de error (truncar si es muy largo)
            const truncatedError = errorMessage.length > 80 ? 
                errorMessage.substring(0, 80) + '...' : 
                errorMessage;
                
            errorPage.drawText(`Error: ${truncatedError}`, {
                x: 50,
                y: 620,
                size: 12,
                font: font,
                color: rgb(0.3, 0.3, 0.3)
            });
            
            // Información adicional
            errorPage.drawText('Este archivo no pudo ser incluido en la combinación.', {
                x: 50,
                y: 580,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5)
            });
            
            errorPage.drawText('Verifica que el archivo sea un PDF válido y accessible.', {
                x: 50,
                y: 565,
                size: 10,
                font: font,
                color: rgb(0.5, 0.5, 0.5)
            });

        } catch (pageError) {
            console.error('❌ Error creando página de error:', pageError);
        }
    }

    /**
     * Descarga el PDF combinado
     */
    downloadCombinedPDF(blob, filename = null) {
        try {
            // Generar nombre del archivo
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const defaultName = `PDFs_Combinados_${timestamp}.pdf`;
            const finalName = filename || defaultName;

            // Crear enlace de descarga
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = finalName;
            
            // Simular click para descargar
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Limpiar URL temporal
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            console.log(`💾 PDF descargado: ${finalName}`);
            
        } catch (error) {
            console.error('❌ Error descargando PDF:', error);
            throw error;
        }
    }

    /**
     * Verifica si el navegador es compatible
     */
    isCompatible() {
        return !!(window.fetch && window.Blob && window.URL && window.URL.createObjectURL);
    }

    /**
     * Obtiene información de memoria aproximada
     */
    getMemoryInfo() {
        if (performance.memory) {
            const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
            return {
                used: Math.round(usedJSHeapSize / 1024 / 1024),
                total: Math.round(totalJSHeapSize / 1024 / 1024),
                limit: Math.round(jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }

    /**
     * Estima el tamaño del PDF resultante
     */
    estimateCombinedSize(files) {
        // Estimación aproximada: suma de archivos + 10% overhead
        const totalSizeEstimate = files.reduce((total, file) => {
            // Convertir tamaño legible a bytes (aproximado)
            const sizeStr = file.size || '0 KB';
            const sizeMatch = sizeStr.match(/(\d+(?:\.\d+)?)\s*(KB|MB|GB)/i);
            
            if (sizeMatch) {
                const value = parseFloat(sizeMatch[1]);
                const unit = sizeMatch[2].toUpperCase();
                
                let bytes = value;
                if (unit === 'KB') bytes *= 1024;
                else if (unit === 'MB') bytes *= 1024 * 1024;
                else if (unit === 'GB') bytes *= 1024 * 1024 * 1024;
                
                return total + bytes;
            }
            
            return total + 500000; // Tamaño por defecto si no se puede parsear
        }, 0);

        // Agregar 10% de overhead
        return Math.round(totalSizeEstimate * 1.1);
    }

    /**
     * Verifica si hay suficiente memoria para la combinación
     */
    checkMemoryAvailability(estimatedSize) {
        const memInfo = this.getMemoryInfo();
        
        if (!memInfo) {
            // No se puede verificar memoria, asumir que está bien
            return { canProceed: true, warning: null };
        }

        const availableMB = memInfo.limit - memInfo.used;
        const requiredMB = Math.round(estimatedSize / 1024 / 1024);
        const safetyFactor = 3; // Factor de seguridad

        if (requiredMB * safetyFactor > availableMB) {
            return {
                canProceed: false,
                warning: `Memoria insuficiente. Requerido: ~${requiredMB}MB, Disponible: ~${availableMB}MB`
            };
        }

        if (requiredMB * 2 > availableMB) {
            return {
                canProceed: true,
                warning: `Advertencia: Combinación grande (~${requiredMB}MB). El proceso puede ser lento.`
            };
        }

        return { canProceed: true, warning: null };
    }
}

// Crear instancia global
window.RealPDFCombiner = new RealPDFCombiner();

console.log('🔗 Real PDF Combiner cargado - Combinación real de PDFs habilitada');
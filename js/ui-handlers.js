/**
 * MUSIC PDF MANAGER - UI HANDLERS
 * Manejadores de eventos de interfaz y utilidades de UI
 */

class UIHandlers {
    
    /**
     * Configura todos los event listeners de la UI
     */
    static setupGlobalEventListeners() {
        // Keyboard shortcuts globales
        document.addEventListener('keydown', this.handleGlobalKeyboard);
        
        // Manejo de errores de conexión
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
        
        // Manejo de cambio de tamaño de ventana
        window.addEventListener('resize', DriveUtils.debounce(this.handleWindowResize, 250));
        
        // Prevenir zoom accidental
        document.addEventListener('wheel', this.handleWheelZoom, { passive: false });
    }

    /**
     * Maneja atajos de teclado globales
     */
    static handleGlobalKeyboard(e) {
        // Solo procesar si no estamos en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case 'F5':
                if (e.ctrlKey) {
                    e.preventDefault();
                    if (window.app && window.app.retryLoadFiles) {
                        window.app.retryLoadFiles();
                    }
                }
                break;
                
            case '1':
            case '2':
            case '3':
                if (e.altKey) {
                    e.preventDefault();
                    const modules = ['visualizer', 'combiner', 'musical'];
                    const moduleIndex = parseInt(e.key) - 1;
                    if (modules[moduleIndex] && window.app) {
                        window.app.switchModule(modules[moduleIndex]);
                    }
                }
                break;
                
            case 'Escape':
                this.handleEscapeKey();
                break;
        }
    }

    /**
     * Maneja la tecla Escape
     */
    static handleEscapeKey() {
        // Cerrar modales abiertos
        document.querySelectorAll('.loading-overlay.show').forEach(modal => {
            if (modal.id !== 'loading-overlay') { // No cerrar el overlay principal
                modal.classList.remove('show');
            }
        });
        
        // Limpiar búsqueda si está activa
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput === document.activeElement) {
            searchInput.blur();
        }
        
        // Salir de pantalla completa
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }

    /**
     * Maneja conexión restaurada
     */
    static handleOnline() {
        // Mostrar notificación de conexión restaurada
        UIHandlers.showNotification('🌐 Conexión restaurada', 'success');
        
        // Intentar reconectar si es necesario
        if (window.app && !AppState.isAuthenticated) {
            setTimeout(() => {
                window.app.retryConnection();
            }, 1000);
        }
    }

    /**
     * Maneja pérdida de conexión
     */
    static handleOffline() {
        UIHandlers.showNotification('📴 Sin conexión a internet', 'warning', 5000);
    }

    /**
     * Maneja cambio de tamaño de ventana
     */
    static handleWindowResize() {
        // Ajustar PDF viewer si está activo
        if (AppState.pdfViewer && AppState.currentPDF) {
            // Pequeño delay para que termine el resize
            setTimeout(() => {
                if (AppState.pdfViewer.fitToWidth) {
                    AppState.pdfViewer.fitToWidth();
                }
            }, 100);
        }
    }

    /**
     * Previene zoom accidental con Ctrl+Wheel
     */
    static handleWheelZoom(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
        }
    }

    /**
     * Muestra notificación temporal
     */
    static showNotification(message, type = 'info', duration = 3000) {
        // Remover notificaciones anteriores
        document.querySelectorAll('.app-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `app-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;
        
        // Estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: var(--spacing-md);
            background: var(--dark-gray);
            border: 2px solid var(--border-gray);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            z-index: 10000;
            min-width: 300px;
            box-shadow: var(--shadow-lg);
            transform: translateX(100%);
            transition: transform var(--transition-normal);
        `;
        
        // Colores por tipo
        switch (type) {
            case 'success':
                notification.style.borderColor = '#28a745';
                notification.style.background = 'linear-gradient(135deg, var(--dark-gray), #1a4d2e)';
                break;
            case 'warning':
                notification.style.borderColor = '#ffc107';
                notification.style.background = 'linear-gradient(135deg, var(--dark-gray), #4d3a1a)';
                break;
            case 'error':
                notification.style.borderColor = 'var(--accent-red)';
                notification.style.background = 'linear-gradient(135deg, var(--dark-gray), #4d1a1a)';
                break;
        }
        
        document.body.appendChild(notification);
        
        // Animación de entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Event listener para cerrar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        // Auto-remover
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }
    }

    /**
     * Remueve una notificación con animación
     */
    static removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Muestra modal de confirmación
     */
    static showConfirmDialog(message, title = 'Confirmar', onConfirm = null, onCancel = null) {
        const modal = document.createElement('div');
        modal.className = 'loading-overlay show';
        modal.innerHTML = `
            <div class="loading-spinner" style="background: var(--secondary-black); padding: var(--spacing-xl); border-radius: var(--radius-lg); max-width: 400px;">
                <h3 style="margin-bottom: var(--spacing-lg); color: var(--text-primary);">${title}</h3>
                <p style="margin-bottom: var(--spacing-xl); color: var(--text-secondary); line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: var(--spacing-md); justify-content: center;">
                    <button class="btn secondary confirm-cancel">Cancelar</button>
                    <button class="btn confirm-ok">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        modal.querySelector('.confirm-cancel').addEventListener('click', () => {
            modal.remove();
            if (onCancel) onCancel();
        });
        
        modal.querySelector('.confirm-ok').addEventListener('click', () => {
            modal.remove();
            if (onConfirm) onConfirm();
        });
        
        // Cerrar con Escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    /**
     * Actualiza indicador de estado de conexión
     */
    static updateConnectionIndicator(status, details = '') {
        const indicator = document.getElementById('auth-status');
        const icon = document.getElementById('auth-icon');
        const text = document.getElementById('auth-text');
        
        if (!indicator || !icon || !text) return;
        
        switch (status) {
            case 'connecting':
                indicator.className = 'auth-status connecting';
                icon.textContent = '🔄';
                text.textContent = 'Conectando...';
                break;
                
            case 'connected':
                indicator.className = 'auth-status authenticated';
                icon.textContent = '✅';
                text.textContent = details || 'Conectado';
                break;
                
            case 'error':
                indicator.className = 'auth-status not-authenticated';
                icon.textContent = '❌';
                text.textContent = details || 'Error';
                break;
                
            case 'offline':
                indicator.className = 'auth-status offline';
                icon.textContent = '📴';
                text.textContent = 'Sin conexión';
                break;
        }
    }

    /**
     * Animación suave de scroll a elemento
     */
    static scrollToElement(element, offset = 0) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) return;
        
        const targetPosition = element.offsetTop - offset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 500;
        let start = null;
        
        function animation(currentTime) {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const run = ease(timeElapsed, startPosition, distance, duration);
            window.scrollTo(0, run);
            if (timeElapsed < duration) requestAnimationFrame(animation);
        }
        
        function ease(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t + b;
            t--;
            return -c / 2 * (t * (t - 2) - 1) + b;
        }
        
        requestAnimationFrame(animation);
    }

    /**
     * Resalta elemento temporalmente
     */
    static highlightElement(element, duration = 2000) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (!element) return;
        
        const originalTransition = element.style.transition;
        const originalBoxShadow = element.style.boxShadow;
        
        element.style.transition = 'box-shadow 0.3s ease';
        element.style.boxShadow = '0 0 0 3px var(--accent-red), var(--shadow-lg)';
        
        setTimeout(() => {
            element.style.transition = originalTransition;
            element.style.boxShadow = originalBoxShadow;
        }, duration);
    }

    /**
     * Copia texto al portapapeles
     */
    static async copyToClipboard(text, showNotification = true) {
        try {
            await navigator.clipboard.writeText(text);
            if (showNotification) {
                this.showNotification('✅ Copiado al portapapeles', 'success', 2000);
            }
            return true;
        } catch (error) {
            // Fallback para navegadores sin soporte
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                if (showNotification) {
                    this.showNotification('✅ Copiado al portapapeles', 'success', 2000);
                }
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                if (showNotification) {
                    this.showNotification('❌ Error al copiar', 'error', 2000);
                }
                return false;
            }
        }
    }

    /**
     * Detecta si es dispositivo móvil
     */
    static isMobile() {
        return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Detecta si es dispositivo táctil
     */
    static isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
    }

    /**
     * Actualiza el título de la página
     */
    static updatePageTitle(title = null) {
        const baseTitle = 'Music PDF Manager';
        if (title) {
            document.title = `${title} - ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }

    /**
     * Muestra/oculta loader con mensaje personalizable
     */
    static toggleLoader(show, message = 'Cargando...') {
        const overlay = document.getElementById('loading-overlay');
        if (!overlay) return;
        
        if (show) {
            const messageElement = overlay.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    /**
     * Actualiza favicon dinámicamente
     */
    static updateFavicon(emoji = '🎵') {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        ctx.font = '28px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 16, 16);
        
        const existingFavicon = document.querySelector('link[rel="icon"]');
        if (existingFavicon) {
            existingFavicon.href = canvas.toDataURL();
        } else {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = canvas.toDataURL();
            document.head.appendChild(link);
        }
    }
}

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
    UIHandlers.setupGlobalEventListeners();
    UIHandlers.updateFavicon('🎵');
});

// === EXPORTAR ===
window.UIHandlers = UIHandlers;
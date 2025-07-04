# 🎵 Music PDF Manager - Guía de Usuario

## 📋 Índice
1. [Instalación y Configuración](#instalación-y-configuración)
2. [Módulo 1: Visualizador](#módulo-1-visualizador)
3. [Configuración de Google Drive](#configuración-de-google-drive)
4. [Uso del Sistema](#uso-del-sistema)
5. [Solución de Problemas](#solución-de-problemas)
6. [Próximos Módulos](#próximos-módulos)

---

## 🚀 Instalación y Configuración

### **Paso 1: Crear la Estructura del Proyecto**

1. **En Windows:** Ejecuta `setup-project.bat`
2. **En Linux/Mac:** Ejecuta `bash setup-project.sh`

```bash
# Ejemplo en Linux/Mac
chmod +x setup-project.sh
./setup-project.sh mi-proyecto-musical
```

### **Paso 2: Abrir en un Servidor Web**

⚠️ **IMPORTANTE:** El proyecto debe ejecutarse en un servidor web local, NO directamente desde el sistema de archivos.

**Opciones recomendadas:**

**Live Server (VS Code)**
```bash
# Si usas VS Code
1. Instala la extensión "Live Server"
2. Clic derecho en index.html → "Open with Live Server"
```

**Python (si tienes Python instalado)**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Luego ve a: http://localhost:8000
```

**Node.js (si tienes Node.js)**
```bash
npx serve .
# o
npm install -g http-server
http-server
```

---

## 📄 Módulo 1: Visualizador

### **Características Implementadas ✅**

#### **🎸 Sección Instrumentos**
- Lista de archivos PDF de canciones con acordes
- Búsqueda en tiempo real
- Visualización ordenada alfabéticamente
- Contador de archivos

#### **🎤 Sección Voces**
- Lista de archivos PDF de partituras vocales
- Búsqueda independiente y cruzada
- Navegación intuitiva
- Metadatos de archivos

#### **🔍 Sistema de Búsqueda Avanzado**
- **Búsqueda instantánea:** Resultados mientras escribes
- **Múltiples tipos de coincidencia:**
  - Coincidencia exacta (💯)
  - Comienza con (▶️)
  - Contiene (🔍)
  - Coincidencia aproximada (≈)
- **Navegación con teclado:** ↑↓ para navegar, Enter para seleccionar
- **Puntuación de relevancia:** Sistema de estrellas ⭐⭐⭐
- **Atajos:** Ctrl+F para enfocar búsqueda, Escape para limpiar

#### **📱 Visualizador de PDF**
- **Controles de zoom:** +/- o botones en la interfaz
- **Navegación de páginas:** Para PDFs multipágina
- **Modo pantalla completa:** Botón ⛶
- **Responsive:** Funciona en móviles y tablets
- **Atajos de teclado:**
  - `Ctrl +` / `Ctrl -`: Zoom in/out
  - `←` / `→`: Páginas anterior/siguiente
  - `Home` / `End`: Primera/última página
  - `Espacio`: Página siguiente

### **🎨 Diseño Dark Mode**
- **Colores principales:** Negro, gris y rojo elegante
- **Detalles blancos:** Para contraste y legibilidad
- **Efectos hover:** Animaciones suaves
- **Iconos expresivos:** Emojis temáticos musicales

---

## ☁️ Configuración de Google Drive

### **Modo Desarrollo (Actual)**

Actualmente funciona con **datos simulados** para desarrollo. Verás:
- 8 archivos de ejemplo en "Instrumentos"
- 6 archivos de ejemplo en "Voces"
- Placeholder al visualizar PDFs

### **Configuración para Producción**

#### **Paso 1: Google Cloud Console**

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto nuevo o selecciona uno existente
3. Habilita **Google Drive API**:
   ```
   APIs & Services → Library → buscar "Google Drive API" → Enable
   ```

#### **Paso 2: Crear Credenciales**

1. **API Key:**
   ```
   APIs & Services → Credentials → Create Credentials → API Key
   ```

2. **OAuth 2.0 Client ID:**
   ```
   APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
   Tipo: Web Application
   Authorized domains: tu-dominio.com
   ```

#### **Paso 3: Configurar en el Código**

Edita `config/drive-config.js`:

```javascript
const DRIVE_CONFIG = {
    API_KEY: 'TU_API_KEY_REAL',
    CLIENT_ID: 'TU_CLIENT_ID_REAL',
    FOLDERS: {
        INSTRUMENTOS: 'ID_CARPETA_INSTRUMENTOS',
        VOCES: 'ID_CARPETA_VOCES'
    }
};
```

#### **Paso 4: Estructura de Carpetas en Drive**

```
📁 Music PDF Manager (Carpeta principal compartida)
├── 📁 Instrumentos
│   ├── 📄 Acércate Más - Nat King Cole.pdf
│   ├── 📄 All of Me - John Legend.pdf
│   └── ... más archivos PDF
└── 📁 Voces
    ├── 📄 Amazing Grace - Himno Tradicional.pdf
    ├── 📄 Ave María - Franz Schubert.pdf
    └── ... más archivos PDF
```

#### **Paso 5: Permisos**

**Opción A - Carpetas Públicas:**
- Clic derecho en cada carpeta → Compartir
- "Cualquier persona con el enlace" → "Visualizador"

**Opción B - Autenticación OAuth:**
- Los usuarios se autenticarán con Google
- Acceso solo a usuarios autorizados

---

## 🎯 Uso del Sistema

### **Navegación Principal**

#### **📄 Visualizador (Módulo Actual)**
- **Panel izquierdo:** Listas de archivos organizadas por sección
- **Panel derecho:** Visualizador de PDF con controles
- **Barra superior:** Búsqueda global y navegación

#### **🔗 Combinador (Próximamente)**
- Combinar múltiples PDFs
- Modo manual y automático
- Vista previa antes de generar

#### **🎼 Musical (Próximamente)**
- Reconocimiento de acordes
- Transposición automática
- Editor de notas musicales

### **Búsqueda Efectiva**

#### **Tipos de Búsqueda:**
```
"All of Me"          → Coincidencia exacta
"All"                → Comienza con
"Legend"             → Contiene
"Jhon Legnd"         → Búsqueda fuzzy (tolerante a errores)
```

#### **Consejos:**
- **Mínimo 2 caracteres** para iniciar búsqueda
- **Busca por:** título, artista, palabras clave
- **Navega con teclado:** más rápido que el mouse
- **Usa Ctrl+F:** atajo global para búsqueda

### **Visualización de PDFs**

#### **Controles Disponibles:**
- **🔍- / 🔍+:** Zoom out/in
- **⛶:** Pantalla completa
- **◀ / ▶:** Navegación de páginas (si aplica)

#### **Atajos de Teclado:**
- **Ctrl + Plus/Minus:** Zoom
- **Flechas/PageUp/PageDown:** Navegación
- **Ctrl + 0:** Zoom original
- **F11:** Pantalla completa del navegador

---

## 🔧 Solución de Problemas

### **Problema: "Aplicación no carga"**

**Síntomas:** Página en blanco o errores en consola

**Soluciones:**
1. **Verificar servidor web:** NO abrir directamente desde archivos
2. **Revisar consola:** F12 → Console para ver errores
3. **Verificar archivos:** Asegurar que todos los .js estén presentes

```bash
# Verificar estructura
ls -la js/
# Debe mostrar: main.js, drive-api.js, pdf-viewer.js, search.js
```

### **Problema: "PDFs no cargan"**

**En modo desarrollo (esperado):**
- Verás placeholder con mensaje de configuración
- Normal durante desarrollo

**En producción:**
1. **Verificar API Key:** En drive-config.js
2. **Verificar permisos:** Carpetas compartidas correctamente
3. **Revisar IDs:** Carpetas deben tener IDs válidos
4. **CORS:** Servidor debe permitir APIs de Google

### **Problema: "Búsqueda no funciona"**

1. **Verificar archivos:** search.js debe estar cargado
2. **Revisar consola:** F12 para ver errores JavaScript
3. **Limpiar caché:** Ctrl+F5 para recargar completamente

### **Problema: "Responsive no funciona en móvil"**

1. **Verificar viewport:** Meta tag debe estar presente
2. **Probar en diferentes dispositivos**
3. **Revisar CSS:** responsive.css debe estar cargado

---

## 🚀 Próximos Módulos

### **Módulo 2: Combinador de PDFs** (En desarrollo)

#### **Características planeadas:**
- **Modo Manual:**
  - Selección múltiple con checkboxes
  - Drag & drop para reordenar
  - Vista previa antes de combinar

- **Modo Automático:**
  - Lista de nombres en texto
  - Búsqueda inteligente de coincidencias
  - Algoritmo de probabilidades

### **Módulo 3: Musical Instructivo** (Complejo)

#### **Características planeadas:**
- **Reconocimiento de acordes:**
  - Detección automática de patrones musicales
  - Resaltado de acordes vs letras
  - Soporte para notación americana

- **Transposición:**
  - Cambio de tonalidad (+1, +1/2, -1, -1/2)
  - Preservación de formato original
  - Círculo de quintas automático

### **Mejoras Generales Planeadas:**
- **Offline mode:** Cache local de archivos
- **Favoritos:** Sistema de marcadores
- **Historial:** Archivos recientes
- **Temas:** Más opciones de color
- **Exportación:** Descargar PDFs combinados
- **Sincronización:** Multi-dispositivo

---

## 🛠️ Desarrollo y Personalización

### **Estructura del Código:**

```
music-pdf-manager/
├── index.html              # Estructura principal
├── css/
│   ├── main.css            # Estilos principales (dark theme)
│   ├── modules.css         # Estilos de módulos específicos
│   └── responsive.css      # Adaptativo móvil/tablet
├── js/
│   ├── main.js             # Lógica principal de la app
│   ├── drive-api.js        # Integración Google Drive
│   ├── pdf-viewer.js       # Visualizador PDF con PDF.js
│   └── search.js           # Sistema de búsqueda avanzado
└── config/
    └── drive-config.js     # Configuración y datos mock
```

### **Personalización de Colores:**

Edita variables CSS en `css/main.css`:

```css
:root {
    --primary-black: #0a0a0a;      /* Fondo principal */
    --accent-red: #dc3545;         /* Color de acento */
    --text-primary: #ffffff;       /* Texto principal */
    /* ... más variables ... */
}
```

### **Agregar Más Archivos Mock:**

Edita `MOCK_DATA` en `config/drive-config.js`:

```javascript
const MOCK_DATA = {
    instrumentos: [
        {
            id: 'nuevo_001',
            name: 'Nueva Canción.pdf',
            size: '200 KB',
            modifiedTime: '2024-01-20T10:00:00Z',
            downloadUrl: 'https://example.com/archivo.pdf'
        }
        // ... más archivos
    ]
};
```

---

## 📞 Soporte

### **Logs y Debugging:**
- **Consola del navegador:** F12 → Console
- **Logs detallados:** La app registra todo su funcionamiento
- **Estado global:** `window.AppState` para debugging

### **Archivos de Configuración:**
- **drive-config.js:** Configuración principal
- **main.css:** Variables de tema
- **Todos los .js:** Configuraciones específicas

### **Contacto para Desarrollo:**
Si necesitas modificaciones o nuevas características, toda la aplicación está diseñada de forma modular y extensible.

---

## ✅ Checklist de Implementación

### **Módulo 1 - Visualizador:** ✅ COMPLETADO

- [x] Estructura HTML responsive
- [x] Tema dark mode elegante
- [x] Integración Google Drive API (con fallback mock)
- [x] Sistema de búsqueda avanzado
- [x] Visualizador PDF con PDF.js
- [x] Navegación por teclado
- [x] Controles de zoom y pantalla completa
- [x] Adaptativo móvil/tablet
- [x] Datos de ejemplo para desarrollo
- [x] Documentación completa

### **Próximo: Módulo 2 - Combinador:** 🔄 EN PLANIFICACIÓN

---

**¡Tu Music PDF Manager está listo para usar! 🎵**

*Última actualización: Julio 2025*
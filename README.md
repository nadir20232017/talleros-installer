# TallerOS v2.0 - Instalador Standalone para Windows

Repositorio para construir el paquete standalone de TallerOS para Windows.

## 📦 Nuevo: Instalador Standalone (Sin NSIS)

Hemos cambiado a un enfoque más sencillo y confiable:

- **Antes:** Instalador `.exe` complejo con NSIS (tenía problemas de compatibilidad)
- **Ahora:** Paquete ZIP con script Batch automático (más sencillo y funcional)

## 🚀 Cómo usar el instalador

1. Ve a la pestaña **Actions** en GitHub
2. Selecciona el workflow "Build TallerOS Standalone"
3. Haz clic en "Run workflow" (botón verde)
4. Espera 2-3 minutos
5. Descarga el ZIP desde **Artifacts**

## 📥 Para el usuario final

El paquete `TallerOS-v2.0-Standalone.zip` incluye:

1. **Descomprime el ZIP** en cualquier carpeta
2. **Ejecuta** `Instalar-TallerOS.bat` como administrador
3. El script automáticamente:
   - Descarga e instala **Node.js** (si no está instalado)
   - Descarga e instala **PostgreSQL** (si no está instalado)
   - Instala **TallerOS** completo
   - Crea accesos directos

**Datos de acceso:**
- Usuario: `admin@igsm.com`
- Contraseña: `admin123`

## 🛠️ Estructura del repositorio

```
talleros-installer/
├── talleros-standalone/            # Contenido del paquete ZIP
│   ├── Instalar-TallerOS.bat     # Script de instalación
│   ├── Iniciar-TallerOS.bat      # Script para iniciar
│   ├── README.txt                # Instrucciones
│   ├── backend/                  # Código del backend
│   ├── frontend/                 # Código del frontend
│   ├── package.json
│   └── ...
├── .github/workflows/build.yml   # GitHub Actions
└── README.md
```

## 📋 Requisitos del sistema

- Windows 10/11 (64 bits)
- 2 GB de espacio libre
- Conexión a internet (para descargar Node.js y PostgreSQL la primera vez)

## 🔧 Compilación local

Si prefieres crear el paquete en tu PC:

```bash
cd talleros-standalone
zip -r ../TallerOS-v2.0-Standalone.zip .
```

## 📞 Soporte

- Email: soporte@igsm.es
- Web: https://igsm.es/talleros

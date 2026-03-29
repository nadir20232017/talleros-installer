# TallerOS v2.0 - Instalador Windows

Repositorio para construir el instalador automático de TallerOS para Windows usando GitHub Actions.

## 🚀 Cómo usar el instalador

1. Ve a la pestaña **Actions** en GitHub
2. Selecciona el workflow "Build TallerOS Installer"
3. Haz clic en "Run workflow" (botón verde)
4. Espera 5-10 minutos
5. Descarga el instalador desde **Artifacts**

## 📥 Para el usuario final

El instalador `TallerOS-Setup.exe` instala automáticamente:
- ✅ Node.js 25.8.2
- ✅ PostgreSQL 18.0 RC1
- ✅ TallerOS completo
- ✅ Configuración automática de base de datos

**Datos de acceso:**
- Usuario: `admin@igsm.com`
- Contraseña: `admin123`

## 🛠️ Estructura del repositorio

```
talleros-installer/
├── installers/                    # Descargados automáticamente en CI
│   ├── node-v25.8.2-x64.msi
│   └── postgresql-18.0-rc1-windows-x64.exe
├── files-win-licencia-pro/        # Código de TallerOS (subido al repo)
│   ├── src/
│   ├── backend/
│   ├── frontend/
│   └── ...
├── installer.nsi                   # Script de instalación NSIS
├── .github/workflows/build.yml   # Configuración de GitHub Actions
└── README.md
```

## 📋 Requisitos del sistema

- Windows 10/11 (64 bits)
- 2 GB de espacio libre
- Permisos de administrador

## 🔧 Compilación local (alternativa)

Si prefieres compilar en tu PC Windows:

1. Instala NSIS desde https://nsis.sourceforge.io/
2. Descarga Node.js y PostgreSQL a la carpeta `installers/`
3. Ejecuta: `makensis.exe installer.nsi`
4. El resultado será: `TallerOS-Setup.exe`

## 📞 Soporte

- Email: soporte@igsm.es
- Web: https://igsm.es/talleros

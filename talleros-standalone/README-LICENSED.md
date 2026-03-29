# TallerOS Licensed v2.0

Versión de TallerOS con sistema de licencias integrado.

## Diferencias con la versión libre

| Característica | Versión Libre | Versión Licensed |
|---------------|---------------|------------------|
| Precio | Gratuita | Pago por licencia |
| Trial | 14 días | - |
| Modo libre después del trial | Sí (limitado) | No requiere |
| Gestión de licencias | No | Sí |
| Soporte técnico | Básico | Prioritario |

## Flujo de inicio

1. Al abrir la app, verifica si hay una licencia activa
2. Si hay licencia válida → Inicia normalmente
3. Si hay trial activo → Inicia normalmente
4. Si no hay licencia ni trial → Muestra pantalla de activación
5. El usuario puede:
   - Activar una licencia con código
   - Continuar con versión libre (inicia trial de 14 días)

## Tipos de licencia

- **Base**: 3 equipos - Licencia vitalicia
- **Pro**: 5 equipos - Licencia vitalicia
- **Premium**: Equipos ilimitados - Licencia vitalicia

## Estructura de archivos

```
TallerOS-Licensed/
├── src/
│   ├── main.js              ← Proceso principal con integración de licencias
│   ├── activation.html      ← Pantalla de activación
│   ├── preload.js           ← API segura expuesta al frontend
│   ├── dependency-checker.js
│   └── license-validator.js ← Validador de licencias
├── backend/                 ← Mismo backend que versión libre
├── frontend/                ← Mismo frontend que versión libre
└── package.json             ← Configuración específica
```

## Comandos

```bash
# Desarrollo
npm start

# Build Mac (Universal - Intel + ARM)
npm run build-mac

# Build Mac Intel solo
npm run build-mac:intel

# Build Mac ARM solo
npm run build-mac:arm

# Build Windows
npm run build-win
```

## Archivos de licencia

Las licencias se almacenan en:

- **Mac**: `~/Library/Application Support/TallerOS-Licensed/`
- **Windows**: `%APPDATA%\TallerOS-Licensed\`

Archivos:
- `license.json` - Licencia activada
- `trial.json` - Información del trial
- `devices.json` - Dispositivos registrados

## Generar licencias

Usar el generador en `TallerOS-License-System/generador-licencias.js`:

```bash
node generador-licencias.js TALLER_MADRID base
node generador-licencias.js TALLER_BARCELONA pro
node generador-licencias.js TALLER_VALENCIA premium
```

## Notas

- La versión libre (`TallerOS-Electron/`) permanece intacta
- Esta versión (`TallerOS-Licensed/`) es una copia con sistema de licencias añadido
- Ambas versiones comparten el mismo código de backend y frontend
- La diferencia está en el proceso principal (main.js) y la pantalla de activación

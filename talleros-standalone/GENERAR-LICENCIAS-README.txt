========================================
GENERADOR DE LICENCIAS TALLEROS v2.0
========================================

QUE ES ESTO?
========================================
Este script genera licencias oficiales para TallerOS v2.0.
Cada licencia tiene un checksum de seguridad que valida
su autenticidad.

COMO USAR
========================================

1. Abre CMD o PowerShell en esta carpeta

2. Ejecuta el generador:
   node generar-licencia.js

3. Sigue las instrucciones en pantalla:
   - Elige opcion 1 (Generar nueva licencia)
   - Introduce el nombre del cliente/taller
   - Elige el tipo: base, pro o premium

4. El script mostrara el codigo de licencia generado
   GUARDALO BIEN - no se puede recuperar

EJEMPLO DE USO
========================================

$ node generar-licencia.js

========================================
   GENERADOR DE LICENCIAS TALLEROS
========================================

1. Generar nueva licencia
2. Validar licencia existente
3. Salir

Elige una opcion (1-3): 1

Tipos de licencia disponibles:

BASE     - Base     |   3 equipos | 99 EUR
PRO      - Pro      |   5 equipos | 149 EUR
PREMIUM  - Premium  | Ilimitados  | 299 EUR

----------------------------------------

Nombre del Taller/Cliente: Taller Juan
Tipo de licencia (base/pro/premium): pro

========================================
   LICENCIA GENERADA
========================================

Codigo: TALLER-TALLERJUAN-PRO-A1B2C3D4
Cliente: Taller Juan
Tipo: Pro (149 EUR)
Equipos permitidos: 5

Validacion: OK

========================================

TIPOS DE LICENCIA
========================================

BASE (99 EUR)
- 3 equipos simultaneos
- Acceso completo
- Soporte basico

PRO (149 EUR)
- 5 equipos simultaneos
- Acceso completo
- Soporte prioritario

PREMIUM (299 EUR)
- Equipos ilimitados
- Acceso completo
- Soporte prioritario
- Actualizaciones de por vida

VALIDAR LICENCIA
========================================

Puedes verificar si una licencia es valida:
1. Elige opcion 2 en el menu
2. Introduce el codigo de licencia
3. El sistema validara el checksum

========================================
IMPORTANTE
========================================
- Guarda las licencias generadas en un lugar seguro
- Cada licencia esta vinculada al nombre del taller
- El checksum garantiza que no se pueden falsificar
- Usa el mismo SECRET_KEY que en license-validator.js

SOPORTE: soporte@igsm.es
========================================

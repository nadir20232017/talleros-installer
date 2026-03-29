#!/usr/bin/env python3
"""
Generador de Licencias TallerOS v2.0
Uso: python generador.py
"""

import hashlib
import re
import sys

SECRET_KEY = 'TallerOS_Secret_2024_License_Key_v2'

TIERS = {
    'base': {'equipos': 3, 'nombre': 'Base', 'precio': '99 EUR'},
    'pro': {'equipos': 5, 'nombre': 'Pro', 'precio': '149 EUR'},
    'premium': {'equipos': -1, 'nombre': 'Premium', 'precio': '299 EUR'}
}

def generar_checksum(taller_id, tipo):
    """Genera checksum SHA-256 de 8 caracteres"""
    data = f"{taller_id}-{tipo}-{SECRET_KEY}"
    hash_full = hashlib.sha256(data.encode()).hexdigest()
    return hash_full[:8].upper()

def generar_licencia(nombre_taller, tipo):
    """Genera codigo de licencia completo"""
    # Normalizar nombre (solo letras y numeros)
    taller_id = re.sub(r'[^A-Z0-9]', '', nombre_taller.upper())[:12]
    tipo_upper = tipo.upper()
    checksum = generar_checksum(taller_id, tipo_upper)
    return f"TALLER-{taller_id}-{tipo_upper}-{checksum}"

def validar_licencia(codigo):
    """Valida si una licencia es autentica"""
    partes = codigo.strip().upper().split('-')
    if len(partes) != 4 or partes[0] != 'TALLER':
        return {'valida': False, 'error': 'Formato invalido'}

    _, taller_id, tipo, checksum = partes

    if tipo.lower() not in TIERS:
        return {'valida': False, 'error': 'Tipo de licencia invalido'}

    checksum_esperado = generar_checksum(taller_id, tipo)
    if checksum != checksum_esperado:
        return {'valida': False, 'error': 'Checksum invalido (licencia falsa)'}

    return {
        'valida': True,
        'taller_id': taller_id,
        'tipo': tipo.lower(),
        'equipos': TIERS[tipo.lower()]['equipos']
    }

def mostrar_menu():
    """Muestra menu principal"""
    print("\n" + "="*50)
    print("   GENERADOR DE LICENCIAS TALLEROS v2.0")
    print("="*50)
    print("\nTipos de licencia disponibles:\n")
    for key, info in TIERS.items():
        equipos_str = 'Ilimitados' if info['equipos'] == -1 else str(info['equipos'])
        print(f"  {key.upper():8} | {info['nombre']:8} | {equipos_str:10} equipos | {info['precio']}")
    print("\n" + "-"*50)

def generar_nueva():
    """Genera una nueva licencia"""
    print("\n--- Generar Nueva Licencia ---\n")

    nombre = input("Nombre del Taller/Cliente: ").strip()
    if not nombre:
        print("[ERROR] El nombre es obligatorio")
        return

    tipo = input("Tipo (base/pro/premium) [pro]: ").strip().lower() or 'pro'
    if tipo not in TIERS:
        print(f"[ERROR] Tipo '{tipo}' invalido. Use: base, pro o premium")
        return

    licencia = generar_licencia(nombre, tipo)
    info = TIERS[tipo]

    print("\n" + "="*50)
    print("   LICENCIA GENERADA")
    print("="*50)
    print(f"\n  Codigo:     {licencia}")
    print(f"  Cliente:    {nombre}")
    print(f"  Tipo:       {info['nombre']}")
    print(f"  Equipos:    {'Ilimitados' if info['equipos'] == -1 else info['equipos']}")
    print(f"  Precio:     {info['precio']}")
    print("\n" + "-"*50)
    print("  IMPORTANTE: Guarda este codigo. No se puede recuperar.")
    print("-"*50 + "\n")

def validar_existente():
    """Valida una licencia existente"""
    print("\n--- Validar Licencia ---\n")
    codigo = input("Introduce el codigo de licencia: ").strip()

    resultado = validar_licencia(codigo)

    print("\n" + "="*50)
    print("   RESULTADO DE VALIDACION")
    print("="*50)

    if resultado['valida']:
        print(f"\n  Estado:     VALIDA ✓")
        print(f"  Taller ID:  {resultado['taller_id']}")
        print(f"  Tipo:       {resultado['tipo'].upper()}")
        print(f"  Equipos:    {'Ilimitados' if resultado['equipos'] == -1 else resultado['equipos']}")
    else:
        print(f"\n  Estado:     INVALIDA ✗")
        print(f"  Error:      {resultado['error']}")

    print("\n" + "-"*50 + "\n")

def main():
    """Funcion principal"""
    if len(sys.argv) > 1:
        # Modo linea de comandos
        if sys.argv[1] == '--generar' and len(sys.argv) >= 4:
            nombre = sys.argv[2]
            tipo = sys.argv[3].lower()
            if tipo in TIERS:
                print(generar_licencia(nombre, tipo))
            else:
                print(f"Tipo invalido. Use: base, pro, premium")
                sys.exit(1)
        elif sys.argv[1] == '--validar' and len(sys.argv) >= 3:
            codigo = sys.argv[2]
            resultado = validar_licencia(codigo)
            print("VALIDA" if resultado['valida'] else f"INVALIDA: {resultado['error']}")
        else:
            print("Uso:")
            print(f"  python {sys.argv[0]} --generar 'Nombre Taller' pro")
            print(f"  python {sys.argv[0]} --validar TALLER-XXXX-PRO-XXXXXXXX")
        return

    # Modo interactivo
    while True:
        mostrar_menu()
        print("\nOpciones:")
        print("  1. Generar nueva licencia")
        print("  2. Validar licencia existente")
        print("  3. Salir")

        opcion = input("\nElige opcion (1-3): ").strip()

        if opcion == '1':
            generar_nueva()
            input("Presiona Enter para continuar...")
        elif opcion == '2':
            validar_existente()
            input("Presiona Enter para continuar...")
        elif opcion == '3':
            print("\nHasta luego!\n")
            break
        else:
            print("\n[ERROR] Opcion invalida\n")

if __name__ == '__main__':
    main()

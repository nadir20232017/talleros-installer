// ═══════════════════════════════════════════════════════
//  Validadores para Autenticación
// ═══════════════════════════════════════════════════════
const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
});

const cambiarPasswordSchema = z.object({
  password_actual: z.string().min(1, 'Contraseña actual requerida'),
  password_nuevo: z.string().min(6, 'Nueva contraseña debe tener al menos 6 caracteres')
});

module.exports = {
  loginSchema,
  cambiarPasswordSchema
};

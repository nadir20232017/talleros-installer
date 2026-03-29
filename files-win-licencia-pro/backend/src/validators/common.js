// ═══════════════════════════════════════════════════════
//  Esquemas de validación Zod reutilizables
// ═══════════════════════════════════════════════════════
const { z } = require('zod');

const paginacionSchema = z.object({
  pagina: z.string().default('1').transform(Number),
  limite: z.string().default('50').transform(Number)
});

const idSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID debe ser numérico').transform(Number)
});

const emailSchema = z.string().email('Email inválido');

const telefonoSchema = z.string().min(9, 'Teléfono debe tener al menos 9 caracteres');

function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validación fallida: ${errors}`);
  }
  return result.data;
}

function validateQuery(schema, req) {
  return validate(schema, req.query);
}

function validateBody(schema, req) {
  return validate(schema, req.body);
}

function validateParams(schema, req) {
  return validate(schema, req.params);
}

module.exports = {
  paginacionSchema,
  idSchema,
  emailSchema,
  telefonoSchema,
  validate,
  validateQuery,
  validateBody,
  validateParams
};

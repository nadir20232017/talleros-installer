// ═══════════════════════════════════════════════════════
//  Validadores para Clientes
// ═══════════════════════════════════════════════════════
const { z } = require('zod');
const { paginacionSchema } = require('./common');

const clienteSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().nullable(),
  telefono: z.string().optional().nullable(),
  nif: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  tipo: z.enum(['particular', 'empresa']).default('particular'),
  notas: z.string().optional().nullable(),
  etiquetas: z.array(z.string()).default([])
});

const clienteUpdateSchema = clienteSchema.partial();

const listarClientesSchema = paginacionSchema.extend({
  q: z.string().optional(),
  etiqueta: z.string().optional()
});

module.exports = {
  clienteSchema,
  clienteUpdateSchema,
  listarClientesSchema
};

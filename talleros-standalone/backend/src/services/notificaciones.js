// ═══════════════════════════════════════════════════════
//  Servicio de Notificaciones - SMS/WhatsApp
// ═══════════════════════════════════════════════════════
const twilio = require('twilio');

// Configuración desde variables de entorno
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;
const NOTIFICACIONES_ACTIVAS = process.env.NOTIFICACIONES_ACTIVAS === 'true';

let twilioClient = null;

// Inicializar cliente Twilio si hay credenciales
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

// Plantillas de mensajes por tipo de notificación
const PLANTILLAS = {
  estado_cambiado: {
    sms: (datos) => `iGSM: Tu ${datos.dispositivo} (${datos.numero}) está: ${datos.estadoLabel}. ${datos.mensajeExtra || ''} Info: ${datos.urlConsulta || ''}`,
    whatsapp: (datos) => `🔧 *iGSM - Actualización de tu reparación*

📱 *Dispositivo:* ${datos.dispositivo} ${datos.modelo}
🔢 *Orden:* ${datos.numero}
📍 *Estado:* ${datos.estadoLabel}

${datos.mensajeExtra || ''}

💻 Consulta el estado online: ${datos.urlConsulta || ''}

Gracias por confiar en iGSM.`
  },

  reparacion_lista: {
    sms: (datos) => `iGSM: Tu ${datos.dispositivo} (${datos.numero}) está LISTO para recoger. Precio: ${datos.precio}€. Horario: L-V 9:00-18:00`,
    whatsapp: (datos) => `✅ *¡TU REPARACIÓN ESTÁ LISTA!*

📱 *Dispositivo:* ${datos.dispositivo} ${datos.modelo}
🔢 *Orden:* ${datos.numero}
💰 *Importe:* ${datos.precio}€

📍 Puedes recogerlo en horario:
Lunes a Viernes: 9:00 - 18:00

💳 Métodos de pago: Efectivo, Tarjeta, Bizum

¡Gracias por confiar en iGSM! 🔧`
  },

  orden_creada: {
    sms: (datos) => `iGSM: Hemos recibido tu ${datos.dispositivo}. Orden: ${datos.numero}. Consulta estado en: ${datos.urlConsulta || ''}`,
    whatsapp: (datos) => `🔧 *¡Orden registrada en iGSM!*

📱 *Dispositivo:* ${datos.dispositivo} ${datos.modelo}
🔢 *Número de orden:* ${datos.numero}
⚠️ *Avería:* ${datos.averia}

💻 Podrás consultar el estado aquí:
${datos.urlConsulta || ''}

Te avisaremos cuando esté listo. ¡Gracias!`
  }
};

/**
 * Enviar notificación SMS
 */
async function enviarSMS(telefono, mensaje) {
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.log('[NOTIF] Twilio no configurado. SMS no enviado:', mensaje.substring(0, 50) + '...');
    return { simulado: true };
  }

  try {
    // Limpiar número
    const numeroLimpio = telefono.replace(/\D/g, '');
    const numeroFormateado = numeroLimpio.startsWith('+') ? numeroLimpio : `+34${numeroLimpio}`;

    const result = await twilioClient.messages.create({
      body: mensaje,
      from: TWILIO_PHONE_NUMBER,
      to: numeroFormateado
    });

    console.log('[NOTIF] SMS enviado:', result.sid);
    return { exito: true, sid: result.sid };
  } catch (err) {
    console.error('[NOTIF] Error enviando SMS:', err.message);
    return { exito: false, error: err.message };
  }
}

/**
 * Enviar notificación WhatsApp
 */
async function enviarWhatsApp(telefono, mensaje) {
  if (!twilioClient || !TWILIO_WHATSAPP_NUMBER) {
    console.log('[NOTIF] Twilio WhatsApp no configurado. Mensaje no enviado:', mensaje.substring(0, 50) + '...');
    return { simulado: true };
  }

  try {
    // Limpiar número y formatear para WhatsApp
    const numeroLimpio = telefono.replace(/\D/g, '');
    const numeroFormateado = numeroLimpio.startsWith('+') ? numeroLimpio : `+34${numeroLimpio}`;
    const toWhatsApp = `whatsapp:${numeroFormateado}`;
    const fromWhatsApp = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;

    const result = await twilioClient.messages.create({
      body: mensaje,
      from: fromWhatsApp,
      to: toWhatsApp
    });

    console.log('[NOTIF] WhatsApp enviado:', result.sid);
    return { exito: true, sid: result.sid };
  } catch (err) {
    console.error('[NOTIF] Error enviando WhatsApp:', err.message);
    return { exito: false, error: err.message };
  }
}

/**
 * Notificar cambio de estado al cliente
 */
async function notificarCambioEstado(orden, estadoAnterior, urlBase = '') {
  if (!NOTIFICACIONES_ACTIVAS) {
    console.log('[NOTIF] Notificaciones desactivadas');
    return;
  }

  // Verificar que hay teléfono del cliente
  if (!orden.cliente_tel && !orden.telefono) {
    console.log('[NOTIF] Sin teléfono del cliente para notificar');
    return;
  }

  const telefono = orden.cliente_tel || orden.telefono;
  const urlConsulta = urlBase ? `${urlBase}/consulta-cliente.html` : '';

  // Determinar tipo de plantilla
  let tipoPlantilla = 'estado_cambiado';
  let mensajeExtra = '';

  const estadoLabels = {
    'pendiente': 'Pendiente',
    'proceso': 'En proceso',
    'espera_piezas': 'Esperando repuestos',
    'terminado': 'Listo para recoger',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado'
  };

  // Mensajes personalizados según estado
  if (orden.estado === 'terminado') {
    tipoPlantilla = 'reparacion_lista';
  } else if (orden.estado === 'proceso') {
    mensajeExtra = 'Estamos trabajando en tu reparación.';
  } else if (orden.estado === 'espera_piezas') {
    mensajeExtra = 'Estamos esperando piezas para completar la reparación.';
  } else if (orden.estado === 'pendiente') {
    mensajeExtra = 'Pronto comenzaremos con tu reparación.';
  }

  const datos = {
    numero: orden.numero,
    dispositivo: orden.dispositivo || 'Dispositivo',
    modelo: orden.modelo || '',
    averia: orden.problema || '',
    estado: orden.estado,
    estadoLabel: estadoLabels[orden.estado] || orden.estado,
    precio: orden.precio_final || orden.precio_estimado || 0,
    mensajeExtra,
    urlConsulta
  };

  // Obtener plantillas
  const plantilla = PLANTILLAS[tipoPlantilla];
  if (!plantilla) {
    console.log('[NOTIF] No hay plantilla para tipo:', tipoPlantilla);
    return;
  }

  // Enviar según preferencia del cliente (por defecto WhatsApp, fallback SMS)
  const resultado = { whatsapp: null, sms: null };

  // Intentar WhatsApp primero
  if (TWILIO_WHATSAPP_NUMBER) {
    const mensajeWhatsApp = plantilla.whatsapp(datos);
    resultado.whatsapp = await enviarWhatsApp(telefono, mensajeWhatsApp);
  }

  // Si WhatsApp falló o no está configurado, enviar SMS
  if ((!resultado.whatsapp || !resultado.whatsapp.exito) && TWILIO_PHONE_NUMBER) {
    const mensajeSMS = plantilla.sms(datos);
    resultado.sms = await enviarSMS(telefono, mensajeSMS);
  }

  return resultado;
}

/**
 * Notificar creación de orden
 */
async function notificarOrdenCreada(orden, urlBase = '') {
  if (!NOTIFICACIONES_ACTIVAS) return;
  if (!orden.cliente_tel && !orden.telefono) return;

  const telefono = orden.cliente_tel || orden.telefono;
  const urlConsulta = urlBase ? `${urlBase}/consulta-cliente.html` : '';

  const datos = {
    numero: orden.numero,
    dispositivo: orden.dispositivo || 'Dispositivo',
    modelo: orden.modelo || '',
    averia: orden.problema || '',
    urlConsulta
  };

  const plantilla = PLANTILLAS.orden_creada;

  if (TWILIO_WHATSAPP_NUMBER) {
    await enviarWhatsApp(telefono, plantilla.whatsapp(datos));
  } else if (TWILIO_PHONE_NUMBER) {
    await enviarSMS(telefono, plantilla.sms(datos));
  }
}

module.exports = {
  enviarSMS,
  enviarWhatsApp,
  notificarCambioEstado,
  notificarOrdenCreada,
  PLANTILLAS
};
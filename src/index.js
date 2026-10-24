// Heraldo: generacion y despacho de documentos y mensajes.
// Por ahora expone el generador de reportes; las colas y los despachadores
// (disco, correo, Telegram, WhatsApp) se agregan como modulos hermanos de "reportes".

const { generarReporte } = require('./reportes');
const { ErrorReporte } = require('./comun/errores');

module.exports = { generarReporte, ErrorReporte };

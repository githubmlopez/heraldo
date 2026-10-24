// Heraldo: generacion y despacho de documentos y mensajes.
// Cada servicio es un modulo dentro de src/ (reportes, y despues colas y despachadores:
// disco, correo, Telegram, WhatsApp). Este archivo expone lo que usan los demas sistemas.

export { generarReporte } from '@reportes/index.js';
export type * from '@reportes/index.js';
export { ErrorReporte } from '@comun/errores.js';
export type { DetalleError, TipoError } from '@comun/errores.js';

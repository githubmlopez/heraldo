// Error unico del reporteador. "tipo" indica en que etapa ocurrio:
//   api        : la API respondio con error de sistema (errorUs)
//   negocio    : la API respondio con error de negocio (errorNeg)
//   sinDatos   : no hay filas (estatus 2 por B_NO_DATA_ERROR, o estatus 1 sin detalle)
//   validacion : el JSON no cumple el contrato
//   limite     : se rebaso el limite de filas
//   diseno     : el contrato es valido pero no cabe en el formato
class ErrorReporte extends Error {
  constructor(tipo, mensaje, errores = []) {
    super(mensaje);
    this.name = 'ErrorReporte';
    this.tipo = tipo;
    this.errores = errores;
  }
}

module.exports = { ErrorReporte };

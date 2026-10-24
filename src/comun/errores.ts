// Error unico del reporteador. "tipo" indica en que etapa ocurrio:
//   api        : la API respondio con error de sistema (errorUs)
//   negocio    : la API respondio con error de negocio (errorNeg)
//   sinDatos   : no hay filas (estatus 2 por B_NO_DATA_ERROR, o estatus 1 sin detalle)
//   validacion : el JSON no cumple el contrato
//   limite     : se rebaso el limite de filas
//   diseno     : el contrato es valido pero no cabe en el formato
export type TipoError = 'api' | 'negocio' | 'sinDatos' | 'validacion' | 'limite' | 'diseno';

export interface DetalleError {
  tipo?: TipoError;
  ruta: string;
  mensaje: string;
}

export class ErrorReporte extends Error {
  readonly tipo: TipoError;
  readonly errores: DetalleError[];

  constructor(tipo: TipoError, mensaje: string, errores: DetalleError[] = []) {
    super(mensaje);
    this.name = 'ErrorReporte';
    this.tipo = tipo;
    this.errores = errores;
  }
}

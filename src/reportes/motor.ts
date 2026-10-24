// Motor: une la definicion (tablas RP_) con la respuesta de la API (FC_QUERY)
// y produce el JSON del contrato v1.1. No formatea ni valida tipos: eso lo hace el preparador.

import { ErrorReporte, type DetalleError } from '@comun/errores.js';
import type {
  Bloque,
  ConfigResumen,
  ContenidoDatos,
  Contrato,
  DefinicionLeida,
  EncabezadoContrato,
  Fila,
  RespuestaApi,
} from './tipos.js';

const ALIAS_BREAK = 'BREAK_TEXTO';
const MENSAJE_SIN_DATOS = 'Sin información para los criterios seleccionados';

// Lo que la consulta puede mandar en la seccion "encabezado" y su nombre en el contrato.
const ENCABEZADO_DATOS = {
  TITULO: 'titulo',
  SUBTITULO: 'subtitulo',
  F_INFORMACION: 'fechaInformacion',
} as const;

function revisarRespuesta(respuesta: RespuestaApi): void {
  if (respuesta.errorUs) throw new ErrorReporte('api', String(respuesta.errorUs));
  if (respuesta.errorNeg) throw new ErrorReporte('negocio', String(respuesta.errorNeg));
  if (respuesta.estatus === 2) {
    throw new ErrorReporte('sinDatos', respuesta.mensaje || respuesta.msg || MENSAJE_SIN_DATOS);
  }
  if (respuesta.estatus !== 1) throw new ErrorReporte('api', `Estatus inesperado de la API: ${respuesta.estatus}`);
}

// data siempre trae un solo elemento. Si la consulta no usa WITHOUT_ARRAY_WRAPPER
// en el FOR JSON exterior, llega como data[0][0]; se acepta pero se avisa.
function extraerContenido(respuesta: RespuestaApi, advertencias: string[]): ContenidoDatos | null {
  if (!respuesta.data || respuesta.data.length === 0) return null;
  let contenido = respuesta.data[0];
  if (Array.isArray(contenido)) {
    advertencias.push(
      'La respuesta llegó como data[0][0] (arreglo dentro de arreglo). ' +
        'Agregar WITHOUT_ARRAY_WRAPPER al FOR JSON exterior de la consulta.',
    );
    contenido = contenido[0] ?? null;
  }
  return (contenido as ContenidoDatos | null) ?? null;
}

function encabezadoDeDatos(encabezado: ContenidoDatos['encabezado']): Partial<EncabezadoContrato> {
  const resultado: Partial<EncabezadoContrato> = {};
  if (!encabezado) return resultado;
  for (const [alias, propiedad] of Object.entries(ENCABEZADO_DATOS)) {
    const valor = encabezado[alias];
    if (valor !== null && valor !== undefined) resultado[propiedad] = String(valor);
  }
  return resultado;
}

function sinBreak(fila: Fila): Fila {
  const { [ALIAS_BREAK]: _omitido, ...resto } = fila;
  return resto;
}

// Filas planas -> bloques. Abre un bloque nuevo cada vez que cambia BREAK_TEXTO.
function agruparEnBloques(filas: Fila[], conBreak: boolean): Bloque[] {
  if (!conBreak) return [{ detalle: filas.map(sinBreak) }];
  const errores: DetalleError[] = [];
  const bloques: Bloque[] = [];
  let actual: Bloque | null = null;
  filas.forEach((fila, i) => {
    const texto = fila[ALIAS_BREAK];
    if (typeof texto !== 'string' || texto.trim() === '') {
      errores.push({
        tipo: 'validacion',
        ruta: `detalle[${i}].${ALIAS_BREAK}`,
        mensaje: 'El reporte tiene break y la fila no trae el texto del break',
      });
      return;
    }
    if (!actual || actual.texto !== texto) {
      actual = { texto, detalle: [] };
      bloques.push(actual);
    }
    actual.detalle.push(sinBreak(fila));
  });
  if (errores.length) throw new ErrorReporte('validacion', 'Los datos no cumplen el contrato', errores);
  return bloques;
}

function armarResumen(
  configuracion: ConfigResumen | undefined,
  bloques: Bloque[],
  totalFilas: number,
  conBreak: boolean,
): string[] {
  const lineas: string[] = [];
  if (!configuracion) return lineas;
  if (configuracion.conteoBloques && conBreak) lineas.push(`${configuracion.conteoBloques}: ${bloques.length}`);
  if (configuracion.conteoRegistros) lineas.push(`${configuracion.conteoRegistros}: ${totalFilas}`);
  if (configuracion.nota) lineas.push(configuracion.nota);
  return lineas;
}

export interface OpcionesCombinar {
  /** Texto del pie de pagina */
  pie?: string;
}

/**
 * Une la definicion leida de las tablas RP_ con la respuesta de la API.
 * @param definicionLeida Resultado de sql/rp_definicion_json.sql
 * @param respuestaApi    Respuesta de /api/Query/Consulta
 */
export function combinar(
  definicionLeida: DefinicionLeida,
  respuestaApi: RespuestaApi,
  opciones: OpcionesCombinar = {},
): { contrato: Contrato; advertencias: string[] } {
  const advertencias: string[] = [];
  const { definicion, resumen: configuracionResumen } = definicionLeida;

  revisarRespuesta(respuestaApi);
  const contenido = extraerContenido(respuestaApi, advertencias);
  const filas = contenido?.detalle ?? [];
  // Sin filas no se genera reporte: se regresa el mensaje al usuario.
  if (filas.length === 0) throw new ErrorReporte('sinDatos', MENSAJE_SIN_DATOS);
  const conBreak = !!definicion.break;
  const bloques = agruparEnBloques(filas, conBreak);

  const contrato: Contrato = {
    version: definicion.version,
    formato: definicion.formato,
    encabezado: { ...definicion.encabezado, ...encabezadoDeDatos(contenido?.encabezado) },
    columnas: definicion.columnas,
    bloques,
  };
  if (definicion.break) contrato.break = definicion.break;
  if (definicion.totalGeneral) contrato.totalGeneral = definicion.totalGeneral;

  const resumen = armarResumen(configuracionResumen, bloques, filas.length, conBreak);
  if (resumen.length) contrato.resumen = resumen;
  if (opciones.pie) contrato.pie = { texto: opciones.pie };

  return { contrato, advertencias };
}

// Motor: une la definicion (tablas RP_) con la respuesta de la API (FC_QUERY)
// y produce el JSON del contrato v1.1. No formatea ni valida tipos: eso lo hace el preparador.

const { ErrorReporte } = require('../comun/errores');

const ALIAS_BREAK = 'BREAK_TEXTO';
const MENSAJE_SIN_DATOS = 'Sin información para los criterios seleccionados';

// Lo que la consulta puede mandar en la seccion "encabezado" y su nombre en el contrato.
const ENCABEZADO_DATOS = {
  TITULO: 'titulo',
  SUBTITULO: 'subtitulo',
  F_INFORMACION: 'fechaInformacion',
};

function revisarRespuesta(respuesta) {
  if (respuesta.errorUs) throw new ErrorReporte('api', String(respuesta.errorUs));
  if (respuesta.errorNeg) throw new ErrorReporte('negocio', String(respuesta.errorNeg));
  if (respuesta.estatus === 2) {
    throw new ErrorReporte('sinDatos', respuesta.mensaje || respuesta.msg || MENSAJE_SIN_DATOS);
  }
  if (respuesta.estatus !== 1) throw new ErrorReporte('api', `Estatus inesperado de la API: ${respuesta.estatus}`);
}

// data siempre trae un solo elemento. Si la consulta no usa WITHOUT_ARRAY_WRAPPER
// en el FOR JSON exterior, llega como data[0][0]; se acepta pero se avisa.
function extraerContenido(respuesta, advertencias) {
  if (!respuesta.data || respuesta.data.length === 0) return null;
  let contenido = respuesta.data[0];
  if (Array.isArray(contenido)) {
    advertencias.push('La respuesta llegó como data[0][0] (arreglo dentro de arreglo). '
      + 'Agregar WITHOUT_ARRAY_WRAPPER al FOR JSON exterior de la consulta.');
    contenido = contenido[0] ?? null;
  }
  return contenido;
}

function encabezadoDeDatos(encabezado) {
  const resultado = {};
  if (!encabezado) return resultado;
  for (const [alias, propiedad] of Object.entries(ENCABEZADO_DATOS)) {
    if (encabezado[alias] !== null && encabezado[alias] !== undefined) resultado[propiedad] = encabezado[alias];
  }
  return resultado;
}

// Filas planas -> bloques. Abre un bloque nuevo cada vez que cambia BREAK_TEXTO.
function agruparEnBloques(filas, conBreak) {
  if (!conBreak) return [{ detalle: filas.map(sinBreak) }];
  const errores = [];
  const bloques = [];
  let actual = null;
  filas.forEach((fila, i) => {
    const texto = fila[ALIAS_BREAK];
    if (typeof texto !== 'string' || texto.trim() === '') {
      errores.push({ tipo: 'validacion', ruta: `detalle[${i}].${ALIAS_BREAK}`, mensaje: 'El reporte tiene break y la fila no trae el texto del break' });
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

function sinBreak(fila) {
  const { [ALIAS_BREAK]: _omitido, ...resto } = fila;
  return resto;
}

function armarResumen(configuracion, bloques, totalFilas, conBreak) {
  const lineas = [];
  if (!configuracion) return lineas;
  if (configuracion.conteoBloques && conBreak) lineas.push(`${configuracion.conteoBloques}: ${bloques.length}`);
  if (configuracion.conteoRegistros) lineas.push(`${configuracion.conteoRegistros}: ${totalFilas}`);
  if (configuracion.nota) lineas.push(configuracion.nota);
  return lineas;
}

/**
 * @param {object} definicionLeida  Resultado de rp_definicion_json.sql: { definicion, resumen, origen }
 * @param {object} respuestaApi     Respuesta de /api/Query/Consulta: { estatus, data, errorUs, errorNeg }
 * @param {object} [opciones]       { pie: texto del pie }
 * @returns {{ contrato: object, advertencias: string[] }}
 */
function combinar(definicionLeida, respuestaApi, opciones = {}) {
  const advertencias = [];
  const { definicion, resumen: configuracionResumen } = definicionLeida;

  revisarRespuesta(respuestaApi);
  const contenido = extraerContenido(respuestaApi, advertencias);
  const filas = contenido?.detalle ?? [];
  // Sin filas no se genera reporte: se regresa el mensaje al usuario.
  if (filas.length === 0) throw new ErrorReporte('sinDatos', MENSAJE_SIN_DATOS);
  const conBreak = !!definicion.break;
  const bloques = agruparEnBloques(filas, conBreak);

  const contrato = {
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

module.exports = { combinar };

// Punto de entrada del reporteador.
//   definicion + respuesta de la API -> contrato -> validacion -> modelo -> PDF
// Con salida "modelo" regresa el modelo de presentacion para el componente React.

const { combinar } = require('./motor');
const { validar, preparar } = require('./preparador');
const { renderizarPdf } = require('./pdf');
const { ErrorReporte } = require('../comun/errores');

/**
 * @param {object} params
 * @param {object} params.definicion   Resultado de rp_definicion_json.sql
 * @param {object} params.respuestaApi Respuesta de /api/Query/Consulta
 * @param {'pdf'|'modelo'} [params.salida]
 * @param {string} [params.pie]
 * @param {object} [params.opciones]  { limiteFilas, dirLogos, dirFuentes }
 */
async function generarReporte({ definicion, respuestaApi, salida = 'pdf', pie, opciones = {} }) {
  const { contrato, advertencias } = combinar(definicion, respuestaApi, { pie });

  const errores = validar(contrato, opciones);
  if (errores.length) throw new ErrorReporte('validacion', 'El reporte no cumple el contrato', errores);

  const modelo = preparar(contrato);
  if (salida === 'modelo') return { modelo, contrato, advertencias };

  const pdf = await renderizarPdf(modelo, opciones);
  return { pdf, modelo, contrato, advertencias };
}

module.exports = { generarReporte };

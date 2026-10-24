// Generador de reportes.
//   definicion + respuesta de la API -> contrato -> validacion -> modelo -> PDF
// Con salida "modelo" regresa el modelo de presentacion para el componente React.

import { ErrorReporte } from '@comun/errores.js';
import { combinar } from './motor.js';
import { preparar, validar, type OpcionesValidacion } from './preparador.js';
import { renderizarPdf, type OpcionesPdf } from './pdf.js';
import type { Contrato, DefinicionLeida, ModeloPresentacion, RespuestaApi } from './tipos.js';

export type * from './tipos.js';

export interface SolicitudReporte {
  /** Resultado de sql/rp_definicion_json.sql */
  definicion: DefinicionLeida;
  /** Respuesta de /api/Query/Consulta */
  respuestaApi: RespuestaApi;
  salida?: 'pdf' | 'modelo';
  pie?: string;
  opciones?: OpcionesValidacion & OpcionesPdf;
}

export interface ResultadoReporte {
  pdf?: Buffer;
  modelo: ModeloPresentacion;
  contrato: Contrato;
  advertencias: string[];
}

export async function generarReporte({
  definicion,
  respuestaApi,
  salida = 'pdf',
  pie,
  opciones = {},
}: SolicitudReporte): Promise<ResultadoReporte> {
  const { contrato, advertencias } = combinar(definicion, respuestaApi, { pie });

  const errores = validar(contrato, opciones);
  if (errores.length) throw new ErrorReporte('validacion', 'El reporte no cumple el contrato', errores);

  const modelo = preparar(contrato);
  if (salida === 'modelo') return { modelo, contrato, advertencias };

  const pdf = await renderizarPdf(modelo, opciones);
  return { pdf, modelo, contrato, advertencias };
}

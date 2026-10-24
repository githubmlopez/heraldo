// Preparador: valida el contrato v1.1 y lo convierte en el "modelo de presentacion",
// donde cada celda ya trae su texto final. Los renderizadores (PDF y React) solo dibujan.

import { ErrorReporte, type DetalleError } from '@comun/errores.js';
import {
  ALINEACION_POR_TIPO,
  TIPOS,
  TOTALIZABLES,
  aEscalado,
  deEscalado,
  esNegativo,
  fechaHoraValida,
  fechaValida,
  formatear,
} from './formato.js';
import type {
  Celda,
  ColumnaDefinicion,
  ColumnaModelo,
  Contrato,
  FilaModelo,
  ModeloPresentacion,
  TipoDato,
} from './tipos.js';

const VERSIONES = ['1.0', '1.1'];
const FORMATOS = ['vertical', 'horizontal', 'horizontalCompacto'];
const ALINEACIONES = ['izquierda', 'centro', 'derecha'];
const LIMITE_FILAS = 3000;
const MAX_LINEAS_RESUMEN = 10;

export interface OpcionesValidacion {
  limiteFilas?: number;
}

const esTexto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

function validarColumnas(columnas: ColumnaDefinicion[], errores: DetalleError[]): void {
  if (!Array.isArray(columnas) || columnas.length === 0) {
    errores.push({ ruta: 'columnas', mensaje: 'Debe haber al menos una columna' });
    return;
  }
  const campos = new Set<string>();
  columnas.forEach((c, i) => {
    const ruta = `columnas[${i}]`;
    if (!esTexto(c.campo)) errores.push({ ruta: `${ruta}.campo`, mensaje: 'Campo obligatorio' });
    else if (campos.has(c.campo))
      errores.push({ ruta: `${ruta}.campo`, mensaje: `El campo "${c.campo}" está repetido` });
    else campos.add(c.campo);
    if (typeof c.titulo !== 'string')
      errores.push({ ruta: `${ruta}.titulo`, mensaje: 'Título obligatorio (puede ser vacío)' });
    if (!TIPOS.includes(c.tipo)) {
      errores.push({ ruta: `${ruta}.tipo`, mensaje: `Tipo inválido: ${c.tipo}` });
      return;
    }
    if (
      c.decimales !== undefined &&
      (!['decimal', 'porcentaje'].includes(c.tipo) ||
        !Number.isInteger(c.decimales) ||
        c.decimales < 0 ||
        c.decimales > 6)
    ) {
      errores.push({ ruta: `${ruta}.decimales`, mensaje: 'Solo en decimal y porcentaje, entero de 0 a 6' });
    }
    if (c.peso !== undefined && (c.tipo !== 'texto' || !(c.peso > 0))) {
      errores.push({ ruta: `${ruta}.peso`, mensaje: 'Solo en texto y mayor a cero' });
    }
    if (c.totalizar && !TOTALIZABLES.includes(c.tipo)) {
      errores.push({ ruta: `${ruta}.totalizar`, mensaje: `El tipo ${c.tipo} no es totalizable` });
    }
    if (c.alineacion !== undefined && !ALINEACIONES.includes(c.alineacion)) {
      errores.push({ ruta: `${ruta}.alineacion`, mensaje: `Alineación inválida: ${c.alineacion}` });
    }
  });
}

function valorValido(valor: unknown, tipo: TipoDato): boolean {
  switch (tipo) {
    case 'texto':
    case 'codigo':
      return typeof valor === 'string';
    case 'entero':
      return Number.isInteger(valor);
    case 'decimal':
    case 'moneda':
    case 'porcentaje':
      return typeof valor === 'number' && Number.isFinite(valor);
    case 'fecha':
      return typeof valor === 'string' && fechaValida(valor);
    case 'fechaHora':
      return typeof valor === 'string' && fechaHoraValida(valor);
    default:
      return false;
  }
}

function validarBloques(contrato: Contrato, errores: DetalleError[]): number {
  const { bloques, columnas } = contrato;
  if (!Array.isArray(bloques)) {
    errores.push({ ruta: 'bloques', mensaje: 'Debe ser un arreglo' });
    return 0;
  }
  if (!contrato.break && bloques.length > 1) {
    errores.push({ ruta: 'bloques', mensaje: 'Sin break solo puede haber un bloque' });
  }
  const columnasValidas = Array.isArray(columnas) ? columnas.filter((c) => TIPOS.includes(c.tipo)) : [];
  let filas = 0;
  bloques.forEach((b, i) => {
    if (contrato.break && !esTexto(b.texto)) {
      errores.push({ ruta: `bloques[${i}].texto`, mensaje: 'Con break, cada bloque lleva texto' });
    }
    if (!contrato.break && b.texto !== undefined) {
      errores.push({ ruta: `bloques[${i}].texto`, mensaje: 'Sin break, el bloque no lleva texto' });
    }
    (b.detalle || []).forEach((fila, j) => {
      filas++;
      for (const c of columnasValidas) {
        const v = fila[c.campo];
        if (v === null || v === undefined) continue;
        if (!valorValido(v, c.tipo)) {
          errores.push({
            ruta: `bloques[${i}].detalle[${j}].${c.campo}`,
            mensaje: `Se esperaba un valor de tipo ${c.tipo}`,
          });
        }
      }
    });
  });
  return filas;
}

/** Regresa la lista de errores (vacia si el contrato es valido). */
export function validar(contrato: Contrato, opciones: OpcionesValidacion = {}): DetalleError[] {
  const errores: DetalleError[] = [];
  if (!VERSIONES.includes(contrato.version)) {
    errores.push({ ruta: 'version', mensaje: `Versión no soportada: ${contrato.version}` });
  }
  if (!FORMATOS.includes(contrato.formato)) {
    errores.push({ ruta: 'formato', mensaje: `Formato inválido: ${contrato.formato}` });
  }

  const enc = contrato.encabezado ?? {};
  if (!esTexto(enc.titulo)) errores.push({ ruta: 'encabezado.titulo', mensaje: 'Título obligatorio' });
  if (
    enc.fechaInformacion !== undefined &&
    !(typeof enc.fechaInformacion === 'string' && fechaValida(enc.fechaInformacion))
  ) {
    errores.push({ ruta: 'encabezado.fechaInformacion', mensaje: 'Se esperaba una fecha AAAA-MM-DD' });
  }

  validarColumnas(contrato.columnas, errores);
  const filas = validarBloques(contrato, errores);

  const hayTotales = !!(contrato.break?.total || contrato.totalGeneral);
  if (hayTotales && !(contrato.columnas || []).some((c) => c.totalizar)) {
    errores.push({ ruta: 'columnas', mensaje: 'Hay totales pero ninguna columna con totalizar' });
  }
  if (
    contrato.resumen !== undefined &&
    (!Array.isArray(contrato.resumen) ||
      contrato.resumen.length > MAX_LINEAS_RESUMEN ||
      !contrato.resumen.every((l) => typeof l === 'string'))
  ) {
    errores.push({ ruta: 'resumen', mensaje: `Debe ser una lista de hasta ${MAX_LINEAS_RESUMEN} textos` });
  }

  const limite = opciones.limiteFilas ?? LIMITE_FILAS;
  if (filas > limite) {
    throw new ErrorReporte(
      'limite',
      `El reporte tiene ${filas.toLocaleString('es-MX')} filas; el máximo es ${limite.toLocaleString('es-MX')}`,
    );
  }
  return errores.map((e) => ({ tipo: 'validacion', ...e }));
}

interface ColumnaInterna extends ColumnaModelo {
  campo: string;
  decimales?: number;
  totalizar: boolean;
}

function filaTotal(
  nivel: 'break' | 'general',
  etiqueta: string,
  conteo: boolean | undefined,
  filas: number,
  columnas: ColumnaInterna[],
  sumas: number[],
): FilaModelo {
  const sufijo = conteo ? ` (${filas} ${filas === 1 ? 'registro' : 'registros'})` : '';
  return {
    tipo: 'total',
    nivel,
    etiqueta: etiqueta + sufijo,
    celdas: columnas.map((c, i): Celda | null => {
      if (!c.totalizar) return null;
      const valor = deEscalado(sumas[i], c);
      return { texto: formatear(valor, c), negativo: valor < 0 };
    }),
  };
}

/** Contrato v1.1 (ya validado) -> modelo de presentacion. */
export function preparar(contrato: Contrato): ModeloPresentacion {
  const columnas: ColumnaInterna[] = contrato.columnas.map((c) => ({
    campo: c.campo,
    titulo: c.titulo,
    tipo: c.tipo,
    decimales: c.decimales,
    alineacion: c.alineacion ?? ALINEACION_POR_TIPO[c.tipo],
    ajusta: c.tipo === 'texto',
    peso: c.tipo === 'texto' ? (c.peso ?? 1) : null,
    totalizar: !!c.totalizar,
  }));

  const filas: FilaModelo[] = [];
  const sumasGenerales = columnas.map(() => 0);
  let filasGenerales = 0;

  contrato.bloques.forEach((bloque, b) => {
    if (contrato.break) {
      filas.push({ tipo: 'break', texto: bloque.texto ?? '', saltoPagina: !!contrato.break.saltoDePagina && b > 0 });
    }
    const sumas = columnas.map(() => 0);
    for (const registro of bloque.detalle || []) {
      filas.push({
        tipo: 'detalle',
        celdas: columnas.map((c, i) => {
          const valor = registro[c.campo];
          if (c.totalizar && typeof valor === 'number') {
            const escalado = aEscalado(valor, c);
            sumas[i] += escalado;
            sumasGenerales[i] += escalado;
          }
          return { texto: formatear(valor, c), negativo: esNegativo(valor, c) };
        }),
      });
    }
    const n = (bloque.detalle || []).length;
    filasGenerales += n;
    if (contrato.break?.total) {
      filas.push(filaTotal('break', contrato.break.total.etiqueta, contrato.break.total.conteo, n, columnas, sumas));
    }
  });

  if (contrato.totalGeneral) {
    filas.push(filaTotal('general', contrato.totalGeneral.etiqueta, false, filasGenerales, columnas, sumasGenerales));
  }

  const enc = contrato.encabezado;
  return {
    formato: contrato.formato,
    encabezado: {
      logo: enc.logo,
      titulo: enc.titulo,
      subtitulo: enc.subtitulo ?? '',
      fecha: enc.fechaInformacion ? formatear(enc.fechaInformacion, { tipo: 'fecha' }) : '',
    },
    columnas: columnas.map(({ titulo, tipo, alineacion, ajusta, peso }) => ({
      titulo,
      tipo,
      alineacion,
      ajusta,
      peso,
    })),
    filas,
    resumen: contrato.resumen ?? [],
    pie: contrato.pie?.texto ?? '',
  };
}

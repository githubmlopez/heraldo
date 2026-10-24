// Reglas de formato por tipo de dato (contrato v1.1).
// Es el unico lugar donde se decide como se ve un valor.

import type { Alineacion, ColumnaDefinicion, TipoDato } from './tipos.js';

type ColumnaFormato = Pick<ColumnaDefinicion, 'tipo' | 'decimales'>;

export const TIPOS: readonly TipoDato[] = [
  'texto',
  'codigo',
  'entero',
  'decimal',
  'moneda',
  'porcentaje',
  'fecha',
  'fechaHora',
];
export const NUMERICOS: readonly TipoDato[] = ['entero', 'decimal', 'moneda', 'porcentaje'];
export const TOTALIZABLES: readonly TipoDato[] = ['entero', 'decimal', 'moneda'];

export const ALINEACION_POR_TIPO: Record<TipoDato, Alineacion> = {
  texto: 'izquierda',
  codigo: 'izquierda',
  entero: 'derecha',
  decimal: 'derecha',
  moneda: 'derecha',
  porcentaje: 'derecha',
  fecha: 'centro',
  fechaHora: 'centro',
};

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_FECHA_HORA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

// Crear un Intl.NumberFormat es costoso: se crea uno por numero de decimales y se reutiliza.
const formateadores = new Map<number, Intl.NumberFormat>();
function formateadorNumero(decimales: number): Intl.NumberFormat {
  let f = formateadores.get(decimales);
  if (!f) {
    f = new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
      useGrouping: true,
    });
    formateadores.set(decimales, f);
  }
  return f;
}

function decimalesDe(columna: ColumnaFormato): number {
  if (columna.tipo === 'entero') return 0;
  if (columna.tipo === 'moneda') return 2;
  return columna.decimales ?? 2;
}

export function formatear(valor: unknown, columna: ColumnaFormato): string {
  if (valor === null || valor === undefined) return '';
  switch (columna.tipo) {
    case 'entero':
    case 'decimal':
    case 'moneda':
      return formateadorNumero(decimalesDe(columna)).format(valor as number);
    case 'porcentaje':
      return formateadorNumero(decimalesDe(columna)).format(valor as number) + '%';
    case 'fecha': {
      const m = RE_FECHA.exec(String(valor));
      return m ? `${m[1]}/${m[2]}/${m[3]}` : String(valor);
    }
    case 'fechaHora': {
      const m = RE_FECHA_HORA.exec(String(valor));
      return m ? `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}:${m[6]}` : String(valor);
    }
    default:
      return String(valor);
  }
}

export function esNegativo(valor: unknown, columna: ColumnaFormato): boolean {
  return NUMERICOS.includes(columna.tipo) && typeof valor === 'number' && valor < 0;
}

// Los totales se acumulan en enteros (valor redondeado * 10^decimales)
// para que siempre cuadren con lo impreso y no haya errores de punto flotante.
export function aEscalado(valor: number, columna: ColumnaFormato): number {
  return Math.round(valor * 10 ** decimalesDe(columna));
}

export function deEscalado(escalado: number, columna: ColumnaFormato): number {
  return escalado / 10 ** decimalesDe(columna);
}

export function fechaValida(texto: string): boolean {
  const m = RE_FECHA.exec(texto);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function fechaHoraValida(texto: string): boolean {
  const m = RE_FECHA_HORA.exec(texto);
  return !!m && fechaValida(`${m[1]}-${m[2]}-${m[3]}`) && +m[4] < 24 && +m[5] < 60 && +m[6] < 60;
}

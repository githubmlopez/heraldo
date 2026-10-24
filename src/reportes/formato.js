// Reglas de formato por tipo de dato (contrato v1.1).
// Es el unico lugar donde se decide como se ve un valor.

const TIPOS = ['texto', 'codigo', 'entero', 'decimal', 'moneda', 'porcentaje', 'fecha', 'fechaHora'];
const NUMERICOS = ['entero', 'decimal', 'moneda', 'porcentaje'];
const TOTALIZABLES = ['entero', 'decimal', 'moneda'];

const ALINEACION_POR_TIPO = {
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
const formateadores = new Map();
function formateadorNumero(decimales) {
  if (!formateadores.has(decimales)) {
    formateadores.set(decimales, new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
      useGrouping: true,
    }));
  }
  return formateadores.get(decimales);
}

function decimalesDe(columna) {
  if (columna.tipo === 'entero') return 0;
  if (columna.tipo === 'moneda') return 2;
  return columna.decimales ?? 2;
}

function formatear(valor, columna) {
  if (valor === null || valor === undefined) return '';
  switch (columna.tipo) {
    case 'texto':
    case 'codigo':
      return String(valor);
    case 'entero':
    case 'decimal':
    case 'moneda':
      return formateadorNumero(decimalesDe(columna)).format(valor);
    case 'porcentaje':
      return formateadorNumero(decimalesDe(columna)).format(valor) + '%';
    case 'fecha': {
      const m = RE_FECHA.exec(valor);
      return `${m[1]}/${m[2]}/${m[3]}`;
    }
    case 'fechaHora': {
      const m = RE_FECHA_HORA.exec(valor);
      return `${m[1]}/${m[2]}/${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
    }
    default:
      return String(valor);
  }
}

function esNegativo(valor, columna) {
  return NUMERICOS.includes(columna.tipo) && typeof valor === 'number' && valor < 0;
}

// Los totales se acumulan en enteros (valor redondeado * 10^decimales)
// para que siempre cuadren con lo impreso y no haya errores de punto flotante.
function aEscalado(valor, columna) {
  const factor = 10 ** decimalesDe(columna);
  return Math.round(valor * factor);
}

function deEscalado(escalado, columna) {
  return escalado / 10 ** decimalesDe(columna);
}

function fechaValida(texto) {
  const m = RE_FECHA.exec(texto);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function fechaHoraValida(texto) {
  const m = RE_FECHA_HORA.exec(texto);
  return !!m && fechaValida(`${m[1]}-${m[2]}-${m[3]}`) && +m[4] < 24 && +m[5] < 60 && +m[6] < 60;
}

module.exports = {
  TIPOS,
  NUMERICOS,
  TOTALIZABLES,
  ALINEACION_POR_TIPO,
  formatear,
  esNegativo,
  aEscalado,
  deEscalado,
  fechaValida,
  fechaHoraValida,
};

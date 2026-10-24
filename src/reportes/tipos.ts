// Tipos del generador de reportes: definicion (tablas RP_), respuesta de la API,
// contrato JSON v1.1 y modelo de presentacion (lo que dibujan el PDF y React).

export type TipoDato = 'texto' | 'codigo' | 'entero' | 'decimal' | 'moneda' | 'porcentaje' | 'fecha' | 'fechaHora';
export type Formato = 'vertical' | 'horizontal' | 'horizontalCompacto';
export type Alineacion = 'izquierda' | 'centro' | 'derecha';

// ---------------------------------------------------------------- definicion

export interface ColumnaDefinicion {
  campo: string;
  titulo: string;
  tipo: TipoDato;
  decimales?: number;
  peso?: number;
  totalizar?: boolean;
  alineacion?: Alineacion;
}

export interface ConfigBreak {
  saltoDePagina?: boolean;
  total?: { etiqueta: string; conteo?: boolean };
}

export interface ConfigTotalGeneral {
  etiqueta: string;
}

export interface DefinicionReporte {
  version: string;
  formato: Formato;
  encabezado: { logo?: string; titulo: string };
  columnas: ColumnaDefinicion[];
  break?: ConfigBreak;
  totalGeneral?: ConfigTotalGeneral;
}

export interface ConfigResumen {
  conteoBloques?: string;
  conteoRegistros?: string;
  nota?: string;
}

export interface OrigenDatos {
  idProceso?: number;
  idQuery?: number;
  idProcedure?: number;
}

/** Resultado de sql/rp_definicion_json.sql */
export interface DefinicionLeida {
  definicion: DefinicionReporte;
  resumen?: ConfigResumen;
  origen?: OrigenDatos;
}

// ---------------------------------------------------------------- API

export type Fila = Record<string, unknown>;

/** Respuesta de /api/Query/Consulta */
export interface RespuestaApi {
  estatus: number;
  data?: unknown[] | null;
  errorUs?: unknown;
  errorNeg?: unknown;
  mensaje?: string;
  msg?: string;
}

/** Secciones que produce la consulta de datos con FOR JSON */
export interface ContenidoDatos {
  encabezado?: Record<string, unknown> | null;
  detalle?: Fila[] | null;
}

// ---------------------------------------------------------------- contrato v1.1

export interface EncabezadoContrato {
  logo?: string;
  titulo: string;
  subtitulo?: string;
  fechaInformacion?: string;
}

export interface Bloque {
  texto?: string;
  detalle: Fila[];
}

export interface Contrato {
  version: string;
  formato: Formato;
  encabezado: EncabezadoContrato;
  columnas: ColumnaDefinicion[];
  break?: ConfigBreak;
  totalGeneral?: ConfigTotalGeneral;
  bloques: Bloque[];
  resumen?: string[];
  pie?: { texto: string };
}

// ---------------------------------------------------------------- modelo de presentacion

export interface ColumnaModelo {
  titulo: string;
  tipo: TipoDato;
  alineacion: Alineacion;
  ajusta: boolean;
  peso: number | null;
}

export interface Celda {
  texto: string;
  negativo: boolean;
}

export type FilaModelo =
  | { tipo: 'break'; texto: string; saltoPagina: boolean }
  | { tipo: 'detalle'; celdas: Celda[] }
  | { tipo: 'total'; nivel: 'break' | 'general'; etiqueta: string; celdas: (Celda | null)[] };

export interface ModeloPresentacion {
  formato: Formato;
  encabezado: { logo?: string; titulo: string; subtitulo: string; fecha: string };
  columnas: ColumnaModelo[];
  filas: FilaModelo[];
  resumen: string[];
  pie: string;
}

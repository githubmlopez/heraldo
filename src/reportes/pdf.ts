// Renderizador PDF: dibuja el modelo de presentacion con pdfmake.
// No formatea ni calcula totales; solo mide, reparte anchos, pagina y dibuja.

import fs from 'node:fs';
import path from 'node:path';
import PdfPrinter from 'pdfmake';
import vfsRoboto from 'pdfmake/build/vfs_fonts.js';
import PDFDocument from '@foliojs-fork/pdfkit'; // viene con pdfmake; se usa solo para medir textos
import type {
  Content,
  ContentTable,
  CustomTableLayout,
  DynamicContent,
  TDocumentDefinitions,
  TFontFamilyTypes,
  TableCell,
} from 'pdfmake/interfaces.js';
import { ErrorReporte } from '@comun/errores.js';
import type { Alineacion, ColumnaModelo, Formato, ModeloPresentacion, FilaModelo } from './tipos.js';

const CM = 72 / 2.54;
const MARGEN = 2 * CM;
const CARTA = { ancho: 612, alto: 792 };

const FORMATOS: Record<Formato, { orientacion: 'portrait' | 'landscape'; tamano: number }> = {
  vertical: { orientacion: 'portrait', tamano: 10 },
  horizontal: { orientacion: 'landscape', tamano: 10 },
  horizontalCompacto: { orientacion: 'landscape', tamano: 8 },
};

const ENCABEZADO = {
  arriba: 0.6 * CM, // distancia del borde superior al encabezado
  logoAncho: 2.5 * CM,
  logoAlto: 1.5 * CM,
  tamTitulo: 12,
  tamSubtitulo: 10,
  tamDerecha: 9,
  separacion: 8,
};
const INICIO_CONTENIDO = 2.6 * CM; // margen superior del contenido (debajo del encabezado)
const PADDING_H = 4;
const PADDING_V = 1.5;
const MIN_CARACTERES_TEXTO = 8;
const COLOR_NEGATIVO = '#C00000';
const COLOR_LINEA = '#555555';
const ALINEACION: Record<Alineacion, 'left' | 'center' | 'right'> = {
  izquierda: 'left',
  centro: 'center',
  derecha: 'right',
};
const RE_LOGO = /^[A-Za-z0-9_-]+$/;

export interface OpcionesPdf {
  dirLogos?: string;
  dirFuentes?: string;
}

type Medidor = (texto: string, tamano: number, negrita?: boolean) => number;

// ---------------------------------------------------------------- fuentes

interface Fuentes {
  nombre: string;
  archivos: Required<Record<keyof TFontFamilyTypes, Buffer>>;
}

let fuentesCache: Fuentes | null = null;

// Usa Carlito si sus archivos estan en recursos/fuentes; si no, Roboto (incluida en pdfmake).
function cargarFuentes(dirFuentes: string): Fuentes {
  if (fuentesCache) return fuentesCache;
  const rutas = {
    normal: path.join(dirFuentes, 'Carlito-Regular.ttf'),
    bold: path.join(dirFuentes, 'Carlito-Bold.ttf'),
    italics: path.join(dirFuentes, 'Carlito-Italic.ttf'),
    bolditalics: path.join(dirFuentes, 'Carlito-BoldItalic.ttf'),
  };
  if (Object.values(rutas).every((r) => fs.existsSync(r))) {
    fuentesCache = {
      nombre: 'Carlito',
      archivos: {
        normal: fs.readFileSync(rutas.normal),
        bold: fs.readFileSync(rutas.bold),
        italics: fs.readFileSync(rutas.italics),
        bolditalics: fs.readFileSync(rutas.bolditalics),
      },
    };
  } else {
    const b = (archivo: string) => Buffer.from(vfsRoboto[archivo], 'base64');
    fuentesCache = {
      nombre: 'Roboto',
      archivos: {
        normal: b('Roboto-Regular.ttf'),
        bold: b('Roboto-Medium.ttf'),
        italics: b('Roboto-Italic.ttf'),
        bolditalics: b('Roboto-MediumItalic.ttf'),
      },
    };
  }
  return fuentesCache;
}

function crearMedidor(fuentes: Fuentes): Medidor {
  const doc = new PDFDocument({ autoFirstPage: false });
  doc.registerFont('normal', fuentes.archivos.normal);
  doc.registerFont('negrita', fuentes.archivos.bold);
  return (texto, tamano, negrita = false) =>
    doc
      .font(negrita ? 'negrita' : 'normal')
      .fontSize(tamano)
      .widthOfString(texto || '');
}

function truncar(texto: string, anchoMax: number, tamano: number, negrita: boolean, medir: Medidor): string {
  if (medir(texto, tamano, negrita) <= anchoMax) return texto;
  let corte = texto;
  while (corte.length > 0 && medir(corte + '…', tamano, negrita) > anchoMax) corte = corte.slice(0, -1);
  return corte.trimEnd() + '…';
}

// ---------------------------------------------------------------- anchos

function palabraMasLarga(texto: string, tamano: number, medir: Medidor): number {
  return Math.max(0, ...texto.split(/\s+/).map((p) => medir(p, tamano, true)));
}

function calcularAnchos(modelo: ModeloPresentacion, anchoContenido: number, tamano: number, medir: Medidor): number[] {
  const { columnas, filas } = modelo;
  const n = columnas.length;
  const presupuesto = anchoContenido - n * 2 * PADDING_H;
  const minTexto = medir('abcdefgh'.slice(0, MIN_CARACTERES_TEXTO), tamano);

  // El titulo puede partirse en dos lineas: basta con que quepa su palabra mas larga.
  const anchoTitulo = columnas.map((c) => palabraMasLarga(c.titulo, tamano, medir));

  const anchoContenidoCol = columnas.map(() => 0);
  for (const fila of filas) {
    if (fila.tipo !== 'detalle' && fila.tipo !== 'total') continue;
    fila.celdas.forEach((celda, i) => {
      if (!celda) return;
      const w = medir(celda.texto, tamano, fila.tipo === 'total');
      if (w > anchoContenidoCol[i]) anchoContenidoCol[i] = w;
    });
  }

  const fijas = columnas.map((c, i) => (c.ajusta ? 0 : Math.max(anchoContenidoCol[i], anchoTitulo[i]) + 0.5));
  const totalFijas = fijas.reduce((a, b) => a + b, 0);
  const deTexto = columnas.map((c, i) => (c.ajusta ? i : -1)).filter((i) => i >= 0);
  const minimos = columnas.map((c, i) => (c.ajusta ? Math.max(minTexto, anchoTitulo[i]) : 0));
  const requerido = totalFijas + minimos.reduce((a, b) => a + b, 0) + n * 2 * PADDING_H;

  const errorDiseno = () =>
    new ErrorReporte(
      'diseno',
      `Las columnas no caben en formato ${modelo.formato} (requieren ${(requerido / CM).toFixed(1)} cm, ` +
        `disponibles ${(anchoContenido / CM).toFixed(1)} cm). Use un formato horizontal o reduzca columnas.`,
    );

  if (deTexto.length === 0) {
    if (totalFijas > presupuesto) throw errorDiseno();
    const escala = presupuesto / totalFijas; // sin columnas de texto: se reparte proporcionalmente
    return fijas.map((w) => w * escala);
  }

  const sobrante = presupuesto - totalFijas;
  const sumaPesos = deTexto.reduce((s, i) => s + (columnas[i].peso ?? 1), 0);
  const anchos = columnas.map((c, i) => (c.ajusta ? (sobrante * (c.peso ?? 1)) / sumaPesos : fijas[i]));
  if (deTexto.some((i) => anchos[i] < minimos[i])) throw errorDiseno();
  return anchos;
}

// ---------------------------------------------------------------- encabezado y pie

function nodoLogo(logo: string | undefined, dirLogos: string): Content {
  const candidatos: string[] = [];
  if (logo && RE_LOGO.test(logo)) candidatos.push(`${logo}.png`, `${logo}.jpg`);
  candidatos.push('default.png', 'default.jpg');
  const archivo = candidatos.map((a) => path.join(dirLogos, a)).find((r) => fs.existsSync(r));
  if (archivo) return { image: archivo, fit: [ENCABEZADO.logoAncho, ENCABEZADO.logoAlto] };
  // Sin archivo de logo: un recuadro para ver el espacio reservado.
  return {
    table: {
      widths: [ENCABEZADO.logoAncho - 2 * PADDING_H],
      body: [[{ text: 'LOGO', alignment: 'center', color: '#999999', fontSize: 9, margin: [0, 12, 0, 12] }]],
    },
    layout: {
      hLineColor: () => '#BBBBBB',
      vLineColor: () => '#BBBBBB',
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
    },
  };
}

function crearEncabezado(
  modelo: ModeloPresentacion,
  anchoContenido: number,
  medir: Medidor,
  dirLogos: string,
): DynamicContent {
  const enc = modelo.encabezado;
  const textoFecha = `Fecha: ${enc.fecha}`;
  const anchoDerecha =
    Math.max(medir(textoFecha, ENCABEZADO.tamDerecha), medir('Página: 9999', ENCABEZADO.tamDerecha)) + 2;
  const anchoCentro = anchoContenido - ENCABEZADO.logoAncho - anchoDerecha - 2 * ENCABEZADO.separacion;
  const titulo = truncar(enc.titulo, anchoCentro, ENCABEZADO.tamTitulo, true, medir);
  const subtitulo = truncar(enc.subtitulo, anchoCentro, ENCABEZADO.tamSubtitulo, true, medir);
  const logo = nodoLogo(enc.logo, dirLogos);

  return (paginaActual) => ({
    margin: [MARGEN, ENCABEZADO.arriba, MARGEN, 0],
    stack: [
      {
        columnGap: ENCABEZADO.separacion,
        columns: [
          { width: ENCABEZADO.logoAncho, stack: [logo] },
          {
            width: anchoCentro,
            margin: [0, 6, 0, 0],
            stack: [
              { text: titulo, bold: true, fontSize: ENCABEZADO.tamTitulo, noWrap: true },
              { text: subtitulo, bold: true, fontSize: ENCABEZADO.tamSubtitulo, noWrap: true, margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: anchoDerecha,
            margin: [0, 8, 0, 0],
            alignment: 'right',
            fontSize: ENCABEZADO.tamDerecha,
            stack: [textoFecha, `Página: ${paginaActual}`],
          },
        ],
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 4, x2: anchoContenido, y2: 4, lineWidth: 0.75, lineColor: COLOR_LINEA }],
      },
    ],
  });
}

function crearPie(modelo: ModeloPresentacion, anchoContenido: number, medir: Medidor): DynamicContent | undefined {
  if (!modelo.pie) return undefined;
  const texto = truncar(modelo.pie, anchoContenido, 8, false, medir);
  return () => ({ text: texto, fontSize: 8, noWrap: true, margin: [MARGEN, MARGEN / 2, MARGEN, 0] });
}

// ---------------------------------------------------------------- tabla

type Borde = [boolean, boolean, boolean, boolean];
const SIN_BORDE: Borde = [false, false, false, false];
const BORDE_ABAJO: Borde = [false, false, false, true];
const BORDE_ARRIBA: Borde = [false, true, false, false];
const relleno = (n: number): TableCell[] => Array.from({ length: n }, () => ({}));

function filaEncabezado(columnas: ColumnaModelo[]): TableCell[] {
  return columnas.map((c) => ({
    text: c.titulo,
    bold: true,
    alignment: ALINEACION[c.alineacion],
    border: BORDE_ABAJO,
  }));
}

function filasDelModelo(fila: FilaModelo, columnas: ColumnaModelo[]): TableCell[][] {
  const n = columnas.length;
  switch (fila.tipo) {
    case 'break':
      return [
        [{ text: fila.texto, colSpan: n, bold: true, border: BORDE_ABAJO, margin: [0, 6, 0, 0] }, ...relleno(n - 1)],
      ];
    case 'detalle':
      return [
        fila.celdas.map((celda, i) => ({
          text: celda.texto,
          alignment: ALINEACION[columnas[i].alineacion],
          color: celda.negativo ? COLOR_NEGATIVO : undefined,
          noWrap: !columnas[i].ajusta,
          border: SIN_BORDE,
        })),
      ];
    case 'total': {
      const k = fila.celdas.findIndex((c) => c !== null);
      const celdas: TableCell[] = fila.celdas.slice(k).map((celda, j) =>
        celda
          ? {
              text: celda.texto,
              bold: true,
              alignment: ALINEACION[columnas[k + j].alineacion],
              color: celda.negativo ? COLOR_NEGATIVO : undefined,
              noWrap: true,
              border: BORDE_ARRIBA,
            }
          : { text: '', border: SIN_BORDE },
      );
      if (k > 0) {
        return [[{ text: fila.etiqueta, colSpan: k, bold: true, border: SIN_BORDE }, ...relleno(k - 1), ...celdas]];
      }
      return [[{ text: fila.etiqueta, colSpan: n, bold: true, border: SIN_BORDE }, ...relleno(n - 1)], celdas];
    }
  }
}

const LAYOUT_TABLA: CustomTableLayout = {
  defaultBorder: false,
  hLineWidth: () => 0.5,
  vLineWidth: () => 0,
  hLineColor: () => COLOR_LINEA,
  paddingLeft: () => PADDING_H,
  paddingRight: () => PADDING_H,
  paddingTop: () => PADDING_V,
  paddingBottom: () => PADDING_V,
};

// Una tabla por segmento: un break con salto de pagina inicia un segmento nuevo.
function crearTablas(modelo: ModeloPresentacion, anchos: number[]): ContentTable[] {
  const segmentos: TableCell[][][] = [[]];
  for (const fila of modelo.filas) {
    if (fila.tipo === 'break' && fila.saltoPagina) segmentos.push([]);
    segmentos[segmentos.length - 1].push(...filasDelModelo(fila, modelo.columnas));
  }
  return segmentos.map((cuerpo, i) => ({
    table: {
      headerRows: 1,
      keepWithHeaderRows: 1,
      dontBreakRows: true,
      widths: anchos,
      body: [filaEncabezado(modelo.columnas), ...cuerpo],
    },
    layout: LAYOUT_TABLA,
    pageBreak: i > 0 ? 'before' : undefined,
  }));
}

// ---------------------------------------------------------------- documento

/** Dibuja el modelo de presentacion y regresa el PDF. */
export function renderizarPdf(modelo: ModeloPresentacion, opciones: OpcionesPdf = {}): Promise<Buffer> {
  const recursos = path.join(import.meta.dirname, '..', '..', 'recursos');
  const dirLogos = opciones.dirLogos ?? path.join(recursos, 'logos');
  const dirFuentes = opciones.dirFuentes ?? path.join(recursos, 'fuentes');

  const formato = FORMATOS[modelo.formato];
  const horizontal = formato.orientacion === 'landscape';
  const anchoPagina = horizontal ? CARTA.alto : CARTA.ancho;
  const anchoContenido = anchoPagina - 2 * MARGEN;

  const fuentes = cargarFuentes(dirFuentes);
  const medir = crearMedidor(fuentes);
  const anchos = calcularAnchos(modelo, anchoContenido, formato.tamano, medir);

  const contenido: Content[] = crearTablas(modelo, anchos);
  if (modelo.resumen.length) {
    contenido.push({ stack: modelo.resumen.map((linea) => ({ text: linea, bold: true })), margin: [0, 10, 0, 0] });
  }

  const definicionPdf: TDocumentDefinitions = {
    pageSize: 'LETTER',
    pageOrientation: formato.orientacion,
    pageMargins: [MARGEN, INICIO_CONTENIDO, MARGEN, MARGEN],
    header: crearEncabezado(modelo, anchoContenido, medir, dirLogos),
    footer: crearPie(modelo, anchoContenido, medir),
    content: contenido,
    defaultStyle: { font: fuentes.nombre, fontSize: formato.tamano },
    info: { title: modelo.encabezado.titulo, creator: 'Heraldo' },
  };

  const printer = new PdfPrinter({ [fuentes.nombre]: fuentes.archivos });
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(definicionPdf);
    const partes: Buffer[] = [];
    doc.on('data', (p: Buffer) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
    doc.end();
  });
}

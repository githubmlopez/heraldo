// Ejecuta el reporteador con respuestas de la API guardadas en archivos.
// Uso: npm run prueba
// Deja en /salida el PDF, el contrato y el modelo de presentacion de cada caso.

const fs = require('fs');
const path = require('path');
const { generarReporte, ErrorReporte } = require('../src');

const dir = __dirname;
const salida = path.join(dir, '..', 'salida');
const leer = (archivo) => JSON.parse(fs.readFileSync(path.join(dir, archivo), 'utf8'));

const casos = [
  {
    nombre: 'quiniela_cierre',
    definicion: 'definicion_quiniela_cierre.json',
    respuesta: 'api_respuesta_quiniela_cierre.json',
    pie: 'Generado por: mlopez',
  },
  {
    nombre: 'prueba_ventas',
    definicion: 'definicion_prueba_ventas.json',
    respuesta: 'api_respuesta_prueba_ventas.json',
    pie: 'Generado por: mlopez · Prueba de tipos de dato, totales y negativos',
  },
  {
    nombre: 'sin_datos_estatus_1',
    definicion: 'definicion_quiniela_cierre.json',
    respuesta: { estatus: 1, data: null, errorUs: null, errorNeg: null },
  },
  {
    nombre: 'sin_datos_estatus_2',
    definicion: 'definicion_quiniela_cierre.json',
    respuesta: { estatus: 2, data: null, mensaje: 'La quiniela no ha cerrado o no tiene pronósticos', errorUs: null, errorNeg: null },
  },
];

async function main() {
  fs.mkdirSync(salida, { recursive: true });
  for (const caso of casos) {
    const respuestaApi = typeof caso.respuesta === 'string' ? leer(caso.respuesta) : caso.respuesta;
    try {
      const r = await generarReporte({ definicion: leer(caso.definicion), respuestaApi, pie: caso.pie });
      fs.writeFileSync(path.join(salida, `${caso.nombre}.pdf`), r.pdf);
      fs.writeFileSync(path.join(salida, `${caso.nombre}.contrato.json`), JSON.stringify(r.contrato, null, 2));
      fs.writeFileSync(path.join(salida, `${caso.nombre}.modelo.json`), JSON.stringify(r.modelo, null, 2));
      console.log(`OK     ${caso.nombre}: ${r.modelo.filas.length} filas en el modelo, PDF de ${(r.pdf.length / 1024).toFixed(0)} KB`);
      r.advertencias.forEach((a) => console.log(`       aviso: ${a}`));
    } catch (e) {
      if (!(e instanceof ErrorReporte)) throw e;
      console.log(`ERROR  ${caso.nombre}: [${e.tipo}] ${e.message}`);
      e.errores.slice(0, 10).forEach((x) => console.log(`       ${x.ruta}: ${x.mensaje}`));
    }
  }
}

main();

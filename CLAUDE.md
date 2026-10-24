# Heraldo — contexto del proyecto

Plataforma para generar documentos (PDF) y despacharlos (disco, correo, Telegram, WhatsApp) mediante colas. Node.js en Docker sobre Linux, detrás de NGINX. Base de datos SQL Server (`NFLQUIN_DESA` en desarrollo). Frontend en React / Next / Tailwind. Idioma del proyecto: español (código, comentarios, mensajes).

## Arquitectura del generador de reportes

```
Lanzador (React)  --parmRemp-->  Motor  --POST /api/Query/Consulta-->  API existente (Sequelize)
                                   |  definición (tablas RP_) + datos (FC_QUERY / FC_PROCEDIMIENTO)
                                   v
                        Contrato JSON v1.1 -> Preparador -> Modelo de presentación
                                                              |-> Renderizador PDF (pdfmake, servidor)
                                                              |-> Componente React (pantalla)
```

- **Diseñador** (persona): da de alta la definición en `RP_REPORTE` / `RP_REPORTE_COLUMNA` (script plantilla) y escribe la consulta de datos.
- **Lanzador**: uno para todos los reportes; solo manda los valores de los filtros como `parmRemp` (`$1`, `$2`…). No arma textos.
- **Consulta de datos**: devuelve dos secciones con `FOR JSON PATH, WITHOUT_ARRAY_WRAPPER`:
  - `encabezado`: objeto con `TITULO`, `SUBTITULO`, `F_INFORMACION` (todo el texto lo arma la consulta desde la base).
  - `detalle`: filas planas; alias = `NOM_CAMPO`; `BREAK_TEXTO` si hay break.
- **Motor** (`src/reportes/motor.js`): revisa `estatus`/`errorUs`/`errorNeg`, agrupa por `BREAK_TEXTO`, une definición + datos, arma el resumen (conteo de bloques, conteo de registros, nota fija).
- **Preparador** (`src/reportes/preparador.js`): valida, formatea y calcula totales una sola vez. El PDF y React dibujan el mismo modelo.

## Reglas del contrato (v1.1)

- Formatos: `vertical` (10 pt), `horizontal` (10 pt), `horizontalCompacto` (8 pt). Carta, márgenes de 2 cm, fuente Carlito. Si no cabe: error de diseño.
- Tipos: `texto` (se ajusta), `codigo` (no se parte), `entero`, `decimal`, `moneda` (2 decimales, sin símbolo), `porcentaje` (llega como 15, no totalizable), `fecha` (ISO → `AAAA/MM/DD`), `fechaHora` (→ `AAAA/MM/DD HH:MM:SS`).
- Anchos: columnas no `texto` miden su valor más largo; las `texto` se reparten el sobrante según `peso`.
- Negativos en rojo con signo menos. Nulos = celda vacía. Totales sumando valores ya redondeados (en enteros).
- Break de un solo nivel; total por break opcional (con conteo); total general opcional.
- Sin filas: no se genera PDF, se regresa el mensaje "Sin información para los criterios seleccionados" (o `MSG_NO_DATA` si la API responde estatus 2).
- Reporte activo = tiene `ID_PROCESO` y exactamente uno de `ID_QUERY` / `ID_PROCEDIMIENTO`.

## Convenciones de base de datos

- Tablas en `dbo` con prefijo por módulo (`RP_` reportes). Columnas: `ID_`, `CVE_`, `NOM_`, `TX_`, `B_`, `F_`, `NUM_`, `IMP_`.
- `varchar` con la collation de la base (`Modern_Spanish_CI_AS`, igual en todos los ambientes).
- IDs asignados a mano (sin identity). Validaciones con `CHECK`; los `LIKE` de validación usan `collate Latin1_General_BIN`.
- Scripts con acentos se guardan en UTF-8 con BOM (SQL Server Management Studio).

## Pendientes conocidos

- Break huérfano: propuesta aceptada para la construcción (títulos de columna en el encabezado de página y una tabla por bloque con el texto del break como encabezado repetible).
- Seguridad: la API sustituye `$n` como texto (riesgo de inyección) y los parámetros de sesión; tema aparte.
- Huella digital (evidencia) en el pie: por definir.
- Alcance completo de Heraldo (colas, despachadores, servicio HTTP, lanzador): por definir.

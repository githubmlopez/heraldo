# Heraldo

Generación de documentos (PDF) y despacho por disco, correo, Telegram y WhatsApp mediante colas de mensajes.

Estado: **prototipo del generador de reportes** (factibilidad comprobada con el reporte de cierre de quiniela). Las colas y los despachadores están por construir.

## Estructura

```
Heraldo/
├── src/
│   ├── index.js            Punto de entrada (exporta generarReporte)
│   ├── comun/
│   │   └── errores.js      ErrorReporte (tipos: api, negocio, sinDatos, validacion, limite, diseno)
│   └── reportes/           Generador de reportes
│       ├── index.js        generarReporte(): definicion + respuesta API -> PDF o modelo
│       ├── motor.js        Une definición y datos, agrupa por BREAK_TEXTO, arma el resumen
│       ├── preparador.js   Valida el contrato y produce el modelo de presentación
│       ├── formato.js      Reglas de formato por tipo de dato
│       └── pdf.js          Renderizador PDF (pdfmake)
├── recursos/
│   ├── fuentes/            Carlito (licencia OFL)
│   └── logos/              <CVE_LOGO>.png | .jpg  (default.png si no existe)
├── sql/                    Scripts de base de datos (tablas RP_, alta de reportes, consultas)
├── pruebas/                Definiciones y respuestas de la API guardadas + probar.js
└── salida/                 Resultado de las pruebas (no se versiona)
```

Por construir (módulos hermanos de `reportes/`): `colas/`, `despachadores/` (disco, correo, telegram, whatsapp) y el servicio HTTP.

## Probar

```bash
npm install
npm run prueba
```

Genera en `salida/` el PDF, el contrato y el modelo de presentación de cada caso de `pruebas/probar.js`.

## Scripts SQL (`sql/`)

| Archivo | Uso |
|---|---|
| `rp_tablas.sql` | Crea los catálogos y las tablas `RP_` en una base nueva |
| `rp_cambios_02.sql` | Actualiza una base creada con la versión anterior de `rp_tablas.sql` |
| `rp_alta_quiniela_cierre.sql` | Plantilla de alta de un reporte (ejemplo: `QUINIELA_CIERRE`) |
| `rp_definicion_json.sql` | Lee la definición de un reporte en JSON (la usa el motor) |
| `rp_query_quiniela_cierre.sql` | Consulta de datos del cierre de quiniela (se registra en `FC_QUERY`) |
| `limpieza_nombres.sql` | Limpieza de espacios y nombres en participantes y equipos |

/*==============================================================*/
/* REPORTEADOR - PLANTILLA DE ALTA DE REPORTE                   */
/* Ejemplo: QUINIELA_CIERRE                                     */
/* Contrato JSON v1.1                                           */
/*                                                              */
/* Para un reporte nuevo: copiar este archivo y cambiar los     */
/* valores marcados con <<<.                                    */
/*                                                              */
/* Reglas:                                                      */
/*  - Mientras falten ID_PROCESO u origen (ID_QUERY o           */
/*    ID_PROCEDIMIENTO), el reporte va con B_ACTIVO = 0.        */
/*  - NOM_CAMPO debe ser igual al alias de la columna en la     */
/*    consulta de datos (respetando mayusculas y minusculas).   */
/*  - Si hay break, la consulta trae la columna BREAK_TEXTO.    */
/*==============================================================*/
set xact_abort on
go

begin transaction

declare @ID_REPORTE int = 1                              -- <<< asignado por el administrador

if exists (select 1 from dbo.RP_REPORTE where ID_REPORTE = @ID_REPORTE
                                           or CVE_REPORTE = 'QUINIELA_CIERRE')   -- <<<
begin
   raiserror('El reporte ya existe. No se insertó nada.', 16, 1)
   rollback transaction
   return
end

insert into dbo.RP_REPORTE (
   ID_REPORTE,
   CVE_REPORTE,
   TX_DESCRIPCION,
   CVE_VERSION,
   CVE_FORMATO,
   CVE_LOGO,
   TX_TITULO,
   ID_PROCESO,
   ID_QUERY,
   ID_PROCEDIMIENTO,
   B_BREAK,
   B_BREAK_SALTO_PAG,
   B_BREAK_TOTAL,
   TX_BREAK_TOTAL,
   B_BREAK_CONTEO,
   B_TOTAL_GRAL,
   TX_TOTAL_GRAL,
   TX_CONTEO_BLOQUES,
   TX_CONTEO_REGISTROS,
   TX_NOTA,
   B_ACTIVO
) values (
   @ID_REPORTE,
   'QUINIELA_CIERRE',                                    -- <<< clave (mayusculas, numeros, _)
   'Pronósticos de todos los participantes al cierre de la semana (evidencia)',
   '1.1',
   'vertical',                                           -- <<< vertical | horizontal | horizontalCompacto
   'quinielas',                                          -- <<< logo
   'Reporte de Quinielas',                               -- <<< titulo (la consulta puede reemplazarlo)
   null,                                                 -- <<< ID_PROCESO (FC_PROCESO)
   null,                                                 -- <<< ID_QUERY (FC_QUERY)          uno u otro
   null,                                                 -- <<< ID_PROCEDIMIENTO (FC_PROCEDIMIENTO)
   1,                                                    -- break por participante
   0,                                                    -- salto de pagina por break
   0, null, 0,                                           -- total por break: bandera, etiqueta, conteo
   0, null,                                              -- total general: bandera, etiqueta
   'Participantes',                                      -- resumen: conteo de bloques
   null,                                                 -- resumen: conteo de registros
   '* Pronóstico asignado por el sistema (el participante no eligió)',   -- resumen: nota fija
   0                                                     -- <<< 1 cuando tenga proceso y origen
)

insert into dbo.RP_REPORTE_COLUMNA
   (ID_REPORTE,  NUM_ORDEN, NOM_CAMPO,       TX_TITULO,          CVE_TIPO, NUM_DECIMALES, NUM_PESO, B_TOTALIZAR, CVE_ALINEACION)
values
   (@ID_REPORTE, 1,         'partido',       'Partido',          'entero', null,          null,     0,           'centro'),
   (@ID_REPORTE, 2,         'visitante',     'Visitante',        'texto',  null,          null,     0,           null),
   (@ID_REPORTE, 3,         'pronVisitante', 'Pronóstico',       'codigo', null,          null,     0,           'centro'),
   (@ID_REPORTE, 4,         'local',         'Local',            'texto',  null,          null,     0,           null),
   (@ID_REPORTE, 5,         'pronLocal',     'Pronóstico',       'codigo', null,          null,     0,           'centro'),
   (@ID_REPORTE, 6,         'desempate',     'Desempate (V/L)',  'codigo', null,          null,     0,           'centro')

commit transaction
go


/*==============================================================*/
/* Verificacion                                                 */
/*==============================================================*/
select * from dbo.RP_REPORTE         where CVE_REPORTE = 'QUINIELA_CIERRE'
select c.*
  from dbo.RP_REPORTE_COLUMNA c
  join dbo.RP_REPORTE r on r.ID_REPORTE = c.ID_REPORTE
 where r.CVE_REPORTE = 'QUINIELA_CIERRE'
 order by c.NUM_ORDEN
go

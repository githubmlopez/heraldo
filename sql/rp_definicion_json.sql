/*==============================================================*/
/* REPORTEADOR - DEFINICION DE UN REPORTE EN JSON               */
/*                                                              */
/* La lee el motor. Tres secciones:                             */
/*   definicion : parte fija del contrato (version, formato,    */
/*                encabezado, columnas, break, totalGeneral)    */
/*   resumen    : configuracion con la que el motor arma las    */
/*                lineas del resumen (conteos y nota)           */
/*   origen     : proceso y consulta/procedimiento para la API  */
/*                                                              */
/* Los valores nulos se omiten en el JSON.                      */
/* Solo regresa reportes activos.                               */
/*==============================================================*/
declare @CVE_REPORTE varchar(50) = 'QUINIELA_CIERRE'

select
   -- Parte fija del contrato
   r.CVE_VERSION                                   as [definicion.version],
   r.CVE_FORMATO                                   as [definicion.formato],
   r.CVE_LOGO                                      as [definicion.encabezado.logo],
   r.TX_TITULO                                     as [definicion.encabezado.titulo],

   json_query((
      select c.NOM_CAMPO      as campo,
             c.TX_TITULO      as titulo,
             c.CVE_TIPO       as tipo,
             c.NUM_DECIMALES  as decimales,
             c.NUM_PESO       as peso,
             case when c.B_TOTALIZAR = 1 then cast(1 as bit) end as totalizar,
             c.CVE_ALINEACION as alineacion
      from   dbo.RP_REPORTE_COLUMNA c
      where  c.ID_REPORTE = r.ID_REPORTE
      order by c.NUM_ORDEN
      for json path
   ))                                              as [definicion.columnas],

   json_query(case when r.B_BREAK = 1 then (
      select r.B_BREAK_SALTO_PAG as saltoDePagina,
             json_query(case when r.B_BREAK_TOTAL = 1 then (
                select r.TX_BREAK_TOTAL as etiqueta,
                       r.B_BREAK_CONTEO as conteo
                for json path, without_array_wrapper
             ) end) as total
      for json path, without_array_wrapper
   ) end)                                          as [definicion.break],

   json_query(case when r.B_TOTAL_GRAL = 1 then (
      select r.TX_TOTAL_GRAL as etiqueta
      for json path, without_array_wrapper
   ) end)                                          as [definicion.totalGeneral],

   -- Configuracion del resumen (la usa el motor)
   r.TX_CONTEO_BLOQUES                             as [resumen.conteoBloques],
   r.TX_CONTEO_REGISTROS                           as [resumen.conteoRegistros],
   r.TX_NOTA                                       as [resumen.nota],

   -- Origen de datos (lo usa el motor para llamar a la API)
   r.ID_PROCESO                                    as [origen.idProceso],
   r.ID_QUERY                                      as [origen.idQuery],
   r.ID_PROCEDIMIENTO                              as [origen.idProcedure]

from  dbo.RP_REPORTE r
where r.CVE_REPORTE = @CVE_REPORTE
  and r.B_ACTIVO = 1
for json path, without_array_wrapper

/*==============================================================*/
/* REPORTEADOR - CAMBIOS 02 A RP_REPORTE                        */
/*                                                              */
/* Para bases donde RP_REPORTE ya existe (creada con la version */
/* anterior de rp_tablas.sql). En una base nueva basta con      */
/* ejecutar rp_tablas.sql, que ya incluye estos cambios.        */
/*                                                              */
/*  + ID_PROCESO        (FK FC_PROCESO)                         */
/*  + ID_PROCEDIMIENTO  (FK FC_PROCEDIMIENTO)                   */
/*  + TX_CONTEO_BLOQUES, TX_CONTEO_REGISTROS, TX_NOTA (resumen) */
/*  - B_TOTAL_GRAL_CONTEO (lo reemplaza TX_CONTEO_REGISTROS)    */
/*  + Regla: reporte activo = proceso + exactamente un origen   */
/*==============================================================*/


/*==============================================================*/
/* 1. Columnas nuevas                                           */
/*==============================================================*/
alter table dbo.RP_REPORTE add
   ID_PROCESO           int                  null,
   ID_PROCEDIMIENTO     int                  null,
   TX_CONTEO_BLOQUES    varchar(60)          null,
   TX_CONTEO_REGISTROS  varchar(60)          null,
   TX_NOTA              varchar(200)         null
go


/*==============================================================*/
/* 2. Quitar B_TOTAL_GRAL_CONTEO con su default y su CHECK      */
/*==============================================================*/
alter table dbo.RP_REPORTE drop constraint CK_RP_REPORTE_TOTAL_GRAL_CONTEO
go
alter table dbo.RP_REPORTE drop constraint DF_RP_REPORTE_B_TOTAL_GRAL_CONTEO
go
alter table dbo.RP_REPORTE drop column B_TOTAL_GRAL_CONTEO
go


/*==============================================================*/
/* 3. Version por defecto del contrato: 1.1                     */
/*==============================================================*/
alter table dbo.RP_REPORTE drop constraint DF_RP_REPORTE_CVE_VERSION
go
alter table dbo.RP_REPORTE add constraint DF_RP_REPORTE_CVE_VERSION
   default '1.1' for CVE_VERSION
go


/*==============================================================*/
/* 4. Desactivar reportes incompletos (sin proceso u origen)    */
/*    para que la regla de reporte activo se pueda crear.       */
/*==============================================================*/
update dbo.RP_REPORTE
   set B_ACTIVO = 0,
       F_MODIFICACION = getdate()
 where B_ACTIVO = 1
   and (ID_PROCESO is null or (ID_QUERY is null and ID_PROCEDIMIENTO is null))
go


/*==============================================================*/
/* 5. Validaciones nuevas                                       */
/*==============================================================*/
alter table dbo.RP_REPORTE add
   -- Conteo de bloques solo con break; etiquetas del resumen no vacias
   constraint CK_RP_REPORTE_CONTEO_BLOQUES
         check (TX_CONTEO_BLOQUES is null or (B_BREAK = 1 and len(TX_CONTEO_BLOQUES) > 0)),
   constraint CK_RP_REPORTE_CONTEO_REGISTROS
         check (TX_CONTEO_REGISTROS is null or len(TX_CONTEO_REGISTROS) > 0),
   constraint CK_RP_REPORTE_TX_NOTA
         check (TX_NOTA is null or len(TX_NOTA) > 0),
   -- Nunca ambos origenes a la vez
   constraint CK_RP_REPORTE_ORIGEN
         check (ID_QUERY is null or ID_PROCEDIMIENTO is null),
   -- Un reporte activo debe estar completo: proceso y exactamente un origen
   constraint CK_RP_REPORTE_ACTIVO
         check (B_ACTIVO = 0
                or (ID_PROCESO is not null
                    and (ID_QUERY is not null or ID_PROCEDIMIENTO is not null)))
go


/*==============================================================*/
/* 6. Llaves foraneas                                           */
/*==============================================================*/
alter table dbo.RP_REPORTE
   add constraint FK_RP_REPORTE_REFERENCE_FC_PROCESO foreign key (ID_PROCESO)
      references dbo.FC_PROCESO (ID_PROCESO)
go

alter table dbo.RP_REPORTE
   add constraint FK_RP_REPORTE_REFERENCE_FC_PROCEDIMIENTO foreign key (ID_PROCEDIMIENTO)
      references dbo.FC_PROCEDIMIENTO (ID_QUERY)
go


/*==============================================================*/
/* 7. Datos del reporte QUINIELA_CIERRE                         */
/*    Queda inactivo hasta tener proceso y consulta.            */
/*==============================================================*/
update dbo.RP_REPORTE
   set TX_CONTEO_BLOQUES = 'Participantes',
       TX_NOTA           = '* Pronóstico asignado por el sistema (el participante no eligió)',
       F_MODIFICACION    = getdate()
 where CVE_REPORTE = 'QUINIELA_CIERRE'
go


/*==============================================================*/
/* 8. Verificacion                                              */
/*==============================================================*/
select ID_REPORTE, CVE_REPORTE, CVE_VERSION, ID_PROCESO, ID_QUERY, ID_PROCEDIMIENTO,
       TX_CONTEO_BLOQUES, TX_CONTEO_REGISTROS, TX_NOTA, B_ACTIVO
  from dbo.RP_REPORTE
go

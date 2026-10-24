/*==============================================================*/
/* LIMPIEZA DE NOMBRES: participantes y equipos                 */
/*                                                              */
/*  - Quita espacios al inicio y al final.                      */
/*  - Reduce espacios repetidos internos a uno solo             */
/*    ('LUIS  ALVAREZ' -> 'LUIS ALVAREZ').                      */
/*  - Corrige nombres de equipos mal escritos.                  */
/*                                                              */
/* Uso: ejecutar el paso 1 para revisar que cambiaria. Luego    */
/* ejecutar el paso 2; al final revisar el resultado y          */
/* ejecutar COMMIT o ROLLBACK a mano.                           */
/*                                                              */
/* Nota: en SQL Server 'ABC ' = 'ABC' es verdadero (ignora los  */
/* espacios finales), por eso los filtros comparan tambien      */
/* DATALENGTH.                                                  */
/*                                                              */
/* Tecnica para espacios repetidos: cada espacio se marca con   */
/* CHAR(7), se eliminan las marcas seguidas de espacio y al     */
/* final las marcas restantes.                                  */
/*==============================================================*/


/*==============================================================*/
/* Paso 1: vista previa (no modifica nada)                      */
/*==============================================================*/
select 'Q_PARTICIPANTE' as TABLA, ID_QUINIELA, ID_PARTICIPANTE as ID,
       '[' + NOM_PARTICIPANTE + ']' as ACTUAL,
       '[' + LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(NOM_PARTICIPANTE,
                 ' ', ' ' + CHAR(7)), CHAR(7) + ' ', ''), CHAR(7), ''))) + ']' as NUEVO
  from dbo.Q_PARTICIPANTE
 where DATALENGTH(NOM_PARTICIPANTE) <> DATALENGTH(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(NOM_PARTICIPANTE,
                 ' ', ' ' + CHAR(7)), CHAR(7) + ' ', ''), CHAR(7), ''))))

select 'Q_EQUIPO' as TABLA, ID_EQUIPO as ID,
       '[' + NOM_EQUIPO + ']' as ACTUAL,
       '[' + REPLACE(REPLACE(
                LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(NOM_EQUIPO,
                    ' ', ' ' + CHAR(7)), CHAR(7) + ' ', ''), CHAR(7), ''))),
             'Bucaneers', 'Buccaneers'), 'Comanders', 'Commanders') + ']' as NUEVO
  from dbo.Q_EQUIPO
 where DATALENGTH(NOM_EQUIPO) <> DATALENGTH(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(NOM_EQUIPO,
                 ' ', ' ' + CHAR(7)), CHAR(7) + ' ', ''), CHAR(7), ''))))
    or NOM_EQUIPO like '%Bucaneers%'
    or NOM_EQUIPO like '%Comanders%'
go


/*==============================================================*/
/* Paso 2: actualizacion dentro de una transaccion              */
/*==============================================================*/
begin transaction

-- Participantes: espacios
update dbo.Q_PARTICIPANTE
   set NOM_PARTICIPANTE = LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(NOM_PARTICIPANTE,
                             ' ', ' ' + CHAR(7)), CHAR(7) + ' ', ''), CHAR(7), '')))
 where DATALENGTH(NOM_PARTICIPANTE) <> DATALENGTH(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(NOM_PARTICIPANTE,
                             ' ', ' ' + CHAR(7)), CHAR(7) + ' ', ''), CHAR(7), ''))))

print 'Q_PARTICIPANTE actualizados: ' + CAST(@@ROWCOUNT as varchar(10))

-- Equipos: espacios
update dbo.Q_EQUIPO
   set NOM_EQUIPO = LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(NOM_EQUIPO,
                       ' ', ' ' + CHAR(7)), CHAR(7) + ' ', ''), CHAR(7), '')))
 where DATALENGTH(NOM_EQUIPO) <> DATALENGTH(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(NOM_EQUIPO,
                       ' ', ' ' + CHAR(7)), CHAR(7) + ' ', ''), CHAR(7), ''))))

print 'Q_EQUIPO actualizados (espacios): ' + CAST(@@ROWCOUNT as varchar(10))

-- Equipos: ortografia
update dbo.Q_EQUIPO
   set NOM_EQUIPO = REPLACE(REPLACE(NOM_EQUIPO, 'Bucaneers', 'Buccaneers'), 'Comanders', 'Commanders')
 where NOM_EQUIPO like '%Bucaneers%'
    or NOM_EQUIPO like '%Comanders%'

print 'Q_EQUIPO actualizados (ortografia): ' + CAST(@@ROWCOUNT as varchar(10))

-- Revision del resultado
select ID_QUINIELA, ID_PARTICIPANTE, '[' + NOM_PARTICIPANTE + ']' as NOM_PARTICIPANTE
  from dbo.Q_PARTICIPANTE
 order by ID_QUINIELA, ID_PARTICIPANTE

select ID_EQUIPO, '[' + NOM_EQUIPO + ']' as NOM_EQUIPO
  from dbo.Q_EQUIPO
 order by ID_EQUIPO

-- Si todo esta bien:   commit transaction
-- Si algo esta mal:    rollback transaction

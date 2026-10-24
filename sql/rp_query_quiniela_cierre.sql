/*==============================================================*/
/* REPORTEADOR - CONSULTA DE DATOS: QUINIELA_CIERRE             */
/* Se registra en FC_QUERY.TX_SQL con B_NO_DATA_ERROR = 1 y un  */
/* MSG_NO_DATA como:                                            */
/*   'La quiniela no ha cerrado o no tiene pronósticos'         */
/*                                                              */
/* Parametros de reemplazo (los manda el lanzador en parmRemp): */
/*   $1 : ID_QUINIELA                                           */
/*   $2 : ID_PERIODO                                            */
/*                                                              */
/* Secciones que espera el motor:                               */
/*   encabezado : objeto con TITULO, SUBTITULO, F_INFORMACION   */
/*   detalle    : filas planas; alias = NOM_CAMPO de            */
/*                RP_REPORTE_COLUMNA + BREAK_TEXTO              */
/*                                                              */
/* Validacion de cierre: la consulta principal parte del        */
/* periodo y solo regresa una fila si ya paso la fecha y hora   */
/* limite (hora del servidor de base de datos, Cd. de Mexico).  */
/* Si no ha cerrado, no regresa nada y la API responde con      */
/* MSG_NO_DATA.                                                 */
/*==============================================================*/
SELECT
    JSON_QUERY((
        SELECT
            'Reporte de Quinielas ' + LTRIM(RTRIM(QU.TIT_QUINIELA))          AS TITULO,
            'Semana ' + LTRIM(RTRIM(PE.ID_PERIODO)) + ' NFL'
              + ' · Temporada ' + LTRIM(RTRIM(QU.TEMPORADA))
              + ' · Cerrada: '  + CONVERT(varchar(10), PE.F_LIMITE, 111)                         -- AAAA/MM/DD
              + ' '             + LTRIM(RTRIM(PE.HORA_LIMITE))               AS SUBTITULO,       -- HH:MM:SS
            PE.F_LIMITE                                                      AS F_INFORMACION    -- date: "AAAA-MM-DD"
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    )) AS encabezado,

    JSON_QUERY((
        SELECT
            'Participante ' + CAST(P.ID_PARTICIPANTE AS varchar(10))
              + ': ' + LTRIM(RTRIM(P.NOM_PARTICIPANTE))                      AS BREAK_TEXTO,
            Q.ID_PARTIDO                                                     AS partido,
            LTRIM(RTRIM(E1.NOM_EQUIPO))                                      AS visitante,
            CASE WHEN Q.CVE_GANADOR = 'V' THEN 'X' END                       AS pronVisitante,
            LTRIM(RTRIM(E2.NOM_EQUIPO))                                      AS local,
            CASE WHEN Q.CVE_GANADOR = 'L' THEN 'X' END                       AS pronLocal,
            CASE WHEN QU.B_DESEMPATE = 1 AND T.B_MARCADOR = 1
                 THEN '(' + CAST(Q.ID_SCORE_1 AS varchar(3))
                    + '-' + CAST(Q.ID_SCORE_2 AS varchar(3)) + ')'
            END                                                              AS desempate
        FROM Q_QUIN_PARTICIPANTE Q
        INNER JOIN Q_PARTICIPANTE P
            ON  P.ID_QUINIELA     = Q.ID_QUINIELA
            AND P.ID_PARTICIPANTE = Q.ID_PARTICIPANTE
        INNER JOIN Q_PARTIDO T
            ON  T.ID_PERIODO      = Q.ID_PERIODO
            AND T.ID_PARTIDO      = Q.ID_PARTIDO
        INNER JOIN Q_EQUIPO E1
            ON  E1.ID_EQUIPO      = T.ID_EQUIPO_1
        INNER JOIN Q_EQUIPO E2
            ON  E2.ID_EQUIPO      = T.ID_EQUIPO_2
        WHERE Q.ID_QUINIELA = PE.ID_QUINIELA
          AND Q.ID_PERIODO  = PE.ID_PERIODO
        ORDER BY Q.ID_PARTICIPANTE, Q.ID_PARTIDO
        FOR JSON PATH
    )) AS detalle

FROM Q_PERIODO PE
INNER JOIN Q_QUINIELA QU
    ON QU.ID_QUINIELA = PE.ID_QUINIELA
WHERE PE.ID_QUINIELA = $1
  AND PE.ID_PERIODO  = '$2'
  -- Solo si ya cerro: F_LIMITE (date) + HORA_LIMITE ('HH:MM:SS')
  AND CAST(PE.F_LIMITE AS datetime) + CAST(PE.HORA_LIMITE AS datetime) <= GETDATE()
FOR JSON PATH, WITHOUT_ARRAY_WRAPPER

/*==============================================================*/
/* REPORTEADOR - TABLAS DE DEFINICION DE REPORTES               */
/* Contrato JSON v1.0                                           */
/*                                                              */
/* Tarea 1: tablas, catalogos, llaves y validaciones (CHECK).   */
/* Pendientes: vista de inconsistencias, consulta de la         */
/* definicion en JSON, reportes de ejemplo y manejo de queries. */
/*==============================================================*/


/*==============================================================*/
/* Table: RP_FORMATO                                            */
/* Catalogo de formatos de pagina                               */
/*==============================================================*/
create table dbo.RP_FORMATO (
   CVE_FORMATO          varchar(20)          not null,
   TX_DESCRIPCION       varchar(100)         not null,
   constraint PK_RP_FORMATO primary key (CVE_FORMATO)
         on "PRIMARY"
)
on "PRIMARY"
go

/*==============================================================*/
/* Table: RP_ALINEACION                                         */
/* Catalogo de alineaciones de columna                          */
/*==============================================================*/
create table dbo.RP_ALINEACION (
   CVE_ALINEACION       varchar(10)          not null,
   TX_DESCRIPCION       varchar(100)         not null,
   constraint PK_RP_ALINEACION primary key (CVE_ALINEACION)
         on "PRIMARY"
)
on "PRIMARY"
go

/*==============================================================*/
/* Table: RP_TIPO_DATO                                          */
/* Catalogo de tipos de dato de columna                         */
/*==============================================================*/
create table dbo.RP_TIPO_DATO (
   CVE_TIPO             varchar(15)          not null,
   TX_DESCRIPCION       varchar(100)         not null,
   constraint PK_RP_TIPO_DATO primary key (CVE_TIPO)
         on "PRIMARY"
)
on "PRIMARY"
go

/*==============================================================*/
/* Table: RP_REPORTE                                            */
/* Una fila por reporte                                         */
/*==============================================================*/
create table dbo.RP_REPORTE (
   ID_REPORTE           int                  not null,
   CVE_REPORTE          varchar(50)          not null,
   TX_DESCRIPCION       varchar(200)         null,
   CVE_VERSION          varchar(10)          not null
         constraint DF_RP_REPORTE_CVE_VERSION default '1.1',
   CVE_FORMATO          varchar(20)          not null,
   CVE_LOGO             varchar(50)          not null,
   TX_TITULO            varchar(150)         not null,
   ID_PROCESO           int                  null,     -- proceso de negocio (FC_PROCESO)
   ID_QUERY             int                  null,     -- origen de datos: consulta (FC_QUERY)
   ID_PROCEDIMIENTO     int                  null,     -- origen de datos: procedimiento (FC_PROCEDIMIENTO)
   B_BREAK              bit                  not null
         constraint DF_RP_REPORTE_B_BREAK default 0,
   B_BREAK_SALTO_PAG    bit                  not null
         constraint DF_RP_REPORTE_B_BREAK_SALTO_PAG default 0,
   B_BREAK_TOTAL        bit                  not null
         constraint DF_RP_REPORTE_B_BREAK_TOTAL default 0,
   TX_BREAK_TOTAL       varchar(60)          null,
   B_BREAK_CONTEO       bit                  not null
         constraint DF_RP_REPORTE_B_BREAK_CONTEO default 0,
   B_TOTAL_GRAL         bit                  not null
         constraint DF_RP_REPORTE_B_TOTAL_GRAL default 0,
   TX_TOTAL_GRAL        varchar(60)          null,
   TX_CONTEO_BLOQUES    varchar(60)          null,     -- resumen: "<etiqueta>: <num. de bloques>"
   TX_CONTEO_REGISTROS  varchar(60)          null,     -- resumen: "<etiqueta>: <num. de filas>"
   TX_NOTA              varchar(200)         null,     -- resumen: texto fijo al final
   B_ACTIVO             bit                  not null
         constraint DF_RP_REPORTE_B_ACTIVO default 1,
   F_ALTA               datetime             not null
         constraint DF_RP_REPORTE_F_ALTA default getdate(),
   F_MODIFICACION       datetime             null,
   CVE_USUARIO_MOD      varchar(50)          null,
   constraint PK_RP_REPORTE primary key (ID_REPORTE)
         on "PRIMARY",

   -- Clave: solo mayusculas, numeros y guion bajo (ej. QUINIELA_CIERRE)
   constraint CK_RP_REPORTE_CVE_REPORTE
         check (CVE_REPORTE collate Latin1_General_BIN not like '%[^A-Z0-9_]%'
                and len(CVE_REPORTE) > 0),
   -- Versiones del contrato soportadas
   constraint CK_RP_REPORTE_CVE_VERSION
         check (CVE_VERSION in ('1.0', '1.1')),
   -- Logo: identificador, nunca una ruta
   constraint CK_RP_REPORTE_CVE_LOGO
         check (CVE_LOGO collate Latin1_General_BIN not like '%[^A-Za-z0-9_-]%'
                and len(CVE_LOGO) > 0),
   constraint CK_RP_REPORTE_TX_TITULO
         check (len(TX_TITULO) > 0),
   -- Sin break no hay salto de pagina ni total por break
   constraint CK_RP_REPORTE_BREAK
         check (B_BREAK = 1 or (B_BREAK_SALTO_PAG = 0 and B_BREAK_TOTAL = 0 and B_BREAK_CONTEO = 0)),
   -- El conteo por break solo aplica si hay total por break
   constraint CK_RP_REPORTE_BREAK_CONTEO
         check (B_BREAK_CONTEO = 0 or B_BREAK_TOTAL = 1),
   -- Total por break requiere etiqueta
   constraint CK_RP_REPORTE_BREAK_TOTAL
         check (B_BREAK_TOTAL = 0 or (TX_BREAK_TOTAL is not null and len(TX_BREAK_TOTAL) > 0)),
   -- Total general requiere etiqueta
   constraint CK_RP_REPORTE_TOTAL_GRAL
         check (B_TOTAL_GRAL = 0 or (TX_TOTAL_GRAL is not null and len(TX_TOTAL_GRAL) > 0)),
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
)
on "PRIMARY"
go

/*==============================================================*/
/* Index: IX_RP_REPORTE_CVE_REPORTE                             */
/*==============================================================*/
create unique index IX_RP_REPORTE_CVE_REPORTE on dbo.RP_REPORTE (
CVE_REPORTE ASC
)
on "PRIMARY"
go

/*==============================================================*/
/* Table: RP_REPORTE_COLUMNA                                    */
/* Una fila por columna del detalle                             */
/*==============================================================*/
create table dbo.RP_REPORTE_COLUMNA (
   ID_REPORTE           int                  not null,
   NUM_ORDEN            int                  not null,
   NOM_CAMPO            varchar(64)          not null,
   TX_TITULO            varchar(60)          not null,   -- puede ser ''
   CVE_TIPO             varchar(15)          not null,
   NUM_DECIMALES        int                  null,     -- solo decimal y porcentaje (null = 2)
   NUM_PESO             numeric(5,2)         null,     -- solo texto (null = 1)
   B_TOTALIZAR          bit                  not null
         constraint DF_RP_REPORTE_COLUMNA_B_TOTALIZAR default 0,
   CVE_ALINEACION       varchar(10)          null,   -- null = la del tipo
   constraint PK_RP_REPORTE_COLUMNA primary key (ID_REPORTE, NUM_ORDEN)
         on "PRIMARY",

   constraint CK_RP_REPORTE_COLUMNA_NUM_ORDEN
         check (NUM_ORDEN > 0),
   -- Campo: nombre de la propiedad en el JSON de datos
   constraint CK_RP_REPORTE_COLUMNA_NOM_CAMPO
         check (NOM_CAMPO collate Latin1_General_BIN not like '%[^A-Za-z0-9_]%'
                and NOM_CAMPO collate Latin1_General_BIN like '[A-Za-z_]%'),
   -- Decimales solo en decimal y porcentaje, de 0 a 6
   constraint CK_RP_REPORTE_COLUMNA_NUM_DECIMALES
         check (NUM_DECIMALES is null
                or (CVE_TIPO in ('decimal', 'porcentaje') and NUM_DECIMALES between 0 and 6)),
   -- Peso solo en texto y mayor a cero
   constraint CK_RP_REPORTE_COLUMNA_NUM_PESO
         check (NUM_PESO is null or (CVE_TIPO = 'texto' and NUM_PESO > 0)),
   -- Solo se totalizan entero, decimal y moneda (porcentaje no)
   constraint CK_RP_REPORTE_COLUMNA_B_TOTALIZAR
         check (B_TOTALIZAR = 0 or CVE_TIPO in ('entero', 'decimal', 'moneda'))
)
on "PRIMARY"
go

/*==============================================================*/
/* Index: IX_RP_REPORTE_COLUMNA_NOM_CAMPO                       */
/* Un campo no se repite dentro del mismo reporte               */
/*==============================================================*/
create unique index IX_RP_REPORTE_COLUMNA_NOM_CAMPO on dbo.RP_REPORTE_COLUMNA (
ID_REPORTE ASC,
NOM_CAMPO ASC
)
on "PRIMARY"
go


/*==============================================================*/
/* Llaves foraneas                                              */
/*==============================================================*/
alter table dbo.RP_REPORTE
   add constraint FK_RP_REPORTE_REFERENCE_RP_FORMATO foreign key (CVE_FORMATO)
      references dbo.RP_FORMATO (CVE_FORMATO)
go

alter table dbo.RP_REPORTE
   add constraint FK_RP_REPORTE_REFERENCE_FC_PROCESO foreign key (ID_PROCESO)
      references dbo.FC_PROCESO (ID_PROCESO)
go

alter table dbo.RP_REPORTE
   add constraint FK_RP_REPORTE_REFERENCE_FC_QUERY foreign key (ID_QUERY)
      references dbo.FC_QUERY (ID_QUERY)
go

alter table dbo.RP_REPORTE
   add constraint FK_RP_REPORTE_REFERENCE_FC_PROCEDIMIENTO foreign key (ID_PROCEDIMIENTO)
      references dbo.FC_PROCEDIMIENTO (ID_QUERY)
go

alter table dbo.RP_REPORTE_COLUMNA
   add constraint FK_RP_REPORTE_COLUMNA_REFERENCE_RP_REPORTE foreign key (ID_REPORTE)
      references dbo.RP_REPORTE (ID_REPORTE)
go

alter table dbo.RP_REPORTE_COLUMNA
   add constraint FK_RP_REPORTE_COLUMNA_REFERENCE_RP_TIPO_DATO foreign key (CVE_TIPO)
      references dbo.RP_TIPO_DATO (CVE_TIPO)
go

alter table dbo.RP_REPORTE_COLUMNA
   add constraint FK_RP_REPORTE_COLUMNA_REFERENCE_RP_ALINEACION foreign key (CVE_ALINEACION)
      references dbo.RP_ALINEACION (CVE_ALINEACION)
go


/*==============================================================*/
/* Datos de catalogos                                           */
/* Los valores son los del contrato v1.0; no agregar valores    */
/* sin actualizar el componente.                                */
/*==============================================================*/
insert into dbo.RP_FORMATO (CVE_FORMATO, TX_DESCRIPCION) values
   ('vertical',           'Carta vertical, detalle a 10 pt'),
   ('horizontal',         'Carta horizontal, detalle a 10 pt'),
   ('horizontalCompacto', 'Carta horizontal, detalle a 8 pt (muchas columnas)')
go

insert into dbo.RP_ALINEACION (CVE_ALINEACION, TX_DESCRIPCION) values
   ('izquierda', 'Alineado a la izquierda'),
   ('centro',    'Centrado'),
   ('derecha',   'Alineado a la derecha')
go

insert into dbo.RP_TIPO_DATO (CVE_TIPO, TX_DESCRIPCION) values
   ('texto',      'Texto libre; se ajusta en varias lineas. Izquierda'),
   ('codigo',     'Clave o folio; nunca se parte. Izquierda'),
   ('entero',     'Numero entero con separador de miles. Derecha. Totalizable'),
   ('decimal',    'Numero con decimales (NUM_DECIMALES, por defecto 2). Derecha. Totalizable'),
   ('moneda',     'Importe con 2 decimales, sin simbolo. Derecha. Totalizable'),
   ('porcentaje', 'Valor como 15 = 15%, con NUM_DECIMALES. Derecha. No totalizable'),
   ('fecha',      'Entrada AAAA-MM-DD, salida AAAA/MM/DD. Centro'),
   ('fechaHora',  'Entrada AAAA-MM-DDTHH:MM:SS, salida AAAA/MM/DD HH:MM:SS. Centro')
go

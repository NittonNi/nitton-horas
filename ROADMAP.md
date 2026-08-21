# Roadmap

Lo que falta, en el orden en que tiene sentido hacerlo. Se va moviendo a
"Hecho" segun entra en `main`.

## Por arreglar

### Revision a fondo del 21-ago-2026

Nicolas pidio repasar la aplicacion entera sin esperar respuesta -codigo,
usabilidad, backend, seguridad, movil y escritorio- y arreglar lo que
hiciera falta. Encontrado y arreglado por el camino:

- **Doble consulta de sesion y catalogo en la ficha de proyecto**:
  `generateMetadata` y la propia pagina de `proyectos/[id]` pedian cada una
  por su cuenta `getSesion()` y `cargarCatalogo()`, asi que cada carga de
  esa pagina eran cuatro consultas en vez de dos. `getPerfil`,
  `getPertenencias`, `getSesion` (en `src/lib/sesion.ts`) y `cargarCatalogo`
  (en `src/lib/datos.ts`) van ahora envueltas en `cache()` de React, que
  comparte el resultado entre quien las pida dentro del mismo request. De
  paso beneficia a `layout.tsx` de `(app)`, que tambien pide `getSesion()`
  en cada pagina.
- **Se contaban dos veces las horas de un proyecto con ediciones y un cierre
  general a la vez**: `resumenDeResultados` (en
  `src/components/resultados-proyecto.tsx`) sumaba las horas de un cierre
  sin edicion por rango de fechas, sin excluir las horas que ya pertenecian
  a una edicion con su propio cierre. Si ese cierre general se reguardaba
  despues de crear ediciones, su periodo se estiraba hasta hoy y las horas
  de cada edicion contaban dos veces: una por su `edition_id`, otra por caer
  dentro del rango del cierre general. Corregido ahi y en
  `tarjetas-edicion.tsx` -mismo criterio en la tarjeta individual, no solo
  en el resumen agregado-. Verificado con datos reales: el proyecto CLOCKIFY
  DUPLICADO tenia exactamente este caso, y las horas facturables pasaron de
  contar 18s (el doble) a los 9s reales.
- **No habia paginas propias de error ni de "no encontrado"**: un
  `notFound()` -por ejemplo, entrar a la ficha de un proyecto borrado- o
  cualquier excepcion sin capturar caian en las paginas genericas de
  Next.js, sin marca. Ahora hay `not-found.tsx` y `error.tsx` dentro de
  `(app)` -mantienen la barra lateral visible, porque el limite de error no
  envuelve el layout de su propio segmento- y en la raiz, para
  acceso/auth/bienvenida y para cualquier URL que no case con ninguna ruta;
  mas `global-error.tsx` por si se rompe el layout raiz -con su propio
  html/body y el mismo script de tema que el layout real, porque ese
  archivo no hereda estilos globales de forma automatica-. Los `error.tsx`
  usan `retry()` en vez de `reset()` -estable desde Next 16.3, vuelve a
  pedir los datos ademas de limpiar el estado-. Probado en vivo: id de
  proyecto inexistente, URL fuera de toda ruta, y una excepcion forzada
  temporalmente para comprobar que el limite la capturaba bien.
- **Cinco funciones de base de datos expuestas por RPC sin necesidad**:
  el asesor de seguridad de Supabase marcaba unas 20 funciones como
  ejecutables por `anon`/`authenticated` via `/rest/v1/rpc/...`. La mayoria
  son intencionadas -`create_workspace`, `join_workspace`,
  `responder_invitacion` y similares, que el cliente llama de verdad, o
  predicados como `is_admin`/`is_member` que ademas se usan por dentro de
  varias politicas RLS y **no se pueden tocar sin arriesgarse a romperlas**-,
  asi que se dejaron como estaban. Pero cinco no tenian ningun motivo para
  estar expuestas: `aplicar_estilo_descripcion`, `aplicar_estilo_nombre`,
  `separar_si_cambia` y `set_local_date` son disparadores puros -viven de
  `new`/`old`, fallan solas si se llaman fuera de un disparador, y el codigo
  no las llama nunca a mano-, y `normalizar_texto_existente` la llama el
  cliente pero solo para un administrador ya autenticado (la propia funcion
  ya rechaza a quien no lo sea). Revocado el `EXECUTE` de las cuatro
  primeras para `anon` y `authenticated`, y el de la quinta solo para
  `anon`. **Ojo con el detalle que costo un intento en falso**: revocar de
  esos dos roles con nombre no sirvio de nada la primera vez porque las
  funciones tenian `EXECUTE` concedido a PUBLIC desde que se crearon -el
  comportamiento por defecto de Postgres-, y PUBLIC se aplica pase lo que
  pase con los roles concretos; hubo que revocarlo de PUBLIC. Comprobado
  con `has_function_privilege` antes y despues de cada intento, y en vivo
  arrancando y parando el cronometro de verdad -`set_local_date` sigue
  poniendo bien el dia de cada hora nueva-.

### Google OAuth y correo de produccion

Configurado el 20-ago-2026: cuenta `hitooclock@gmail.com` con proyecto propio
en Google Cloud, pantalla de consentimiento publicada, credenciales pegadas
en Supabase. Pendiente de probar el flujo completo una vez despliegue el
arreglo del boton de cerrar sesion (necesario para probarlo mas de una vez
seguida). Sigue pendiente el SMTP propio: los correos van con el servicio por
defecto de Supabase, con limite bajo -no vale para que lo use otro equipo-.

### Faltan estados de carga: la pantalla se queda parada y de golpe aparece todo

Apuntado por Nicolas el 20-ago-2026. En varios sitios de la app, mientras se
espera la respuesta de Supabase no hay ningun aviso -ni esqueleto, ni
spinner-, asi que da la sensacion de que se ha quedado colgado. Luego aparece
todo de golpe. Confunde bastante, sobre todo en conexiones lentas o con listas
largas.

**Arreglado el 20-ago-2026** para las paginas principales: `loading.tsx` de
Next.js (panel, calendario, informes, semana, estadisticas, proyectos
-incluida la ficha, que cae en el mismo- y gestion -incluidas todas sus
subpaginas: equipo, categorias, tarifas, importar, ajustes-), con un esqueleto
generico y reutilizable (`EsqueletoPagina`, el mismo patron de bloques grises
`animate-pulse` que ya usaba el formulario de `/acceso`). Se nota tanto al
navegar entre paginas como al recargar, mientras se resuelve la consulta a
Supabase de esa pagina.

**Cerrado el 20-ago-2026**: el tramo de la sesion del layout (`getSesion` +
el cronometro en marcha), que ningun `loading.tsx` de seccion cubria, ahora
tiene el suyo en `src/app/loading.tsx` -un spinner centrado, sin ligar a
ningun layout a proposito, porque tambien cubre las paginas publicas antes
del propio `(app)`-. Probado en vivo: la portada publica sigue cargando
igual que antes.

Queda pendiente si hace falta: afinar el esqueleto de cada pagina para que
se parezca mas a su contenido real en vez de bloques genericos.

### Filtro "marcar todos" se queda atras si se crea algo nuevo mientras esta activo

Visto el 20-ago-2026 en revision de codigo, en
`src/components/filtro-multiple.tsx`. No es un fallo del "Marcar todos" del
19-ago -al reves, el diseño es a proposito: guarda la lista explicita de ids
para poder luego ir quitando uno ("todos menos este"), que es todo el sentido
del boton-.

El roce es otro: si mientras ese filtro sigue activo se crea un proyecto, una
rama o una etiqueta nueva, la casilla de cabecera se da cuenta sola -pasa de
marcada a "5/6"-, pero **el informe o la estadistica que esta mirando esa
persona en ese momento no avisa**, solo deja de contar la entrada nueva. Pasa
igual en cualquier filtro de la app que se deje a medias sin querer, no es
exclusivo de este boton.

Que hacer, a decidir: o bien un aviso visible cuando el filtro activo ya no
cubre todo lo que hay ("hay 1 proyecto nuevo fuera del filtro"), o bien
aceptar que es el precio de tener el boton de "todos menos este" y dejarlo
documentado. No toco el codigo hasta decidir cual.

### Continuar arranca, pero no se nota

Diagnosticado el 19-ago-2026. **Si funciona**: al pulsarlo se crea una entrada
nueva que empieza en ese momento, con el mismo proyecto, tarea, etiquetas,
descripcion y si se cobra. Se comprobo en el navegador y quedo el rastro en
los datos de Nicolas: una entrada de **2 segundos** a las 02:42, que es
exactamente el patron de arrancar y parar enseguida al no ver nada.

El problema era que **no se veia**: el cronometro se ponia en marcha en la
barra de arriba y en la lateral, pero la lista de horas -que es donde estas
mirando cuando pulsas- no cambiaba nada. Parecia que el boton no habia hecho
nada.

**Arreglado el 20-ago-2026**: la entrada en marcha sale ahora como una fila
propia, teñida de naranja, encima de toda la lista -`FilaEnMarcha`, en
`src/components/lista-entradas.tsx`-, contando en vivo con el mismo reloj de
la barra y con un boton de parar directo ahi. Se edita desde la barra, igual
que antes; aqui solo se ve y se para. Al pulsar Continuar en cualquier hora de
abajo, la fila aparece al instante en el sitio donde se estaba mirando.

Ojo tambien: las dos entradas iguales de LALALA a las 09:00 no son de
continuar, son del boton de duplicar. Conviene mirar si duplicar deberia
avisar de algo, porque deja dos filas identicas sin mas.

### Las horas compartidas no se ven

Revisado el 20-ago-2026: la mayoria de esto ya estaba hecho, y esta nota se
habia quedado desactualizada.

Ya resuelto: se proponen desde el cronometro, el calendario y el dialogo de
apuntar a mano (informes y ficha de proyecto); si estas solo en el espacio,
la barra lo explica en vez de esconder el selector ("Trae a tu equipo..."); y
cada entrada enseña con quien mas cuenta y en que estado -pendiente, aceptada,
rechazada- con su propio boton (`CompartirCon`, en `fila-entrada.tsx`).

Sigue sin poder proponerse **desde la hoja semanal**, que es el mismo punto 5
de la lista de pendientes de mas abajo.

## Enfoque LEINN

Todo esto sale de la sesion del 18-ago-2026, al girar el producto de "horas
para un equipo" a "horas para cualquier equipo de LEINN".

### Estado a 19-ago-2026

Hecha toda la lista de la sesion. Por encima: nombre ClockLEINN; portada
publica de producto en `/` -con lo que hace, la categorizacion, las ediciones,
los tres pasos y las preguntas de siempre- y aplicacion en `/panel`;
categorizacion de dos niveles con objetivo por rama, visible en el listado de
proyectos y con una columna por nivel en informes y Excel; ediciones de
proyecto en las cuatro pantallas donde se apuntan horas; objetivos de dia,
semana y rama con lo que falta a la vista; horas compartidas desde el
cronometro, con el selector siempre visible y con quien mas cuenta cada hora
en su propia fila; etiquetas que se crean desde el selector; ninguna hora
suelta -ni al parar, ni a mano, ni en el calendario- si el espacio lo exige;
resumen del cronometro con tres huecos a gusto de cada uno; informes con
filtro y desgloses por categoria y por edicion y descarga completa; tildes y
enes; menu lateral con la gestion desplegada.

Repasada tambien la seguridad el 19-ago: cerrado el redirect abierto de
`?volver=` y `?next=`, contestar una propuesta se queda en manos de quien la
recibe, revocado el permiso de ejecutar las funciones a quien no ha entrado y
los disparadores a todo el mundo, y cabeceras puestas -nosniff, marcos
denegados, HSTS y politica de contenido en produccion-. Icono propio en su
sitio.

Y en la ultima tanda: deshacer lo ultimo que se hizo en bloque -incluido el
borrado, que devuelve la fila entera con su origen-, apartado de
**Estadisticas** (doce meses, reparto por rama, presupuestos), aviso de los
dias laborables sin apuntar, filtro de abiertas y cerradas, guia de despliegue
e icono propio.

Y el 19-ago por la noche: los informes dejan de ser de solo mirar -se corrige
una hora pulsandola, o varias a la vez: moverlas de proyecto, marcarlas como
facturables, ponerles etiqueta, cerrarlas o borrarlas-, la bienvenida pregunta
por fin si se quiere la plantilla de LEINN, hay guia rapida la primera vez
(y un boton en el perfil para volver a verla) y buscador en proyectos.

Y la tanda del 20-ago: **cualquiera del espacio corrige las horas de
cualquiera** -el dinero sigue siendo de quien gestiona, y lo cerrado sigue
cerrado-, con rastro de quien toco cada hora; **proyecto y edicion se eligen a
la vez** en el mismo desplegable; las duraciones se leen en `hh:mm:ss` y las
descargas llevan la duracion legible y el decimal para sumar; los **clientes**
se crean desde el proyecto y el catalogo pasa a ser su resumen; y el importador
pregunta si el campo *Cliente* del CSV es un cliente o la rama del equipo.

Repaso de UX del 20-ago: apuntar a mano ya deja elegir el dia, el calendario
abre por donde se trabaja, deshacer sale abajo al borrar una hora -y duplicar y
borrar viven detras de los tres puntos-, y el alta del equipo se hace **al
estilo Tricount**: quien administra escribe los nombres, reparte un enlace y
cada uno dice cual es el suyo.

**Pendiente**:

0. **Repaso de UX en movil**. Apuntado por Nicolas el 20-ago-2026, y pedido
   sin esperar respuesta el mismo dia: no solo la distribucion, tambien que
   pasa al deslizar, si el teclado tapa algo, si se puede deslizar bien.

   **Auditoria hecha por codigo el 20-ago-2026** -aviso honesto: el
   navegador de esta sesion no deja cambiar el ancho de la ventana de
   verdad (`resize_window` no cambia lo que de verdad se renderiza), asi
   que nada de esto se ha visto con los ojos a un ancho de movil real.
   Falta que Nicolas lo mire desde su telefono, que es justo lo que ya
   tenia pendiente hacer el mismo-.

   Arreglado, con bastante confianza porque son bugs claros leyendo el
   codigo:
   - **Zoom automatico de iOS al tocar un campo**: cualquier `input`,
     `select` o `textarea` con letra menor de 16px hace que iOS Safari
     amplie toda la pagina al enfocarlo -pasaba en todos los formularios,
     `.field` estaba en 14px-. Con un `@media` que solo toca movil/tablet
     (hasta 1023px, el mismo corte que ya usa el resto de la app para
     barra lateral/inferior) se sube a 16px ahi sin tocar el tamaño en
     escritorio.
   - **El dialogo de editar una hora podia quedarse sin sitio para
     Guardar**: `dialogo-entrada.tsx` -el que se abre en movil al tocar
     cualquier hora, y tambien desde informes y la ficha de proyecto- no
     tenia limite de alto ni scroll propio. Con el teclado ocupando media
     pantalla, un formulario largo (descripcion, proyecto, fecha, horas,
     etiquetas, compartir) se podia salir por abajo sin forma de llegar al
     boton de guardar. Ahora tiene el mismo patron que ya usaba el dialogo
     de aceptar reuniones de Google -alto maximo 90vh, cabecera y pie
     fijos, y el cuerpo con scroll propio-. Comprobado que los
     desplegables de dentro (proyecto, etiquetas, compartir) no se cortan,
     porque son de Radix y se pintan fuera del dialogo (`Popover.Portal`).

   Revisado y **ya estaba bien hecho**, sin tocar nada:
   - El arrastre del calendario para crear/mover horas ya usa Pointer
     Events (raton y dedo con el mismo codigo), con mantener pulsado 350ms
     en tactil antes de empezar a arrastrar -para no confundirlo con hacer
     scroll de la pantalla-, tolerancia de 8px de movimiento y vibracion al
     empezar. Nivel de detalle ya muy por delante de lo tipico.
   - Las tablas anchas (informes) ya ruedan por dentro de su propio
     contenedor (`overflow-x-auto`) en vez de estirar toda la pagina.
   - Las filas de filtros (informes, estadisticas) ya usan `flex-wrap`, y
     alguna ya cambia a rejilla de 2 columnas en movil a proposito.
   - Los desplegables de proyecto/etiquetas ya limitan su ancho a
     `100vw - 2rem` para no salirse en pantallas estrechas.
   - `min-h-dvh` en el armazon general -la unidad correcta para que la
     barra del navegador movil no monte encima del contenido-, y la barra
     inferior ya respeta `env(safe-area-inset-bottom)` del iPhone.

   Queda por mirar con el telefono de verdad, no solo leyendo el codigo:
   - Si el zoom de iOS queda bien arreglado de verdad en un iPhone real
     -el `viewport` no lleva `maximum-scale` a proposito: bloquear el zoom
     del todo es peor, hay quien lo necesita para leer-.
   - Estadisticas tiene ahora bastantes graficas interactivas (clic para
     cruzar, hover con desglose): en tactil no hay "hover" de verdad, asi
     que conviene ver como se siente tocarlas -el primer toque puede que
     solo enseñe el aviso en vez de filtrar, hay que probarlo-.
   - Los dialogos cortos (nuevo proyecto, ajustes de Google Calendar) se
     quedaron sin el mismo tratamiento de alto maximo/scroll -su contenido
     es corto, pero conviene confirmarlo con el teclado abierto de verdad-.
   - Tamaño de los botones pequeños (borrar, cerrar) para el dedo: no se
     ha medido ninguno a proposito.


1. **Desplegar**: `DESPLIEGUE.md` lleva los pasos en orden -Vercel, las URLs de
   Supabase, las credenciales de Google, el dominio- con lo que hay que
   comprobar despues de cada uno. Es lo unico que separa esto de que lo use
   otro equipo de LEINN, y necesita las cuentas de Nicolas.
2. **En el panel de Supabase, a mano**: activar la proteccion de contrasenas
   filtradas y subir el minimo a 8 caracteres. Dos interruptores.
3. ~~Aprobar horas~~ **descartado el 20-ago-2026**: dentro de un equipo LEINN
   nadie tiene que aprobar las horas de otro -cerrar ya vale, y con eso basta-.
   Solo tendria sentido si esto se usa para empresas de fuera de LEINN, y ese
   caso no esta decidido todavia. No implementar mientras siga sin decidir.
4. **La hoja semanal solo deja editar las tuyas**. Para un administrador
   tendria sentido tambien ahi; en el calendario y en los informes ya se puede.
5. **Horas compartidas, tercera vuelta**: proponerlas desde la hoja semanal, y
   avisar a quien ya acepto si luego cambia la hora o se borra.
6. **Rendimiento, cuando crezca**: casi todas las paginas cargan el catalogo
   entero y los informes traen el rango completo. Con cien proyectos y dos anos
   de horas habra que paginar.
7. **Ojo con las tildes**: rutas e identificadores SIN tilde -son URLs y
   carpetas- y textos CON ella. Un `href="/gestión"` da 404; ya paso.

## Siguiente

### 1. Estadisticas

Un apartado propio, mas alla de los informes: en que se va el tiempo, como
evoluciona mes a mes, cuanto se factura de lo que se trabaja, que proyectos se
comen el presupuesto. Los informes de ahora responden "que horas hay"; esto
tiene que responder "como vamos".

**Reconstruccion a fondo el 20-ago-2026**, pedida por Nicolas explicitamente
("bien bien hecha"). Plan completo en la sesion; por encima:

- **Granularidad explicita**: boton Dia/Semana/Mes/Año junto al periodo,
  independiente del rango -antes solo lo decidia el tamaño del rango-.
  `unidadPara`/`serie` en `src/lib/estadisticas.ts` ganan la unidad "ano".
- **Objetivos**: seccion nueva, siempre de hoy/esta semana al margen del
  periodo que se mire arriba -objetivo diario y semanal del espacio, y una
  fila por cada rama con objetivo semanal puesto (`categories.goal_weekly_minutes`,
  que ya existia pero no se enseñaba en ningun sitio fuera de Gestion).
- **Reparto de facturacion**: hasta ahora cada uno se llevaba el dinero de sus
  propias horas por su propia tarifa, sin mas. Nicolas explico que en NITTON
  el dinero de un proyecto se reparte de formas distintas segun el caso -por
  horas metidas, a partes iguales entre quien participo, por un % fijo puesto
  a mano, o entre todo el equipo aunque no haya metido horas-. Nuevo, en
  Gestion → Tarifas: tablas `revenue_splits`/`revenue_split_shares` (mismo
  patron de "mas especifico gana" que `rates`: edicion > proyecto > espacio,
  sin historico -un modo activo por ambito-), logica pura en
  `src/lib/reparto.ts` (`resolverReparto`/`calcularAtribucion`), UI en
  `src/components/gestion-reparto.tsx`. Con eso, Estadisticas trae una seccion
  **Coste por hora, por persona** con el €/h real de cada uno segun como se
  reparte de verdad, no solo sus propias horas.
- **Cruce al clic, tipo Power BI**: una sola seleccion activa a la vez -clic
  en un area del donut, un proyecto, o una persona, y el resto de la pagina
  se acota a eso al instante: cifras, "como va el ritmo", mapa de calor,
  todos los desgloses-. Segundo clic en lo mismo lo quita; hay un chip junto
  a los mandos para quitarlo tambien desde ahi. Probado en vivo: se cruza
  desde el donut, desde "quien lo pone" y desde "los proyectos que mas
  pesan", y cascada a todo lo demas correctamente.
- **El donut ya cuenta algo al pasar el raton**: antes solo enseñaba las
  horas totales del area. Ahora el tooltip trae el desglose por proyecto y
  por persona dentro de esa area -queja concreta de Nicolas-.
- Aprovechado de paso: `database.types.ts` se regenero entero desde el
  esquema real -cerraba una tarea pendiente del roadmap, los tipos de
  `entry_invitations`/`resumen_proyectos` ya no estan puestos a mano-.

Verificado con `npx tsc --noEmit`, `eslint` y `npm run build` limpios, y en
el navegador: reparto por porcentajes creado y borrado de verdad en Tarifas,
granularidad forzada probada en un rango de 12 meses, tooltip del donut con
desglose real, y el cruce al clic probado en las tres direcciones con
capturas de pantalla en cada paso.

**Rematado el 20-ago-2026**: faltaba clic y atenuado en "A cuánto sale la
hora" -era la unica grafica de la dimension proyecto que no cruzaba con el
foco-, ya arreglado; y el ultimo hueco de las paginas de carga, la sesion
del propio layout de `(app)` -quien eres, si tienes el cronometro en
marcha-, que ningun `loading.tsx` de seccion llegaba a cubrir. Nuevo
`src/app/loading.tsx`, sin ligar a ningun layout a proposito -tambien cubre
las paginas publicas, con un spinner centrado que no da por hecho ningun
armazon-. Probado en vivo: `A cuánto sale la hora` cruza con las demas
graficas de proyecto -para eso hizo falta un tramo con una tarifa y un
reparto de prueba puestos y quitados a mano en Tarifas-, y la portada
publica carga igual que antes con el `loading.tsx` nuevo de por medio.

Queda pendiente si hace falta: decidir si vale la pena paginar el reparto en
Tarifas si algun dia hay muchos proyectos con reparto propio.

**Mismo estilo de hover en todas partes, el 20-ago-2026**: a Nicolas le
gustaba el hover del donut -titulo, desglose por proyecto y por persona- y
pidio que fuera el mismo en el resto de graficas con tooltip. Sacado a un
componente compartido (`CajaTooltip`, en `panel-estadisticas.tsx`) y puesto
tambien en "Como va el ritmo" (desglose por proyecto/persona de ese punto
del tiempo), "Quien lo pone" (por proyecto de esa persona) y "A cuanto sale
la hora" (por persona de ese proyecto). El donut se reescribio para usar el
mismo componente en vez de tener su version aparte.

De paso, arreglado un bug que encontro Nicolas mirando esto: el color de
cada area del donut salia de su posicion en la lista -al filtrar y quedar
una sola area visible, esa area pasaba a ser la primera y "robaba" siempre
el azul, aunque su color de siempre fuera otro-. Ahora el color de cada area
sale de un mapa fijo calculado sobre el catalogo entero
(`categoriasRaiz(catalogo.categorias)`), no de la lista filtrada: cada area
mantiene su color se mire como se mire.

Probado en vivo: hover en las cuatro graficas con datos reales, y
comprobado que "PROYECTOS" se queda verde al filtrar aunque quede sola,
en vez de pasar a azul.

**Mapa de calor sin aviso feo del navegador, el 20-ago-2026**: "Cuándo se
trabaja" avisaba con el `title` nativo del HTML al pasar el ratón por una
casilla -el globo gris cutre del navegador-. Ahora sigue al cursor con la
misma caja (`CajaTooltip`) que el resto de graficas, con `position: fixed`
para no cortarse contra el scroll horizontal del propio mapa. Mismo dato de
siempre, solo mejor puesto.

**Hover del donut arreglado del todo, el 20-ago-2026**: Nicolas vio que el
tooltip del donut se plantaba a veces en medio y tapaba otras porciones, sin
dejar clicar. Primer intento -seguir el cursor a mano con estado de React en
cada `mouseenter`, igual que el mapa de calor- **no funciono**: cada entrada
en una porcion volvia a montar esa porcion entera, y el clic que venia justo
detras se perdia por el camino -confirmado en vivo: el clic en la leyenda
seguia funcionando siempre, el clic directo en el donut fallaba a menudo-.
Revertido a como estaba, con dos cambios de verdad:

- `CajaTooltip` (el componente que ya usan las cuatro graficas) lleva ahora
  `pointer-events-none`: la caja del hover nunca puede tapar un clic,
  aunque se dibuje encima de otra porcion.
- El `<Tooltip>` del donut lleva `offset={28}` en vez del valor por defecto,
  para que se separe mas del anillo y no se pegue a la porcion de al lado.

Probado en vivo repetidas veces: clic en una porcion filtra correctamente
-cifras, listas y mapa de calor se acotan-, el hover ya no se ve pegado al
centro, y no hay perdida de clics.

### 2. Integracion con Google Calendar

Traer los eventos del calendario y convertirlos en horas con un clic, sin
teclear.

**Hecho el 20-ago-2026, version completa**: conectar (boton visible "Conectar
Google Calendar" arriba del calendario, ya no un icono pequeño) pide el
permiso de calendario aparte del login normal -no se le pide a quien nunca
vaya a usarlo-, y guarda el token de refresco en su propia tabla
(`google_connections`, RLS por persona, nunca llega al navegador).

La primera version enseñaba los eventos dentro del dialogo de ajustes; se
corrigio el mismo dia porque no era eso lo que hacia falta. Ahora, igual que
"Clockify": **las reuniones aparecen directamente en la rejilla del
calendario**, con el mismo aspecto que una hora que ha apuntado otra persona
del equipo -borde a rayas del color del proyecto (aqui sin color, gris), sin
sumar al total hasta que se acepta-, y solo el icono de la esquina cambia
(calendario en vez de personas). Un clic abre un dialogo pequeño para elegir
proyecto -obligatorio si el espacio no deja horas sueltas- y aceptar: crea la
hora de verdad, con `source: "google_calendar"` y el id del evento en
`external_id`, mismo criterio que Clockify para no repetir si se vuelve a
abrir la semana.

Solo se traen reuniones **ya aceptadas en el propio Google Calendar** -si
tiene invitados, hace falta `responseStatus: "accepted"`; si es un evento
propio sin invitados, cuenta directo-, y solo las de la semana que se esta
mirando en ese momento, nunca en el cronometro. Probado de principio a fin en
local con un evento sintetico: aparece en su sitio, aceptar crea la hora con
el color y el proyecto correctos, e "Ignorar" la descarta sin guardar nada.

Encontrado y arreglado de paso: las Redirect URLs de Supabase no llevaban
comodin, asi que el `?next=...` que se añade en cada vuelta no encajaba con
la URL exacta guardada y la sesion caia al Site URL de produccion en vez de
volver a donde se estaba -afectaba a todo login con Google, no solo a esto-.

Arreglado el 20-ago-2026: al aceptar un evento, el desplegable del selector
de proyecto tapaba el resto de la tarjeta -etiquetas, facturable,
compartir-, asi que el clic fuera para cerrar solo el desplegable sacaba sin
querer del dialogo entero. Ahora el primer clic fuera cierra solo el
selector; hace falta un segundo clic para salir de la tarjeta. Mismo arreglo
aplicado a "Nueva entrada", que usa el mismo selector y tenia el mismo roce.

**Decisiones que quedan abiertas**:

- "Ignorar" no se guarda en ningun sitio: si se cierra el dialogo sin
  aceptar, la reunion vuelve a aparecer la proxima vez que se cargue la
  semana. Si molesta, hace falta una tabla de "descartados" -no se ha hecho
  porque no esta claro que compense la complejidad para algo que se ve una
  vez por semana.
- que hacer cuando el evento cambia de hora en Google despues de haberlo
  aceptado en hitoo: hoy no se entera, cada uno vive su vida.

### 3. Proyectos: buscar y ficha mas completa

- Buscar y filtrar en el listado: por nombre, cliente, si esta activo, si le
  quedan horas de presupuesto.
- Dentro del proyecto falta informacion: como va mes a mes, quien ha tocado
  que, cuanto queda por facturar, y las etiquetas que mas aparecen.

### 4. Equipo

La pantalla se queda corta: solo lista y cambia roles. Falta ver cuanto
trabaja cada uno, quien no ha rellenado la semana, y poder entrar en la ficha
de una persona igual que se entra en la de un proyecto.

### 5. Control de las horas

- Bloquear semanas ya facturadas para que no se toquen.
- ~~Aprobar o devolver las horas de otra persona~~ descartado el 20-ago-2026:
  dentro de un equipo LEINN nadie aprueba las horas de otro. Solo volveria si
  esto se usa para empresas de fuera de LEINN, sin decidir todavia.
- Avisar de dias sin rellenar antes de cerrar la semana.

### 6. Flujos de alta y baja de horas

- Borrado y edicion en bloque desde los informes.
- Mover un rango de horas de un proyecto a otro.
- Duplicar una semana entera.
- Deshacer lo ultimo.

### 7. Identidad

Hecho el 18-ago-2026 el nombre: ~~ClockLEINN~~, en la portada, en el acceso, en
la pestana y en el manifiesto.

Renombrado el 20-ago-2026 a **hitoo**: es el nombre real, el dominio ya era
`hitoo.vercel.app` desde antes. Cambiado en la portada, el acceso, la pestana,
el manifiesto, `package.json`, README y guia de despliegue. Logo y favicon
propios puestos -wordmark en el header y acceso, marca "h" en favicon e
iconos PWA (192, 512, 512 recortable)-, a partir del SVG que paso Nicolas
(`hitoo_logo_white_v4_wordmark_only.svg`).

Queda:

- **og:image** para compartir enlaces (redes, WhatsApp): no hay todavia.
- Renombrar el repositorio de GitHub, que aun se llama `nitton-horas`.
- Revisar `theme_color`/`background_color` del manifiesto: siguen siendo el
  azul de antes (`#0071e3` / `#f5f5f7`), no se han tocado a proposito -es un
  cambio de paleta, no de marca-.

### 8. Despliegue

Vercel, dominio y repetir la configuracion de URLs de Google con el dominio
real.

## Ideas apuntadas

- **Horas compartidas, segunda vuelta**: avisar a quien ya acepto cuando el que
  las propuso cambia la hora o las borra; poder proponer desde el cronometro y
  desde la hoja semanal, no solo desde el calendario.
- **Calendario**: vista de dia para movil, arrastrar entre semanas, y duplicar
  un bloque con alt.
- **Recordatorios**: aviso si se acaba la semana con horas sin meter.
- **Etiquetas**: se usan como formas fijas de clasificar el tiempo, al margen
  del proyecto. Falta poder filtrar por etiqueta desde cualquier pantalla y no
  solo desde informes, y una ficha por etiqueta parecida a la de proyecto.
- **Regenerar `database.types.ts`** entero en la proxima migracion: los tipos de
  `entry_invitations` y `resumen_proyectos` se anadieron a mano.

## Hecho

- Espacios de trabajo independientes, con roles por espacio y RLS probada.
- Importacion de Clockify desde CSV, sin duplicar al reimportar.
- Cronometro, hoja semanal, informes con importes, tarifas por ambito.
- Acceso por correo y con Google (pendiente solo de dar de alta credenciales).
- **Calendario**: rejilla semanal, arrastrar para crear, mover y estirar.
- **Horas compartidas**: se proponen a otras personas y ellas aceptan o rechazan.
- **Descarga en Excel** con columnas tipadas y hoja de resumen.
- **Aspecto**: menu lateral en escritorio, barra inferior en movil, gris
  agrupado, tarjetas blancas y un solo azul para lo pulsable.
- **Proyectos**: apartado propio con ficha por proyecto -horas, reparto por
  tarea y por persona, presupuesto, color y tareas- y creacion de proyectos y
  de tareas desde el propio selector.
- **Facturable**: el mismo verde en todas partes, con recuadro sobre la linea
  de color del proyecto.
- **Editar en el sitio**: en el cronometro se cambia la descripcion, el
  proyecto, la tarea, las etiquetas, el dia, las horas y si se cobra pulsando
  encima del dato, sin abrir ningun dialogo.
- **Preferencias de edicion**: el espacio puede fijar que todo se guarde en
  MAYUSCULAS. Va en la base, con disparador, asi que vale tambien para lo que
  entra por el importador.
- **Portada publica** en `/`, con el cronometro de ejemplo corriendo de verdad.
  La aplicacion se mudo a `/panel` y la ruta vive en `src/lib/rutas.ts`.

## Dudas abiertas

### Etiquetas

Se usan como formas fijas de clasificar el tiempo, al margen del proyecto, y
para poder buscar por ellas. Falta decidir:

- si se filtra por etiqueta desde cualquier pantalla, y no solo desde informes;
- si tienen ficha propia, como los proyectos, con sus horas;
- si conviene que una entrada pueda llevar varias, o solo una.

## Horas compartidas (19-ago-2026)

Hecho: las propuestas se pintan en el calendario como invitacion -sin rellenar,
borde a rayas del color del proyecto, sin sumar al dia, con Aceptar / No fui al
pulsarlas-, y con quien cuenta una hora se cambia despues desde la propia fila
(añadir manda propuesta; quitar solo retira las que siguen sin contestar).

Cuando llegue **Google Calendar**, un evento externo pendiente se pinta con ese
mismo formato y solo cambia el icono de la esquina: reloj = horas propuestas
por alguien del equipo, calendario = evento de fuera.

Queda:

- **Compartir desde la hoja de la semana**, que ahi todavia no se puede.
- **Aceptar o rechazar en bloque** cuando lleguen varias propuestas del mismo
  dia; ahora se contestan de una en una.

## Onboarding (hecho 19-ago-2026)

`/empezar` monta el espacio de una sentada, en cuatro pasos: el espacio -nombre,
zona y plantilla de LEINN-, el equipo -los nombres, que se pueden pegar de una
lista-, repartirlo -enlace y codigo QR- y por donde empezar -importar de
Clockify o al cronometro-. `/bienvenida` se queda solo para elegir entre los
espacios que ya tienes y llevar aqui.

El QR se dibuja en el navegador con `qrcode`, cargado solo al usarlo, a partir
del enlace de siempre: no se guarda nada nuevo. El codigo de union se genera al
llegar al paso 3, no antes: quien no pasa por ahi no deja una puerta abierta.

Queda por si se quiere:

- **Reclamar la plaza en el mismo QR**: hoy quien escanea entra y elige su
  nombre en `/unirse/[codigo]`, que ya funciona; se podria llevar directo a su
  plaza si el enlace la nombrara.
- **Un paso de proyectos** al final, para no llegar al cronometro sin nada
  contra lo que apuntar. Se decidio no meterlo: el aviso de "aun no hay
  proyectos" del panel ya lo resuelve sin alargar el alta.

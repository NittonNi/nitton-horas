# Roadmap

Lo que falta, en el orden en que tiene sentido hacerlo. Se va moviendo a
"Hecho" segun entra en `main`.

## Por arreglar

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

Falta decidir donde son mas necesarios (candidatos: cronometro/panel al
cargar, informes al cambiar filtros, calendario al cambiar de semana) y que
patron usar -esqueleto tipo el que ya usa el propio dashboard de Supabase, o
un spinner simple-, para que sea el mismo en toda la app.

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

El problema es que **no se ve**: el cronometro se pone en marcha en la barra
de arriba y en la lateral, pero la lista de horas -que es donde estas mirando
cuando pulsas- no cambia nada. Parece que el boton no ha hecho nada.

Que hacer:

- que la entrada en marcha salga **como una fila mas arriba del todo de la
  lista**, contando en vivo, en lugar de vivir solo en la barra;
- y que al arrancar se note, aunque sea un instante.

Ojo tambien: las dos entradas iguales de LALALA a las 09:00 no son de
continuar, son del boton de duplicar. Conviene mirar si duplicar deberia
avisar de algo, porque deja dos filas identicas sin mas.

### Las horas compartidas no se ven

Estan implementadas pero Nicolas no ha dado con ellas, que es como decir que
no existen:

- solo se pueden proponer desde el dialogo del calendario. Tienen que estar
  tambien en el cronometro y en la hoja semanal.
- el selector se esconde cuando eres el unico del espacio, asi que ahora
  mismo no hay forma de descubrir la funcion. Deberia verse igual, explicando
  que hace falta alguien mas.
- falta enseñar en la propia entrada a quien mas le cuenta, y en que estado
  esta cada uno (pendiente, aceptada, rechazada).

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

0. **Repaso de UX en movil, pendiente**. Apuntado por Nicolas el 20-ago-2026:
   hay varias cosas que comprobar desde el telefono de verdad, no solo en el
   emulador -barra de abajo, la tabla de informes con las casillas, y el
   calendario son los primeros candidatos-, y falta un repaso completo de UX
   pensado para movil, no solo verificar que no rompe.


1. **Desplegar**: `DESPLIEGUE.md` lleva los pasos en orden -Vercel, las URLs de
   Supabase, las credenciales de Google, el dominio- con lo que hay que
   comprobar despues de cada uno. Es lo unico que separa esto de que lo use
   otro equipo de LEINN, y necesita las cuentas de Nicolas.
2. **En el panel de Supabase, a mano**: activar la proteccion de contrasenas
   filtradas y subir el minimo a 8 caracteres. Dos interruptores.
3. **Aprobar horas**: cerrarlas ya se puede, y hay filtro de abiertas y
   cerradas. Falta el paso previo: revisar la semana de alguien, devolversela
   con un comentario y aprobarla.
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
- Aprobar o devolver las horas de otra persona.
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

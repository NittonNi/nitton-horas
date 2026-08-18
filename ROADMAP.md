# Roadmap

Lo que falta, en el orden en que tiene sentido hacerlo. Se va moviendo a
"Hecho" segun entra en `main`.

## Por arreglar

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

**Hecho**: nombre ClockLEINN; portada publica en `/` y aplicacion en `/panel`;
categorizacion de dos niveles con objetivo por rama, elegible al crear y al
editar proyecto, visible en el listado de proyectos y con una columna por nivel
en informes y Excel; ediciones de proyecto (TBCE 1 / TBCE 2) con fechas,
presupuesto y horas, elegibles desde el cronometro, el calendario, el dialogo
de entrada y la propia fila; objetivos de dia y semana del espacio, visibles
restando en el cronometro y en cada cabecera de dia y de semana, y objetivo por
rama con lo que llevas esta semana; horas compartidas desde el cronometro, con
el selector siempre a la vista; etiquetas que se crean desde el propio selector
y ajuste de una-o-varias; no se puede parar el cronometro sin proyecto
-probado en vivo-; resumen del cronometro con tres huecos que cada uno elige
(hoy, semana, facturable, mes, lo que falta, media por dia); informes con
filtro por categoria, desgloses por categoria y por edicion y descarga de todo
el historico; repaso de tildes y enes; bordes mas rectos; continuar sin la
palabra; menu lateral con la gestion desplegada.

**Pendiente**:

1. **Horas compartidas, segunda vuelta**: falta verlas en la propia entrada
   -a quien le cuenta y en que estado- y poder proponerlas desde la hoja
   semanal. Avisar a quien acepto si luego cambia la hora.
2. **Identidad**: logo y favicon propios, y renombrar el repositorio, que
   sigue siendo `nitton-horas`.
3. **Despliegue**: Vercel, dominio y las URLs de Google con el dominio real.
4. **Ojo**: las rutas y los identificadores van SIN tilde -son URLs y
   carpetas- y los textos CON ella. Un `href="/gestión"` da 404; ya paso.

## Siguiente

### 1. Estadisticas

Un apartado propio, mas alla de los informes: en que se va el tiempo, como
evoluciona mes a mes, cuanto se factura de lo que se trabaja, que proyectos se
comen el presupuesto. Los informes de ahora responden "que horas hay"; esto
tiene que responder "como vamos".

### 2. Integracion con Google Calendar

Traer los eventos del calendario y convertirlos en horas con un clic, sin
teclear. **Bloqueado**: hace falta antes dar de alta el acceso con Google, que
es de donde sale el permiso `calendar.readonly` del usuario.

Decisiones pendientes:

- donde se guarda el token de refresco (nunca en el navegador);
- cada cuanto se sincroniza, y si es a demanda o de fondo;
- como se evita reimportar un evento ya convertido — misma idea que el
  `external_id` de Clockify;
- que hacer cuando el evento cambia de hora despues de haberlo importado.

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

Hecho el 18-ago-2026 el nombre: **ClockLEINN**, en la portada, en el acceso, en
la pestana y en el manifiesto. Falta **logo y favicon propios** -el icono sigue
siendo un cronometro generico- y renombrar el repositorio de GitHub, que aun se
llama `nitton-horas`.

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

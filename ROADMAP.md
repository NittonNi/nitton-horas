# Roadmap

Lo que falta, en el orden en que tiene sentido hacerlo. Se va moviendo a
"Hecho" segun entra en `main`.

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

### 3. Control de las horas

- Bloquear semanas ya facturadas para que no se toquen.
- Aprobar o devolver las horas de otra persona.
- Avisar de dias sin rellenar antes de cerrar la semana.

### 4. Flujos de alta y baja de horas

- Borrado y edicion en bloque desde los informes.
- Mover un rango de horas de un proyecto a otro.
- Duplicar una semana entera.
- Deshacer lo ultimo.

### 5. Identidad

El producto se llama "Horas" en la interfaz, pero el repo sigue siendo
`nitton-horas` y el icono es un cronometro generico. Falta nombre definitivo,
logo y favicon propios.

### 6. Despliegue

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

## Dudas abiertas

### Etiquetas

Se usan como formas fijas de clasificar el tiempo, al margen del proyecto, y
para poder buscar por ellas. Falta decidir:

- si se filtra por etiqueta desde cualquier pantalla, y no solo desde informes;
- si tienen ficha propia, como los proyectos, con sus horas;
- si conviene que una entrada pueda llevar varias, o solo una.

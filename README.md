# ClockLEINN

Control de horas para equipos LEINN: cronometro, hoja semanal, informes con
importes e importacion del historico de Clockify. Cada equipo tiene su propio
espacio de trabajo, aislado del resto.

La raiz `/` es la portada publica y la aplicacion vive bajo `/panel`.

Next.js 16 (App Router) + Supabase (Postgres con RLS) + Tailwind v4.

## Que hace

- **Portada** (`/`): la pagina publica, con el cronometro corriendo de
  ejemplo. Lleva a `/acceso`, y con la sesion abierta al espacio.
- **Cronometro** (`/panel`): arrancar y parar, entrada manual y las ultimas semanas.
  Un unico cronometro en marcha por persona, sincronizado entre dispositivos.
- **Calendario** (`/calendario`): la semana en rejilla. Se arrastra sobre un
  hueco para apuntar horas, se mueve un bloque para cambiarlo de sitio y se
  estira su borde para alargarlo.
- **Semana** (`/semana`): hoja de horas editable, una fila por proyecto y
  descripcion. Las celdas aceptan `1:30`, `90m` o `1,5`.
- **Informes** (`/informes`): filtros, grafico por dia, desgloses por proyecto,
  persona y cliente, y descarga en Excel, CSV o PDF.
- **Gestion** (`/gestion`): clientes, proyectos, tareas, etiquetas, equipo,
  tarifas e importacion desde Clockify.

### Horas compartidas

Una reunion la apunta **una** persona y elige a quien mas le cuenta. A los
demas no se les mete nada: les llega una propuesta que aceptan o rechazan, como
la invitacion de un calendario. Solo al aceptarla se convierte en una entrada
suya, editable y borrable como cualquier otra.

Se hace desde el calendario, en *Tambien cuenta para*. Las propuestas que te
esperan salen arriba del todo en el cronometro.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # y rellenar con los datos del proyecto de Supabase
npm run dev
```

| Variable | Que es |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto (panel: *Project Settings > API*) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave publicable (`sb_publishable_...`) |
| `NEXT_PUBLIC_SITE_URL` | A donde vuelven los enlaces de correo |

Al entrar por primera vez, la app pide crear un espacio de trabajo. Quien lo
crea queda como administrador de ese espacio.

## Espacios de trabajo

Cualquiera puede registrarse y crear el suyo. Para que entre alguien mas hay dos
caminos, ambos en *Gestion > Equipo*:

- **invitar por correo**: esa direccion vera el espacio nada mas entrar en la app;
- **alta por dominio**: quien tenga un correo `@tuempresa.com` puede unirse solo.

Una misma persona puede estar en varios espacios y cambiar desde la cabecera.
Las horas, el catalogo y las tarifas nunca se cruzan entre espacios: lo impone
la RLS de Postgres, no la interfaz.

### Roles

| Rol | Que puede |
| --- | --- |
| `admin` | Todo: equipo, tarifas, importes y horas de cualquiera |
| `manager` | Ve las horas de todo el equipo y gestiona el catalogo |
| `member` | Solo sus propias horas |

Son por espacio: se puede ser administrador en uno y miembro en otro.

## Acceso con Google

El codigo ya esta listo (`/auth/callback` y el boton de la pantalla de acceso),
pero hay que dar de alta las credenciales una vez. Mientras no se haga, el boton
lleva a un error de Supabase (`provider is not enabled`).

**1. Google Cloud Console** → *APIs y servicios > Credenciales*

- Configura la pantalla de consentimiento (tipo *Externo*, nombre de la app,
  correo de soporte).
- Crea un *ID de cliente de OAuth* de tipo **Aplicacion web**.
- En **URI de redireccionamiento autorizados** pon exactamente:

  ```
  https://<TU-PROYECTO>.supabase.co/auth/v1/callback
  ```

- Copia el *Client ID* y el *Client secret*.

**2. Supabase** → *Authentication > Providers > Google*

- Activa el proveedor y pega ahi el Client ID y el Client secret.

**3. Supabase** → *Authentication > URL Configuration*

- *Site URL*: `http://localhost:3000` en local, el dominio real al desplegar.
- *Redirect URLs*: anade `http://localhost:3000/auth/callback` y, cuando exista,
  `https://tu-dominio/auth/callback`.

Al desplegar hay que volver a este paso 3 con el dominio de produccion; el paso
1 no cambia, porque el redirect siempre apunta a Supabase.

## Importar el historico de Clockify

En Clockify: *Informes > Detallado*, se elige el rango y se exporta en **CSV**
(el XLSX no vale). Despues, en `/gestion/importar`:

1. El fichero se lee entero en el navegador; nada se sube sin confirmar.
2. Se detecta solo si las fechas vienen en dia/mes o mes/dia, y se puede forzar.
3. Cada persona del informe se empareja con una cuenta (por correo, si coincide).
   Lo que quede sin asignar no se importa.
4. Se crean los clientes, proyectos, tareas y etiquetas que falten.

Cada entrada se guarda con `source = 'clockify'` y un `external_id` construido
con la persona y el intervalo exacto, asi que **reimportar el mismo fichero no
duplica nada**: las que ya estan se saltan.

## Tarifas

`resolve_rate` decide el precio de cada hora facturable con la tarifa mas
especifica que encuentre: persona + proyecto, luego proyecto, luego persona y
por ultimo la general. A igualdad de ambito gana la mas reciente que ya este
vigente. Las tarifas no se editan: se anade una nueva con su fecha de entrada.

Sin tarifa general, las horas facturables sin tarifa propia salen a cero euros.

## Aspecto

La interfaz es monocroma y hay **un unico color**, el naranja, que siempre
quiere decir lo mismo: aqui esta pasando el tiempo ahora. Si apareciera tambien
en botones o enlaces dejaria de significar nada.

Los numeros son el contenido de verdad, asi que van todos en monoespaciada con
cifras tabulares (IBM Plex Mono) y los rotulos en versales espaciadas, como los
de un instrumento de medida. El texto corrido va en Archivo.

Los componentes con comportamiento -menus, dialogos- son primitivas de
[Radix](https://www.radix-ui.com/primitives) **sin estilos**: aportan
accesibilidad y teclado, y el aspecto se define entero en `globals.css`.

Un aviso para quien toque el CSS: los `reset` de elementos van dentro de
`@layer base`. Fuera de capa ganarian a `@layer components`, y `button { color:
inherit }` acabaria pintando el texto de los botones del color de su fondo.

## Base de datos

El esquema vive en Supabase, en migraciones numeradas (`09_espacios_de_trabajo`
en adelante es el modelo multiempresa). Para regenerar los tipos:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/database.types.ts
```

Cosas que conviene no olvidar:

- `time_entries.local_date` lo rellena un disparador con la **zona horaria del
  espacio**: el mismo instante cae en dias distintos segun donde este el equipo.
  `duration_seconds` es columna generada.
- Un indice parcial impide tener dos cronometros en marcha a la vez.
- `v_entries` es la vista que leen los informes, con `security_invoker=on` para
  que la RLS siga aplicando.
- Las funciones que usan las politicas (`is_member`, `can_see_all`...) son
  `SECURITY DEFINER` por necesidad: si consultaran `workspace_members` con la
  RLS puesta, las politicas se llamarian a si mismas. Solo responden sobre quien
  llama, y `anon` no puede ejecutarlas.

## Comprobaciones

```bash
npm run build     # incluye el chequeo de tipos
npx eslint .
```

## Licencia

MIT.

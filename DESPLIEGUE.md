# Poner ClockLEINN en marcha para todo el mundo

Mientras esto viva en `localhost` solo lo usa quien tenga el portatil delante.
Estos son los pasos, en orden, y lo que hay que comprobar despues de cada uno.

## 1. Subir el codigo

```bash
git push origin main
```

El repositorio es publico y solo lleva codigo: las claves viven en `.env.local`
—que esta ignorado— y en Supabase.

## 2. Desplegar en Vercel

1. [vercel.com/new](https://vercel.com/new) → importar el repositorio.
2. Framework: **Next.js** (lo detecta solo). No hay que tocar los comandos.
3. **Variables de entorno**, las mismas dos de `.env.local`:

   | Variable | De donde sale |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clave **publicable** (`sb_publishable_…`), no la secreta |

4. Deploy. Sale una direccion tipo `clockleinn.vercel.app`.

**Comprobar**: la portada carga y `/acceso` sale bien. Entrar todavia no
funciona: falta el paso siguiente.

## 3. Decirle a Supabase cual es la direccion real

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://clockleinn.vercel.app` (o el dominio propio).
- **Redirect URLs**, una por linea:

  ```
  https://clockleinn.vercel.app/auth/callback
  https://clockleinn.vercel.app/auth/confirmar
  http://localhost:3000/auth/callback
  http://localhost:3000/auth/confirmar
  ```

Sin esto, el enlace del correo de confirmacion lleva a `localhost` y la vuelta
de Google no encuentra el camino.

**Comprobar**: crear una cuenta con correo, recibir el enlace y que entre.

## 4. Acceso con Google

El codigo esta listo desde el primer dia; lo que falta son las credenciales.

1. [Google Cloud Console](https://console.cloud.google.com/) → proyecto nuevo.
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: externo, nombre
   ClockLEINN, correo de contacto.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicacion
   web**:
   - Origenes autorizados de JavaScript: `https://clockleinn.vercel.app`
   - URI de redireccionamiento autorizado:
     `https://TU-PROYECTO.supabase.co/auth/v1/callback`
     (ojo: es el de **Supabase**, no el de la web)
4. Copiar el **ID de cliente** y el **secreto** a Supabase → Authentication →
   Providers → **Google** → activar y pegar.

**Comprobar**: el boton de Google entra sin dar `provider is not enabled`.

## 5. Los dos interruptores de seguridad

Supabase → Authentication → **Passwords**:

- activar **Leaked password protection** (comprueba contra HaveIBeenPwned);
- subir el **minimo a 8 caracteres**, que es lo que ya pide el formulario.

## 6. Dominio propio, si lo hay

Vercel → Settings → Domains → anadir el dominio y seguir los DNS. Despues hay
que **repetir el paso 3 y el 4** con la direccion nueva: Site URL, redirect
URLs y origenes de Google.

## 7. Repaso final, con la web en pie

- [ ] Entrar con correo y con Google.
- [ ] Crear un espacio nuevo con la plantilla de LEINN y ver el arbol.
- [ ] Arrancar y parar el cronometro; que no deje parar sin proyecto.
- [ ] Importar un CSV de Clockify y volver a importarlo: no debe duplicar.
- [ ] Descargar el Excel y abrirlo.
- [ ] Comprobar las cabeceras: la respuesta debe llevar
      `Content-Security-Policy` y `X-Frame-Options: DENY`.

```bash
curl -sD - -o /dev/null https://clockleinn.vercel.app/ | grep -i "content-security\|x-frame"
```

## Lo que hay que recordar

- La base de datos **ya esta en produccion**: Supabase es el mismo proyecto que
  se usa en local. Cuidado con las pruebas.
- Cada `git push` a `main` despliega. Si algo sale mal, Vercel deja volver al
  despliegue anterior en un clic.

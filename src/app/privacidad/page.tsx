import Link from "next/link"

export const metadata = { title: "Política de privacidad" }

/** Cuelga de la portada, así que va en claro como ella. */
export const viewport = { themeColor: "#f5f5f7" }

export default function PaginaPrivacidad() {
  return (
    /* En claro: se llega pulsando en el pie de la portada, y saltar de blanco
       a negro al hacerlo no tenía ningún sentido. */
    <main className="tema-claro mx-auto w-full max-w-2xl px-5 py-16">
      <Link href="/" className="text-sm text-muted transition hover:text-ink">
        ← Volver a hitoo
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">
        Política de privacidad
      </h1>
      <p className="mt-2 text-sm text-muted">Última actualización: 21 de agosto de 2026.</p>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-ink">
        <section>
          <p>
            hitoo es una aplicación de control de horas para equipos LEINN:
            cronómetro, hoja semanal, calendario e informes con importes. La
            ofrece Nicolás Martínez Riego, y se puede escribir en cualquier
            momento a{" "}
            <a href="mailto:hitooclock@gmail.com" className="underline hover:text-muted">
              hitooclock@gmail.com
            </a>{" "}
            para cualquier pregunta sobre esta política o sobre los datos
            propios.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Qué datos se recogen</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              <strong>Al crear la cuenta:</strong> nombre, correo electrónico
              y, si se entra con Google, el nombre y correo que Google
              facilita. La contraseña, si se usa acceso por correo, la guarda
              y cifra Supabase (el proveedor de base de datos y autenticación
              de hitoo) — hitoo nunca la ve en claro.
            </li>
            <li>
              <strong>Datos de uso normal de la app:</strong> las horas que se
              apuntan (inicio, fin, proyecto, tarea, descripción, si se
              cobran), los proyectos y tarifas que un administrador del
              espacio configure, y las propuestas de horas compartidas entre
              compañeros de equipo.
            </li>
            <li>
              <strong>Si se conecta Google Calendar</strong> (opcional, se
              activa a mano desde Ajustes): un token de acceso de solo
              lectura sobre el calendario, y los eventos de los próximos días
              para poder ofrecerlos como horas con un clic. hitoo nunca
              escribe ni modifica nada en el calendario de Google — solo lee.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Para qué se usan</h2>
          <p className="mt-3">
            Únicamente para que el equipo pueda fichar sus horas, ver en qué
            se reparte el tiempo de cada proyecto y calcular lo que cuesta o
            factura. Nada de estos datos se usa para publicidad, ni se vende
            ni se cede a terceros con fines comerciales.
          </p>
        </section>

        <section id="google-calendar">
          <h2 className="text-lg font-semibold text-ink">
            Acceso a Google Calendar
          </h2>
          <p className="mt-3">
            hitoo pide el permiso <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">calendar.readonly</code> de
            Google —solo lectura— exclusivamente para mostrar los eventos
            aceptados del calendario de quien lo conecta, dentro de la propia
            app, y dejar que los convierta en una hora fichada con un clic en
            vez de escribirla a mano. No se usa para ningún otro fin.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              El token de acceso se guarda cifrado en la base de datos y solo
              lo lee el servidor de hitoo — nunca se envía al navegador ni a
              ningún otro servicio.
            </li>
            <li>
              Se puede desconectar el calendario en cualquier momento desde
              Ajustes → Calendario. Al desconectarlo, hitoo revoca el permiso
              directamente con Google (no solo lo olvida por su cuenta) y
              borra el token guardado.
            </li>
            <li>Los datos del calendario nunca se comparten con terceros.</li>
          </ul>
          <p className="mt-3">
            El uso y la transferencia a cualquier otra aplicación de la
            información recibida de las APIs de Google se ajusta a la{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-muted"
            >
              Política de datos de usuario de los Servicios de API de Google
            </a>
            , incluidos los requisitos de Uso Limitado.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Dónde se guardan</h2>
          <p className="mt-3">
            Todos los datos viven en Supabase, sobre un proyecto propio de
            hitoo alojado en la Unión Europea. Cada espacio de trabajo tiene
            sus propias reglas de acceso: solo quien pertenece a un espacio
            puede ver sus horas, y solo quien lo administra ve los importes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">
            Cuánto tiempo se conservan y cómo pedir que se borren
          </h2>
          <p className="mt-3">
            Los datos se conservan mientras la cuenta o el espacio de trabajo
            sigan activos. Para pedir la baja de una cuenta, la salida de un
            espacio o el borrado completo de los propios datos, basta con
            escribir a{" "}
            <a href="mailto:hitooclock@gmail.com" className="underline hover:text-muted">
              hitooclock@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink">Cookies</h2>
          <p className="mt-3">
            hitoo usa únicamente las cookies imprescindibles para mantener la
            sesión iniciada (gestionadas por Supabase Auth). No hay cookies de
            publicidad ni de analítica de terceros.
          </p>
        </section>
      </div>
    </main>
  )
}

import Link from "next/link"
import {
  BarChart3,
  CalendarRange,
  FileSpreadsheet,
  FolderKanban,
  Timer,
  Upload,
  Users,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { RUTA_APP } from "@/lib/rutas"
import { CronometroDemo } from "@/components/cronometro-demo"

export const metadata = {
  title: { absolute: "ClockLEINN · Las horas del equipo, en su sitio" },
  description:
    "Control de horas para equipos LEINN: cronómetro, calendario, hoja semanal, proyectos e informes. Con lo que ya tienes en Clockify.",
}

/** La marca, en pequeño. El icono es el mismo cronómetro que se ve dentro. */
function Marca() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radio-sm)] bg-accent text-accent-fg">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden
        >
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5M9 2h6" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">ClockLEINN</span>
    </span>
  )
}

const COMO_SE_USA = [
  {
    icono: Timer,
    titulo: "Apuntar",
    texto:
      "Le das al play y ya está. Si prefieres el calendario, arrastras el rato en la semana; si prefieres la tabla, escribes las horas a mano.",
  },
  {
    icono: FolderKanban,
    titulo: "Revisar",
    texto:
      "Cada proyecto con sus horas, su presupuesto y quién ha metido qué. Los informes cruzan persona, proyecto, etiqueta y fecha.",
  },
  {
    icono: BarChart3,
    titulo: "Cerrar",
    texto:
      "Lo que se cobra va marcado en verde y con su importe según la tarifa. Se descarga en Excel con una hoja de resumen.",
  },
]

const PARA_LEINN = [
  {
    icono: Users,
    titulo: "Un espacio por equipo",
    texto:
      "Cada equipo tiene el suyo, con sus proyectos, su gente y sus roles. Si estás en dos, cambias de espacio desde arriba sin salir de la cuenta.",
  },
  {
    icono: CalendarRange,
    titulo: "Horas que se comparten",
    texto:
      "Apuntas la reunión una vez y se la propones a quien estuvo. A cada uno le llega y decide si la acepta: nadie apunta horas en el calendario de otro.",
  },
  {
    icono: Upload,
    titulo: "Lo de Clockify se trae",
    texto:
      "Subes el CSV y entra todo con su proyecto, su tarea y sus etiquetas. Si lo vuelves a subir no se duplica nada.",
  },
  {
    icono: FileSpreadsheet,
    titulo: "Sale en Excel, no en PDF raro",
    texto:
      "Columnas con tipo de verdad -horas como números y fechas como fechas- para que la tabla dinámica salga a la primera.",
  },
]

export default async function Portada() {
  // Con la sesion abierta la portada sigue siendo visible -sirve para
  // ensenarsela a otro equipo- pero los botones llevan al espacio.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const dentro = Boolean(user)

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-5">
          <Marca />
          <Link href={dentro ? RUTA_APP : "/acceso"} className="btn btn-ghost text-accent">
            {dentro ? "Ir a mi espacio" : "Entrar"}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5">
        {/* -------------------------------------------------------- portada */}
        <section className="grid items-center gap-10 py-14 lg:grid-cols-[1fr_26rem] lg:gap-14 lg:py-24">
          <div>
            <p className="rotulo">Para equipos LEINN</p>
            <h1 className="mt-3 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">
              Las horas del equipo,
              <br />
              cada una en su sitio.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-soft">
              Backoffice, conocimiento y proyectos no se miden igual, pero acaban
              en la misma hoja. ClockLEINN es el cronómetro, el calendario y los
              informes de tu equipo, en castellano y con vuestra manera de
              organizaros.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {dentro ? (
                <Link href={RUTA_APP} className="btn btn-primary">
                  Ir a mi espacio
                </Link>
              ) : (
                <>
                  <Link href="/acceso?modo=registrarse" className="btn btn-primary">
                    Crear el espacio de mi equipo
                  </Link>
                  <Link href="/acceso" className="btn">
                    Ya tengo cuenta
                  </Link>
                </>
              )}
            </div>

            {!dentro && (
              <p className="mt-4 text-xs text-muted">
                Con tu correo o con Google. Traes tu histórico de Clockify en un CSV.
              </p>
            )}
          </div>

          <CronometroDemo />
        </section>

        {/* ------------------------------------------------------ como se usa */}
        <section className="border-t border-line py-14 lg:py-20">
          <p className="rotulo">Cómo se usa</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Apuntar, revisar y cerrar la semana
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {COMO_SE_USA.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo}>
                <Icono className="h-5 w-5 text-ink-soft" strokeWidth={1.9} aria-hidden />
                <h3 className="mt-3 text-[15px] font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- para LEINN */}
        <section className="border-t border-line py-14 lg:py-20">
          <p className="rotulo">Por qué no es otro Clockify</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Está hecho desde dentro de un equipo
          </h2>

          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {PARA_LEINN.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radio-sm)] bg-surface-2 text-ink-soft">
                  <Icono className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold">{titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{texto}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------- cta */}
        <section className="border-t border-line py-14 text-center lg:py-20">
          <h2 className="text-2xl font-semibold tracking-tight">
            {dentro
              ? "Sigue donde lo dejaste"
              : "Empieza por las horas de esta semana"}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            {dentro
              ? "Tu espacio te espera con el cronómetro parado y la semana a medias."
              : "Creas el espacio del equipo, invitas a la gente y en cinco minutos está apuntando. Lo de antes lo subes cuando quieras."}
          </p>
          <Link
            href={dentro ? RUTA_APP : "/acceso?modo=registrarse"}
            className="btn btn-primary mt-6"
          >
            {dentro ? "Ir a mi espacio" : "Crear el espacio de mi equipo"}
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-xs text-muted">
          <Marca />
          <p>Hecho por un equipo LEINN, para los equipos LEINN.</p>
        </div>
      </footer>
    </>
  )
}

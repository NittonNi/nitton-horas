import Link from "next/link"
import {
  BarChart3,
  CalendarRange,
  Check,
  FileSpreadsheet,
  FolderTree,
  Layers,
  Timer,
  Upload,
  Users,
} from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { RUTA_APP } from "@/lib/rutas"
import { CronometroDemo } from "@/components/cronometro-demo"

export const metadata = {
  title: { absolute: "hitoo · Las horas del equipo, en su sitio" },
  description:
    "Control de horas para equipos LEINN: cronómetro, calendario, hoja semanal, proyectos e informes. Con la categorización de vuestro equipo y lo que ya tenéis en Clockify.",
}

/** La marca, en pequeño. */
function Marca() {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG de marca, no necesita next/image
    <img src="/hitoo-logo.svg" alt="hitoo" className="h-7 w-auto" />
  )
}

/** Titulillo de sección: el mismo rótulo gris que se usa dentro de la app. */
function Seccion({
  rotulo,
  titulo,
  texto,
}: {
  rotulo: string
  titulo: string
  texto?: string
}) {
  return (
    <div className="max-w-2xl">
      <p className="rotulo">{rotulo}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
        {titulo}
      </h2>
      {texto && (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{texto}</p>
      )}
    </div>
  )
}

const CHIPS = [
  "En castellano",
  "Un espacio por equipo",
  "Trae tu histórico de Clockify",
  "Excel con columnas de verdad",
]

const PASOS = [
  {
    titulo: "Crea el espacio de tu equipo",
    texto:
      "Te preguntamos si quieres empezar con la estructura típica de LEINN -Backoffice, Conocimiento y Proyectos- o en blanco. Se cambia cuando quieras.",
  },
  {
    titulo: "Invita a la gente",
    texto:
      "Por correo o dejando entrar a quien tenga un correo de vuestro dominio. Cada uno con su papel: quien apunta, quien gestiona y quien administra.",
  },
  {
    titulo: "Sube lo de Clockify",
    texto:
      "El CSV detallado entra con su proyecto, su tarea y sus etiquetas. Si lo vuelves a subir no se duplica nada.",
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
      "Sin empezar de cero ni perder el año pasado. Cada rama del informe entra como área, y las horas se quedan donde estaban.",
  },
  {
    icono: BarChart3,
    titulo: "Objetivos, no solo horas",
    texto:
      "El equipo fija las horas de la semana y del día, y las de cada rama. En el cronómetro se ve lo que falta, no solo lo que llevas.",
  },
]

const PREGUNTAS = [
  {
    q: "¿Y todo lo que tenemos ya en Clockify?",
    a: "Se sube el CSV detallado y entra tal cual: proyecto, tarea, etiquetas, si se cobraba y quién lo apuntó. Se reconoce lo que ya está, así que puedes subirlo varias veces sin miedo a duplicar.",
  },
  {
    q: "Estoy en dos equipos, ¿tengo dos cuentas?",
    a: "No. Una cuenta y tantos espacios como equipos. Se cambia desde arriba a la izquierda y cada espacio tiene sus proyectos, su gente y sus horas, sin mezclarse.",
  },
  {
    q: "¿Quién ve mis horas?",
    a: "Tú ves las tuyas. Quien gestiona o administra el espacio ve las del equipo, porque le hacen falta para facturar y cerrar. No es una promesa: la base de datos lo impide fila a fila.",
  },
  {
    q: "Hemos tenido una reunión los cuatro, ¿la apuntamos cuatro veces?",
    a: "La apunta uno y elige a quién más le cuenta. A los demás les llega una propuesta que aceptan o rechazan, como la invitación de un calendario. Hasta que la aceptan no tienen nada apuntado.",
  },
  {
    q: "Hacemos el mismo evento cada año, ¿lo duplicamos?",
    a: "No hace falta. El proyecto es The Bilbao Coffee Experience y dentro tiene sus ediciones: TBCE 1, TBCE 2. Cada una con sus fechas, su presupuesto y sus horas, y el proyecto suma todas.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Nada. Lo hicimos para nuestro equipo porque lo necesitábamos, y lo abrimos al resto de LEINN.",
  },
]

/* ------------------------------------------------------------- maquetas
   Trozos de la propia aplicación, dibujados con los mismos tokens: se ve lo
   que hay, no un dibujo bonito de lo que podría haber. */

function MaquetaArbol() {
  const arbol = [
    { nombre: "Backoffice", hijas: ["TLT", "Care team", "Financial team", "Legal team"] },
    { nombre: "Conocimiento", hijas: [] },
    { nombre: "Proyectos", hijas: ["Eventos", "Proyectos", "Oportunidades"] },
  ]

  return (
    <div className="card p-4">
      <p className="rotulo mb-2 flex items-center gap-1.5">
        <FolderTree className="h-3.5 w-3.5" aria-hidden />
        Categorización
      </p>
      <ul className="space-y-1.5">
        {arbol.map(({ nombre, hijas }) => (
          <li key={nombre} className="rounded-[var(--radio-sm)] bg-surface-2/60 p-2">
            <p className="text-sm font-medium">{nombre}</p>
            {hijas.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-1.5 pl-3">
                {hijas.map((h) => (
                  <li key={h} className="chip">
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MaquetaEdiciones() {
  const ediciones = [
    { nombre: "TBCE 1", fechas: "sep 2025", horas: "82:15", presupuesto: "80 h" },
    { nombre: "TBCE 2", fechas: "mar 2026", horas: "46:30", presupuesto: "120 h" },
  ]

  return (
    <div className="card p-4">
      <p className="rotulo mb-1 flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5" aria-hidden />
        The Bilbao Coffee Experience
      </p>
      <table className="w-full">
        <thead>
          <tr>
            <th className="th">Edición</th>
            <th className="th">Fechas</th>
            <th className="th text-right">Horas</th>
            <th className="th text-right">Presupuesto</th>
          </tr>
        </thead>
        <tbody>
          {ediciones.map((e) => (
            <tr key={e.nombre} className="border-b border-line last:border-0">
              <td className="py-2 pr-3 text-sm font-medium">{e.nombre}</td>
              <td className="py-2 pr-3 text-sm text-muted">{e.fechas}</td>
              <td className="cifra py-2 pr-3 text-right text-sm">{e.horas}</td>
              <td className="cifra py-2 text-right text-sm text-muted">
                {e.presupuesto}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MaquetaColumnas() {
  const columnas = [
    "Fecha",
    "Persona",
    "Categoría",
    "Subcategoría",
    "Proyecto",
    "Edición",
    "Tarea",
    "Horas",
    "Facturable",
    "Importe",
  ]

  return (
    <div className="card p-4">
      <p className="rotulo mb-2 flex items-center gap-1.5">
        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden />
        Lo que sale en el Excel
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {columnas.map((c) => (
          <li key={c} className="chip">
            {c}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        Las horas son un número, las fechas son fechas y el importe es moneda.
        La tabla dinámica sale a la primera.
      </p>
    </div>
  )
}

export default async function Portada() {
  // Con la sesión abierta la portada sigue siendo visible -sirve para
  // enseñársela a otro equipo- pero los botones llevan al espacio.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const dentro = Boolean(user)

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-6 px-5">
          <Marca />
          <nav className="hidden flex-1 items-center gap-5 text-sm text-ink-soft md:flex">
            <a href="#que-hace" className="transition hover:text-ink">
              Qué hace
            </a>
            <a href="#organizar" className="transition hover:text-ink">
              Cómo se organiza
            </a>
            <a href="#empezar" className="transition hover:text-ink">
              Cómo se empieza
            </a>
            <a href="#preguntas" className="transition hover:text-ink">
              Preguntas
            </a>
          </nav>
          <Link
            href={dentro ? RUTA_APP : "/acceso"}
            className="btn btn-ghost ml-auto text-accent md:ml-0"
          >
            {dentro ? "Ir a mi espacio" : "Entrar"}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5">
        {/* -------------------------------------------------------- portada */}
        <section className="grid grid-cols-1 items-center gap-10 py-14 lg:grid-cols-[1fr_26rem] lg:gap-14 lg:py-20">
          <div>
            <p className="rotulo">Para equipos LEINN</p>
            <h1 className="mt-3 text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">
              Las horas del equipo,
              <br />
              cada una en su sitio.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-soft">
              Backoffice, conocimiento y proyectos no se miden igual, pero acaban
              en la misma hoja. hitoo es el cronómetro, el calendario y los
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

            <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
              {CHIPS.map((c) => (
                <li key={c} className="flex items-center gap-1.5 text-xs text-muted">
                  <Check className="h-3.5 w-3.5 text-billable" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <CronometroDemo />
        </section>

        {/* ------------------------------------------------------- que hace */}
        <section id="que-hace" className="scroll-mt-16 border-t border-line py-14 lg:py-20">
          <Seccion
            rotulo="Qué hace"
            titulo="Apuntar, revisar y cerrar la semana"
            texto="Tres pantallas para lo mismo, según cómo trabaje cada uno: el cronómetro para el día a día, el calendario para arrastrar el rato donde toca y la hoja semanal para rellenar a mano el viernes."
          />

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icono: Timer,
                titulo: "Cronómetro",
                texto:
                  "Play y a trabajar. Lo que empieces en el móvil sigue corriendo en el portátil, y no te deja parar sin decir en qué proyecto ha sido.",
              },
              {
                icono: CalendarRange,
                titulo: "Calendario y semana",
                texto:
                  "Arrastras sobre el hueco y ya está apuntado; mueves el bloque si te confundiste. O escribes las horas en la tabla: acepta 2, 1:30, 90m o 1,5.",
              },
              {
                icono: BarChart3,
                titulo: "Informes",
                texto:
                  "Filtras por persona, proyecto, categoría, etiqueta o fecha, ves el reparto y te lo llevas en Excel, CSV o PDF. O todo el histórico de un botón.",
              },
            ].map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo}>
                <Icono className="h-5 w-5 text-ink-soft" strokeWidth={1.9} aria-hidden />
                <h3 className="mt-3 text-[15px] font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------ organizar */}
        <section id="organizar" className="scroll-mt-16 border-t border-line py-14 lg:py-20">
          <Seccion
            rotulo="Cómo se organiza"
            titulo="Vuestra estructura, no la de una herramienta"
            texto="En LEINN el tiempo se reparte entre backoffice, conocimiento y empresa, y dentro por equipos y por tipo de trabajo. Aquí eso es de primera clase, y no un campo apañado para poder filtrar."
          />

          <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">
            <MaquetaArbol />
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-semibold">Dos niveles, y para</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  Categoría y subcategoría. Suficiente para Backoffice · TLT y
                  para Proyectos · Eventos, y poco suficiente para que nadie se
                  monte un laberinto. Cada equipo pone sus ramas y las cambia de
                  nombre cuando cambian los equipos.
                </p>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">
                  Etiqueta de filtro, no carpeta
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  El proyecto cuelga de una rama, pero sigue siendo del espacio:
                  se puede mirar por área, por categoría o por persona sin
                  mover nada de sitio.
                </p>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Una columna por nivel</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  En el Excel salen Categoría y Subcategoría como columnas
                  aparte. Ahí acaba el copiar y pegar de los cierres.
                </p>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Con objetivos</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                  Cada rama puede llevar sus horas por persona y semana. En el
                  cronómetro se ve lo que falta para llegar.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- ediciones */}
        <section className="border-t border-line py-14 lg:py-20">
          <Seccion
            rotulo="Lo que se repite"
            titulo="El mismo evento cada año, sin duplicar el proyecto"
            texto="TBCE 1 y TBCE 2 no son dos proyectos: son dos ediciones del mismo. Cada una con sus fechas, su presupuesto y sus horas; el proyecto suma todas y se pueden comparar entre sí. Las tareas quedan libres para lo que son."
          />
          <div className="mt-8 max-w-2xl">
            <MaquetaEdiciones />
          </div>
        </section>

        {/* -------------------------------------------------------- informes */}
        <section className="border-t border-line py-14 lg:py-20">
          <Seccion
            rotulo="Cerrar"
            titulo="El Excel que de verdad usáis después"
            texto="Lo que se cobra va marcado en verde y con su importe según la tarifa de cada persona o proyecto. Y la descarga no es una captura: son columnas con tipo."
          />
          <div className="mt-8 max-w-2xl">
            <MaquetaColumnas />
          </div>
        </section>

        {/* --------------------------------------------------------- empezar */}
        <section id="empezar" className="scroll-mt-16 border-t border-line py-14 lg:py-20">
          <Seccion rotulo="Cómo se empieza" titulo="Tres pasos y a apuntar" />

          <ol className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {PASOS.map(({ titulo, texto }, i) => (
              <li key={titulo}>
                <span className="cifra text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <h3 className="mt-1 text-[15px] font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------------ para LEINN */}
        <section className="border-t border-line py-14 lg:py-20">
          <Seccion
            rotulo="Por qué no es otro Clockify"
            titulo="Está hecho desde dentro de un equipo"
          />

          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
            {PARA_LEINN.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className="flex gap-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radio-sm)] bg-surface-2 text-ink-soft">
                  <Icono className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold">{titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {texto}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- preguntas */}
        <section id="preguntas" className="scroll-mt-16 border-t border-line py-14 lg:py-20">
          <Seccion rotulo="Preguntas" titulo="Lo que pregunta todo el mundo" />

          <div className="mt-8 max-w-3xl divide-y divide-line border-y border-line">
            {PREGUNTAS.map(({ q, a }) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium marker:content-none">
                  {q}
                  <span
                    aria-hidden
                    className="shrink-0 text-muted transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
                  {a}
                </p>
              </details>
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
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={dentro ? RUTA_APP : "/acceso?modo=registrarse"}
              className="btn btn-primary"
            >
              {dentro ? "Ir a mi espacio" : "Crear el espacio de mi equipo"}
            </Link>
            {!dentro && (
              <Link href="/acceso" className="btn">
                Entrar
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-xs text-muted">
          <div className="flex items-center gap-3">
            <Marca />
            <span>Hecho por un equipo LEINN, para los equipos LEINN.</span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="#que-hace" className="transition hover:text-ink">
              Qué hace
            </a>
            <a href="#preguntas" className="transition hover:text-ink">
              Preguntas
            </a>
            <Link href="/privacidad" className="transition hover:text-ink">
              Privacidad
            </Link>
            <Link
              href={dentro ? RUTA_APP : "/acceso"}
              className="transition hover:text-ink"
            >
              {dentro ? "Mi espacio" : "Entrar"}
            </Link>
          </nav>
        </div>
      </footer>
    </>
  )
}

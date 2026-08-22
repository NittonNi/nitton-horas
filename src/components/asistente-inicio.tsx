"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Timer,
  Upload,
  Users,
} from "lucide-react"

import { activarEspacio, entrarEnEspacio } from "@/app/acciones"
import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { CodigoQr } from "@/components/codigo-qr"
import { ZONAS_HORARIAS, type Perfil } from "@/lib/tipos"
import { cn, nuevoCodigo } from "@/lib/utils"

/**
 * Montar el espacio, de una sentada.
 *
 * Antes esto estaba repartido: el espacio se creaba en un sitio, los nombres
 * del equipo en otro y el enlace en un tercero, cada uno sin saber del
 * anterior. Aquí van seguidos y en el orden en que se hacen de verdad.
 *
 * Lo que se pregunta se usa: cuántos sois deja preparados esos huecos de
 * nombres, y de dónde venís decide dónde acaba el asistente -en el importador
 * o en el cronómetro-, en vez de preguntarlo otra vez al final. Si vas solo,
 * los pasos de nombres y de repartir el enlace ni aparecen.
 */

type Clave = "espacio" | "vosotros" | "nombres" | "repartir"
type Origen = "clockify" | "otra" | "cero"

const ETIQUETAS: Record<Clave, string> = {
  espacio: "El espacio",
  vosotros: "Cómo sois",
  nombres: "El equipo",
  repartir: "Repartirlo",
}

/** Nadie monta un equipo de tres cifras aquí, y el contador no puede irse. */
const MAX_EQUIPO = 60

/** Zona del navegador, si es una de las que ofrecemos. */
function zonaPorDefecto(): string {
  try {
    const propuesta = Intl.DateTimeFormat().resolvedOptions().timeZone
    return (ZONAS_HORARIAS as readonly string[]).includes(propuesta)
      ? propuesta
      : "Europe/Madrid"
  } catch {
    return "Europe/Madrid"
  }
}

export function AsistenteInicio({ perfil }: { perfil: Perfil }) {
  const [activo, setActivo] = useState<Clave>("espacio")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, empezarTransicion] = useTransition()

  // El espacio
  const [nombre, setNombre] = useState("")
  const [zona, setZona] = useState(zonaPorDefecto)
  const [conPlantilla, setConPlantilla] = useState(true)

  // Cómo sois
  const [cuantos, setCuantos] = useState(5)
  const [origen, setOrigen] = useState<Origen>("cero")

  // Lo que se crea en el primer paso y usan los demás
  const [espacioId, setEspacioId] = useState<string | null>(null)
  const [codigo, setCodigo] = useState<string | null>(null)

  // El equipo
  const [gente, setGente] = useState<string[]>([])

  // Repartirlo
  const [copiado, setCopiado] = useState(false)

  /* Solo tú: no hay a quién nombrar ni a quién mandarle el enlace, así que
     esos dos pasos no existen. La lista de arriba lo enseña al momento. */
  const pasos = useMemo<Clave[]>(
    () =>
      cuantos > 1
        ? ["espacio", "vosotros", "nombres", "repartir"]
        : ["espacio", "vosotros"],
    [cuantos],
  )
  const indice = Math.max(0, pasos.indexOf(activo))

  const enlace =
    codigo && typeof window !== "undefined"
      ? `${window.location.origin}/unirse/${codigo}`
      : null

  /** Dónde se acaba, según de dónde vengan las horas. */
  const destino = origen === "cero" ? "/panel" : "/gestion/importar"

  useEffect(() => {
    if (!copiado) return
    const t = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(t)
  }, [copiado])

  /* ------------------------------------------------------------ el espacio */

  async function crearEspacio() {
    const limpio = nombre.trim()
    if (!limpio) {
      setError("Ponle un nombre al espacio.")
      return
    }
    setOcupado(true)
    setError(null)

    const supabase = createClient()
    const { data, error: err } = await supabase.rpc("create_workspace", {
      p_name: limpio,
      p_timezone: zona,
      p_plantilla: conPlantilla,
    })
    if (err || !data) {
      setOcupado(false)
      setError(mensajeError(err))
      return
    }

    /* Que sea ya el espacio activo: lo que viene después -y adonde se sale al
       final- da por hecho que hay uno. */
    await activarEspacio(data.id)
    setEspacioId(data.id)
    setOcupado(false)
    setActivo("vosotros")
  }

  /* ------------------------------------------------------------- cómo sois */

  /** Del contador salen los huecos: uno menos, que tú ya estás dentro. */
  function irAlEquipo() {
    setGente((antes) => {
      const faltan = cuantos - 1 - antes.length
      return faltan > 0 ? [...antes, ...Array<string>(faltan).fill("")] : antes
    })
    setActivo("nombres")
  }

  /* -------------------------------------------------------------- el equipo */

  function escribir(i: number, valor: string) {
    setGente((antes) => antes.map((n, j) => (j === i ? valor : n)))
  }

  /**
   * Se puede pegar la lista entera en cualquier hueco: se reparte desde ahí
   * hacia abajo y crece si hace falta. Copiar de un correo y soltarlo es como
   * llega esto de verdad.
   */
  function repartirPegado(desde: number, texto: string) {
    const nuevos = texto
      .split(/[\n,;\t]+/)
      .map((n) => n.trim())
      .filter(Boolean)
    if (nuevos.length === 0) return
    setGente((antes) => {
      const lista = [...antes]
      nuevos.forEach((n, k) => {
        lista[desde + k] = n
      })
      return lista.slice(0, MAX_EQUIPO)
    })
  }

  async function guardarGente() {
    const limpios = gente.map((n) => n.trim()).filter(Boolean)
    if (!espacioId || limpios.length === 0) {
      setActivo("repartir")
      return
    }
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient()
      .from("workspace_seats")
      .insert(limpios.map((name) => ({ workspace_id: espacioId, name })))
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setActivo("repartir")
  }

  /* ------------------------------------------------------------- repartirlo */

  /* El enlace se prepara al llegar aquí: si nadie pasa por este paso, el
     espacio se queda sin código y no hay puerta abierta de más. */
  useEffect(() => {
    if (activo !== "repartir" || !espacioId || codigo) return
    let vivo = true
    const generado = nuevoCodigo()
    void createClient()
      .from("workspaces")
      .update({ join_code: generado })
      .eq("id", espacioId)
      .select("join_code")
      .then(({ data, error: err }) => {
        if (!vivo) return
        if (err || !data || data.length === 0) {
          setError("No se ha podido preparar el enlace.")
          return
        }
        setCodigo(generado)
      })
    return () => {
      vivo = false
    }
  }, [activo, espacioId, codigo])

  /* ----------------------------------------------------------------- salida */

  function salir() {
    if (!espacioId) return
    empezarTransicion(() => {
      void entrarEnEspacio(espacioId, destino)
    })
  }

  return (
    /* En claro siempre, como la portada: el alta es la primera pantalla que
       ve alguien y va antes de tener ningún gusto guardado. */
    <main className="tema-claro relative min-h-dvh overflow-hidden">
      {/* Un resplandor arriba para que el negro no sea una pared */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[26rem]"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-4xl gap-8 px-5 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12 lg:py-20">
        {/* ------------------------------------------------------ el lateral */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca */}
          <img src="/hitoo-logo.svg" alt="hitoo" className="h-6 w-auto" />

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            {activo === "espacio"
              ? `Hola, ${perfil.full_name.split(" ")[0]}`
              : nombre.trim() || "Tu espacio"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {activo === "espacio"
              ? "Vamos a montar el espacio de tu equipo."
              : "Así va quedando."}
          </p>

          {/* En pantalla ancha, los pasos con nombre; en el móvil, la raya */}
          <ol className="mt-6 hidden space-y-2.5 lg:block">
            {pasos.map((clave, i) => (
              <li key={clave} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium transition",
                    i < indice
                      ? "border-accent bg-accent text-accent-fg"
                      : i === indice
                        ? "border-accent text-accent"
                        : "border-line text-muted",
                  )}
                >
                  {i < indice ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-sm transition",
                    i === indice ? "font-medium text-ink" : "text-muted",
                  )}
                >
                  {ETIQUETAS[clave]}
                </span>
              </li>
            ))}
          </ol>

          <div
            aria-hidden
            className="mt-5 flex items-center gap-1.5 lg:hidden"
          >
            {pasos.map((clave, i) => (
              <span
                key={clave}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === indice ? "w-6 bg-accent" : "w-1.5",
                  i < indice ? "bg-accent" : i > indice ? "bg-surface-3" : "",
                )}
              />
            ))}
          </div>

          {/* Lo que ya se ha decidido, sin repetir lo que aún no se sabe */}
          {activo !== "espacio" && (
            <dl className="mt-8 hidden space-y-2 border-t border-line pt-5 text-xs lg:block">
              <Dato titulo="Zona" valor={zona.replace(/_/g, " ")} />
              <Dato
                titulo="Estructura"
                valor={conPlantilla ? "La de LEINN" : "En blanco"}
              />
              <Dato
                titulo="Sois"
                valor={cuantos === 1 ? "Tú solo" : `${cuantos} personas`}
              />
            </dl>
          )}
        </div>

        {/* --------------------------------------------------------- el paso */}
        <section key={activo} className="entra">
          {/* ---------------------------------------------------- el espacio */}
          {activo === "espacio" && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void crearEspacio()
              }}
              className="card space-y-5 p-6"
            >
              <div>
                <label className="label" htmlFor="ai-nombre">
                  Nombre del equipo o la empresa
                </label>
                <input
                  id="ai-nombre"
                  autoFocus
                  className="field text-base"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nitton"
                />
              </div>

              <div>
                <label className="label" htmlFor="ai-zona">
                  Zona horaria
                </label>
                <select
                  id="ai-zona"
                  className="field"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                >
                  {ZONAS_HORARIAS.map((z) => (
                    <option key={z} value={z}>
                      {z.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-muted">
                  Decide a qué día cuenta cada hora. Se cambia después.
                </p>
              </div>

              <div>
                <span className="label">¿Por dónde empezamos?</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Opcion
                    activa={conPlantilla}
                    onClick={() => setConPlantilla(true)}
                    icono={Sparkles}
                    titulo="La estructura de LEINN"
                    texto="Backoffice, Conocimiento y Proyectos, con sus ramas dentro. Todo se cambia luego."
                  />
                  <Opcion
                    activa={!conPlantilla}
                    onClick={() => setConPlantilla(false)}
                    icono={Plus}
                    titulo="En blanco"
                    texto="Sin áreas ni categorías. Las montas tú a tu manera."
                  />
                </div>
              </div>

              {error && <Fallo texto={error} />}

              <button
                type="submit"
                disabled={ocupado || !nombre.trim()}
                className="btn btn-primary w-full"
              >
                {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear el espacio
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* ----------------------------------------------------- cómo sois */}
          {activo === "vosotros" && (
            <div className="card space-y-6 p-6">
              <div>
                <h2 className="text-base font-semibold">¿Cuántos sois?</h2>
                <p className="mt-1 text-sm text-muted">
                  Contándote a ti. Dejamos preparados esos huecos para los
                  nombres; luego se añade o se quita gente cuando quieras.
                </p>

                <div className="mt-4 flex items-center justify-center gap-6 rounded-[var(--radio)] border border-line bg-surface-2 py-5">
                  <BotonContador
                    etiqueta="Uno menos"
                    icono={Minus}
                    onClick={() => setCuantos((n) => Math.max(1, n - 1))}
                    apagado={cuantos <= 1}
                  />
                  <div className="w-24 text-center">
                    <p className="cifra text-4xl font-semibold leading-none">
                      {cuantos}
                    </p>
                    <p className="mt-1.5 text-xs text-muted">
                      {cuantos === 1 ? "solo tú" : "personas"}
                    </p>
                  </div>
                  <BotonContador
                    etiqueta="Uno más"
                    icono={Plus}
                    onClick={() => setCuantos((n) => Math.min(MAX_EQUIPO, n + 1))}
                    apagado={cuantos >= MAX_EQUIPO}
                  />
                </div>

                <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                  {[1, 3, 5, 8, 12, 20].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setCuantos(n)}
                      className={cn(
                        "chip cifra transition",
                        cuantos === n && "border-accent text-accent",
                      )}
                    >
                      {n === 1 ? "Solo yo" : n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-line pt-5">
                <h2 className="text-base font-semibold">¿De dónde venís?</h2>
                <p className="mt-1 text-sm text-muted">
                  Para acabar donde toca y no preguntártelo otra vez al final.
                </p>

                <div className="mt-3 space-y-2">
                  <Opcion
                    activa={origen === "clockify"}
                    onClick={() => setOrigen("clockify")}
                    icono={Upload}
                    titulo="De Clockify"
                    texto="Con el CSV del informe detallado entra el histórico, con su proyecto, su tarea y sus etiquetas."
                  />
                  <Opcion
                    activa={origen === "otra"}
                    onClick={() => setOrigen("otra")}
                    icono={Upload}
                    titulo="De un Excel o de otra herramienta"
                    texto="Si puedes exportar un CSV con las columnas de Clockify, entra igual. Si no, siempre puedes empezar de cero."
                  />
                  <Opcion
                    activa={origen === "cero"}
                    onClick={() => setOrigen("cero")}
                    icono={Timer}
                    titulo="De cero"
                    texto="Al cronómetro directo. Los proyectos se van creando sobre la marcha."
                  />
                </div>
              </div>

              {error && <Fallo texto={error} />}

              <button
                type="button"
                onClick={() => (cuantos > 1 ? irAlEquipo() : salir())}
                className="btn btn-primary w-full"
              >
                {cuantos > 1 ? "Siguiente" : textoFinal(origen)}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ----------------------------------------------------- el equipo */}
          {activo === "nombres" && (
            <div className="card space-y-4 p-6">
              <div>
                <h2 className="text-base font-semibold">
                  ¿Quiénes son los otros {cuantos - 1}?
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Escribe los nombres y luego cada uno entra con su correo y
                  dice cuál es el suyo, sin que tengas que ir pidiendo
                  direcciones. Puedes pegar la lista entera en el primer hueco.
                </p>
              </div>

              <ul className="space-y-2">
                {gente.map((valor, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xs text-muted">
                      {i + 2}
                    </span>
                    <input
                      autoFocus={i === 0}
                      className="field"
                      value={valor}
                      onChange={(e) => escribir(i, e.target.value)}
                      onPaste={(e) => {
                        const pegado = e.clipboardData.getData("text")
                        if (/[\n,;\t]/.test(pegado)) {
                          e.preventDefault()
                          repartirPegado(i, pegado)
                        }
                      }}
                      placeholder={i === 0 ? "Ane Etxebarria" : "Nombre"}
                      aria-label={`Nombre ${i + 2}`}
                    />
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() =>
                  setGente((antes) =>
                    antes.length < MAX_EQUIPO ? [...antes, ""] : antes,
                  )
                }
                disabled={gente.length >= MAX_EQUIPO}
                className="btn btn-ghost text-muted"
              >
                <Plus className="h-4 w-4" />
                Añadir otro hueco
              </button>

              {error && <Fallo texto={error} />}

              <div className="flex items-center gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => void guardarGente()}
                  disabled={ocupado}
                  className="btn btn-primary"
                >
                  {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </button>
                <span className="text-xs text-muted">
                  {(() => {
                    const puestos = gente.filter((n) => n.trim()).length
                    return puestos === 0
                      ? "Los huecos vacíos no molestan: se rellenan luego en Equipo."
                      : `${puestos} ${puestos === 1 ? "nombre" : "nombres"}`
                  })()}
                </span>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------- repartirlo */}
          {activo === "repartir" && (
            <div className="card space-y-5 p-6">
              <div>
                <h2 className="text-base font-semibold">
                  Que entre el resto del equipo
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Enseña esto en la reunión y que cada uno lo escanee, o pásales
                  el enlace. Quien lo tenga entra como miembro y elige su
                  nombre de la lista.
                </p>
              </div>

              {enlace ? (
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                  <CodigoQr valor={enlace} />

                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      readOnly
                      value={enlace}
                      onFocus={(e) => e.currentTarget.select()}
                      className="field cifra text-xs"
                      aria-label="Enlace para unirse"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(enlace)
                        setCopiado(true)
                      }}
                      className="btn w-full"
                    >
                      {copiado ? (
                        <Check className="h-4 w-4 text-billable" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiado ? "Copiado" : "Copiar el enlace"}
                    </button>
                    <p className="text-xs text-muted">
                      Si se te va de las manos, en Equipo se cambia y el
                      anterior deja de valer.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-40 animate-pulse rounded-[var(--radio)] bg-surface-2" />
              )}

              {error && <Fallo texto={error} />}

              <button
                type="button"
                onClick={salir}
                className="btn btn-primary w-full"
              >
                {textoFinal(origen)}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Volver, sin perder lo hecho: el espacio existe desde el paso 1 */}
          {indice > 0 && (
            <button
              type="button"
              onClick={() => setActivo(pasos[indice - 1])}
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Atrás
            </button>
          )}
        </section>
      </div>
    </main>
  )
}

/** El último botón dice adónde va, que es lo que se acaba de elegir. */
function textoFinal(origen: Origen) {
  return origen === "cero" ? "Empezar a contar" : "Traer las horas"
}

/* ------------------------------------------------------------------ piezas */

/** Una tarjeta de elegir: se pulsa entera, y la elegida se ve sin leerla. */
function Opcion({
  activa,
  onClick,
  icono: Icono,
  titulo,
  texto,
}: {
  activa: boolean
  onClick: () => void
  icono: typeof Users
  titulo: string
  texto: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        "flex w-full items-start gap-3 rounded-[var(--radio-sm)] border p-3 text-left transition",
        activa
          ? "border-accent bg-accent-soft"
          : "border-line hover:bg-surface-2",
      )}
    >
      <Icono
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          activa ? "text-accent" : "text-muted",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">
          {texto}
        </span>
      </span>
      {activa && <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
    </button>
  )
}

function BotonContador({
  etiqueta,
  icono: Icono,
  onClick,
  apagado,
}: {
  etiqueta: string
  icono: typeof Plus
  onClick: () => void
  apagado: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={apagado}
      aria-label={etiqueta}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-line-strong bg-surface transition hover:bg-surface-2 disabled:opacity-30"
    >
      <Icono className="h-4 w-4" />
    </button>
  )
}

/** Una línea del resumen del lateral. */
function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{titulo}</dt>
      <dd className="min-w-0 truncate text-right font-medium text-ink-soft">
        {valor}
      </dd>
    </div>
  )
}

function Fallo({ texto }: { texto: string }) {
  return (
    <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
      {texto}
    </p>
  )
}

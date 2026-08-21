"use client"

import { useEffect, useState, useTransition } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Plus,
  Timer,
  Upload,
  X,
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
 * anterior. Aquí van los cuatro pasos seguidos y en el orden en que se hacen
 * de verdad: creas, escribes quién sois, lo repartes y eliges por dónde
 * empezar.
 */

const PASOS = ["El espacio", "El equipo", "Repartirlo", "Empezar"] as const

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
  const [paso, setPaso] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, empezarTransicion] = useTransition()

  // Paso 1
  const [nombre, setNombre] = useState("")
  const [zona, setZona] = useState(zonaPorDefecto)
  const [conPlantilla, setConPlantilla] = useState(true)

  // Lo que se crea en el paso 1 y usan los demás
  const [espacioId, setEspacioId] = useState<string | null>(null)
  const [codigo, setCodigo] = useState<string | null>(null)

  // Paso 2
  const [gente, setGente] = useState<string[]>([])
  const [suelto, setSuelto] = useState("")

  // Paso 3
  const [copiado, setCopiado] = useState(false)

  const enlace =
    codigo && typeof window !== "undefined"
      ? `${window.location.origin}/unirse/${codigo}`
      : null

  useEffect(() => {
    if (!copiado) return
    const t = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(t)
  }, [copiado])

  /* -------------------------------------------------------------- paso 1 */

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
    setPaso(1)
  }

  /* -------------------------------------------------------------- paso 2 */

  /** Se puede pegar una lista entera: una por línea o separadas por comas. */
  function anadir(texto: string) {
    const nuevos = texto
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter(Boolean)
    if (nuevos.length === 0) return
    setGente((antes) => [
      ...antes,
      ...nuevos.filter(
        (n) => !antes.some((a) => a.toLowerCase() === n.toLowerCase()),
      ),
    ])
    setSuelto("")
  }

  async function guardarGente() {
    if (!espacioId || gente.length === 0) {
      setPaso(2)
      return
    }
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient()
      .from("workspace_seats")
      .insert(gente.map((name) => ({ workspace_id: espacioId, name })))
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setPaso(2)
  }

  /* -------------------------------------------------------------- paso 3 */

  /* El enlace se prepara al llegar aquí: si nadie pasa por este paso, el
     espacio se queda sin código y no hay puerta abierta de más. */
  useEffect(() => {
    if (paso !== 2 || !espacioId || codigo) return
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
  }, [paso, espacioId, codigo])

  /* -------------------------------------------------------------- salida */

  function salir(destino: string) {
    if (!espacioId) return
    empezarTransicion(() => {
      void entrarEnEspacio(espacioId, destino)
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg">
          <Timer className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">
          {paso === 0
            ? `Hola, ${perfil.full_name.split(" ")[0]}`
            : (nombre.trim() || "Tu espacio")}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {paso === 0
            ? "Vamos a montar el espacio de tu equipo. Son cuatro pasos."
            : PASOS[paso]}
        </p>
      </div>

      {/* Dónde estás: cuatro puntos, sin números que no dicen nada */}
      <ol className="mb-4 flex items-center justify-center gap-1.5">
        {PASOS.map((p, i) => (
          <li
            key={p}
            aria-current={i === paso ? "step" : undefined}
            title={p}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === paso ? "w-6 bg-accent" : "w-1.5",
              i < paso ? "bg-accent" : i > paso ? "bg-surface-3" : "",
            )}
          />
        ))}
      </ol>

      <section className="card p-5">
        {/* ------------------------------------------------------ el espacio */}
        {paso === 0 && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void crearEspacio()
            }}
            className="space-y-3"
          >
            <div>
              <label className="label" htmlFor="ai-nombre">
                Nombre del equipo o la empresa
              </label>
              <input
                id="ai-nombre"
                autoFocus
                className="field"
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
              <p className="mt-1 text-xs text-muted">
                Decide a qué día cuenta cada hora. Se cambia después.
              </p>
            </div>

            <label className="flex items-start gap-2.5 rounded-[var(--radio-sm)] border border-line bg-surface-2/60 p-3">
              <input
                type="checkbox"
                checked={conPlantilla}
                onChange={(e) => setConPlantilla(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium">
                  Empezar con la estructura de LEINN
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Backoffice —TLT, Care, Financial y Legal—, Conocimiento y
                  Proyectos —Eventos, Proyectos y Oportunidades—. Todo se cambia
                  luego; sin marcar, empiezas en blanco.
                </span>
              </span>
            </label>

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

        {/* ------------------------------------------------------- el equipo */}
        {paso === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Escribe los nombres de quienes vais a apuntar horas. Después cada
              uno entra con su correo y dice cuál es el suyo, sin que tengas que
              ir pidiendo direcciones.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                anadir(suelto)
              }}
              className="flex gap-2"
            >
              <input
                autoFocus
                className="field"
                value={suelto}
                onChange={(e) => setSuelto(e.target.value)}
                onPaste={(e) => {
                  const pegado = e.clipboardData.getData("text")
                  if (/[\n,;]/.test(pegado)) {
                    e.preventDefault()
                    anadir(pegado)
                  }
                }}
                placeholder="Ane Etxebarria"
                aria-label="Nombre"
              />
              <button
                type="submit"
                disabled={!suelto.trim()}
                className="btn btn-primary shrink-0"
              >
                <Plus className="h-4 w-4" />
                Añadir
              </button>
            </form>
            <p className="text-xs text-muted">
              Puedes pegar la lista entera de una vez, una por línea.
            </p>

            {gente.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {gente.map((n) => (
                  <li key={n}>
                    <span className="chip gap-1">
                      {n}
                      <button
                        type="button"
                        onClick={() =>
                          setGente((antes) => antes.filter((a) => a !== n))
                        }
                        aria-label={`Quitar a ${n}`}
                        className="text-muted transition hover:text-ink"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {error && <Fallo texto={error} />}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => void guardarGente()}
                disabled={ocupado}
                className="btn btn-primary"
              >
                {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
                {gente.length === 0 ? "Ahora no" : "Siguiente"}
                <ArrowRight className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted">
                {gente.length === 0
                  ? "También se pueden añadir luego, en Equipo."
                  : `${gente.length} ${gente.length === 1 ? "persona" : "personas"}`}
              </span>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------- repartirlo */}
        {paso === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Enseña esto en la reunión y que cada uno lo escanee, o pásales el
              enlace. Quien lo tenga entra como miembro.
            </p>

            {enlace ? (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
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
                    Si se te va de las manos, en Equipo se cambia y el anterior
                    deja de valer.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-40 animate-pulse rounded-[var(--radio)] bg-surface-2" />
            )}

            {error && <Fallo texto={error} />}

            <button
              type="button"
              onClick={() => setPaso(3)}
              className="btn btn-primary w-full"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* -------------------------------------------------------- empezar */}
        {paso === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Ya está montado. ¿Traes horas de Clockify o empiezas de cero?
            </p>

            <button
              type="button"
              onClick={() => salir("/gestion/importar")}
              className="flex w-full items-start gap-3 rounded-[var(--radio-sm)] border border-line p-3 text-left transition hover:bg-surface-2"
            >
              <Upload className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  Traer lo de Clockify
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Un CSV del informe detallado y no se pierde el año pasado.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => salir("/panel")}
              className="flex w-full items-start gap-3 rounded-[var(--radio-sm)] border border-line p-3 text-left transition hover:bg-surface-2"
            >
              <Timer className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  Empezar a contar ya
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Al cronómetro. Los proyectos se crean sobre la marcha.
                </span>
              </span>
            </button>
          </div>
        )}
      </section>

      {/* Volver, sin perder lo hecho: el espacio ya existe desde el paso 1 */}
      {paso > 0 && paso < 3 && (
        <button
          type="button"
          onClick={() => setPaso((p) => p - 1)}
          className="mx-auto mt-4 inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Atrás
        </button>
      )}
    </main>
  )
}

function Fallo({ texto }: { texto: string }) {
  return (
    <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
      {texto}
    </p>
  )
}

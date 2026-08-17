"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Euro, ListPlus, Loader2, Play, Square, Timer, Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useCronometro } from "@/components/proveedor-cronometro"
import { useSesion } from "@/components/proveedor-sesion"
import { SelectorProyecto } from "@/components/selector-proyecto"
import { SelectorEtiquetas } from "@/components/selector-etiquetas"
import {
  combineDateAndTime,
  formatDuration,
  parseDurationToSeconds,
  todayKey,
} from "@/lib/time"
import { BORRADOR_VACIO, type BorradorEntrada, type Catalogo } from "@/lib/tipos"
import { cn } from "@/lib/utils"

type Modo = "cronometro" | "manual"

export function BarraCronometro({ catalogo }: { catalogo: Catalogo }) {
  const router = useRouter()
  const { perfil, espacio } = useSesion()
  const { enMarcha, segundos, arrancar, parar, descartar, cargando, recargar } =
    useCronometro()

  const [modo, setModo] = useState<Modo>("cronometro")
  const [borrador, setBorrador] = useState<BorradorEntrada>(BORRADOR_VACIO)
  const [guardando, setGuardando] = useState(false)
  const supabase = useRef(createClient())

  // Mientras corre el cronometro, la barra muestra y edita esa entrada
  const activo = enMarcha
    ? {
        project_id: enMarcha.project_id,
        task_id: enMarcha.task_id,
        description: enMarcha.description,
        billable: enMarcha.billable,
        tagIds: enMarcha.tagIds,
      }
    : borrador

  // Lo que se esta tecleando ahora mismo, atado a la entrada que se edita: si
  // cambia la entrada (arranca otra, para, llega del movil) el texto local
  // caduca solo y vuelve a mandar lo que dice el servidor.
  const claveActiva = enMarcha?.id ?? "borrador"
  const [tecleado, setTecleado] = useState<{ clave: string; texto: string } | null>(
    null,
  )
  const descripcionLocal =
    tecleado?.clave === claveActiva ? tecleado.texto : activo.description
  const setDescripcionLocal = (texto: string) =>
    setTecleado({ clave: claveActiva, texto })

  /** Guarda un cambio sobre la entrada en marcha. */
  async function actualizarEnMarcha(cambios: Partial<BorradorEntrada>) {
    if (!enMarcha) return
    try {
      const { tagIds, ...campos } = cambios
      if (Object.keys(campos).length > 0) {
        const { error } = await supabase.current
          .from("time_entries")
          .update(campos)
          .eq("id", enMarcha.id)
        if (error) throw error
      }
      if (tagIds) {
        await supabase.current
          .from("time_entry_tags")
          .delete()
          .eq("entry_id", enMarcha.id)
        if (tagIds.length > 0) {
          const { error } = await supabase.current
            .from("time_entry_tags")
            .insert(tagIds.map((tag_id) => ({ entry_id: enMarcha.id, tag_id })))
          if (error) throw error
        }
      }
      await recargar()
    } catch (err) {
      alert(mensajeError(err))
    }
  }

  function cambiar(cambios: Partial<BorradorEntrada>) {
    if (enMarcha) void actualizarEnMarcha(cambios)
    else setBorrador((b) => ({ ...b, ...cambios }))
  }

  /** Al elegir proyecto, hereda su marca de facturable si no se ha tocado. */
  function elegirProyecto(sel: { project_id: string | null; task_id: string | null }) {
    const proyecto = catalogo.proyectos.find((p) => p.id === sel.project_id)
    cambiar({
      ...sel,
      ...(proyecto && !enMarcha ? { billable: proyecto.billable_default } : {}),
    })
  }

  async function alPulsarPrincipal() {
    if (enMarcha) {
      await parar()
    } else {
      await arrancar({ ...borrador, description: descripcionLocal })
      setBorrador(BORRADOR_VACIO)
      setDescripcionLocal("")
    }
  }

  return (
    <div className="card overflow-visible p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={descripcionLocal}
          onChange={(e) => setDescripcionLocal(e.target.value)}
          onBlur={() => {
            if (enMarcha && descripcionLocal !== enMarcha.description) {
              void actualizarEnMarcha({ description: descripcionLocal })
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              e.currentTarget.blur()
              if (modo === "cronometro") void alPulsarPrincipal()
            }
          }}
          placeholder="¿En que estas trabajando?"
          className="min-w-0 flex-1 bg-transparent px-1 text-[0.95rem] outline-none placeholder:text-muted"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-56">
            <SelectorProyecto
              catalogo={catalogo}
              valor={{ project_id: activo.project_id, task_id: activo.task_id }}
              onChange={elegirProyecto}
            />
          </div>

          <SelectorEtiquetas
            etiquetas={catalogo.etiquetas}
            seleccionadas={activo.tagIds}
            onChange={(tagIds) => cambiar({ tagIds })}
          />

          <button
            type="button"
            onClick={() => cambiar({ billable: !activo.billable })}
            title={activo.billable ? "Facturable" : "No facturable"}
            aria-pressed={activo.billable}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg border transition",
              activo.billable
                ? "border-billable/40 bg-billable-soft text-billable"
                : "border-line-strong bg-surface text-muted hover:bg-surface-2",
            )}
          >
            <Euro className="h-4 w-4" />
          </button>

          <div className="hidden h-6 w-px bg-line sm:block" />

          {modo === "cronometro" ? (
            <>
              <span
                className={cn(
                  "tabular w-24 text-right text-lg font-semibold",
                  enMarcha ? "text-running" : "text-muted",
                )}
              >
                {formatDuration(enMarcha ? segundos : 0)}
              </span>
              <button
                type="button"
                onClick={() => void alPulsarPrincipal()}
                disabled={cargando}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-white transition disabled:opacity-50",
                  enMarcha
                    ? "bg-danger hover:opacity-90"
                    : "bg-running hover:opacity-90",
                )}
                aria-label={enMarcha ? "Parar" : "Arrancar"}
              >
                {cargando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : enMarcha ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4 fill-current" />
                )}
              </button>
              {enMarcha && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("¿Descartar el tiempo de este cronometro?")) {
                      void descartar()
                    }
                  }}
                  title="Descartar sin guardar"
                  className="btn btn-ghost h-9 w-9 p-0 text-muted hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <EntradaManual
              espacioId={espacio.id}
              userId={perfil.id}
              borrador={{ ...borrador, description: descripcionLocal }}
              guardando={guardando}
              setGuardando={setGuardando}
              alGuardar={() => {
                setBorrador(BORRADOR_VACIO)
                setDescripcionLocal("")
                router.refresh()
              }}
            />
          )}

          {!enMarcha && (
            <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
              <button
                type="button"
                onClick={() => setModo("cronometro")}
                title="Modo cronometro"
                aria-pressed={modo === "cronometro"}
                className={cn(
                  "rounded-md p-1.5 transition",
                  modo === "cronometro"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink",
                )}
              >
                <Timer className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setModo("manual")}
                title="Anadir a mano"
                aria-pressed={modo === "manual"}
                className={cn(
                  "rounded-md p-1.5 transition",
                  modo === "manual"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-muted hover:text-ink",
                )}
              >
                <ListPlus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Inicio, fin y duracion enlazados: tocar uno recalcula el otro. */
function EntradaManual({
  espacioId,
  userId,
  borrador,
  guardando,
  setGuardando,
  alGuardar,
}: {
  espacioId: string
  userId: string
  borrador: BorradorEntrada
  guardando: boolean
  setGuardando: (v: boolean) => void
  alGuardar: () => void
}) {
  const [inicio, setInicio] = useState("09:00")
  const [fin, setFin] = useState("10:00")
  const [duracion, setDuracion] = useState("1:00")

  function recalcularDuracion(desde: string, hasta: string) {
    const [h1, m1] = desde.split(":").map(Number)
    const [h2, m2] = hasta.split(":").map(Number)
    let mins = h2 * 60 + m2 - (h1 * 60 + m1)
    if (mins < 0) mins += 24 * 60 // ha cruzado la medianoche
    setDuracion(`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`)
  }

  function aplicarDuracion(texto: string) {
    setDuracion(texto)
    const segs = parseDurationToSeconds(texto)
    if (segs === null) return
    const [h, m] = inicio.split(":").map(Number)
    const total = h * 60 + m + Math.round(segs / 60)
    const hh = Math.floor(total / 60) % 24
    setFin(`${String(hh).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`)
  }

  async function guardar() {
    const segs = parseDurationToSeconds(duracion)
    if (!segs || segs <= 0) {
      alert("Pon una duracion valida, por ejemplo 1:30 o 90m.")
      return
    }

    setGuardando(true)
    const supabase = createClient()
    const hoy = todayKey()
    const start_at = combineDateAndTime(hoy, inicio)
    const end_at = new Date(new Date(start_at).getTime() + segs * 1000).toISOString()

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          workspace_id: espacioId,
          user_id: userId,
          project_id: borrador.project_id,
          task_id: borrador.task_id,
          description: borrador.description,
          billable: borrador.billable,
          start_at,
          end_at,
        })
        .select("id")
        .single()
      if (error) throw error

      if (borrador.tagIds.length > 0) {
        await supabase
          .from("time_entry_tags")
          .insert(borrador.tagIds.map((tag_id) => ({ entry_id: data.id, tag_id })))
      }
      alGuardar()
    } catch (err) {
      alert(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <input
        type="time"
        value={inicio}
        onChange={(e) => {
          setInicio(e.target.value)
          recalcularDuracion(e.target.value, fin)
        }}
        className="field h-9 w-[6.5rem] tabular"
        aria-label="Hora de inicio"
      />
      <span className="text-muted">–</span>
      <input
        type="time"
        value={fin}
        onChange={(e) => {
          setFin(e.target.value)
          recalcularDuracion(inicio, e.target.value)
        }}
        className="field h-9 w-[6.5rem] tabular"
        aria-label="Hora de fin"
      />
      <input
        value={duracion}
        onChange={(e) => aplicarDuracion(e.target.value)}
        className="field h-9 w-20 tabular text-center"
        aria-label="Duracion"
        placeholder="1:30"
      />
      <button
        type="button"
        onClick={() => void guardar()}
        disabled={guardando}
        className="btn btn-primary h-9"
      >
        {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
        Anadir
      </button>
    </>
  )
}

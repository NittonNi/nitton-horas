"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { ChevronLeft, ChevronRight, Euro, Loader2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useSesion } from "@/components/proveedor-sesion"
import { DialogoEntrada } from "@/components/dialogo-entrada"
import { SelectorPersonas } from "@/components/selector-personas"
import { SelectorProyecto } from "@/components/selector-proyecto"
import { SelectorEtiquetas } from "@/components/selector-etiquetas"
import {
  ALTO_HORA,
  comoHora,
  comoHoraInput,
  DIA_ENTERO,
  horaParaEmpezar,
  limitar,
  minutosDeHora,
  redondear,
  repartir,
  type Bloque,
} from "@/lib/calendario"
import {
  addDays,
  formatDurationShort,
  fromDateKey,
  toDateKey,
  todayKey,
} from "@/lib/time"
import type { Catalogo, EntradaVista, Miembro } from "@/lib/tipos"
import { cn } from "@/lib/utils"

type Arrastre =
  | { tipo: "crear"; dia: string; ancla: number; hasta: number }
  | { tipo: "mover"; id: string; dia: string; desde: number; hasta: number; pinza: number }
  | { tipo: "redim"; id: string; dia: string; desde: number; hasta: number }

type Nuevo = { dia: string; desde: number; hasta: number }

const Minimo = 15

export function RejillaCalendario({
  entradas,
  catalogo,
  lunes,
  espacioId,
  yoId,
  personaId,
  miembros,
}: {
  entradas: EntradaVista[]
  catalogo: Catalogo
  lunes: string
  espacioId: string
  yoId: string
  personaId: string
  miembros: Miembro[]
}) {
  const router = useRouter()
  const refColumnas = useRef<HTMLDivElement>(null)
  const arrastreRef = useRef<Arrastre | null>(null)

  const [arrastre, setArrastre] = useState<Arrastre | null>(null)
  const [nuevo, setNuevo] = useState<Nuevo | null>(null)
  const [editando, setEditando] = useState<EntradaVista | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ahora, setAhora] = useState(() => new Date())

  /* Las horas del equipo las corrige cualquiera: si ves un fallo en la semana
     de otro, lo arreglas. Lo que cambia es el tono de los avisos. */
  const mias = personaId === yoId
  const hoy = todayKey()

  const dias = useMemo(
    () => Array.from({ length: 7 }, (_, i) => toDateKey(addDays(fromDateKey(lunes), i))),
    [lunes],
  )

  const porDia = useMemo(() => {
    const mapa = new Map<string, Bloque[]>()
    for (const dia of dias) {
      mapa.set(
        dia,
        repartir(entradas.filter((e) => e.local_date === dia)),
      )
    }
    return mapa
  }, [entradas, dias])

  // El dia entero, siempre: apuntar a las 6 o a las 23 tiene que ser posible
  const franja = DIA_ENTERO
  const alto = ((franja.hasta - franja.desde) / 60) * ALTO_HORA

  // La linea del momento actual, al minuto
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* Al abrir la semana, el scroll cae donde empieza la jornada */
  const refScroll = useRef<HTMLDivElement>(null)
  const semanaVista = useRef<string | null>(null)
  useEffect(() => {
    if (semanaVista.current === lunes) return
    semanaVista.current = lunes
    const minuto = horaParaEmpezar([...porDia.values()].flat())
    refScroll.current?.scrollTo({ top: (minuto / 60) * ALTO_HORA })
  }, [lunes, porDia])

  /* ------------------------------------------------------------- arrastre */

  /** De donde esta el raton a que dia y que minuto es eso. */
  function posicion(evento: { clientX: number; clientY: number }) {
    const caja = refColumnas.current!.getBoundingClientRect()
    const anchoDia = caja.width / dias.length
    const indice = Math.max(
      0,
      Math.min(dias.length - 1, Math.floor((evento.clientX - caja.left) / anchoDia)),
    )
    const minutos = limitar(
      redondear(franja.desde + ((evento.clientY - caja.top) / ALTO_HORA) * 60),
    )
    return { dia: dias[indice], minutos }
  }

  /**
   * Los escuchadores se enganchan aquí mismo, no en un efecto: si se suelta el
   * raton antes de que React vuelva a pintar, el efecto llegaria tarde y el
   * arrastre se quedaria colgado.
   */
  function iniciar(inicial: Arrastre) {
    arrastreRef.current = inicial
    setArrastre(inicial)

    const mover = (evento: PointerEvent) => {
      const previo = arrastreRef.current
      if (!previo) return
      const { dia, minutos } = posicion(evento)

      let siguiente: Arrastre
      if (previo.tipo === "crear") {
        siguiente = { ...previo, dia, hasta: minutos }
      } else if (previo.tipo === "redim") {
        siguiente = { ...previo, hasta: Math.max(previo.desde + Minimo, minutos) }
      } else {
        // mover: se conserva la duracion y se respeta por donde se agarro
        const duracion = previo.hasta - previo.desde
        const inicio = limitar(Math.min(24 * 60 - duracion, minutos - previo.pinza))
        siguiente = { ...previo, dia, desde: inicio, hasta: inicio + duracion }
      }

      arrastreRef.current = siguiente
      setArrastre(siguiente)
    }

    const soltar = () => {
      window.removeEventListener("pointermove", mover)
      window.removeEventListener("pointerup", soltar)
      window.removeEventListener("pointercancel", soltar)
      const final = arrastreRef.current
      arrastreRef.current = null
      setArrastre(null)
      if (final) void confirmar(final)
    }

    window.addEventListener("pointermove", mover)
    window.addEventListener("pointerup", soltar)
    window.addEventListener("pointercancel", soltar)
  }

  async function confirmar(final: Arrastre) {
    if (final.tipo === "crear") {
      const desde = Math.min(final.ancla, final.hasta)
      const hasta = Math.max(final.ancla, final.hasta)
      // Un clic seco, sin arrastrar, crea una hora
      const fin = hasta - desde < Minimo ? desde + 60 : hasta
      setNuevo({ dia: final.dia, desde, hasta: Math.min(24 * 60, fin) })
      return
    }

    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("time_entries")
      .update({
        start_at: instante(final.dia, final.desde),
        end_at: instante(final.dia, final.hasta),
      })
      .eq("id", final.id)

    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  function irA(nuevoLunes: string) {
    const persona = personaId !== yoId ? `&persona=${personaId}` : ""
    router.push(`/calendario?semana=${nuevoLunes}${persona}`)
  }

  const totalSemana = entradas.reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

  /* ---------------------------------------------------------------- vista */

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => irA(toDateKey(addDays(fromDateKey(lunes), -7)))}
            className="btn p-2"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => irA(toDateKey(addDays(fromDateKey(lunes), 7)))}
            className="btn p-2"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm font-medium">
          {fromDateKey(lunes).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
          })}{" "}
          -{" "}
          {fromDateKey(dias[6]).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>

        <span className="chip">{formatDurationShort(totalSemana)}</span>

        {miembros.length > 0 && (
          <select
            className="field ml-auto w-52 py-1"
            value={personaId}
            onChange={(e) => {
              const destino = e.target.value
              router.push(
                `/calendario?semana=${lunes}${destino !== yoId ? `&persona=${destino}` : ""}`,
              )
            }}
            aria-label="Persona"
          >
            {miembros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === yoId ? `${m.full_name} (tu)` : m.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        {/* cabecera de dias */}
        <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] border-b border-line">
          <div />
          {dias.map((dia) => {
            const fecha = fromDateKey(dia)
            const esHoy = dia === hoy
            const segundos = (porDia.get(dia) ?? []).reduce(
              (s, b) => s + (b.entrada.duration_seconds ?? 0),
              0,
            )
            return (
              <div
                key={dia}
                className={cn(
                  "border-l border-line px-2 py-2 text-center",
                  esHoy && "bg-live-soft",
                )}
              >
                <p className="rotulo">
                  {fecha.toLocaleDateString("es-ES", { weekday: "short" }).replace(".", "")}
                </p>
                <p
                  className={cn(
                    "cifra text-lg font-semibold leading-tight",
                    esHoy && "text-live",
                  )}
                >
                  {fecha.getDate()}
                </p>
                <p className="cifra text-[11px] text-muted">
                  {segundos > 0 ? formatDurationShort(segundos) : "-"}
                </p>
              </div>
            )
          })}
        </div>

        {/* rejilla */}
        <div ref={refScroll} className="scroll-thin max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]">
            {/* columna de horas */}
            <div className="relative" style={{ height: alto }}>
              {Array.from(
                { length: (franja.hasta - franja.desde) / 60 + 1 },
                (_, i) => franja.desde + i * 60,
              ).map((minuto) => (
                <span
                  key={minuto}
                  // Justo debajo de su linea: la hora rotula la franja que abre
                  className="rotulo absolute right-2 leading-none"
                  style={{ top: ((minuto - franja.desde) / 60) * ALTO_HORA + 4 }}
                >
                  {minuto < 24 * 60 ? comoHora(minuto) : ""}
                </span>
              ))}
            </div>

            {/* columnas de dias */}
            <div
              ref={refColumnas}
              className="col-span-7 grid grid-cols-7"
              style={{ height: alto }}
            >
              {dias.map((dia) => (
                <ColumnaDia
                  key={dia}
                  dia={dia}
                  esHoy={dia === hoy}
                  bloques={porDia.get(dia) ?? []}
                  franja={franja}
                  editable
                  arrastre={arrastre}
                  ahora={ahora}
                  onCrear={(minutos) =>
                    iniciar({ tipo: "crear", dia, ancla: minutos, hasta: minutos })
                  }
                  onMover={(bloque, minutos) =>
                    iniciar({
                      tipo: "mover",
                      id: bloque.entrada.id,
                      dia,
                      desde: bloque.desde,
                      hasta: bloque.hasta,
                      pinza: minutos - bloque.desde,
                    })
                  }
                  onRedimensionar={(bloque) =>
                    iniciar({
                      tipo: "redim",
                      id: bloque.entrada.id,
                      dia,
                      desde: bloque.desde,
                      hasta: bloque.hasta,
                    })
                  }
                  onAbrir={(entrada) => setEditando(entrada)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="no-print text-xs text-muted">
        {mias
          ? "Arrastra sobre un hueco para apuntar horas. Mueve un bloque para cambiarlo de sitio, o estira su borde de abajo para alargarlo."
          : "Estás en la semana de otra persona: puedes corregir lo que veas mal, y queda apuntado que lo tocaste tú."}
      </p>

      {nuevo && (
        <DialogoNuevaEntrada
          espacioId={espacioId}
          userId={personaId}
          catalogo={catalogo}
          // Compartir solo tiene sentido cuando apuntas tus propias horas
          miembros={mias ? miembros.filter((m) => m.id !== yoId) : []}
          nuevo={nuevo}
          onCerrar={() => setNuevo(null)}
        />
      )}

      {editando && (
        <DialogoEntrada
          entrada={editando}
          catalogo={catalogo}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ un dia */

function ColumnaDia({
  dia,
  esHoy,
  bloques,
  franja,
  editable,
  arrastre,
  ahora,
  onCrear,
  onMover,
  onRedimensionar,
  onAbrir,
}: {
  dia: string
  esHoy: boolean
  bloques: Bloque[]
  franja: { desde: number; hasta: number }
  editable: boolean
  arrastre: Arrastre | null
  ahora: Date
  onCrear: (minutos: number) => void
  onMover: (bloque: Bloque, minutos: number) => void
  onRedimensionar: (bloque: Bloque) => void
  onAbrir: (entrada: EntradaVista) => void
}) {
  const arriba = (minutos: number) => ((minutos - franja.desde) / 60) * ALTO_HORA
  const minutosDelEvento = (e: React.PointerEvent<HTMLElement>) => {
    const caja = e.currentTarget.getBoundingClientRect()
    return limitar(redondear(franja.desde + ((e.clientY - caja.top) / ALTO_HORA) * 60))
  }

  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  const enFranja = minutosAhora >= franja.desde && minutosAhora <= franja.hasta

  // El bloque que se esta arrastrando se pinta donde va a caer, no donde estaba
  const fantasma =
    arrastre?.tipo === "crear" && arrastre.dia === dia
      ? {
          desde: Math.min(arrastre.ancla, arrastre.hasta),
          hasta: Math.max(arrastre.ancla, arrastre.hasta),
        }
      : null

  return (
    <div
      className={cn(
        "relative border-l border-line",
        esHoy && "bg-live-soft/40",
        editable && "cursor-crosshair",
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(to bottom, var(--line) 0 1px, transparent 1px ${ALTO_HORA}px)`,
      }}
      onPointerDown={(e) => {
        if (!editable || e.button !== 0) return
        if ((e.target as HTMLElement).closest("[data-bloque]")) return
        onCrear(minutosDelEvento(e))
      }}
    >
      {esHoy && enFranja && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 h-px bg-live-fill"
          style={{ top: arriba(minutosAhora) }}
        >
          <span className="absolute -left-0.5 -top-1 h-2 w-2 rounded-full bg-live-fill" />
        </div>
      )}

      {bloques.map((bloque) => {
        const arrastrandose =
          (arrastre?.tipo === "mover" || arrastre?.tipo === "redim") &&
          arrastre.id === bloque.entrada.id
        const desde = arrastrandose ? arrastre.desde : bloque.desde
        const hasta = arrastrandose ? arrastre.hasta : bloque.hasta
        const enOtroDia = arrastrandose && arrastre.dia !== dia
        if (enOtroDia) return null

        const color = bloque.entrada.project_color ?? "var(--line-strong)"
        const anchura = 100 / bloque.columnas

        return (
          <div
            key={bloque.entrada.id}
            data-bloque
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onAbrir(bloque.entrada)
              }
            }}
            onPointerDown={(e) => {
              if (!editable || e.button !== 0) return
              e.stopPropagation()
              const caja = e.currentTarget.getBoundingClientRect()
              // los últimos 8 px de alto son el tirador para alargar
              if (e.clientY > caja.bottom - 8) onRedimensionar(bloque)
              else {
                const caso = limitar(
                  redondear(franja.desde + ((e.clientY - (caja.top - arriba(desde))) / ALTO_HORA) * 60),
                )
                onMover(bloque, caso)
              }
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (!arrastrandose) onAbrir(bloque.entrada)
            }}
            title={`${comoHora(desde)} - ${comoHora(hasta)}  ${bloque.entrada.description || ""}`}
            className={cn(
              "absolute overflow-hidden rounded-[3px] border-l-[3px] bg-surface px-1.5 py-1 text-left shadow-sm ring-1 ring-inset transition-shadow",
              // Lo que se cobra va enmarcado en verde; el resto, en linea neutra
              bloque.entrada.billable ? "ring-billable-line" : "ring-line",
              editable && "cursor-grab active:cursor-grabbing",
              arrastrandose && "opacity-80 shadow-lg",
            )}
            style={{
              top: arriba(desde),
              height: Math.max(16, ((hasta - desde) / 60) * ALTO_HORA - 2),
              left: `calc(${bloque.columna * anchura}% + 2px)`,
              width: `calc(${anchura}% - 4px)`,
              borderLeftColor: color,
            }}
          >
            <p
              className={cn(
                "truncate text-[11px] font-medium leading-tight",
                bloque.entrada.billable && "pr-3.5",
              )}
            >
              {bloque.entrada.description || bloque.entrada.project_name || "Sin descripción"}
            </p>
            <p className="cifra truncate text-[10px] leading-tight text-muted">
              {comoHora(desde)}-{comoHora(hasta)}
            </p>
            {bloque.entrada.billable && (
              <Euro className="absolute right-1 top-1.5 h-3 w-3 text-billable" />
            )}
            {editable && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
              />
            )}
          </div>
        )
      })}

      {fantasma && (
        <div
          className="pointer-events-none absolute inset-x-0.5 rounded-[3px] border border-dashed border-accent bg-accent-soft px-1.5 py-1"
          style={{
            top: arriba(fantasma.desde),
            height: Math.max(14, ((fantasma.hasta - fantasma.desde) / 60) * ALTO_HORA),
          }}
        >
          <p className="cifra text-[10px] font-medium text-accent">
            {comoHora(fantasma.desde)}-{comoHora(fantasma.hasta)}
          </p>
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------- entrada nueva */

function instante(dia: string, minutos: number): string {
  const [y, m, d] = dia.split("-").map(Number)
  return new Date(y, m - 1, d, Math.floor(minutos / 60), minutos % 60, 0, 0).toISOString()
}

function DialogoNuevaEntrada({
  espacioId,
  userId,
  catalogo,
  miembros,
  nuevo,
  onCerrar,
}: {
  espacioId: string
  userId: string
  catalogo: Catalogo
  miembros: Miembro[]
  nuevo: Nuevo
  onCerrar: () => void
}) {
  const router = useRouter()
  const { espacio } = useSesion()
  const [descripcion, setDescripcion] = useState("")
  const [edicionId, setEdicionId] = useState<string | null>(null)
  const [proyecto, setProyecto] = useState<{
    project_id: string | null
    task_id: string | null
  }>({ project_id: null, task_id: null })
  const [facturable, setFacturable] = useState(false)
  const [compartidos, setCompartidos] = useState<string[]>([])
  const [etiquetas, setEtiquetas] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* El arrastre solo propone: aquí se puede afinar la fecha y las horas */
  const [fecha, setFecha] = useState(nuevo.dia)
  const [horaInicio, setHoraInicio] = useState(comoHoraInput(nuevo.desde))
  const [horaFin, setHoraFin] = useState(comoHoraInput(nuevo.hasta))

  const minutosInicio = minutosDeHora(horaInicio)
  const minutosFin = minutosDeHora(horaFin)
  // Si el fin es menor que el inicio, es que cruza la medianoche
  const duracion =
    minutosInicio === null || minutosFin === null
      ? null
      : (minutosFin > minutosInicio ? minutosFin : minutosFin + 24 * 60) - minutosInicio

  function elegirProyecto(sel: { project_id: string | null; task_id: string | null }) {
    setProyecto(sel)
    const encontrado = catalogo.proyectos.find((p) => p.id === sel.project_id)
    if (encontrado) setFacturable(encontrado.billable_default)
  }

  async function guardar() {
    if (minutosInicio === null || duracion === null || duracion <= 0) {
      setError("Revisa las horas: el fin tiene que ser posterior al inicio.")
      return
    }
    if (espacio.require_project && !proyecto.project_id) {
      setError("Elige un proyecto: este espacio no guarda horas sueltas.")
      return
    }

    setGuardando(true)
    setError(null)

    const inicio = instante(fecha, minutosInicio)
    const fin = new Date(new Date(inicio).getTime() + duracion * 60_000).toISOString()

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("time_entries")
      .insert({
        workspace_id: espacioId,
        user_id: userId,
        project_id: proyecto.project_id,
        edition_id: edicionId,
        task_id: proyecto.task_id,
        description: descripcion,
        billable: facturable,
        start_at: inicio,
        end_at: fin,
        source: "calendario",
      })
      .select("id")
      .single()

    if (err) {
      setGuardando(false)
      setError(mensajeError(err))
      return
    }

    if (etiquetas.length > 0) {
      const { error: errTags } = await supabase
        .from("time_entry_tags")
        .insert(etiquetas.map((tag_id) => ({ entry_id: data.id, tag_id })))
      if (errTags) {
        setGuardando(false)
        setError(mensajeError(errTags))
        return
      }
    }

    // Al resto no se le apuntan las horas: se le proponen
    if (compartidos.length > 0) {
      const { error: errCompartir } = await supabase.from("entry_invitations").insert(
        compartidos.map((to_user) => ({
          workspace_id: espacioId,
          origin_entry_id: data.id,
          from_user: userId,
          to_user,
          project_id: proyecto.project_id,
          edition_id: edicionId,
          task_id: proyecto.task_id,
          description: descripcion,
          start_at: inicio,
          end_at: fin,
          billable: facturable,
        })),
      )
      if (errCompartir) {
        setGuardando(false)
        setError(
          `Tus horas se han guardado, pero no se ha podido avisar al resto: ${mensajeError(errCompartir)}`,
        )
        return
      }
    }

    setGuardando(false)
    router.refresh()
    onCerrar()
  }

  return (
    <Dialog.Root open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="card fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">Nueva entrada</Dialog.Title>
            <Dialog.Close className="btn btn-ghost p-1" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2">
                <label className="label" htmlFor="cal-fecha">
                  Fecha
                </label>
                <input
                  id="cal-fecha"
                  type="date"
                  className="field tabular"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="cal-inicio">
                  Inicio
                </label>
                <input
                  id="cal-inicio"
                  type="time"
                  className="field tabular"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="cal-fin">
                  Fin
                </label>
                <input
                  id="cal-fin"
                  type="time"
                  className="field tabular"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-muted">
              {duracion && duracion > 0
                ? `Son ${formatDurationShort(duracion * 60)} horas.`
                : "El fin tiene que ser posterior al inicio."}
            </p>

            <div>
              <label className="label" htmlFor="cal-descripcion">
                En que has trabajado
              </label>
              <input
                id="cal-descripcion"
                autoFocus
                className="field"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <span className="label">Proyecto y tarea</span>
              <SelectorProyecto
                catalogo={catalogo}
                valor={{ ...proyecto, edition_id: edicionId }}
                onChange={(sel) => {
                  setEdicionId(sel.edition_id)
                  elegirProyecto(sel)
                }}
              />
            </div>

            <div>
              <span className="label">Etiquetas</span>
              <SelectorEtiquetas
                etiquetas={catalogo.etiquetas}
                seleccionadas={etiquetas}
                onChange={setEtiquetas}
              />
            </div>

            <div>
              <span className="label">También cuenta para</span>
              <SelectorPersonas
                miembros={miembros}
                seleccionadas={compartidos}
                onChange={setCompartidos}
              />
              {compartidos.length > 0 && (
                <p className="mt-1 text-xs text-muted">
                  Les llegara como una propuesta: hasta que la acepten no se les
                  apunta nada.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFacturable((v) => !v)}
              aria-pressed={facturable}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-[var(--radio-sm)] border px-3 text-sm transition",
                facturable
                  ? "border-billable-line bg-billable-soft text-billable"
                  : "border-line-strong bg-surface text-muted hover:bg-surface-2",
              )}
            >
              <Euro className="h-4 w-4" />
              {facturable ? "Facturable" : "No facturable"}
            </button>

            {error && (
              <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
            <Dialog.Close className="btn">Cancelar</Dialog.Close>
            <button
              type="button"
              onClick={() => void guardar()}
              disabled={guardando}
              className="btn btn-primary"
            >
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

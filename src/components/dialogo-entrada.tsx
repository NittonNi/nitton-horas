"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Euro, Loader2, Trash2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useAvisos } from "@/components/avisos"
import { SelectorPersonas } from "@/components/selector-personas"
import { proponerHoras } from "@/lib/compartir"
import { useSesion } from "@/components/proveedor-sesion"
import { SelectorProyecto } from "@/components/selector-proyecto"
import { SelectorEtiquetas } from "@/components/selector-etiquetas"
import {
  combineDateAndTime,
  formatDurationShort,
  parseDurationToSeconds,
  toClockInput,
} from "@/lib/time"
import type { Catalogo, EntradaVista, Miembro } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export function DialogoEntrada({
  entrada,
  catalogo,
  miembros = [],
  onCerrar,
}: {
  entrada: EntradaVista
  catalogo: Catalogo
  /** El resto del equipo: para contarle estas horas a quien tambien estuvo. */
  miembros?: Miembro[]
  onCerrar: () => void
}) {
  const router = useRouter()
  const { avisar } = useAvisos()
  const { perfil, espacio } = useSesion()
  // A quien mas le cuentan estas horas: se les propone al guardar
  const [compartidos, setCompartidos] = useState<string[]>([])
  const [descripcion, setDescripcion] = useState(entrada.description)
  const [proyecto, setProyecto] = useState({
    project_id: entrada.project_id,
    task_id: entrada.task_id,
    edition_id: entrada.edition_id,
  })
  const [facturable, setFacturable] = useState(entrada.billable)
  const [fecha, setFecha] = useState(entrada.local_date)
  const [inicio, setInicio] = useState(toClockInput(entrada.start_at))
  const [fin, setFin] = useState(
    entrada.end_at ? toClockInput(entrada.end_at) : "",
  )
  const [duracion, setDuracion] = useState(
    formatDurationShort(entrada.duration_seconds),
  )
  const [tagIds, setTagIds] = useState<string[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Las etiquetas de la vista vienen por nombre; para editarlas hacen falta los ids
  useEffect(() => {
    const supabase = createClient()
    void supabase
      .from("time_entry_tags")
      .select("tag_id")
      .eq("entry_id", entrada.id)
      .then(({ data }) => setTagIds((data ?? []).map((f) => f.tag_id)))
  }, [entrada.id])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onCerrar()
    document.addEventListener("keydown", esc)
    return () => document.removeEventListener("keydown", esc)
  }, [onCerrar])

  function recalcularDuracion(desde: string, hasta: string) {
    if (!desde || !hasta) return
    const [h1, m1] = desde.split(":").map(Number)
    const [h2, m2] = hasta.split(":").map(Number)
    let mins = h2 * 60 + m2 - (h1 * 60 + m1)
    if (mins < 0) mins += 24 * 60
    setDuracion(`${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`)
  }

  function aplicarDuracion(texto: string) {
    setDuracion(texto)
    const segs = parseDurationToSeconds(texto)
    if (segs === null || !inicio) return
    const [h, m] = inicio.split(":").map(Number)
    const total = h * 60 + m + Math.round(segs / 60)
    setFin(
      `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
    )
  }

  /** Igual que en la lista: se guarda la fila antes de irse, para poder volver. */
  async function borrar() {
    setGuardando(true)
    setError(null)
    const supabase = createClient()

    const [{ data: fila }, { data: etiquetasPuestas }] = await Promise.all([
      supabase.from("time_entries").select("*").eq("id", entrada.id).single(),
      supabase
        .from("time_entry_tags")
        .select("entry_id, tag_id")
        .eq("entry_id", entrada.id),
    ])

    const { error: err } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", entrada.id)

    if (err) {
      setGuardando(false)
      setError(mensajeError(err))
      return
    }

    router.refresh()
    onCerrar()
    avisar(
      "Hora borrada.",
      fila
        ? async () => {
            const cliente = createClient()
            const { duration_seconds: _fuera, ...devolver } = fila
            const { error: errVolver } = await cliente
              .from("time_entries")
              .insert(devolver)
            if (errVolver) throw new Error(mensajeError(errVolver))
            if (etiquetasPuestas && etiquetasPuestas.length > 0) {
              await cliente.from("time_entry_tags").insert(etiquetasPuestas)
            }
            router.refresh()
            return "Recuperada."
          }
        : undefined,
    )
  }

  async function guardar() {
    setError(null)
    const segs = parseDurationToSeconds(duracion)
    if (segs === null || segs <= 0) {
      setError("La duración no es válida. Prueba con 1:30, 90m o 1,5.")
      return
    }

    setGuardando(true)
    const supabase = createClient()
    const start_at = combineDateAndTime(fecha, inicio)
    const end_at = new Date(new Date(start_at).getTime() + segs * 1000).toISOString()

    try {
      const { error: errUpdate } = await supabase
        .from("time_entries")
        .update({
          description: descripcion,
          project_id: proyecto.project_id,
          edition_id: proyecto.edition_id,
          task_id: proyecto.task_id,
          billable: facturable,
          start_at,
          end_at,
        })
        .eq("id", entrada.id)
      if (errUpdate) throw errUpdate

      await supabase.from("time_entry_tags").delete().eq("entry_id", entrada.id)
      if (tagIds.length > 0) {
        const { error: errTags } = await supabase
          .from("time_entry_tags")
          .insert(tagIds.map((tag_id) => ({ entry_id: entrada.id, tag_id })))
        if (errTags) throw errTags
      }

      if (compartidos.length > 0) {
        const { error: errCompartir } = await proponerHoras(supabase, {
          espacioId: entrada.workspace_id,
          entradaId: entrada.id,
          deQuien: perfil.id,
          aQuienes: compartidos,
          project_id: proyecto.project_id,
          edition_id: proyecto.edition_id,
          task_id: proyecto.task_id,
          description: descripcion,
          start_at,
          end_at,
          billable: facturable,
        })
        if (errCompartir) throw errCompartir
        avisar(
          compartidos.length === 1
            ? "Propuesta enviada. Hasta que la acepte no se le apunta nada."
            : "Propuestas enviadas. Hasta que las acepten no se les apunta nada.",
        )
      }

      router.refresh()
      onCerrar()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar entrada"
        className="card w-full max-w-lg overflow-visible rounded-b-none sm:rounded-xl"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">Editar entrada</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="btn btn-ghost p-1"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p className="rounded-[var(--radio-sm)] bg-surface-2 px-3 py-2 text-xs text-muted">
            Horas de <span className="text-ink-soft">{entrada.user_name}</span>
            {entrada.updated_by_name &&
              entrada.updated_by !== entrada.user_id && (
                <>
                  {" · última corrección de "}
                  <span className="text-ink-soft">{entrada.updated_by_name}</span>
                </>
              )}
          </p>

          <div>
            <label className="label" htmlFor="descripcion">
              Descripción
            </label>
            <input
              id="descripcion"
              className="field"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="¿En qué estuviste trabajando?"
            />
          </div>

          <div>
            <span className="label">Proyecto y tarea</span>
            <SelectorProyecto
              catalogo={catalogo}
              valor={proyecto}
              onChange={setProyecto}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <label className="label" htmlFor="fecha">
                Fecha
              </label>
              <input
                id="fecha"
                type="date"
                className="field tabular"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="inicio">
                Inicio
              </label>
              <input
                id="inicio"
                type="time"
                className="field tabular"
                value={inicio}
                onChange={(e) => {
                  setInicio(e.target.value)
                  recalcularDuracion(e.target.value, fin)
                }}
              />
            </div>
            <div>
              <label className="label" htmlFor="fin">
                Fin
              </label>
              <input
                id="fin"
                type="time"
                className="field tabular"
                value={fin}
                onChange={(e) => {
                  setFin(e.target.value)
                  recalcularDuracion(inicio, e.target.value)
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="w-24">
              <label className="label" htmlFor="duracion">
                Duración
              </label>
              <input
                id="duracion"
                className="field tabular text-center"
                value={duracion}
                onChange={(e) => aplicarDuracion(e.target.value)}
              />
            </div>
            <div>
              <span className="label">Etiquetas</span>
              <SelectorEtiquetas
                etiquetas={catalogo.etiquetas}
                seleccionadas={tagIds}
                onChange={setTagIds}
              />
            </div>
            <button
              type="button"
              onClick={() => setFacturable((v) => !v)}
              aria-pressed={facturable}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition",
                facturable
                  ? "border-billable-line bg-billable-soft text-billable"
                  : "border-line-strong bg-surface text-muted hover:bg-surface-2",
              )}
            >
              <Euro className="h-4 w-4" />
              {facturable ? "Facturable" : "No facturable"}
            </button>
          </div>

          <div>
            <span className="label">También cuenta para</span>
            {miembros.length > 0 ? (
              <>
                <SelectorPersonas
                  miembros={miembros.filter((m) => m.id !== entrada.user_id)}
                  seleccionadas={compartidos}
                  onChange={setCompartidos}
                />
                {compartidos.length > 0 && (
                  <p className="mt-1.5 text-xs text-muted">
                    Al guardar les llegará como propuesta: hasta que la acepten
                    no se les apunta nada.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted">
                Cuando haya más gente en {espacio.name} podrás contarle estas
                horas a quien también estuvo.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-danger-soft p-2.5 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          {/* Borrar desde aqui: al abrir una hora para corregirla, a veces lo
              que quieres es que no exista. Con vuelta atras. */}
          <button
            type="button"
            onClick={() => void borrar()}
            disabled={guardando || entrada.locked}
            className="btn btn-danger mr-auto"
          >
            <Trash2 className="h-4 w-4" />
            Borrar
          </button>

          <button type="button" onClick={onCerrar} className="btn">
            Cancelar
          </button>
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
      </div>
    </div>
  )
}

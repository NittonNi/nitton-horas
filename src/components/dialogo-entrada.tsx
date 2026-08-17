"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Euro, Loader2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { SelectorProyecto } from "@/components/selector-proyecto"
import { SelectorEtiquetas } from "@/components/selector-etiquetas"
import {
  combineDateAndTime,
  formatDurationShort,
  parseDurationToSeconds,
  toClockInput,
} from "@/lib/time"
import type { Catalogo, EntradaVista } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export function DialogoEntrada({
  entrada,
  catalogo,
  onCerrar,
}: {
  entrada: EntradaVista
  catalogo: Catalogo
  onCerrar: () => void
}) {
  const router = useRouter()
  const [descripcion, setDescripcion] = useState(entrada.description)
  const [proyecto, setProyecto] = useState({
    project_id: entrada.project_id,
    task_id: entrada.task_id,
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

  async function guardar() {
    setError(null)
    const segs = parseDurationToSeconds(duracion)
    if (segs === null || segs <= 0) {
      setError("La duracion no es valida. Prueba con 1:30, 90m o 1,5.")
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
          <div>
            <label className="label" htmlFor="descripcion">
              Descripcion
            </label>
            <input
              id="descripcion"
              className="field"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="¿En que estuviste trabajando?"
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
                Duracion
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

          {error && (
            <p className="rounded-lg bg-danger-soft p-2.5 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
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

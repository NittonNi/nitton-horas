"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import * as Popover from "@radix-ui/react-popover"
import { Copy, Euro, Play, Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useCronometro } from "@/components/proveedor-cronometro"
import { SelectorProyecto } from "@/components/selector-proyecto"
import { SelectorEtiquetas } from "@/components/selector-etiquetas"
import { SelectorEdicion } from "@/components/selector-edicion"
import {
  combineDateAndTime,
  formatClock,
  formatDurationShort,
  parseDurationToSeconds,
  toClockInput,
} from "@/lib/time"
import type { TablesUpdate } from "@/lib/database.types"
import type { Catalogo, EntradaVista } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/** Que celda esta abierta para editar. Solo una a la vez. */
type Campo = "descripcion" | "proyecto" | "etiquetas" | "horario" | "duracion" | null

/**
 * Una hora apuntada. Todo se edita pulsando encima del dato: no hay que ir a
 * buscar un boton de editar para cambiar una palabra.
 */
export function FilaEntrada({
  entrada,
  catalogo,
  mostrarPersona,
}: {
  entrada: EntradaVista
  catalogo: Catalogo
  mostrarPersona: boolean
}) {
  const router = useRouter()
  const { arrancar } = useCronometro()
  const [campo, setCampo] = useState<Campo>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bloqueada = entrada.locked

  /** Solo las del proyecto de esta entrada; si no tiene, no se ve nada. */
  const ediciones = entrada.project_id
    ? catalogo.ediciones.filter((e) => e.project_id === entrada.project_id)
    : []

  async function guardar(cambios: TablesUpdate<"time_entries">) {
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient()
      .from("time_entries")
      .update(cambios)
      .eq("id", entrada.id)
    setOcupado(false)
    setCampo(null)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  async function guardarEtiquetas(ids: string[]) {
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    await supabase.from("time_entry_tags").delete().eq("entry_id", entrada.id)
    if (ids.length > 0) {
      const { error: err } = await supabase
        .from("time_entry_tags")
        .insert(ids.map((tag_id) => ({ entry_id: entrada.id, tag_id })))
      if (err) {
        setOcupado(false)
        setError(mensajeError(err))
        return
      }
    }
    setOcupado(false)
    router.refresh()
  }

  async function borrar() {
    if (!confirm("¿Borrar esta entrada?")) return
    setOcupado(true)
    const { error: err } = await createClient()
      .from("time_entries")
      .delete()
      .eq("id", entrada.id)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  async function duplicar() {
    setOcupado(true)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("time_entries")
      .insert({
        workspace_id: entrada.workspace_id,
        user_id: entrada.user_id,
        project_id: entrada.project_id,
        task_id: entrada.task_id,
        description: entrada.description,
        billable: entrada.billable,
        start_at: entrada.start_at,
        end_at: entrada.end_at,
      })
      .select("id")
      .single()

    if (!err && data && entrada.tags.length > 0) {
      const ids = catalogo.etiquetas
        .filter((e) => entrada.tags.includes(e.name))
        .map((e) => e.id)
      if (ids.length > 0) {
        await supabase
          .from("time_entry_tags")
          .insert(ids.map((tag_id) => ({ entry_id: data.id, tag_id })))
      }
    }

    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  /** Ids de las etiquetas puestas: la vista las trae por nombre. */
  const etiquetasPuestas = catalogo.etiquetas
    .filter((e) => entrada.tags.includes(e.name))
    .map((e) => e.id)

  const pulsable =
    "rounded-[6px] px-1.5 py-1 text-left transition hover:bg-surface-3/70"

  return (
    <li
      className={cn(
        "group border-b border-line px-2.5 last:border-b-0 transition",
        ocupado && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2 py-1.5">
        {/* -------------------------------------------------- descripcion */}
        <div className="min-w-0 flex-1">
          {campo === "descripcion" ? (
            <input
              autoFocus
              defaultValue={entrada.description}
              onBlur={(e) => {
                const valor = e.target.value
                if (valor === entrada.description) setCampo(null)
                else void guardar({ description: valor })
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") setCampo(null)
              }}
              className="field py-1 text-[0.9375rem]"
              placeholder="¿En qué has trabajado?"
            />
          ) : (
            <button
              type="button"
              disabled={bloqueada}
              onClick={() => setCampo("descripcion")}
              className={cn(pulsable, "block w-full truncate text-[0.9375rem]")}
            >
              {entrada.description || (
                <span className="text-muted">Sin descripción</span>
              )}
            </button>
          )}
        </div>

        {/* ----------------------------------------------------- proyecto */}
        <div className="hidden w-52 shrink-0 md:block">
          {campo === "proyecto" ? (
            <div className="space-y-1.5">
              <SelectorProyecto
                catalogo={catalogo}
                compacto
                autoAbrir
                valor={{ project_id: entrada.project_id, task_id: entrada.task_id }}
                onChange={(sel) =>
                  void guardar({
                    project_id: sel.project_id,
                    task_id: sel.task_id,
                    // la edicion es de un proyecto: al cambiarlo, se cae
                    ...(sel.project_id !== entrada.project_id
                      ? { edition_id: null }
                      : {}),
                  })
                }
              />
              {ediciones.length > 0 && (
                <SelectorEdicion
                  ediciones={ediciones}
                  valor={entrada.edition_id}
                  compacto
                  onChange={(edition_id) => void guardar({ edition_id })}
                />
              )}
            </div>
          ) : (
            <button
              type="button"
              disabled={bloqueada}
              onClick={() => setCampo("proyecto")}
              className={cn(pulsable, "flex w-full items-center gap-1.5")}
            >
              {entrada.project_name ? (
                <>
                  {/* El punto es del proyecto; el aro verde dice que se cobra */}
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      entrada.billable && "marca-facturable",
                    )}
                    style={{ background: entrada.project_color ?? "var(--line-strong)" }}
                  />
                  <span className="min-w-0 truncate text-[0.8125rem]">
                    {entrada.project_name}
                    {entrada.edition_name && (
                      <span className="text-muted"> · {entrada.edition_name}</span>
                    )}
                    {entrada.task_name && (
                      <span className="text-muted"> · {entrada.task_name}</span>
                    )}
                  </span>
                </>
              ) : (
                <span className="text-[0.8125rem] text-muted">Sin proyecto</span>
              )}
            </button>
          )}
        </div>

        {/* ---------------------------------------------------- etiquetas */}
        <div className="hidden w-36 shrink-0 lg:block">
          {campo === "etiquetas" ? (
            <SelectorEtiquetas
              etiquetas={catalogo.etiquetas}
              seleccionadas={etiquetasPuestas}
              compacto
              autoAbrir
              onChange={(ids) => void guardarEtiquetas(ids)}
            />
          ) : (
            <button
              type="button"
              disabled={bloqueada}
              onClick={() => setCampo("etiquetas")}
              className={cn(pulsable, "flex w-full items-center gap-1")}
            >
              {mostrarPersona && (
                <span className="chip min-w-0 truncate">{entrada.user_name}</span>
              )}
              {entrada.tags.length === 0 && !mostrarPersona && (
                <span className="text-[0.8125rem] text-muted opacity-0 transition group-hover:opacity-100">
                  Etiquetas
                </span>
              )}
              {entrada.tags.slice(0, 1).map((t) => (
                <span key={t} className="chip min-w-0 truncate">
                  {t}
                </span>
              ))}
              {entrada.tags.length > 1 && (
                <span className="chip shrink-0">+{entrada.tags.length - 1}</span>
              )}
            </button>
          )}
        </div>

        {/* --------------------------------------------------- facturable */}
        <button
          type="button"
          disabled={bloqueada}
          onClick={() => void guardar({ billable: !entrada.billable })}
          title={entrada.billable ? "Se cobra" : "No se cobra"}
          aria-pressed={entrada.billable}
          className={cn(
            "shrink-0 rounded-[6px] p-1 transition",
            entrada.billable
              ? "text-billable hover:bg-billable-soft"
              : "text-muted opacity-0 hover:bg-surface-3/70 group-focus-within:opacity-100 group-hover:opacity-100",
          )}
        >
          <Euro className="h-3.5 w-3.5" />
        </button>

        {/* ------------------------------------------ fecha, inicio y fin */}
        <div className="hidden shrink-0 sm:block">
          <PopoverHorario
            entrada={entrada}
            abierto={campo === "horario"}
            onAbrir={(v) => setCampo(v ? "horario" : null)}
            onGuardar={guardar}
            bloqueada={bloqueada}
          />
        </div>

        {/* -------------------------------------------------- duracion */}
        <div className="w-16 shrink-0">
          {campo === "duracion" ? (
            <input
              autoFocus
              defaultValue={formatDurationShort(entrada.duration_seconds)}
              onBlur={(e) => {
                const segundos = parseDurationToSeconds(e.target.value)
                if (!segundos || segundos <= 0) {
                  setCampo(null)
                  return
                }
                void guardar({
                  end_at: new Date(
                    new Date(entrada.start_at).getTime() + segundos * 1000,
                  ).toISOString(),
                })
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") setCampo(null)
              }}
              className="field tabular py-1 text-right text-[0.9375rem]"
            />
          ) : (
            <button
              type="button"
              disabled={bloqueada}
              onClick={() => setCampo("duracion")}
              className={cn(
                pulsable,
                "tabular block w-full text-right text-[0.9375rem] font-semibold",
              )}
            >
              {formatDurationShort(entrada.duration_seconds)}
            </button>
          )}
        </div>

        {/* ---------------------------------------------------- acciones */}
        {/* Continuar: arranca ahora mismo con lo mismo de esta entrada */}
        <button
          type="button"
          title="Continuar con esto ahora"
          onClick={() =>
            void arrancar({
              project_id: entrada.project_id,
              edition_id: entrada.edition_id,
              task_id: entrada.task_id,
              description: entrada.description,
              billable: entrada.billable,
              tagIds: etiquetasPuestas,
            })
          }
          className="flex shrink-0 items-center gap-1 rounded-[6px] px-2 py-1.5 text-[0.8125rem] font-medium text-muted transition hover:bg-live-soft hover:text-live"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
        </button>

        <div className="flex w-[4rem] shrink-0 items-center justify-end gap-0.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            title="Duplicar"
            aria-label="Duplicar"
            onClick={() => void duplicar()}
            disabled={ocupado}
            className="btn btn-ghost p-1.5 text-muted hover:text-ink"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Borrar"
            aria-label="Borrar"
            onClick={() => void borrar()}
            disabled={ocupado || bloqueada}
            className="btn btn-ghost p-1.5 text-muted hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <p className="pb-2 pl-1.5 text-xs text-danger">{error}</p>
      )}
    </li>
  )
}

/* ------------------------------------------------- fecha, inicio y fin */

function PopoverHorario({
  entrada,
  abierto,
  onAbrir,
  onGuardar,
  bloqueada,
}: {
  entrada: EntradaVista
  abierto: boolean
  onAbrir: (abierto: boolean) => void
  onGuardar: (cambios: TablesUpdate<"time_entries">) => Promise<void>
  bloqueada: boolean
}) {
  const [fecha, setFecha] = useState(entrada.local_date)
  const [inicio, setInicio] = useState(toClockInput(entrada.start_at))
  const [fin, setFin] = useState(
    entrada.end_at ? toClockInput(entrada.end_at) : "",
  )

  function aplicar() {
    if (!inicio || !fin) return
    const start_at = combineDateAndTime(fecha, inicio)
    let end_at = combineDateAndTime(fecha, fin)
    // Si acaba antes de empezar, es que cruzo la medianoche
    if (new Date(end_at) <= new Date(start_at)) {
      end_at = new Date(new Date(end_at).getTime() + 86_400_000).toISOString()
    }
    void onGuardar({ start_at, end_at })
  }

  return (
    <Popover.Root
      open={abierto}
      onOpenChange={(v) => {
        if (v) {
          setFecha(entrada.local_date)
          setInicio(toClockInput(entrada.start_at))
          setFin(entrada.end_at ? toClockInput(entrada.end_at) : "")
        }
        onAbrir(v)
      }}
    >
      <Popover.Trigger
        disabled={bloqueada}
        className="tabular rounded-[6px] px-1.5 py-1 text-right text-[0.8125rem] text-muted transition hover:bg-surface-3/70"
      >
        {formatClock(entrada.start_at)}–{formatClock(entrada.end_at)}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="card z-50 w-64 p-3"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="space-y-2.5">
            <div>
              <label className="label" htmlFor={`fecha-${entrada.id}`}>
                Día
              </label>
              <input
                id={`fecha-${entrada.id}`}
                type="date"
                className="field tabular"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor={`inicio-${entrada.id}`}>
                  Inicio
                </label>
                <input
                  id={`inicio-${entrada.id}`}
                  type="time"
                  className="field tabular"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor={`fin-${entrada.id}`}>
                  Fin
                </label>
                <input
                  id={`fin-${entrada.id}`}
                  type="time"
                  className="field tabular"
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={aplicar}
              className="btn btn-primary w-full"
            >
              Guardar
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

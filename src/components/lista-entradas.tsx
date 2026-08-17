"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Euro, Pencil, Play, Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useCronometro } from "@/components/proveedor-cronometro"
import { DialogoEntrada } from "@/components/dialogo-entrada"
import {
  formatClock,
  formatDurationShort,
  relativeDayLabel,
} from "@/lib/time"
import type { Catalogo, EntradaVista } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export function ListaEntradas({
  entradas,
  catalogo,
  mostrarPersona = false,
}: {
  entradas: EntradaVista[]
  catalogo: Catalogo
  mostrarPersona?: boolean
}) {
  const [editando, setEditando] = useState<EntradaVista | null>(null)

  const dias = useMemo(() => {
    const mapa = new Map<string, EntradaVista[]>()
    for (const e of entradas) {
      if (!e.end_at) continue // el cronometro en marcha ya sale en la barra
      const lista = mapa.get(e.local_date)
      if (lista) lista.push(e)
      else mapa.set(e.local_date, [e])
    }
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [entradas])

  if (dias.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-sm text-muted">
          Todavia no hay horas registradas en este periodo.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {dias.map(([dia, dEntradas]) => {
          const total = dEntradas.reduce(
            (s, e) => s + (e.duration_seconds ?? 0),
            0,
          )
          return (
            <section key={dia} className="card overflow-hidden">
              <header className="flex items-baseline justify-between border-b border-line bg-surface-2 px-4 py-2">
                <h2 className="text-sm font-semibold">{relativeDayLabel(dia)}</h2>
                <span className="tabular text-sm font-semibold text-muted">
                  {formatDurationShort(total)}
                </span>
              </header>
              <ul>
                {dEntradas.map((e) => (
                  <FilaEntrada
                    key={e.id}
                    entrada={e}
                    mostrarPersona={mostrarPersona}
                    onEditar={() => setEditando(e)}
                  />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {editando && (
        <DialogoEntrada
          entrada={editando}
          catalogo={catalogo}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  )
}

function FilaEntrada({
  entrada,
  mostrarPersona,
  onEditar,
}: {
  entrada: EntradaVista
  mostrarPersona: boolean
  onEditar: () => void
}) {
  const router = useRouter()
  const { arrancar } = useCronometro()
  const [ocupado, setOcupado] = useState(false)

  async function borrar() {
    if (!confirm("¿Borrar esta entrada?")) return
    setOcupado(true)
    try {
      const { error } = await createClient()
        .from("time_entries")
        .delete()
        .eq("id", entrada.id)
      if (error) throw error
      router.refresh()
    } catch (err) {
      alert(mensajeError(err))
    } finally {
      setOcupado(false)
    }
  }

  async function duplicar() {
    setOcupado(true)
    try {
      const supabase = createClient()
      const { data: original, error: errLeer } = await supabase
        .from("time_entries")
        .select(
          "workspace_id, user_id, project_id, task_id, description, billable, start_at, end_at",
        )
        .eq("id", entrada.id)
        .single()
      if (errLeer) throw errLeer

      const { data: copia, error: errCrear } = await supabase
        .from("time_entries")
        .insert({ ...original })
        .select("id")
        .single()
      if (errCrear) throw errCrear

      const { data: etiquetas } = await supabase
        .from("time_entry_tags")
        .select("tag_id")
        .eq("entry_id", entrada.id)
      if (etiquetas && etiquetas.length > 0) {
        await supabase
          .from("time_entry_tags")
          .insert(etiquetas.map((t) => ({ entry_id: copia.id, tag_id: t.tag_id })))
      }
      router.refresh()
    } catch (err) {
      alert(mensajeError(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0 transition hover:bg-surface-2",
        ocupado && "opacity-50",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {entrada.description || (
            <span className="text-muted">Sin descripcion</span>
          )}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {entrada.project_name ? (
            <span className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: entrada.project_color ?? "#888" }}
              />
              <span className="text-muted">
                {entrada.client_name && `${entrada.client_name} · `}
                <span className="text-ink">{entrada.project_name}</span>
                {entrada.task_name && ` · ${entrada.task_name}`}
              </span>
            </span>
          ) : (
            <span className="text-muted">Sin proyecto</span>
          )}
          {mostrarPersona && (
            <span className="chip">{entrada.user_name}</span>
          )}
          {entrada.tags.map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      </div>

      {entrada.billable && (
        <Euro
          className="h-3.5 w-3.5 shrink-0 text-billable"
          aria-label="Facturable"
        />
      )}

      <span className="tabular hidden shrink-0 text-xs text-muted sm:block">
        {formatClock(entrada.start_at)} – {formatClock(entrada.end_at)}
      </span>

      <span className="tabular w-14 shrink-0 text-right text-sm font-semibold">
        {formatDurationShort(entrada.duration_seconds)}
      </span>

      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          title="Seguir con esta tarea"
          aria-label="Seguir con esta tarea"
          onClick={() =>
            void arrancar({
              project_id: entrada.project_id,
              task_id: entrada.task_id,
              description: entrada.description,
              billable: entrada.billable,
              tagIds: [],
            })
          }
          className="btn btn-ghost p-1.5 text-muted hover:text-running"
        >
          <Play className="h-3.5 w-3.5" />
        </button>
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
          title="Editar"
          aria-label="Editar"
          onClick={onEditar}
          className="btn btn-ghost p-1.5 text-muted hover:text-ink"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          title="Borrar"
          aria-label="Borrar"
          onClick={() => void borrar()}
          disabled={ocupado}
          className="btn btn-ghost p-1.5 text-muted hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  )
}

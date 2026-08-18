"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, CalendarRange, Loader2, Plus, RotateCcw } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import {
  formatDateShort,
  formatDurationShort,
  formatHoursDecimal,
} from "@/lib/time"
import type { Edicion, EntradaVista } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/**
 * Un evento que se repite -TBCE 1, TBCE 2- es el mismo proyecto en dos años, no
 * dos proyectos. Las ediciones lo separan sin tocar las tareas, que se
 * necesitan para lo que son.
 */
export function EdicionesProyecto({
  espacioId,
  proyectoId,
  ediciones,
  entradas,
  puedeGestionar,
}: {
  espacioId: string
  proyectoId: string
  ediciones: Edicion[]
  entradas: EntradaVista[]
  puedeGestionar: boolean
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [presupuesto, setPresupuesto] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)

  const visibles = ediciones.filter((e) => verArchivadas || !e.archived)
  const archivadas = ediciones.filter((e) => e.archived).length
  const sinEdicion = entradas.filter((e) => !e.edition_id)

  function segundosDe(edicionId: string | null) {
    return entradas
      .filter((e) => e.edition_id === edicionId)
      .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  }

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) return
    const horas = presupuesto.trim().replace(",", ".")
    if (horas && Number.isNaN(Number(horas))) {
      setError("El presupuesto tiene que ser un número de horas.")
      return
    }

    setOcupado(true)
    setError(null)
    const { error: err } = await createClient().from("project_editions").insert({
      workspace_id: espacioId,
      project_id: proyectoId,
      name: limpio,
      starts_on: desde || null,
      ends_on: hasta || null,
      budget_hours: horas ? Number(horas) : null,
      position: ediciones.length,
    })
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setNombre("")
    setDesde("")
    setHasta("")
    setPresupuesto("")
    router.refresh()
  }

  async function archivar(edicion: Edicion) {
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient()
      .from("project_editions")
      .update({ archived: !edicion.archived })
      .eq("id", edicion.id)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  return (
    <section className="card p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarRange className="h-4 w-4 text-muted" aria-hidden />
          Ediciones
        </h2>
        {archivadas > 0 && (
          <button
            type="button"
            onClick={() => setVerArchivadas((v) => !v)}
            className="text-xs font-medium text-muted transition hover:text-ink"
          >
            {verArchivadas ? "Ocultar" : "Ver"} archivadas ({archivadas})
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-muted">
        Para lo que se repite: TBCE 1 y TBCE 2 son el mismo proyecto en dos
        años. Al apuntar horas se elige a cuál van.
      </p>

      {error && (
        <p className="mb-3 rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="py-2 text-sm text-muted">
          Todavía no hay ediciones. Sin ellas el proyecto funciona igual que
          siempre.
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Edición</th>
              <th className="th">Fechas</th>
              <th className="th text-right">Horas</th>
              <th className="th text-right">Presupuesto</th>
              {puedeGestionar && <th className="th" />}
            </tr>
          </thead>
          <tbody>
            {visibles.map((edicion) => {
              const segundos = segundosDe(edicion.id)
              const presu = edicion.budget_hours ?? null
              return (
                <tr
                  key={edicion.id}
                  className={cn(
                    "border-b border-line last:border-0",
                    edicion.archived && "opacity-55",
                  )}
                >
                  <td className="py-2 pr-3 text-sm font-medium">{edicion.name}</td>
                  <td className="py-2 pr-3 text-sm text-muted">
                    {edicion.starts_on
                      ? formatDateShort(edicion.starts_on) +
                        (edicion.ends_on
                          ? " – " + formatDateShort(edicion.ends_on)
                          : "")
                      : "—"}
                  </td>
                  <td className="cifra py-2 pr-3 text-right text-sm">
                    {formatDurationShort(segundos)}
                  </td>
                  <td className="cifra py-2 text-right text-sm text-muted">
                    {presu
                      ? formatHoursDecimal(segundos) + " / " + presu + " h"
                      : "—"}
                  </td>
                  {puedeGestionar && (
                    <td className="py-2 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => void archivar(edicion)}
                        disabled={ocupado}
                        className="rounded-[4px] p-1 text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
                        aria-label={edicion.archived ? "Reactivar" : "Archivar"}
                        title={edicion.archived ? "Reactivar" : "Archivar"}
                      >
                        {edicion.archived ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {sinEdicion.length > 0 && (
              <tr className="border-t border-line">
                <td className="py-2 pr-3 text-sm text-muted" colSpan={2}>
                  Sin edicion ({sinEdicion.length})
                </td>
                <td className="cifra py-2 pr-3 text-right text-sm text-muted">
                  {formatDurationShort(segundosDe(null))}
                </td>
                <td colSpan={puedeGestionar ? 2 : 1} />
              </tr>
            )}
          </tbody>
        </table>
      )}

      {puedeGestionar && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void crear()
          }}
          className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]"
        >
          <input
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="TBCE 2"
            aria-label="Nombre de la edición"
          />
          <input
            type="date"
            className="field"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            aria-label="Empieza"
          />
          <input
            type="date"
            className="field"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            aria-label="Termina"
          />
          <input
            className="field cifra"
            value={presupuesto}
            onChange={(e) => setPresupuesto(e.target.value)}
            placeholder="Horas"
            inputMode="decimal"
            aria-label="Presupuesto de horas"
          />
          <button
            type="submit"
            disabled={ocupado || !nombre.trim()}
            className="btn btn-primary shrink-0"
          >
            {ocupado ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Añadir
          </button>
        </form>
      )}
    </section>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { formatDateShort, formatMoney, todayKey } from "@/lib/time"
import type { Miembro, ProyectoConCliente, Tarifa } from "@/lib/tipos"

/**
 * La base resuelve la tarifa de cada entrada con `resolve_rate`: gana la mas
 * especifica (persona + proyecto), luego proyecto, luego persona, y por ultimo
 * la general. A igualdad de ambito, la mas reciente que ya este vigente.
 */
export function GestionTarifas({
  espacioId,
  tarifas,
  miembros,
  proyectos,
}: {
  espacioId: string
  tarifas: Tarifa[]
  miembros: Miembro[]
  proyectos: ProyectoConCliente[]
}) {
  const router = useRouter()
  const [userId, setUserId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [importe, setImporte] = useState("")
  const [desde, setDesde] = useState(todayKey())
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nombreMiembro = (id: string | null) =>
    id ? (miembros.find((m) => m.id === id)?.full_name ?? "Desconocido") : null
  const nombreProyecto = (id: string | null) =>
    id ? (proyectos.find((p) => p.id === id)?.name ?? "Desconocido") : null

  function ambito(tarifa: Tarifa) {
    const persona = nombreMiembro(tarifa.user_id)
    const proyecto = nombreProyecto(tarifa.project_id)
    if (persona && proyecto) return `${persona} en ${proyecto}`
    if (proyecto) return `Proyecto ${proyecto}`
    if (persona) return persona
    return "General"
  }

  function prioridad(tarifa: Tarifa) {
    if (tarifa.user_id && tarifa.project_id) return "Mas especifica"
    if (tarifa.project_id) return "Por proyecto"
    if (tarifa.user_id) return "Por persona"
    return "Por defecto"
  }

  async function crear() {
    const valor = Number(importe.trim().replace(",", "."))
    if (!Number.isFinite(valor) || valor <= 0) {
      setError("Escribe un importe por hora valido.")
      return
    }
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from("rates").insert({
      workspace_id: espacioId,
      user_id: userId || null,
      project_id: projectId || null,
      hourly_rate: valor,
      effective_from: desde,
    })
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setImporte("")
    router.refresh()
  }

  async function borrar(id: string) {
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from("rates").delete().eq("id", id)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  const general = tarifas.find((t) => !t.user_id && !t.project_id)

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-semibold">Nueva tarifa</h2>
        <p className="mb-3 text-xs text-muted">
          Deja el ambito en blanco para que valga por defecto. Las tarifas no se
          editan: se anade una nueva con la fecha desde la que entra en vigor.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void crear()
          }}
          className="space-y-3"
        >
          <div>
            <label className="label" htmlFor="tarifa-persona">
              Persona
            </label>
            <select
              id="tarifa-persona"
              className="field"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">Todas</option>
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="tarifa-proyecto">
              Proyecto
            </label>
            <select
              id="tarifa-proyecto"
              className="field"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Todos</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.clients?.name ? `${p.clients.name} · ${p.name}` : p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="tarifa-importe">
                Euros por hora
              </label>
              <input
                id="tarifa-importe"
                className="field tabular"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="45"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="label" htmlFor="tarifa-desde">
                Vigente desde
              </label>
              <input
                id="tarifa-desde"
                type="date"
                className="field tabular"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-danger-soft p-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado || !importe.trim()}
            className="btn btn-primary w-full"
          >
            {ocupado ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Anadir tarifa
          </button>
        </form>

        {!general && (
          <p className="mt-3 rounded-lg border border-accent/25 bg-accent-soft px-3 py-2 text-xs">
            No hay tarifa general. Sin ella, las horas facturables de proyectos y
            personas sin tarifa propia salen a cero euros en los informes.
          </p>
        )}
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          Tarifas <span className="text-muted">({tarifas.length})</span>
        </h2>

        {tarifas.length === 0 ? (
          <p className="py-3 text-sm text-muted">Todavia no hay ninguna tarifa.</p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Ambito</th>
                  <th className="py-2 pr-3 font-semibold">Prioridad</th>
                  <th className="py-2 pr-3 text-right font-semibold">Por hora</th>
                  <th className="py-2 pr-3 font-semibold">Desde</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tarifas.map((tarifa) => (
                  <tr key={tarifa.id}>
                    <td className="py-2 pr-3">{ambito(tarifa)}</td>
                    <td className="py-2 pr-3">
                      <span className="chip">{prioridad(tarifa)}</span>
                    </td>
                    <td className="tabular py-2 pr-3 text-right font-medium">
                      {formatMoney(tarifa.hourly_rate)}
                    </td>
                    <td className="tabular py-2 pr-3 text-muted">
                      {formatDateShort(tarifa.effective_from)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void borrar(tarifa.id)}
                        disabled={ocupado}
                        className="btn btn-ghost p-1.5 text-danger"
                        aria-label="Borrar tarifa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

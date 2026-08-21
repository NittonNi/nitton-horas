"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import type {
  Edicion,
  Miembro,
  ModoReparto,
  Proyecto,
  Reparto,
  RepartoShare,
} from "@/lib/tipos"

/**
 * Como se reparte la facturacion ya calculada entre las personas -no decide
 * cuanto se factura, eso lo sigue haciendo la tarifa de al lado-. Sin
 * historico: el modo activo de un ambito se aplica a todo lo facturado ahi
 * hasta hoy. El ambito en blanco (sin proyecto ni edicion) es el que vale
 * por defecto para todo el espacio.
 */

const MODOS: { valor: ModoReparto; etiqueta: string; ayuda: string }[] = [
  {
    valor: "horas",
    etiqueta: "Por horas metidas",
    ayuda: "Proporcional a las horas facturables que puso cada uno.",
  },
  {
    valor: "equitativo",
    etiqueta: "Equitativo",
    ayuda: "A partes iguales entre quien haya metido horas ahí.",
  },
  {
    valor: "porcentajes",
    etiqueta: "Por porcentajes",
    ayuda: "Un % fijo por persona, puesto a mano.",
  },
  {
    valor: "equipo",
    etiqueta: "Entre todo el equipo",
    ayuda: "A partes iguales entre todos los activos, hayan metido horas o no.",
  },
]

export function GestionReparto({
  espacioId,
  repartos,
  shares,
  miembros,
  proyectos,
  ediciones,
}: {
  espacioId: string
  repartos: Reparto[]
  shares: RepartoShare[]
  miembros: Miembro[]
  proyectos: Proyecto[]
  ediciones: Edicion[]
}) {
  const router = useRouter()
  const [projectId, setProjectId] = useState("")
  const [editionId, setEditionId] = useState("")
  const [modo, setModo] = useState<ModoReparto>("horas")
  const [partes, setPartes] = useState<{ userId: string; percent: string }[]>([])
  const [nuevaPersona, setNuevaPersona] = useState("")
  const [nuevoPercent, setNuevoPercent] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nombreProyecto = (id: string | null) =>
    id ? (proyectos.find((p) => p.id === id)?.name ?? "Desconocido") : null
  const nombreEdicion = (id: string | null) =>
    id ? (ediciones.find((e) => e.id === id)?.name ?? "Desconocida") : null
  const nombreMiembro = (id: string) =>
    miembros.find((m) => m.id === id)?.full_name ?? "Desconocido"

  function ambito(r: Reparto) {
    const edicion = nombreEdicion(r.edition_id)
    const proyecto = nombreProyecto(r.project_id)
    if (edicion) return `${proyecto} · ${edicion}`
    if (proyecto) return proyecto
    return "General del espacio"
  }

  const ediciones_del_proyecto = ediciones.filter((e) => e.project_id === projectId)

  function añadirParte() {
    if (!nuevaPersona || !nuevoPercent.trim()) return
    setPartes((p) => [...p, { userId: nuevaPersona, percent: nuevoPercent.trim() }])
    setNuevaPersona("")
    setNuevoPercent("")
  }

  // Solo cuentan para el 100% las partes con persona y porcentaje > 0: son
  // las mismas que de verdad se insertan (ver filtro de mas abajo). Si se
  // dejara guardar sin sumar 100%, el resto de `total` desaparece sin
  // repartirse a nadie y sin ningun aviso claro del dinero perdido.
  const partesValidas = partes.filter((p) => p.userId && Number(p.percent) > 0)
  const sumaPartes =
    Math.round(partesValidas.reduce((s, p) => s + Number(p.percent), 0) * 100) / 100
  const TOLERANCIA_PORCENTAJE = 0.5
  const diferenciaPorcentaje = Math.round((100 - sumaPartes) * 100) / 100
  const porcentajesInvalidos =
    modo === "porcentajes" &&
    (partesValidas.length === 0 || Math.abs(diferenciaPorcentaje) > TOLERANCIA_PORCENTAJE)

  async function crear() {
    if (modo === "porcentajes") {
      if (partes.length === 0) {
        setError("Añade al menos una persona con su porcentaje.")
        return
      }
      if (porcentajesInvalidos) {
        setError(
          diferenciaPorcentaje > 0
            ? `Los porcentajes suman ${sumaPartes}%, no 100% -faltan ${diferenciaPorcentaje}%-.`
            : `Los porcentajes suman ${sumaPartes}%, no 100% -sobran ${Math.abs(diferenciaPorcentaje)}%-.`,
        )
        return
      }
    }
    setOcupado(true)
    setError(null)
    const supabase = createClient()

    // Sin historico: como mucho un reparto activo por ambito exacto.
    let borrado = supabase.from("revenue_splits").delete().eq("workspace_id", espacioId)
    borrado = projectId ? borrado.eq("project_id", projectId) : borrado.is("project_id", null)
    borrado = editionId ? borrado.eq("edition_id", editionId) : borrado.is("edition_id", null)
    const { error: errBorrado } = await borrado
    if (errBorrado) {
      setOcupado(false)
      setError(mensajeError(errBorrado))
      return
    }

    const { data, error: errIns } = await supabase
      .from("revenue_splits")
      .insert({
        workspace_id: espacioId,
        project_id: projectId || null,
        edition_id: editionId || null,
        mode: modo,
      })
      .select()
      .single()
    if (errIns || !data) {
      setOcupado(false)
      setError(mensajeError(errIns))
      return
    }

    if (modo === "porcentajes") {
      const filas = partes
        .filter((p) => p.userId && Number(p.percent) > 0)
        .map((p) => ({ split_id: data.id, user_id: p.userId, percent: Number(p.percent) }))
      const { error: errShares } = await supabase
        .from("revenue_split_shares")
        .insert(filas)
      if (errShares) {
        setOcupado(false)
        setError(mensajeError(errShares))
        return
      }
    }

    setOcupado(false)
    setProjectId("")
    setEditionId("")
    setModo("horas")
    setPartes([])
    router.refresh()
  }

  async function borrar(id: string) {
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from("revenue_splits").delete().eq("id", id)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-semibold">Reparto de facturación</h2>
        <p className="mb-3 text-xs text-muted">
          Cómo se reparte entre las personas lo que ya factura cada proyecto.
          El ámbito en blanco es el que vale por defecto para todo el espacio.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void crear()
          }}
          className="space-y-3"
        >
          <div>
            <label className="label" htmlFor="reparto-proyecto">
              Proyecto
            </label>
            <select
              id="reparto-proyecto"
              className="field"
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value)
                setEditionId("")
              }}
            >
              <option value="">Todos (general)</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {projectId && ediciones_del_proyecto.length > 0 && (
            <div>
              <label className="label" htmlFor="reparto-edicion">
                Edición
              </label>
              <select
                id="reparto-edicion"
                className="field"
                value={editionId}
                onChange={(e) => setEditionId(e.target.value)}
              >
                <option value="">Todo el proyecto</option>
                {ediciones_del_proyecto.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <span className="label">Modo</span>
            <div className="space-y-1.5">
              {MODOS.map((m) => (
                <label
                  key={m.valor}
                  className="flex cursor-pointer items-start gap-2 rounded-[var(--radio-sm)] border border-line-strong p-2 text-sm has-[:checked]:border-ink has-[:checked]:bg-surface-2"
                >
                  <input
                    type="radio"
                    name="reparto-modo"
                    className="mt-0.5"
                    checked={modo === m.valor}
                    onChange={() => setModo(m.valor)}
                  />
                  <span>
                    <span className="block font-medium">{m.etiqueta}</span>
                    <span className="block text-xs text-muted">{m.ayuda}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {modo === "porcentajes" && (
            <div className="rounded-[var(--radio-sm)] border border-line-strong p-2.5">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label" htmlFor="reparto-persona">
                    Persona
                  </label>
                  <select
                    id="reparto-persona"
                    className="field"
                    value={nuevaPersona}
                    onChange={(e) => setNuevaPersona(e.target.value)}
                  >
                    <option value="">Elegir…</option>
                    {miembros.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="label" htmlFor="reparto-percent">
                    %
                  </label>
                  <input
                    id="reparto-percent"
                    className="field tabular"
                    value={nuevoPercent}
                    onChange={(e) => setNuevoPercent(e.target.value)}
                    placeholder="50"
                    inputMode="decimal"
                  />
                </div>
                <button
                  type="button"
                  onClick={añadirParte}
                  className="btn h-[2.125rem] shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {partes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {partes.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{nombreMiembro(p.userId)}</span>
                      <span className="flex items-center gap-2">
                        <span className="cifra">{p.percent}%</span>
                        <button
                          type="button"
                          onClick={() => setPartes((ps) => ps.filter((_, j) => j !== i))}
                          className="text-muted hover:text-danger"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {partes.length > 0 && porcentajesInvalidos && (
                <p className="mt-1.5 text-xs text-danger">
                  Suma {sumaPartes}%, no 100%
                  {diferenciaPorcentaje > 0
                    ? ` -faltan ${diferenciaPorcentaje}%-.`
                    : ` -sobran ${Math.abs(diferenciaPorcentaje)}%-.`}
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-danger-soft p-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado || porcentajesInvalidos}
            className="btn btn-primary w-full"
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Guardar reparto
          </button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          Repartos <span className="text-muted">({repartos.length})</span>
        </h2>

        {repartos.length === 0 ? (
          <p className="py-3 text-sm text-muted">
            Todavía no hay ningún reparto configurado: cada uno se lleva lo de
            sus propias horas, como siempre.
          </p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Ámbito</th>
                  <th className="py-2 pr-3 font-semibold">Modo</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {repartos.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3">{ambito(r)}</td>
                    <td className="py-2 pr-3">
                      <span className="chip">
                        {MODOS.find((m) => m.valor === r.mode)?.etiqueta ?? r.mode}
                      </span>
                      {r.mode === "porcentajes" && (
                        <p className="mt-1 text-xs text-muted">
                          {shares
                            .filter((s) => s.split_id === r.id)
                            .map((s) => `${nombreMiembro(s.user_id)} ${s.percent}%`)
                            .join(" · ")}
                        </p>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => void borrar(r.id)}
                        disabled={ocupado}
                        className="btn btn-ghost p-1.5 text-danger"
                        aria-label="Borrar reparto"
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

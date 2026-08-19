"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import type { Cliente } from "@/lib/tipos"

/**
 * Los clientes de un proyecto, en lista como las tareas: un proyecto puede ser
 * para varios -y una edición también-, y lo que interesa saber es entre
 * quiénes se están repartiendo las horas.
 */
export function ClientesProyecto({
  espacioId,
  proyectoId,
  clientes,
  puestos,
  enEdiciones,
  puedeGestionar,
}: {
  espacioId: string
  proyectoId: string
  /** Todos los del espacio, para elegir. */
  clientes: Cliente[]
  /** Los que ya están en este proyecto. */
  puestos: string[]
  /** Para cada cliente, en qué ediciones participa. */
  enEdiciones: Map<string, string[]>
  puedeGestionar: boolean
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const puestosOrdenados = clientes
    .filter((c) => puestos.includes(c.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const disponibles = clientes
    .filter((c) => !puestos.includes(c.id) && !c.archived)
    .sort((a, b) => a.name.localeCompare(b.name))

  /** Se escribe el nombre: si existe se engancha, y si no se crea. */
  async function anadir(texto: string) {
    const limpio = texto.trim()
    if (!limpio) return
    setOcupado(true)
    setError(null)
    const supabase = createClient()

    let id = clientes.find(
      (c) => c.name.toLowerCase() === limpio.toLowerCase(),
    )?.id

    if (!id) {
      const { data, error: errCrear } = await supabase
        .from("clients")
        .insert({ workspace_id: espacioId, name: limpio })
        .select("id")
        .single()
      if (errCrear || !data) {
        setOcupado(false)
        setError(mensajeError(errCrear))
        return
      }
      id = data.id
    }

    const { error: err } = await supabase
      .from("project_clients")
      .insert({ project_id: proyectoId, client_id: id, workspace_id: espacioId })
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setNombre("")
    router.refresh()
  }

  async function quitar(clienteId: string) {
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient()
      .from("project_clients")
      .delete()
      .eq("project_id", proyectoId)
      .eq("client_id", clienteId)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  return (
    <section className="card min-w-0 p-4">
      <h2 className="mb-1 text-sm font-semibold">
        Clientes{" "}
        <span className="text-muted">({puestosOrdenados.length})</span>
      </h2>
      <p className="mb-3 text-sm text-muted">
        Para quién es este trabajo. Pueden ser varios: en cada edición se elige
        cuáles, y así se sabe entre quiénes se han repartido las horas.
      </p>

      {puedeGestionar && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void anadir(nombre)
          }}
          className="mb-3 flex gap-2"
        >
          <input
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Añadir un cliente"
            aria-label="Añadir un cliente"
            list={`clientes-${proyectoId}`}
          />
          <datalist id={`clientes-${proyectoId}`}>
            {disponibles.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
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

      {error && (
        <p className="mb-2 rounded-[var(--radio-sm)] bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      {puestosOrdenados.length === 0 ? (
        <p className="py-2 text-sm text-muted">
          Este proyecto no tiene clientes todavía.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {puestosOrdenados.map((cliente) => {
            const donde = enEdiciones.get(cliente.id) ?? []
            return (
              <li key={cliente.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{cliente.name}</p>
                  {donde.length > 0 && (
                    <p className="truncate text-xs text-muted">
                      {donde.join(" · ")}
                    </p>
                  )}
                </div>
                {puedeGestionar && (
                  <button
                    type="button"
                    onClick={() => void quitar(cliente.id)}
                    disabled={ocupado}
                    aria-label={`Quitar a ${cliente.name} del proyecto`}
                    title="Quitarlo del proyecto"
                    className="shrink-0 rounded-[3px] p-1 text-muted transition hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

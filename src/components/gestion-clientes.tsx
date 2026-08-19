"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Check, Pencil, RotateCcw, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import type { Cliente, ProyectoConCliente } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export function GestionClientes({
  clientes,
  proyectos,
}: {
  clientes: Cliente[]
  /** Un cliente sin proyectos no sirve de nada: aqui se ve y se arregla. */
  proyectos: ProyectoConCliente[]
}) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [borrador, setBorrador] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verArchivados, setVerArchivados] = useState(false)

  const visibles = clientes.filter((c) => verArchivados || !c.archived)
  const archivados = clientes.filter((c) => c.archived).length

  // Las consultas de supabase-js son thenables, no promesas: PromiseLike basta.
  async function ejecutar(accion: () => PromiseLike<{ error: unknown }>) {
    setOcupado(true)
    setError(null)
    const { error: err } = await accion()
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return false
    }
    router.refresh()
    return true
  }

  async function renombrar(id: string) {
    const limpio = borrador.trim()
    if (!limpio) return
    const supabase = createClient()
    const ok = await ejecutar(() =>
      supabase.from("clients").update({ name: limpio }).eq("id", id),
    )
    if (ok) setEditando(null)
  }

  /** Colgar un proyecto de este cliente, que es para lo que sirve un cliente. */
  async function asignar(proyectoId: string, clienteId: string | null) {
    const supabase = createClient()
    await ejecutar(() =>
      supabase.from("projects").update({ client_id: clienteId }).eq("id", proyectoId),
    )
  }

  async function archivar(cliente: Cliente) {
    const supabase = createClient()
    await ejecutar(() =>
      supabase
        .from("clients")
        .update({ archived: !cliente.archived })
        .eq("id", cliente.id),
    )
  }

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          Clientes{" "}
          <span className="text-muted">
            ({clientes.filter((c) => !c.archived).length})
          </span>
        </h2>
        {archivados > 0 && (
          <button
            type="button"
            onClick={() => setVerArchivados((v) => !v)}
            className="text-xs font-medium text-muted hover:text-ink"
          >
            {verArchivados ? "Ocultar" : "Ver"} archivados ({archivados})
          </button>
        )}
      </div>

      <p className="mb-3 text-sm text-muted">
        Quien paga. Los clientes se crean desde el propio proyecto, que es donde
        se sabe de quién es; aquí se ven todos con lo que les cuelga, se
        renombran y se cambian de proyecto.
      </p>

      {error && (
        <p className="mt-2 rounded-lg bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="mt-3 divide-y divide-line">
        {visibles.length === 0 && (
          <li className="py-3 text-sm text-muted">
            Todavía no hay clientes. Se crean al editar un proyecto, en el campo
            «Cliente».
          </li>
        )}
        {visibles.map((cliente) => {
          const suyos = proyectos.filter(
            (p) => p.client_id === cliente.id && !p.archived,
          )
          const sueltos = proyectos.filter((p) => !p.client_id && !p.archived)

          return (
          <li
            key={cliente.id}
            className={cn("py-2", cliente.archived && "opacity-55")}
          >
          <div className="flex items-center gap-2">
            {editando === cliente.id ? (
              <>
                <input
                  autoFocus
                  className="field py-1"
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void renombrar(cliente.id)
                    if (e.key === "Escape") setEditando(null)
                  }}
                />
                <button
                  type="button"
                  onClick={() => void renombrar(cliente.id)}
                  className="btn btn-ghost p-1.5 text-accent"
                  aria-label="Guardar"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="btn btn-ghost p-1.5"
                  aria-label="Cancelar"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 truncate text-sm">{cliente.name}</span>
                {cliente.archived && <span className="chip">Archivado</span>}
                <button
                  type="button"
                  onClick={() => {
                    setEditando(cliente.id)
                    setBorrador(cliente.name)
                  }}
                  className="btn btn-ghost p-1.5 text-muted"
                  aria-label={`Renombrar ${cliente.name}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void archivar(cliente)}
                  disabled={ocupado}
                  className="btn btn-ghost p-1.5 text-muted"
                  aria-label={
                    cliente.archived
                      ? `Reactivar ${cliente.name}`
                      : `Archivar ${cliente.name}`
                  }
                >
                  {cliente.archived ? (
                    <RotateCcw className="h-3.5 w-3.5" />
                  ) : (
                    <Archive className="h-3.5 w-3.5" />
                  )}
                </button>
              </>
            )}
          </div>

          {/* Los proyectos que le cuelgan, que es de lo que va esto */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-1">
            {suyos.length === 0 ? (
              <span className="text-xs text-muted">Sin proyectos todavía.</span>
            ) : (
              suyos.map((p) => (
                <span key={p.id} className="chip gap-1.5">
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: p.color }}
                  />
                  {p.name}
                  <button
                    type="button"
                    onClick={() => void asignar(p.id, null)}
                    disabled={ocupado}
                    aria-label={`Quitar ${p.name} de ${cliente.name}`}
                    title="Quitárselo"
                    className="text-muted transition hover:text-danger"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}

            {!cliente.archived && sueltos.length > 0 && (
              <select
                value=""
                onChange={(e) => e.target.value && void asignar(e.target.value, cliente.id)}
                disabled={ocupado}
                aria-label={`Añadir un proyecto a ${cliente.name}`}
                className="field h-6 w-auto py-0 text-xs"
              >
                <option value="">+ proyecto…</option>
                {sueltos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          </li>
          )
        })}
      </ul>
    </section>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Check, Loader2, Pencil, Plus, RotateCcw, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import type { Cliente } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export function GestionClientes({
  espacioId,
  clientes,
}: {
  espacioId: string
  clientes: Cliente[]
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
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

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) return
    const supabase = createClient()
    const ok = await ejecutar(() =>
      supabase.from("clients").insert({ workspace_id: espacioId, name: limpio }),
    )
    if (ok) setNombre("")
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

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void crear()
        }}
        className="flex gap-2"
      >
        <input
          className="field"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nuevo cliente"
          aria-label="Nombre del cliente"
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
          Anadir
        </button>
      </form>

      {error && (
        <p className="mt-2 rounded-lg bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="mt-3 divide-y divide-line">
        {visibles.length === 0 && (
          <li className="py-3 text-sm text-muted">Todavia no hay clientes.</li>
        )}
        {visibles.map((cliente) => (
          <li
            key={cliente.id}
            className={cn(
              "flex items-center gap-2 py-2",
              cliente.archived && "opacity-55",
            )}
          >
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
          </li>
        ))}
      </ul>
    </section>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Loader2, Plus, RotateCcw } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { COLORES_PROYECTO, type Etiqueta } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export function GestionEtiquetas({
  espacioId,
  etiquetas,
}: {
  espacioId: string
  etiquetas: Etiqueta[]
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [color, setColor] = useState<string>(COLORES_PROYECTO[10])
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)

  const visibles = etiquetas.filter((t) => verArchivadas || !t.archived)
  const archivadas = etiquetas.filter((t) => t.archived).length

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) return
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("tags")
      .insert({ workspace_id: espacioId, name: limpio, color })
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setNombre("")
    router.refresh()
  }

  async function archivar(etiqueta: Etiqueta) {
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("tags")
      .update({ archived: !etiqueta.archived })
      .eq("id", etiqueta.id)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">
          Etiquetas{" "}
          <span className="text-muted">
            ({etiquetas.filter((t) => !t.archived).length})
          </span>
        </h2>
        {archivadas > 0 && (
          <button
            type="button"
            onClick={() => setVerArchivadas((v) => !v)}
            className="text-xs font-medium text-muted hover:text-ink"
          >
            {verArchivadas ? "Ocultar" : "Ver"} archivadas ({archivadas})
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void crear()
        }}
        className="space-y-2"
      >
        <div className="flex gap-2">
          <input
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nueva etiqueta"
            aria-label="Nombre de la etiqueta"
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
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLORES_PROYECTO.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              className={cn(
                "h-5 w-5 rounded-full border transition",
                color === c
                  ? "border-ink ring-2 ring-accent/40"
                  : "border-transparent",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </form>

      {error && (
        <p className="mt-2 rounded-lg bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {visibles.length === 0 && (
          <li className="py-1 text-sm text-muted">Todavia no hay etiquetas.</li>
        )}
        {visibles.map((etiqueta) => (
          <li key={etiqueta.id}>
            <span
              className={cn("chip gap-1.5", etiqueta.archived && "opacity-55")}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: etiqueta.color }}
              />
              {etiqueta.name}
              <button
                type="button"
                onClick={() => void archivar(etiqueta)}
                disabled={ocupado}
                className="text-muted transition hover:text-ink"
                aria-label={
                  etiqueta.archived
                    ? `Reactivar ${etiqueta.name}`
                    : `Archivar ${etiqueta.name}`
                }
              >
                {etiqueta.archived ? (
                  <RotateCcw className="h-3 w-3" />
                ) : (
                  <Archive className="h-3 w-3" />
                )}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

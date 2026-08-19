"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { Loader2, Plus, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { SelectorColor } from "@/components/selector-color"
import { ramas, SIN_CATEGORIA } from "@/lib/categorias"
import { COLORES_PROYECTO, type Categoria } from "@/lib/tipos"

export function NuevoProyecto({
  espacioId,
  categorias,
}: {
  espacioId: string
  categorias: Categoria[]
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState("")
  const [categoriaId, setCategoriaId] = useState("")
  const [color, setColor] = useState<string>(COLORES_PROYECTO[0])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) {
      setError("El proyecto necesita un nombre.")
      return
    }
    setGuardando(true)
    setError(null)

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("projects")
      .insert({
        workspace_id: espacioId,
        name: limpio,
        category_id: categoriaId || null,
        color,
      })
      .select("id")
      .single()

    setGuardando(false)
    if (err || !data) {
      setError(mensajeError(err))
      return
    }

    setAbierto(false)
    setNombre("")
    setCategoriaId("")
    router.push(`/proyectos/${data.id}`)
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger className="btn btn-primary">
        <Plus className="h-4 w-4" />
        Nuevo proyecto
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="card fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">Nuevo proyecto</Dialog.Title>
            <Dialog.Close className="btn btn-ghost p-1" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void crear()
            }}
            className="space-y-3 p-4"
          >
            <div>
              <label className="label" htmlFor="np-nombre">
                Nombre
              </label>
              <input
                id="np-nombre"
                autoFocus
                className="field"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Rediseño de la web"
              />
            </div>

            <div>
              <label className="label" htmlFor="np-categoria">
                Categoría
              </label>
              <select
                id="np-categoria"
                className="field"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                <option value="">{SIN_CATEGORIA}</option>
                {ramas(categorias.filter((c) => !c.archived)).map(
                  ({ categoria, camino }) => (
                    <option key={categoria.id} value={categoria.id}>
                      {camino}
                    </option>
                  ),
                )}
              </select>
              <p className="mt-1.5 text-xs text-muted">
                Cómo se organiza el equipo: el área arriba y la categoría
                debajo.
              </p>
            </div>

            <div>
              <span className="label">Color</span>
              <SelectorColor valor={color} onChange={setColor} />
            </div>

            {error && (
              <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close className="btn">Cancelar</Dialog.Close>
              <button
                type="submit"
                disabled={guardando || !nombre.trim()}
                className="btn btn-primary"
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { FolderKanban } from "lucide-react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { ramas, SIN_CATEGORIA } from "@/lib/categorias"
import type { Categoria, Proyecto as TipoProyecto } from "@/lib/tipos"

/**
 * Los proyectos del espacio vistos por la categorizacion: cada rama con lo que
 * cuelga de ella, y los que todavía no cuelgan de ninguna arriba del todo para
 * que se noten.
 */
export function ProyectosPorCategoria({
  categorias,
  proyectos,
}: {
  categorias: Categoria[]
  proyectos: TipoProyecto[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState<string | null>(null)

  const lista = useMemo(() => ramas(categorias), [categorias])
  const sueltos = proyectos.filter((p) => !p.category_id)

  async function mover(proyectoId: string, categoriaId: string) {
    setGuardando(proyectoId)
    setError(null)
    const { error: err } = await createClient()
      .from("projects")
      .update({ category_id: categoriaId || null })
      .eq("id", proyectoId)
    setGuardando(null)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  function Selector({ proyecto }: { proyecto: TipoProyecto }) {
    return (
      <select
        value={proyecto.category_id ?? ""}
        onChange={(e) => void mover(proyecto.id, e.target.value)}
        disabled={guardando === proyecto.id}
        aria-label={"Categoría de " + proyecto.name}
        /* En movil no cabe un desplegable de 208 px al lado del nombre: ahi
           se pone debajo, a lo ancho */
        className="field h-7 w-full py-0 text-xs sm:w-52 sm:shrink-0"
      >
        <option value="">{SIN_CATEGORIA}</option>
        {lista.map(({ categoria, camino }) => (
          <option key={categoria.id} value={categoria.id}>
            {camino}
          </option>
        ))}
      </select>
    )
  }

  function Proyecto({ proyecto }: { proyecto: TipoProyecto }) {
    return (
      <li className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: proyecto.color }}
        />
        <Link
          href={"/proyectos/" + proyecto.id}
          className="min-w-0 flex-1 truncate text-sm transition hover:text-accent"
        >
          {proyecto.name}
        </Link>
        <Selector proyecto={proyecto} />
      </li>
    )
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold">Proyectos por categoría</h2>
      <p className="mb-4 mt-1 text-sm text-muted">
        Cambia la rama de un proyecto desde aquí mismo.
      </p>

      {error && (
        <p className="mb-3 rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {sueltos.length > 0 && (
        <div className="mb-4 rounded-[var(--radio-sm)] border border-line bg-surface-2/60 p-3">
          <p className="rotulo mb-1">{SIN_CATEGORIA}</p>
          <ul className="divide-y divide-line">
            {sueltos.map((p) => (
              <Proyecto key={p.id} proyecto={p} />
            ))}
          </ul>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Crea arriba la primera categoria y aquí verás los proyectos ordenados.
        </p>
      ) : (
        <ul className="space-y-3">
          {lista.map(({ categoria, padre, camino }) => {
            const suyos = proyectos.filter((p) => p.category_id === categoria.id)
            return (
              <li key={categoria.id} className={padre ? "pl-4" : undefined}>
                <p className="rotulo flex items-center gap-1.5">
                  <FolderKanban className="h-3.5 w-3.5" aria-hidden />
                  {camino}
                </p>
                {suyos.length === 0 ? (
                  <p className="py-1.5 text-sm text-muted">Nada todavía.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {suyos.map((p) => (
                      <Proyecto key={p.id} proyecto={p} />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { categoriasRaiz, subcategoriasDe, SIN_CATEGORIA } from "@/lib/categorias"
import type { Categoria, Proyecto as TipoProyecto } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/**
 * Los proyectos vistos por la categorizacion.
 *
 * El sitio de cada cosa lo dice donde esta puesta, no un camino escrito al
 * lado: el area se nombra una vez y sus categorias van debajo con su propio
 * nombre a secas. Repetirlo -«Proyectos / Proyectos»- solo hace ruido, y con
 * un nivel mas seria impronunciable.
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

  const areas = categoriasRaiz(categorias).filter((c) => !c.archived)
  const sueltos = proyectos.filter((p) => !p.category_id && !p.archived)
  const de = (categoriaId: string) =>
    proyectos.filter((p) => p.category_id === categoriaId && !p.archived)

  async function mover(proyectoId: string, categoriaId: string) {
    setGuardando(proyectoId)
    setError(null)
    const { data, error: err } = await createClient()
      .from("projects")
      .update({ category_id: categoriaId || null })
      .eq("id", proyectoId)
      .select("id")
    setGuardando(null)
    if (err) {
      setError(mensajeError(err))
      return
    }
    if (!data || data.length === 0) {
      setError("No se ha podido mover el proyecto.")
      return
    }
    router.refresh()
  }

  /**
   * El desplegable tambien va por grupos: el area es el titulo del grupo y
   * dentro van sus categorias por su nombre. Asi no hay que leer el camino
   * entero en cada linea.
   */
  function Selector({ proyecto }: { proyecto: TipoProyecto }) {
    return (
      <select
        value={proyecto.category_id ?? ""}
        onChange={(e) => void mover(proyecto.id, e.target.value)}
        disabled={guardando === proyecto.id}
        aria-label={"Dónde va " + proyecto.name}
        /* En movil no cabe un desplegable al lado del nombre: ahi se pone
           debajo, a lo ancho */
        className="field h-7 w-full py-0 text-xs sm:w-48 sm:shrink-0"
      >
        <option value="">{SIN_CATEGORIA}</option>
        {areas.map((area) => {
          const hijas = subcategoriasDe(categorias, area.id).filter(
            (c) => !c.archived,
          )
          if (hijas.length === 0) {
            return (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            )
          }
          return (
            <optgroup key={area.id} label={area.name}>
              <option value={area.id}>Sin categoría</option>
              {hijas.map((hija) => (
                <option key={hija.id} value={hija.id}>
                  {hija.name}
                </option>
              ))}
            </optgroup>
          )
        })}
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
      <h2 className="text-sm font-semibold">Dónde está cada proyecto</h2>
      <p className="mb-4 mt-1 text-sm text-muted">
        Cámbialo desde aquí mismo, sin entrar en el proyecto.
      </p>

      {error && (
        <p className="mb-3 rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Los que no cuelgan de nada, arriba y marcados: es lo unico de esta
          pantalla que hay que arreglar. */}
      {sueltos.length > 0 && (
        <div className="mb-4 rounded-[var(--radio-sm)] border border-live-line bg-live-soft px-3 py-2">
          <p className="rotulo mb-1 text-live">
            {SIN_CATEGORIA} ({sueltos.length})
          </p>
          <ul className="divide-y divide-line">
            {sueltos.map((p) => (
              <Proyecto key={p.id} proyecto={p} />
            ))}
          </ul>
        </div>
      )}

      {areas.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Crea al lado la primera área y aquí verás los proyectos ordenados.
        </p>
      ) : (
        <div className="space-y-4">
          {areas.map((area) => {
            const hijas = subcategoriasDe(categorias, area.id).filter(
              (c) => !c.archived,
            )
            const directos = de(area.id)
            const total =
              directos.length +
              hijas.reduce((s, h) => s + de(h.id).length, 0)

            return (
              <div key={area.id}>
                <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1">
                  <h3 className="min-w-0 truncate text-sm font-semibold">
                    {area.name}
                  </h3>
                  <span className="shrink-0 text-xs text-muted">
                    {total === 0
                      ? "sin proyectos"
                      : `${total} ${total === 1 ? "proyecto" : "proyectos"}`}
                  </span>
                </div>

                {/* Los del area sin bajar a ninguna categoria */}
                {directos.length > 0 && (
                  <ul className="divide-y divide-line">
                    {directos.map((p) => (
                      <Proyecto key={p.id} proyecto={p} />
                    ))}
                  </ul>
                )}

                {hijas.length > 0 && (
                  <div
                    className={cn(
                      "ml-1 space-y-1 border-l border-line pl-3",
                      directos.length > 0 ? "mt-2" : "mt-1.5",
                    )}
                  >
                    {hijas.map((hija) => {
                      const suyos = de(hija.id)
                      /* Las vacias, en una linea: saber que existen basta, y
                         asi no ocupan tres renglones cada una. */
                      if (suyos.length === 0) {
                        return (
                          <p
                            key={hija.id}
                            className="flex items-baseline justify-between gap-2 py-0.5 text-sm"
                          >
                            <span className="min-w-0 truncate text-muted">
                              {hija.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted">
                              nada todavía
                            </span>
                          </p>
                        )
                      }
                      return (
                        <div key={hija.id}>
                          <p className="rotulo pt-1">{hija.name}</p>
                          <ul className="divide-y divide-line">
                            {suyos.map((p) => (
                              <Proyecto key={p.id} proyecto={p} />
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                )}

                {total === 0 && hijas.length === 0 && (
                  <p className="py-1.5 text-sm text-muted">Nada todavía.</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

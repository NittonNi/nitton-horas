"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, ChevronRight, Loader2, Plus, RotateCcw } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import {
  categoriasRaiz,
  formatObjetivo,
  parseObjetivo,
  subcategoriasDe,
} from "@/lib/categorias"
import { formatDurationShort } from "@/lib/time"
import type { Categoria, Proyecto } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/**
 * El arbol del equipo: como se organiza, no quien paga. Son dos niveles y cada
 * proyecto cuelga de uno solo, que es lo que deja sacar en el Excel una columna
 * por nivel.
 */
export function GestionCategorias({
  espacioId,
  categorias,
  proyectos,
  segundosPorRama = {},
}: {
  espacioId: string
  categorias: Categoria[]
  proyectos: Proyecto[]
  /** Lo que llevas tu esta semana en cada rama, para leer el objetivo. */
  segundosPorRama?: Record<string, number>
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nueva, setNueva] = useState("")
  const [anadiendoEn, setAnadiendoEn] = useState<string | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)

  const raiz = categoriasRaiz(categorias).filter(
    (c) => verArchivadas || !c.archived,
  )
  const archivadas = categorias.filter((c) => c.archived).length

  async function conSupabase(
    hacer: (s: ReturnType<typeof createClient>) => PromiseLike<{ error: unknown }>,
  ) {
    setOcupado(true)
    setError(null)
    const { error: err } = await hacer(createClient())
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return false
    }
    router.refresh()
    return true
  }

  async function crear(nombre: string, padreId: string | null) {
    const limpio = nombre.trim()
    if (!limpio) return
    const hermanas = padreId
      ? subcategoriasDe(categorias, padreId)
      : categoriasRaiz(categorias)

    const ok = await conSupabase((s) =>
      s.from("categories").insert({
        workspace_id: espacioId,
        parent_id: padreId,
        name: limpio,
        position: hermanas.length,
      }),
    )
    if (!ok) return
    if (padreId) setAnadiendoEn(null)
    else setNueva("")
  }

  async function renombrar(categoria: Categoria, nombre: string) {
    const limpio = nombre.trim()
    if (!limpio || limpio === categoria.name) return
    await conSupabase((s) =>
      s.from("categories").update({ name: limpio }).eq("id", categoria.id),
    )
  }

  async function ponerObjetivo(categoria: Categoria, texto: string) {
    const minutos = texto.trim() ? parseObjetivo(texto) : null
    if (texto.trim() && minutos === null) {
      setError("No entiendo esas horas. Prueba con 5, 5h o 5:30.")
      return
    }
    if (minutos === categoria.goal_weekly_minutes) return
    await conSupabase((s) =>
      s
        .from("categories")
        .update({ goal_weekly_minutes: minutos })
        .eq("id", categoria.id),
    )
  }

  async function archivar(categoria: Categoria) {
    await conSupabase((s) =>
      s
        .from("categories")
        .update({ archived: !categoria.archived })
        .eq("id", categoria.id),
    )
  }

  return (
    <section className="card p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Categorización</h2>
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
      <p className="mb-4 max-w-xl text-sm text-muted">
        Cómo se organiza el equipo, en dos niveles. Cada proyecto cuelga de una
        rama y en los informes sale una columna por nivel. El objetivo son horas
        por persona y semana en esa rama.
      </p>

      {error && (
        <p className="mb-3 rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="space-y-1">
        {raiz.map((padre) => {
          const hijas = subcategoriasDe(categorias, padre.id).filter(
            (c) => verArchivadas || !c.archived,
          )
          return (
            <li
              key={padre.id}
              className="rounded-[var(--radio-sm)] bg-surface-2/60 p-1.5"
            >
              <Fila
                categoria={padre}
                proyectos={proyectos}
                segundos={segundosPorRama[padre.id] ?? 0}
                ocupado={ocupado}
                onRenombrar={(n) => void renombrar(padre, n)}
                onObjetivo={(t) => void ponerObjetivo(padre, t)}
                onArchivar={() => void archivar(padre)}
              />

              <ul className="mt-0.5 space-y-0.5 pl-5">
                {hijas.map((hija) => (
                  <li key={hija.id} className="flex items-center gap-1">
                    <ChevronRight
                      className="h-3 w-3 shrink-0 text-muted"
                      aria-hidden
                    />
                    <Fila
                      categoria={hija}
                      proyectos={proyectos}
                      segundos={segundosPorRama[hija.id] ?? 0}
                      ocupado={ocupado}
                      onRenombrar={(n) => void renombrar(hija, n)}
                      onObjetivo={(t) => void ponerObjetivo(hija, t)}
                      onArchivar={() => void archivar(hija)}
                    />
                  </li>
                ))}

                <li className="pl-4">
                  {anadiendoEn === padre.id ? (
                    <NuevoNombre
                      placeholder="Nueva subcategoría"
                      onGuardar={(n) => void crear(n, padre.id)}
                      onCancelar={() => setAnadiendoEn(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAnadiendoEn(padre.id)}
                      className="flex items-center gap-1 py-1 text-xs font-medium text-muted transition hover:text-accent"
                    >
                      <Plus className="h-3 w-3" />
                      Subcategoría
                    </button>
                  )}
                </li>
              </ul>
            </li>
          )
        })}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void crear(nueva, null)
        }}
        className="mt-3 flex gap-2"
      >
        <input
          className="field"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Nueva categoría: Backoffice, Conocimiento, Proyectos..."
          aria-label="Nombre de la categoría"
        />
        <button
          type="submit"
          disabled={ocupado || !nueva.trim()}
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
    </section>
  )
}

/* ------------------------------------------------------------------- fila */

function Fila({
  categoria,
  proyectos,
  segundos,
  ocupado,
  onRenombrar,
  onObjetivo,
  onArchivar,
}: {
  categoria: Categoria
  proyectos: Proyecto[]
  segundos: number
  ocupado: boolean
  onRenombrar: (nombre: string) => void
  onObjetivo: (texto: string) => void
  onArchivar: () => void
}) {
  const cuantos = proyectos.filter((p) => p.category_id === categoria.id).length

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radio-sm)] px-1.5 py-1",
        categoria.archived && "opacity-55",
      )}
    >
      <input
        key={categoria.name}
        defaultValue={categoria.name}
        onBlur={(e) => onRenombrar(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") {
            e.currentTarget.value = categoria.name
            e.currentTarget.blur()
          }
        }}
        aria-label="Nombre de la categoría"
        className="min-w-0 flex-1 truncate rounded-[4px] bg-transparent px-1 py-0.5 text-sm font-medium outline-none transition hover:bg-surface-3/60 focus:bg-surface"
      />

      <span className="shrink-0 text-xs text-muted">
        {cuantos === 0
          ? "sin proyectos"
          : cuantos === 1
            ? "1 proyecto"
            : cuantos + " proyectos"}
      </span>

      <span
        className={cn(
          "cifra shrink-0 text-xs",
          categoria.goal_weekly_minutes &&
            segundos >= categoria.goal_weekly_minutes * 60
            ? "font-medium text-billable"
            : "text-muted",
        )}
        title="Lo que llevas tú esta semana en esta rama"
      >
        {segundos > 0 ? formatDurationShort(segundos) : ""}
      </span>

      <input
        key={"objetivo-" + categoria.goal_weekly_minutes}
        defaultValue={formatObjetivo(categoria.goal_weekly_minutes)}
        onBlur={(e) => onObjetivo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        placeholder="—"
        aria-label="Objetivo semanal"
        title="Objetivo de horas por persona y semana"
        className="cifra w-16 shrink-0 rounded-[4px] bg-transparent px-1 py-0.5 text-right text-sm outline-none transition hover:bg-surface-3/60 focus:bg-surface"
      />

      <button
        type="button"
        onClick={onArchivar}
        disabled={ocupado}
        className="shrink-0 rounded-[4px] p-1 text-muted transition hover:bg-surface-3 hover:text-ink disabled:opacity-40"
        aria-label={categoria.archived ? "Reactivar" : "Archivar"}
        title={categoria.archived ? "Reactivar" : "Archivar"}
      >
        {categoria.archived ? (
          <RotateCcw className="h-3.5 w-3.5" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

function NuevoNombre({
  placeholder,
  onGuardar,
  onCancelar,
}: {
  placeholder: string
  onGuardar: (nombre: string) => void
  onCancelar: () => void
}) {
  const [valor, setValor] = useState("")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar(valor)
      }}
      className="flex gap-1.5 py-1"
    >
      <input
        autoFocus
        className="field h-7 py-0 text-sm"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancelar()}
        placeholder={placeholder}
      />
      <button
        type="submit"
        disabled={!valor.trim()}
        className="btn h-7 shrink-0 px-2 py-0"
      >
        Añadir
      </button>
      <button
        type="button"
        onClick={onCancelar}
        className="btn btn-ghost h-7 shrink-0 px-2 py-0"
      >
        Cancelar
      </button>
    </form>
  )
}

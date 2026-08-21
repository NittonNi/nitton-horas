"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import * as Popover from "@radix-ui/react-popover"
import { Check, Loader2, Plus, Search, TagIcon } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useSesion } from "@/components/proveedor-sesion"
import type { Etiqueta } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export function SelectorEtiquetas({
  etiquetas,
  seleccionadas,
  onChange,
  compacto = false,
  autoAbrir = false,
}: {
  etiquetas: Etiqueta[]
  seleccionadas: string[]
  onChange: (ids: string[]) => void
  compacto?: boolean
  /** Empieza desplegado: se usa al editar una fila en el sitio. */
  autoAbrir?: boolean
}) {
  const router = useRouter()
  const { espacio } = useSesion()
  const soloUna = espacio.tag_mode === "una"

  const [abierto, setAbierto] = useState(autoAbrir)
  const [filtro, setFiltro] = useState("")
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Las recien creadas se pintan ya, sin esperar a que el servidor refresque
  const [recientes, setRecientes] = useState<Etiqueta[]>([])

  const todas = useMemo(() => {
    const vistas = new Set(etiquetas.map((e) => e.id))
    return [...etiquetas, ...recientes.filter((e) => !vistas.has(e.id))]
  }, [etiquetas, recientes])

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return q ? todas.filter((e) => e.name.toLowerCase().includes(q)) : todas
  }, [todas, filtro])

  const elegidas = todas.filter((e) => seleccionadas.includes(e.id))
  const escrito = filtro.trim()
  const yaExiste = todas.some((e) => e.name.toLowerCase() === escrito.toLowerCase())

  function alternar(id: string) {
    if (soloUna) {
      onChange(seleccionadas.includes(id) ? [] : [id])
      setAbierto(false)
      return
    }
    onChange(
      seleccionadas.includes(id)
        ? seleccionadas.filter((x) => x !== id)
        : [...seleccionadas, id],
    )
  }

  async function crear() {
    if (!escrito || creando) return
    setCreando(true)
    setError(null)

    const { data, error: err } = await createClient()
      .from("tags")
      .insert({ workspace_id: espacio.id, name: escrito })
      .select("*")
      .single()

    setCreando(false)
    if (err || !data) {
      setError(mensajeError(err))
      return
    }

    setRecientes((r) => [...r, data])
    setFiltro("")
    onChange(soloUna ? [data.id] : [...seleccionadas, data.id])
    router.refresh()
    if (soloUna) setAbierto(false)
  }

  return (
    /* En un portal: dentro de una fila con overflow oculto se recortaria */
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger
        title="Etiquetas"
        aria-label="Etiquetas"
        className={cn(
          "flex items-center gap-1.5 rounded-[var(--radio-sm)] border border-line-strong bg-surface px-2.5 text-sm transition hover:bg-surface-2",
          compacto ? "h-8" : "h-9",
          elegidas.length > 0 ? "text-ink" : "text-muted",
        )}
        aria-haspopup="listbox"
      >
        <TagIcon className="h-4 w-4 shrink-0" />
        {elegidas.length > 0 && (
          <span className="max-w-32 truncate text-xs font-medium">
            {elegidas.length === 1
              ? elegidas[0].name
              : elegidas.length + " etiquetas"}
          </span>
        )}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="card z-50 w-64 overflow-hidden p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              autoFocus
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAbierto(false)
                if (e.key === "Enter" && escrito && !yaExiste) {
                  e.preventDefault()
                  void crear()
                }
              }}
              placeholder="Buscar o crear etiqueta"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>

          <ul className="scroll-thin max-h-64 overflow-y-auto py-1">
            {filtradas.map((e) => {
              const marcada = seleccionadas.includes(e.id)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => alternar(e.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition hover:bg-surface-2"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: e.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    {marcada && <Check className="h-3.5 w-3.5 text-accent" />}
                  </button>
                </li>
              )
            })}
            {filtradas.length === 0 && !escrito && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                Todavía no hay etiquetas. Escribe arriba para crear la primera.
              </li>
            )}
          </ul>

          {escrito && !yaExiste && (
            <button
              type="button"
              onClick={() => void crear()}
              disabled={creando}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2 text-left text-sm text-accent transition hover:bg-surface-2 disabled:opacity-50"
            >
              {creando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Crear «{escrito}»
            </button>
          )}

          {error && (
            <p className="border-t border-line bg-danger-soft px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          {soloUna && (
            <p className="border-t border-line px-3 py-1.5 text-xs text-muted">
              Este espacio admite una etiqueta por entrada.
            </p>
          )}

          {seleccionadas.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full border-t border-line px-3 py-2 text-left text-xs text-muted transition hover:bg-surface-2"
            >
              Quitar {soloUna ? "la etiqueta" : "todas"}
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

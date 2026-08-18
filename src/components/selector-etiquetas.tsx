"use client"

import { useMemo, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Check, Search, TagIcon } from "lucide-react"

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
  const [abierto, setAbierto] = useState(autoAbrir)
  const [filtro, setFiltro] = useState("")

  const filtradas = useMemo(() => {
    const q = filtro.trim().toLowerCase()
    return q
      ? etiquetas.filter((e) => e.name.toLowerCase().includes(q))
      : etiquetas
  }, [etiquetas, filtro])

  const elegidas = etiquetas.filter((e) => seleccionadas.includes(e.id))

  function alternar(id: string) {
    onChange(
      seleccionadas.includes(id)
        ? seleccionadas.filter((x) => x !== id)
        : [...seleccionadas, id],
    )
  }

  return (
    /* En un portal: dentro de una fila con overflow oculto se recortaria */
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger
        title="Etiquetas"
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-sm transition hover:bg-surface-2",
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
              : `${elegidas.length} etiquetas`}
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
              onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
              placeholder="Buscar etiqueta"
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
            {filtradas.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {etiquetas.length === 0
                  ? "Todavia no hay etiquetas."
                  : `Nada coincide con «${filtro}».`}
              </li>
            )}
          </ul>

          {seleccionadas.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full border-t border-line px-3 py-2 text-left text-xs text-muted transition hover:bg-surface-2"
            >
              Quitar todas
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

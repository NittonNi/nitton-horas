"use client"

import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown, Minus } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Un filtro de varios a la vez: sin nada marcado no filtra -"Todas las
 * areas"- y marcando dos o tres se quedan esas. Es el mismo menu con
 * casillas que las etiquetas y las personas, para que se use igual en toda
 * la app.
 *
 * Arriba va marcar todos, que es como se hace "todos menos este": son quince
 * clics de diferencia cuando la lista es larga.
 */
export function FiltroMultiple({
  etiqueta,
  todos,
  opciones,
  elegidas,
  onChange,
}: {
  etiqueta: string
  /** Lo que pone cuando no hay nada marcado. */
  todos: string
  opciones: { id: string; nombre: string }[]
  elegidas: string[]
  onChange: (ids: string[]) => void
}) {
  const puestas = opciones.filter((o) => elegidas.includes(o.id))
  const todasPuestas = opciones.length > 0 && puestas.length === opciones.length

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={etiqueta}
        className={cn(
          "flex h-[2.125rem] shrink-0 items-center gap-1.5 rounded-[3px] border px-2.5 text-sm transition",
          puestas.length > 0
            ? "border-accent bg-accent-soft text-accent"
            : "border-line-strong bg-surface hover:bg-surface-2",
        )}
      >
        <span className="max-w-[11rem] truncate">
          {puestas.length === 0
            ? todos
            : puestas.length === 1
              ? puestas[0].nombre
              : `${etiqueta}: ${puestas.length}`}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 max-h-72 w-60 overflow-y-auto rounded-[var(--radio)] border border-line bg-surface p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          {/* Marcar todos y quitar uno es mas rapido que marcar quince. Con
              todos marcados se filtra igual que sin nada, pero se puede ir
              quitando desde ahi. */}
          <DropdownMenu.CheckboxItem
            checked={
              elegidas.length === 0
                ? false
                : todasPuestas
                  ? true
                  : "indeterminate"
            }
            onCheckedChange={() => onChange(todasPuestas ? [] : opciones.map((o) => o.id))}
            onSelect={(e) => e.preventDefault()}
            className="flex cursor-pointer items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-sm font-medium outline-none transition hover:bg-surface-2 data-highlighted:bg-surface-2"
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
                elegidas.length > 0 ? "border-ink bg-ink" : "border-line-strong",
              )}
            >
              {todasPuestas ? (
                <Check className="h-3 w-3 text-[color:var(--accent-fg)]" />
              ) : (
                elegidas.length > 0 && (
                  <Minus className="h-3 w-3 text-[color:var(--accent-fg)]" />
                )
              )}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {todasPuestas ? "Quitar la selección" : "Marcar todos"}
            </span>
            {elegidas.length > 0 && (
              <span className="cifra shrink-0 text-xs font-normal text-muted">
                {puestas.length}/{opciones.length}
              </span>
            )}
          </DropdownMenu.CheckboxItem>

          <div className="my-1 h-px bg-line" />

          {opciones.map((opcion) => {
            const puesta = elegidas.includes(opcion.id)
            return (
              <DropdownMenu.CheckboxItem
                key={opcion.id}
                checked={puesta}
                onCheckedChange={() =>
                  onChange(
                    puesta
                      ? elegidas.filter((id) => id !== opcion.id)
                      : [...elegidas, opcion.id],
                  )
                }
                onSelect={(e) => e.preventDefault()}
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-sm outline-none transition hover:bg-surface-2 data-highlighted:bg-surface-2"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border",
                    puesta ? "border-ink bg-ink" : "border-line-strong",
                  )}
                >
                  {puesta && (
                    <Check className="h-3 w-3 text-[color:var(--accent-fg)]" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{opcion.nombre}</span>
              </DropdownMenu.CheckboxItem>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

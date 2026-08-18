"use client"

import { Check, Users } from "lucide-react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

import type { Miembro } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/**
 * A quien más le cuentan estas horas. No se las apunta directamente: a cada uno
 * le llega una propuesta que tiene que aceptar.
 */
export function SelectorPersonas({
  miembros,
  seleccionadas,
  onChange,
}: {
  miembros: Miembro[]
  seleccionadas: string[]
  onChange: (ids: string[]) => void
}) {
  if (miembros.length === 0) {
    return (
      <p className="text-xs text-muted">
        Cuando haya más gente en el espacio podrás compartir estas horas con
        ellos.
      </p>
    )
  }

  const elegidas = miembros.filter((m) => seleccionadas.includes(m.id))

  function alternar(id: string) {
    onChange(
      seleccionadas.includes(id)
        ? seleccionadas.filter((x) => x !== id)
        : [...seleccionadas, id],
    )
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-[var(--radio-sm)] border px-3 text-left text-sm transition",
          elegidas.length > 0
            ? "border-ink bg-surface-2"
            : "border-line-strong bg-surface text-muted hover:bg-surface-2",
        )}
      >
        <Users className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {elegidas.length === 0
            ? "Solo para mi"
            : elegidas.length === 1
              ? elegidas[0].full_name
              : `${elegidas.length} personas más`}
        </span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[60] max-h-64 w-64 overflow-y-auto rounded-[var(--radio)] border border-line bg-surface p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <p className="rotulo px-2 py-1.5">Compartir con</p>
          {miembros.map((miembro) => {
            const puesta = seleccionadas.includes(miembro.id)
            return (
              <DropdownMenu.CheckboxItem
                key={miembro.id}
                checked={puesta}
                onCheckedChange={() => alternar(miembro.id)}
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
                <span className="min-w-0 flex-1 truncate">{miembro.full_name}</span>
              </DropdownMenu.CheckboxItem>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

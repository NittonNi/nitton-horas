"use client"

import * as Select from "@radix-ui/react-select"
import { Check, ChevronDown, Layers } from "lucide-react"

import type { Edicion } from "@/lib/tipos"
import { cn } from "@/lib/utils"

const SIN = "sin-edicion"

/**
 * Solo aparece cuando el proyecto elegido tiene ediciones. Un proyecto normal
 * -la mayoria- no ve nada de esto.
 */
export function SelectorEdicion({
  ediciones,
  valor,
  onChange,
  compacto = false,
}: {
  /** Ya filtradas: las del proyecto que esta elegido. */
  ediciones: Edicion[]
  valor: string | null
  onChange: (edicionId: string | null) => void
  compacto?: boolean
}) {
  if (ediciones.length === 0) return null

  return (
    <Select.Root
      value={valor ?? SIN}
      onValueChange={(v) => onChange(v === SIN ? null : v)}
    >
      <Select.Trigger
        title="Edición"
        aria-label="Edición"
        className={cn(
          "flex items-center gap-1.5 rounded-[var(--radio-sm)] border border-line-strong bg-surface px-2.5 text-sm transition hover:bg-surface-2",
          compacto ? "h-8" : "h-9",
          valor ? "text-ink" : "text-muted",
        )}
      >
        <Layers className="h-4 w-4 shrink-0" />
        <Select.Value placeholder="Edición" />
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="card z-50 overflow-hidden p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <Select.Viewport>
            <Opcion valor={SIN} texto="Sin edición" />
            {ediciones.map((e) => (
              <Opcion key={e.id} valor={e.id} texto={e.name} />
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function Opcion({ valor, texto }: { valor: string; texto: string }) {
  return (
    <Select.Item
      value={valor}
      className="flex cursor-pointer items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-sm outline-none data-highlighted:bg-surface-2"
    >
      <Select.ItemText>{texto}</Select.ItemText>
      <Select.ItemIndicator className="ml-auto">
        <Check className="h-3.5 w-3.5 text-accent" />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

"use client"

import { COLORES_PROYECTO } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/** Los doce colores de proyecto, todos a la misma intensidad. */
export function SelectorColor({
  valor,
  onChange,
}: {
  valor: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLORES_PROYECTO.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Color ${color}`}
          aria-pressed={valor === color}
          className={cn(
            "h-6 w-6 rounded-full transition",
            valor === color
              ? "ring-2 ring-ink ring-offset-2 ring-offset-[color:var(--surface)]"
              : "hover:scale-110",
          )}
          style={{ background: color }}
        />
      ))}
    </div>
  )
}

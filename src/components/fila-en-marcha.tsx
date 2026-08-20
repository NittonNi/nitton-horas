"use client"

import { Square } from "lucide-react"

import { useCronometro } from "@/components/proveedor-cronometro"
import { formatDuration } from "@/lib/time"
import type { Catalogo } from "@/lib/tipos"

/**
 * El cronometro en marcha, como una fila mas arriba del todo de la lista.
 * Antes solo vivia en la barra de arriba: al pulsar Continuar en una hora de
 * abajo, la lista no cambiaba nada y parecia que el boton no habia hecho
 * nada. Se edita desde la barra -aqui solo se ve y se para-.
 */
export function FilaEnMarcha({ catalogo }: { catalogo: Catalogo }) {
  const { enMarcha, segundos, parar, cargando } = useCronometro()

  if (!enMarcha) return null

  const etiquetas = catalogo.etiquetas.filter((t) => enMarcha.tagIds.includes(t.id))

  return (
    <div className="card mb-3 flex items-center gap-3 border-live-line bg-live-soft px-3 py-2.5">
      <span
        className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-live-fill"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium">
          {enMarcha.description || <span className="text-muted">Sin descripción</span>}
        </p>
        <p className="mt-0.5 truncate text-[0.8125rem]">
          {enMarcha.proyecto ? (
            <span style={{ color: enMarcha.proyecto.color }} className="font-medium">
              {enMarcha.proyecto.name}
              {enMarcha.tarea && (
                <span className="text-muted"> · {enMarcha.tarea.name}</span>
              )}
            </span>
          ) : (
            <span className="text-muted">Sin proyecto</span>
          )}
          {etiquetas.length > 0 && (
            <span className="text-muted"> · {etiquetas.map((t) => t.name).join(", ")}</span>
          )}
        </p>
      </div>
      <span className="cifra tabular-nums text-lg font-semibold text-running">
        {formatDuration(segundos)}
      </span>
      <button
        type="button"
        title="Parar"
        disabled={cargando}
        onClick={() => void parar()}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-live transition hover:bg-live-soft/60 disabled:opacity-50"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
      </button>
    </div>
  )
}

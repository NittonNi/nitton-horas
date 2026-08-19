"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { formatClock, formatDateLong, formatDurationShort } from "@/lib/time"
import { cn } from "@/lib/utils"

export type Propuesta = {
  id: string
  de: string
  description: string
  start_at: string
  end_at: string
  billable: boolean
  project_name: string | null
  project_color: string | null
}

/**
 * Horas que alguien ha apuntado contando contigo. No son tuyas hasta que las
 * aceptas: por eso viven aparte y no suman en ningún total todavía.
 */
export function PropuestasPendientes({ propuestas }: { propuestas: Propuesta[] }) {
  const router = useRouter()
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (propuestas.length === 0) return null

  async function responder(id: string, aceptar: boolean) {
    setOcupada(id)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.rpc("responder_invitacion", {
      p_invitacion: id,
      p_aceptar: aceptar,
    })
    setOcupada(null)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span aria-hidden className="h-4 w-[3px] rounded-full bg-accent" />
        <h2 className="text-sm font-semibold">
          Horas que han apuntado contigo
        </h2>
        <span className="chip ml-auto">{propuestas.length}</span>
      </div>

      {error && (
        <p className="border-b border-line bg-danger-soft px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="divide-y divide-line">
        {propuestas.map((propuesta) => {
          const segundos = Math.round(
            (new Date(propuesta.end_at).getTime() -
              new Date(propuesta.start_at).getTime()) /
              1000,
          )
          return (
            <li
              key={propuesta.id}
              /* En movil no cabe todo en una linea: el texto arriba y los
                 botones debajo, anchos, que se pulsan con el pulgar. */
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <span
                aria-hidden
                className="h-8 w-[3px] shrink-0 rounded-full"
                style={{
                  background: propuesta.project_color ?? "var(--line-strong)",
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {propuesta.description || propuesta.project_name || "Sin descripción"}
                </p>
                <p className="truncate text-xs text-muted">
                  {propuesta.de} · {formatDateLong(propuesta.start_at.slice(0, 10))}
                  {" · "}
                  <span className="cifra">
                    {formatClock(propuesta.start_at)}-{formatClock(propuesta.end_at)}
                  </span>
                  {propuesta.project_name && ` · ${propuesta.project_name}`}
                </p>
              </div>

              <span
                className={cn(
                  "cifra text-sm font-semibold",
                  propuesta.billable && "text-billable",
                )}
              >
                {formatDurationShort(segundos)}
              </span>

              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => void responder(propuesta.id, false)}
                  disabled={ocupada === propuesta.id}
                  className="btn py-1.5"
                >
                  <X className="h-4 w-4" />
                  No fui
                </button>
                <button
                  type="button"
                  onClick={() => void responder(propuesta.id, true)}
                  disabled={ocupada === propuesta.id}
                  className="btn btn-primary py-1.5"
                >
                  {ocupada === propuesta.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Aceptar
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

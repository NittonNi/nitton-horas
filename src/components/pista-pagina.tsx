"use client"

import { useSyncExternalStore } from "react"
import { Lightbulb, X } from "lucide-react"

/**
 * La pista de la primera vez.
 *
 * Cada pantalla dice ya de qué va en su subtítulo; esto añade lo único que no
 * se adivina mirando: el gesto. Sale una vez por persona y pantalla, no tapa
 * nada y se va para siempre en cuanto la cierras. Un tutorial que te para la
 * pantalla cada vez que entras en un sitio nuevo se cierra sin leer.
 */

const CLAVE = "pista"
const oyentes = new Set<() => void>()

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function vista(id: string) {
  try {
    return localStorage.getItem(`${CLAVE}:${id}`) === "si"
  } catch {
    // sin almacen -navegacion privada- mejor no dar la lata
    return true
  }
}

function cerrar(id: string) {
  try {
    localStorage.setItem(`${CLAVE}:${id}`, "si")
  } catch {
    // da igual: en esta sesion ya no se ve
  }
  for (const oyente of oyentes) oyente()
}

export function PistaPagina({
  clave,
  perfilId,
  children,
}: {
  /** Qué pantalla es: "calendario", "informes"... */
  clave: string
  perfilId: string
  children: React.ReactNode
}) {
  const id = `${perfilId}:${clave}`
  // En el servidor se da por vista: asi no parpadea al hidratar
  const yaEsta = useSyncExternalStore(
    suscribir,
    () => vista(id),
    () => true,
  )

  if (yaEsta) return null

  return (
    <div className="no-print flex items-start gap-2 rounded-[var(--radio-sm)] border border-accent/25 bg-accent-soft px-3 py-2 text-sm text-accent">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">{children}</p>
      <button
        type="button"
        onClick={() => cerrar(id)}
        aria-label="Entendido"
        title="Entendido"
        className="shrink-0 rounded-[3px] p-0.5 transition hover:bg-accent/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

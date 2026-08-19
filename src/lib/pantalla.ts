"use client"

import { useSyncExternalStore } from "react"

/**
 * Ancho a partir del cual dejamos de estar en un movil. Es el mismo corte que
 * usa `md:` en las clases, para que lo que decide el codigo y lo que decide el
 * CSS no se contradigan nunca.
 */
const MOVIL = "(max-width: 767px)"

/**
 * Si estamos en una pantalla de movil. Sirve para lo que no se puede resolver
 * con clases: en el telefono una hora se edita en su tarjeta entera, no celda
 * a celda, porque los campos de 70 pixeles no se pulsan con el pulgar.
 */
export function useEsMovil(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia(MOVIL)
      consulta.addEventListener("change", avisar)
      return () => consulta.removeEventListener("change", avisar)
    },
    () => window.matchMedia(MOVIL).matches,
    // En el servidor no hay pantalla: se pinta la version de escritorio
    () => false,
  )
}

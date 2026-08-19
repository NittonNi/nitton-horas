"use client"

import { useEffect, useRef, useState } from "react"

import { interpretarHora } from "@/lib/time"
import { cn } from "@/lib/utils"

/**
 * El único sitio donde se escribe una hora del reloj en toda la app. Se teclea
 * como se dice: "9" son las nueve, "930" las nueve y media, "21" las nueve de
 * la noche. Al salir del campo se ordena solo a "09:30".
 *
 * No es un `input type="time"` a propósito: el del navegador obliga a rellenar
 * hora y minutos por separado, cambia de aspecto en cada sistema y no entiende
 * que "9" ya es una hora.
 */
export function CampoHora({
  valor,
  onChange,
  className,
  id,
  autoFocus = false,
  etiqueta,
  alPulsarEnter,
}: {
  /** "HH:MM". Vacío si todavía no hay hora. */
  valor: string
  onChange: (valor: string) => void
  className?: string
  id?: string
  autoFocus?: boolean
  etiqueta?: string
  /** Recibe la hora ya entendida: al pulsar Enter el estado de fuera aún no
      se ha actualizado, así que hay que pasársela. */
  alPulsarEnter?: (valor: string) => void
}) {
  const [texto, setTexto] = useState(valor)
  const escribiendo = useRef(false)

  // Si la hora cambia por fuera -otra edición, deshacer- el campo la recoge,
  // pero nunca mientras se está tecleando encima.
  useEffect(() => {
    if (!escribiendo.current) setTexto(valor)
  }, [valor])

  /** Devuelve la hora que queda puesta, sea la nueva o la de antes. */
  function confirmar(): string {
    escribiendo.current = false
    const entendido = interpretarHora(texto)
    if (entendido === null) {
      setTexto(valor) // no se entiende: se deja como estaba, sin regañar
      return valor
    }
    setTexto(entendido)
    if (entendido !== valor) onChange(entendido)
    return entendido
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      autoFocus={autoFocus}
      value={texto}
      aria-label={etiqueta}
      placeholder="9:30"
      onFocus={(e) => {
        escribiendo.current = true
        e.currentTarget.select()
      }}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          alPulsarEnter?.(confirmar())
        }
        if (e.key === "Escape") {
          escribiendo.current = false
          setTexto(valor)
          e.currentTarget.blur()
        }
      }}
      className={cn("field tabular", className)}
    />
  )
}

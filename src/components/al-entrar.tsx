"use client"

import { useEffect, useRef, type ReactNode } from "react"

/**
 * Aparecer al llegar a la pantalla, en la portada.
 *
 * Dos cuidados a propósito:
 *
 * - **Sin JavaScript no esconde nada.** La clase que oculta la pone este
 *   efecto al montar, así que si el JS no llega la portada se lee entera, que
 *   es lo que le pasa a quien la mira desde un rastreador.
 * - **Lo que ya se ve no se anima.** Si al montar el bloque está dentro de la
 *   pantalla, se deja como está: animar lo que el ojo ya tiene delante es un
 *   parpadeo, no una entrada.
 */
export function AlEntrar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return

    el.classList.add("por-entrar")
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        el.classList.remove("por-entrar")
        el.classList.add("entra")
        observador.disconnect()
      },
      { rootMargin: "0px 0px -12% 0px" },
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

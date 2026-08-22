"use client"

import { useEffect, useState } from "react"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

/**
 * La barra que sale flotando justo encima del teclado del móvil, con una
 * flecha para el campo anterior, otra para el siguiente y un "Listo".
 *
 * Sale de dos quejas de Nicolas al usarlo en el telefono: que la barra de
 * abajo tapa lo que estas escribiendo, y que para pasar al campo siguiente
 * hay que cerrar el teclado, buscar el campo y volver a abrirlo.
 *
 * Como se sabe donde acaba el teclado: `visualViewport` es lo unico que lo
 * dice en iOS y en Android a la vez -no hay evento de "teclado abierto"-. Lo
 * que queda tapado es `innerHeight - visualViewport.height - offsetTop`, y la
 * barra se sube esa distancia. En Android, ademas, el `interactiveWidget` del
 * layout hace que el contenido se encoja solo.
 *
 * Mientras hay teclado, la navegacion de abajo se esconde: lo dice el atributo
 * `data-teclado` en el `<html>`, que lee el CSS. Asi no hay dos barras
 * peleandose por el mismo sitio.
 */

/** Lo que se puede rellenar, en el orden en que se ve. */
function camposDe(desde: Element | null): HTMLElement[] {
  const raiz = desde?.closest("form") ?? document.body
  const todos = [
    ...raiz.querySelectorAll<HTMLElement>("input, select, textarea"),
  ]
  return todos.filter((el) => {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") {
      return false
    }
    const tipo = (el as HTMLInputElement).type
    if (tipo === "checkbox" || tipo === "radio" || tipo === "hidden") return false
    // Lo que no ocupa sitio no se puede enfocar
    return el.offsetParent !== null || el.getClientRects().length > 0
  })
}

export function BarraTeclado() {
  /** Cuánto tapa el teclado, en píxeles. Cero es que no hay teclado. */
  const [tapado, setTapado] = useState(0)
  const [campo, setCampo] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function medir() {
      const alto = window.innerHeight - vv!.height - vv!.offsetTop
      // Menos de esto no es un teclado: es la barra del navegador
      setTapado(alto > 120 ? Math.round(alto) : 0)
    }

    function alEnfocar(e: FocusEvent) {
      const el = e.target as HTMLElement | null
      if (!el || !el.matches?.("input, select, textarea")) return
      const tipo = (el as HTMLInputElement).type
      if (tipo === "checkbox" || tipo === "radio") return
      setCampo(el)
      /* El teclado tarda en abrirse: cuando termina, el campo puede haber
         quedado debajo. Llevarlo al centro es lo que arregla el "no veo lo
         que estoy escribiendo". */
      setTimeout(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" })
      }, 320)
    }

    function alSalir() {
      // Un respiro: al saltar de un campo a otro hay un instante sin foco
      setTimeout(() => {
        const activo = document.activeElement
        if (!activo?.matches?.("input, select, textarea")) setCampo(null)
      }, 120)
    }

    vv.addEventListener("resize", medir)
    vv.addEventListener("scroll", medir)
    document.addEventListener("focusin", alEnfocar)
    document.addEventListener("focusout", alSalir)
    medir()

    return () => {
      vv.removeEventListener("resize", medir)
      vv.removeEventListener("scroll", medir)
      document.removeEventListener("focusin", alEnfocar)
      document.removeEventListener("focusout", alSalir)
    }
  }, [])

  const visible = tapado > 0 && campo !== null

  /* Que la navegacion de abajo se aparte mientras se escribe. Va por atributo
     en el <html> para que lo lea el CSS, sin que este componente tenga que
     saber nada de la otra barra. */
  useEffect(() => {
    const raiz = document.documentElement
    if (visible) raiz.dataset.teclado = "si"
    else delete raiz.dataset.teclado
    return () => {
      delete raiz.dataset.teclado
    }
  }, [visible])

  if (!visible || !campo) return null

  const campos = camposDe(campo)
  const donde = campos.indexOf(campo)
  const anterior = donde > 0 ? campos[donde - 1] : null
  const siguiente = donde >= 0 && donde < campos.length - 1 ? campos[donde + 1] : null

  /** Sin soltar el foco: si el navegador cierra el teclado, el salto no vale. */
  function saltar(e: React.PointerEvent, destino: HTMLElement | null) {
    e.preventDefault()
    if (!destino) return
    destino.focus()
    if (destino instanceof HTMLInputElement && destino.select) destino.select()
  }

  return (
    <div
      className="no-print fixed inset-x-0 bottom-0 z-50 flex items-center gap-1 border-t border-line bg-surface/95 px-2 py-1.5 backdrop-blur lg:hidden"
      style={{ transform: `translateY(-${tapado}px)` }}
    >
      <button
        type="button"
        onPointerDown={(e) => saltar(e, anterior)}
        disabled={!anterior}
        aria-label="Campo anterior"
        className="pulsable flex h-9 w-11 items-center justify-center rounded-[var(--radio-sm)] text-ink-soft disabled:opacity-30"
      >
        <ChevronUp className="h-5 w-5" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => saltar(e, siguiente)}
        disabled={!siguiente}
        aria-label="Campo siguiente"
        className="pulsable flex h-9 w-11 items-center justify-center rounded-[var(--radio-sm)] text-ink-soft disabled:opacity-30"
      >
        <ChevronDown className="h-5 w-5" />
      </button>

      <span className="ml-1 min-w-0 flex-1 truncate text-xs text-muted">
        {campos.length > 1 && `${donde + 1} de ${campos.length}`}
      </span>

      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault()
          campo.blur()
        }}
        className="pulsable flex h-9 items-center gap-1.5 rounded-[var(--radio-sm)] px-3 text-sm font-medium text-accent"
      >
        <Check className="h-4 w-4" />
        Listo
      </button>
    </div>
  )
}

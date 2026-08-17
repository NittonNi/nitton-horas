"use client"

import { useSyncExternalStore } from "react"
import { Monitor, Moon, Sun } from "lucide-react"

type Tema = "light" | "dark" | "system"

const OPCIONES: { valor: Tema; icono: typeof Sun; etiqueta: string }[] = [
  { valor: "light", icono: Sun, etiqueta: "Claro" },
  { valor: "dark", icono: Moon, etiqueta: "Oscuro" },
  { valor: "system", icono: Monitor, etiqueta: "Sistema" },
]

/**
 * El tema vive en localStorage, no en React: lo aplica el script del layout
 * antes de pintar nada. Aqui solo se lee y se escribe, con un almacen externo
 * para que el boton se entere de los cambios (incluidos los de otra pestana).
 */
const oyentes = new Set<() => void>()

function suscribir(alCambiar: () => void) {
  oyentes.add(alCambiar)
  window.addEventListener("storage", alCambiar)
  return () => {
    oyentes.delete(alCambiar)
    window.removeEventListener("storage", alCambiar)
  }
}

function leerTema(): Tema {
  const guardado = localStorage.getItem("tema")
  return guardado === "light" || guardado === "dark" ? guardado : "system"
}

/** En el servidor no hay localStorage: se pinta como "sistema". */
const temaEnServidor = (): Tema => "system"

export function SelectorTema() {
  const tema = useSyncExternalStore(suscribir, leerTema, temaEnServidor)

  function cambiar(nuevo: Tema) {
    const raiz = document.documentElement
    if (nuevo === "system") {
      localStorage.removeItem("tema")
      raiz.removeAttribute("data-theme")
    } else {
      localStorage.setItem("tema", nuevo)
      raiz.setAttribute("data-theme", nuevo)
    }
    for (const avisar of oyentes) avisar()
  }

  return (
    <div className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {OPCIONES.map(({ valor, icono: Icono, etiqueta }) => (
        <button
          key={valor}
          type="button"
          onClick={() => cambiar(valor)}
          title={etiqueta}
          aria-label={`Tema ${etiqueta.toLowerCase()}`}
          aria-pressed={tema === valor}
          className={`rounded-md p-1.5 transition ${
            tema === valor
              ? "bg-surface text-ink shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          <Icono className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}

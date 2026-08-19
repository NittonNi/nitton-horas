"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { X } from "lucide-react"

/**
 * El aviso de abajo: lo que acaba de pasar y, si se puede, como deshacerlo.
 * Dura unos segundos y se va solo. Es lo que convierte un borrado en algo que
 * no da miedo.
 */
type Aviso = {
  id: number
  texto: string
  deshacer?: () => Promise<string | void>
}

type Contexto = {
  avisar: (texto: string, deshacer?: () => Promise<string | void>) => void
}

const ContextoAvisos = createContext<Contexto | null>(null)

/* Doce segundos y quieto mientras el raton esta encima: si te vas a
   arrepentir de un borrado, no puede desaparecer justo al ir a pulsarlo. */
const SEGUNDOS = 12

export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [parado, setParado] = useState(false)
  const siguiente = useRef(0)

  const avisar = useCallback(
    (texto: string, deshacer?: () => Promise<string | void>) => {
      siguiente.current += 1
      setParado(false)
      setAviso({ id: siguiente.current, texto, deshacer })
    },
    [],
  )

  // Se va solo: un aviso que se queda acaba siendo parte del decorado
  useEffect(() => {
    if (!aviso || ocupado || parado) return
    const id = setTimeout(() => setAviso(null), SEGUNDOS * 1000)
    return () => clearTimeout(id)
  }, [aviso, ocupado, parado])

  return (
    <ContextoAvisos.Provider value={{ avisar }}>
      {children}

      {aviso && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-20 lg:pb-6"
        >
          <div
            onMouseEnter={() => setParado(true)}
            onMouseLeave={() => setParado(false)}
            onFocusCapture={() => setParado(true)}
            onBlurCapture={() => setParado(false)}
            className="card flex items-center gap-3 px-4 py-2.5 text-sm"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <span className="text-ink-soft">{aviso.texto}</span>

            {aviso.deshacer && (
              <button
                type="button"
                disabled={ocupado}
                onClick={async () => {
                  setOcupado(true)
                  try {
                    const hecho = await aviso.deshacer?.()
                    setAviso(
                      typeof hecho === "string"
                        ? { id: aviso.id + 1000, texto: hecho }
                        : null,
                    )
                  } catch (err) {
                    setAviso({
                      id: aviso.id + 2000,
                      texto:
                        "No se ha podido deshacer: " +
                        (err instanceof Error ? err.message : "algo ha fallado"),
                    })
                  } finally {
                    setOcupado(false)
                  }
                }}
                className="btn h-7 py-0 text-xs"
              >
                {ocupado ? "Deshaciendo…" : "Deshacer"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setAviso(null)}
              aria-label="Cerrar el aviso"
              className="rounded p-1 text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </ContextoAvisos.Provider>
  )
}

export function useAvisos(): Contexto {
  const ctx = useContext(ContextoAvisos)
  if (!ctx) {
    throw new Error("useAvisos tiene que usarse dentro de <ProveedorAvisos>")
  }
  return ctx
}

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

import { cn } from "@/lib/utils"

/**
 * Los avisos de abajo a la derecha: lo que acaba de pasar y, si se puede, como
 * deshacerlo. Duran unos segundos y se van solos. Es lo que convierte un
 * borrado en algo que no da miedo, y lo que sustituye a los alert del navegador.
 */
type Aviso = {
  id: number
  texto: string
  deshacer?: () => Promise<string | void>
  /** `mal` es para lo que ha fallado: lo demas se cuenta en tono normal. */
  tono?: "normal" | "mal"
}

type Contexto = {
  avisar: (
    texto: string,
    deshacer?: () => Promise<string | void>,
    tono?: "normal" | "mal",
  ) => void
}

const ContextoAvisos = createContext<Contexto | null>(null)

/* Doce segundos y quieto mientras el raton esta encima: si te vas a
   arrepentir de un borrado, no puede desaparecer justo al ir a pulsarlo. */
const SEGUNDOS = 12
/** Mas de tres apilados tapan la pantalla; el mas viejo deja sitio. */
const A_LA_VEZ = 3

export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const siguiente = useRef(0)

  const quitar = useCallback((id: number) => {
    setAvisos((lista) => lista.filter((a) => a.id !== id))
  }, [])

  const avisar = useCallback<Contexto["avisar"]>((texto, deshacer, tono) => {
    siguiente.current += 1
    const nuevo = { id: siguiente.current, texto, deshacer, tono }
    setAvisos((lista) => [...lista, nuevo].slice(-A_LA_VEZ))
  }, [])

  /* Uno debajo de otro y pegados a la derecha, que es donde no estorban: en el
     movil suben por encima de la barra de abajo. */
  return (
    <ContextoAvisos.Provider value={{ avisar }}>
      {children}

      {avisos.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-end gap-2 px-4 pb-20 sm:inset-x-auto sm:right-0 lg:pb-6"
        >
          {avisos.map((aviso) => (
            <Ventanita
              key={aviso.id}
              aviso={aviso}
              onCerrar={() => quitar(aviso.id)}
              onCambiar={(texto, tono) =>
                setAvisos((lista) =>
                  lista.map((a) =>
                    a.id === aviso.id
                      ? { id: a.id, texto, tono, deshacer: undefined }
                      : a,
                  ),
                )
              }
            />
          ))}
        </div>
      )}
    </ContextoAvisos.Provider>
  )
}

function Ventanita({
  aviso,
  onCerrar,
  onCambiar,
}: {
  aviso: Aviso
  onCerrar: () => void
  onCambiar: (texto: string, tono: Aviso["tono"]) => void
}) {
  const [ocupado, setOcupado] = useState(false)
  const [parado, setParado] = useState(false)

  // Se va solo: un aviso que se queda acaba siendo parte del decorado
  useEffect(() => {
    if (ocupado || parado) return
    const id = setTimeout(onCerrar, SEGUNDOS * 1000)
    return () => clearTimeout(id)
  }, [ocupado, parado, onCerrar, aviso.texto])

  return (
    <div
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
      onFocusCapture={() => setParado(true)}
      onBlurCapture={() => setParado(false)}
      className={cn(
        "card pointer-events-auto flex max-w-[22rem] items-center gap-3 border-l-[3px] px-4 py-2.5 text-sm",
        // Lo que se puede deshacer se distingue de un vistazo; lo que ha
        // fallado, tambien. El resto solo cuenta lo que ha pasado.
        aviso.tono === "mal"
          ? "border-l-danger"
          : aviso.deshacer
            ? "border-l-accent"
            : "border-l-line-strong",
      )}
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <span className={cn("min-w-0 flex-1", aviso.tono === "mal" ? "text-danger" : "text-ink-soft")}>
        {aviso.texto}
      </span>

      {aviso.deshacer && (
        <button
          type="button"
          disabled={ocupado}
          onClick={async () => {
            setOcupado(true)
            try {
              const hecho = await aviso.deshacer?.()
              if (typeof hecho === "string") onCambiar(hecho, "normal")
              else onCerrar()
            } catch (err) {
              onCambiar(
                "No se ha podido deshacer: " +
                  (err instanceof Error ? err.message : "algo ha fallado"),
                "mal",
              )
            } finally {
              setOcupado(false)
            }
          }}
          className="btn h-7 shrink-0 py-0 text-xs"
        >
          {ocupado ? "Deshaciendo…" : "Deshacer"}
        </button>
      )}

      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar el aviso"
        className="shrink-0 rounded p-1 text-muted transition hover:bg-surface-2 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function useAvisos(): Contexto {
  const ctx = useContext(ContextoAvisos)
  if (!ctx) {
    throw new Error("useAvisos tiene que usarse dentro de <ProveedorAvisos>")
  }
  return ctx
}

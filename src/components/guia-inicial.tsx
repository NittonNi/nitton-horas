"use client"

import { useState, useSyncExternalStore } from "react"
import { BarChart3, FolderTree, Settings2, Timer, Users } from "lucide-react"

/**
 * La primera vez que entras, cuatro pantallas con lo justo: donde se apuntan
 * las horas, como se organizan, como se comparte una reunion y donde se
 * arreglan los fallos. Se puede omitir en cualquier momento, y no vuelve.
 */

type Paso = {
  icono: typeof Timer
  titulo: string
  texto: string
  soloGestores?: boolean
}

const PASOS: Paso[] = [
  {
    icono: Timer,
    titulo: "Aquí se apuntan las horas",
    texto:
      "Escribe en qué estás trabajando, elige el proyecto y dale al play. Si prefieres apuntarlas después, tienes el modo manual, el calendario -arrastrando sobre el hueco- y la hoja semanal.",
  },
  {
    icono: FolderTree,
    titulo: "Cada hora, en su sitio",
    texto:
      "Cada proyecto cuelga de una rama -Backoffice, Conocimiento, Proyectos- y eso es lo que sale luego en los informes y en el Excel. Si el evento se repite, elige además la edición: TBCE 1 o TBCE 2.",
  },
  {
    icono: Users,
    titulo: "Las reuniones se apuntan una vez",
    texto:
      "Debajo del cronómetro eliges a quién más le cuentan esas horas. A cada uno le llega como propuesta y decide si la acepta: nadie apunta horas en el calendario de otro.",
  },
  {
    icono: BarChart3,
    titulo: "Los fallos se arreglan en Informes",
    texto:
      "Filtra por persona, proyecto o categoría, pulsa una hora para corregirla o marca varias y arréglalas de golpe. Y te lo llevas en Excel cuando toque cerrar.",
  },
  {
    icono: Settings2,
    titulo: "El espacio es vuestro",
    texto:
      "En Gestión están la categorización del equipo, los objetivos de horas, las etiquetas, las tarifas y la importación de lo que ya tenéis en Clockify.",
    soloGestores: true,
  },
]

const CLAVE = "guia-vista"

const oyentes = new Set<() => void>()

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

function yaVista(perfilId: string) {
  try {
    return localStorage.getItem(CLAVE + ":" + perfilId) === "si"
  } catch {
    // sin almacen -navegacion privada- mejor no dar la lata
    return true
  }
}

function guardar(perfilId: string) {
  try {
    localStorage.setItem(CLAVE + ":" + perfilId, "si")
  } catch {
    // da igual: en esta sesion ya no se ve
  }
  for (const oyente of oyentes) oyente()
}

export function GuiaInicial({
  perfilId,
  esGestor,
}: {
  perfilId: string
  esGestor: boolean
}) {
  // En el servidor se da por vista: asi no parpadea al hidratar
  const vista = useSyncExternalStore(
    suscribir,
    () => yaVista(perfilId),
    () => true,
  )
  const [paso, setPaso] = useState(0)

  const pasos = PASOS.filter((p) => !p.soloGestores || esGestor)
  if (vista) return null

  const actual = pasos[paso]
  const Icono = actual.icono
  const ultimo = paso === pasos.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guia-titulo"
        className="card w-full max-w-md p-5"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex items-center justify-between">
          <p className="rotulo">
            Guía rápida · {paso + 1} de {pasos.length}
          </p>
          <button
            type="button"
            onClick={() => guardar(perfilId)}
            className="text-xs font-medium text-muted transition hover:text-ink"
          >
            Omitir
          </button>
        </div>

        <span className="mt-4 flex h-10 w-10 items-center justify-center rounded-[var(--radio-sm)] bg-accent-soft text-accent">
          <Icono className="h-5 w-5" strokeWidth={1.9} aria-hidden />
        </span>

        <h2 id="guia-titulo" className="mt-3 text-lg font-semibold tracking-tight">
          {actual.titulo}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{actual.texto}</p>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {pasos.map((p, i) => (
              <span
                key={p.titulo}
                className={
                  "h-1.5 flex-1 rounded-full transition " +
                  (i <= paso ? "bg-accent" : "bg-surface-3")
                }
              />
            ))}
          </div>

          {paso > 0 && (
            <button
              type="button"
              onClick={() => setPaso((p) => p - 1)}
              className="btn btn-ghost shrink-0 text-muted"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => (ultimo ? guardar(perfilId) : setPaso((p) => p + 1))}
            className="btn btn-primary shrink-0"
          >
            {ultimo ? "Empezar" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Para volver a verla desde el perfil, que se olvida rapido. */
export function BotonVerGuia({ perfilId }: { perfilId: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          localStorage.removeItem(CLAVE + ":" + perfilId)
        } catch {
          // sin almacen no hay nada que borrar
        }
        for (const oyente of oyentes) oyente()
      }}
      className="btn"
    >
      Ver la guía otra vez
    </button>
  )
}

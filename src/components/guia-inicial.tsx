"use client"

import { useState, useSyncExternalStore } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { BarChart3, FolderTree, Settings2, Timer, Users } from "lucide-react"

/**
 * La primera vez que entras, lo justo para empezar: donde se apuntan las horas,
 * como se organizan, como se comparte una reunion y donde se arreglan los
 * fallos. Se puede omitir en cualquier momento, y no vuelve.
 *
 * Lo de cada pantalla no esta aqui: sale como pista la primera vez que entras
 * en ella -PistaPagina-, que es cuando sirve de algo.
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
      "Escribe en qué estás trabajando, elige el proyecto y dale al play. Si prefieres apuntarlas después: modo manual, calendario o la hoja de la semana.",
  },
  {
    icono: FolderTree,
    titulo: "Cada hora, en su sitio",
    texto:
      "Cada proyecto cuelga de un área -Backoffice, Conocimiento, Proyectos- y eso es lo que sale en los informes. Si el trabajo se repite, elige además la edición: TBCE 1 o TBCE 2.",
  },
  {
    icono: Users,
    titulo: "Las reuniones se apuntan una vez",
    texto:
      "Debajo del cronómetro eliges a quién más le cuentan esas horas. A cada uno le llega como propuesta: nadie apunta horas en el calendario de otro.",
  },
  {
    icono: BarChart3,
    titulo: "Los fallos se arreglan en Informes",
    texto:
      "Filtra por persona, área o proyecto -varios a la vez-, pulsa una hora para corregirla o marca varias y arréglalas de golpe. Y te lo llevas en Excel.",
  },
  {
    icono: Settings2,
    titulo: "El espacio es vuestro",
    texto:
      "En Gestión están las áreas del equipo, los objetivos, las tarifas, los ajustes del espacio y la importación de lo que ya tenéis en Clockify.",
    soloGestores: true,
  },
]

const CLAVE = "guia-vista"

const oyentes = new Set<() => void>()

/* La primera vez la guia se abre sola -no hay boton que la dispare-, pero al
   volver a abrirla desde el perfil si lo hay: se guarda aqui para poder
   devolverle el foco al cerrar, ya que Radix solo hace eso solo cuando quien
   abre es un Dialog.Trigger, y este se controla desde fuera. */
let disparador: HTMLElement | null = null

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
    <Dialog.Root open onOpenChange={(abierto) => !abierto && guardar(perfilId)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            disparador?.focus()
            disparador = null
          }}
          className="card fixed inset-x-4 bottom-4 z-50 max-w-md p-5 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2"
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

          <Dialog.Title className="mt-3 text-lg font-semibold tracking-tight">
            {actual.titulo}
          </Dialog.Title>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Para volver a verla desde el perfil, que se olvida rapido. */
export function BotonVerGuia({ perfilId }: { perfilId: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        disparador = e.currentTarget
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

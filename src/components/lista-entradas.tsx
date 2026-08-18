"use client"

import { useMemo } from "react"

import { FilaEntrada } from "@/components/fila-entrada"
import { formatDurationShort, relativeDayLabel } from "@/lib/time"
import type { Catalogo, EntradaVista } from "@/lib/tipos"

export function ListaEntradas({
  entradas,
  catalogo,
  mostrarPersona = false,
}: {
  entradas: EntradaVista[]
  catalogo: Catalogo
  mostrarPersona?: boolean
}) {
  const dias = useMemo(() => {
    const mapa = new Map<string, EntradaVista[]>()
    for (const e of entradas) {
      if (!e.end_at) continue // el cronometro en marcha ya sale en la barra
      const lista = mapa.get(e.local_date)
      if (lista) lista.push(e)
      else mapa.set(e.local_date, [e])
    }
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [entradas])

  if (dias.length === 0) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="text-sm font-medium">Aqui apareceran tus horas</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Escribe arriba en que estas trabajando y dale al play, o cambia al modo
          manual para apuntar un rato que ya has echado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {dias.map(([dia, delDia]) => {
        const total = delDia.reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
        return (
          <section key={dia}>
            <header className="flex items-baseline justify-between px-1 pb-1.5">
              <h2 className="text-sm font-semibold">{relativeDayLabel(dia)}</h2>
              <span className="tabular text-sm text-muted">
                {formatDurationShort(total)}
              </span>
            </header>
            <ul className="card overflow-hidden">
              {delDia.map((entrada) => (
                <FilaEntrada
                  key={entrada.id}
                  entrada={entrada}
                  catalogo={catalogo}
                  mostrarPersona={mostrarPersona}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

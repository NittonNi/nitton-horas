"use client"

import { useMemo } from "react"

import { FilaEntrada } from "@/components/fila-entrada"
import {
  dayLabel,
  formatDurationShort,
  formatObjetivoCorto,
  weekKey,
  weekLabel,
} from "@/lib/time"
import type { Catalogo, EntradaVista } from "@/lib/tipos"

/**
 * Las horas van agrupadas por semana y, dentro, por dia. La cabecera de cada
 * bloque lleva su total y, si el espacio tiene objetivo, cuanto es de cuanto.
 */
export function ListaEntradas({
  entradas,
  catalogo,
  mostrarPersona = false,
  objetivoDia = null,
  objetivoSemana = null,
}: {
  entradas: EntradaVista[]
  catalogo: Catalogo
  mostrarPersona?: boolean
  /** Minutos al dia, del espacio. */
  objetivoDia?: number | null
  /** Minutos a la semana, del espacio. */
  objetivoSemana?: number | null
}) {
  const semanas = useMemo(() => {
    const mapa = new Map<string, Map<string, EntradaVista[]>>()
    for (const e of entradas) {
      if (!e.end_at) continue // el cronometro en marcha ya sale en la barra
      const semana = weekKey(e.local_date)
      const dias = mapa.get(semana) ?? new Map<string, EntradaVista[]>()
      const lista = dias.get(e.local_date)
      if (lista) lista.push(e)
      else dias.set(e.local_date, [e])
      mapa.set(semana, dias)
    }
    return [...mapa.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([semana, dias]) => ({
        semana,
        dias: [...dias.entries()].sort((a, b) => b[0].localeCompare(a[0])),
      }))
  }, [entradas])

  if (semanas.length === 0) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="text-sm font-medium">Aquí aparecerán tus horas</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Escribe arriba en qué estás trabajando y dale al play, o cambia al
          modo manual para apuntar un rato que ya has echado.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {semanas.map(({ semana, dias }) => {
        const totalSemana = dias.reduce(
          (s, [, delDia]) =>
            s + delDia.reduce((t, e) => t + (e.duration_seconds ?? 0), 0),
          0,
        )
        return (
          <section key={semana}>
            <header className="flex items-baseline justify-between border-b border-line px-1 pb-1.5">
              <h2 className="text-sm font-semibold">{weekLabel(semana)}</h2>
              <Cifra segundos={totalSemana} objetivo={objetivoSemana} />
            </header>

            <div className="mt-3 space-y-4">
              {dias.map(([dia, delDia]) => {
                const total = delDia.reduce(
                  (s, e) => s + (e.duration_seconds ?? 0),
                  0,
                )
                return (
                  <div key={dia}>
                    <header className="flex items-baseline justify-between px-1 pb-1.5">
                      <h3 className="text-sm font-medium text-ink-soft">
                        {dayLabel(dia)}
                      </h3>
                      <Cifra segundos={total} objetivo={objetivoDia} discreto />
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
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** "6:12" o "6:12 / 8:00" cuando hay objetivo. */
function Cifra({
  segundos,
  objetivo,
  discreto = false,
}: {
  segundos: number
  objetivo: number | null
  discreto?: boolean
}) {
  const cumplido = objetivo !== null && segundos >= objetivo * 60

  return (
    <span className="tabular text-sm">
      <span
        className={
          cumplido ? "font-medium text-billable" : discreto ? "text-ink-soft" : "text-ink"
        }
      >
        {formatDurationShort(segundos)}
      </span>
      {objetivo !== null && (
        <span className="text-muted"> / {formatObjetivoCorto(objetivo)}</span>
      )}
    </span>
  )
}

"use client"

import { useMemo } from "react"

import { formatDurationShort, formatMoney } from "@/lib/time"
import type { EntradaVista } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export type Resultado = {
  id: string
  edition_id: string | null
  label: string
  starts_on: string
  ends_on: string
  income: number
  expenses: number
  notes: string
}

/**
 * Lo que ha dejado un trabajo y lo que ha costado en horas.
 *
 * Aquí no se presupuesta ni se cobra por tarifa: se apunta lo que entró y lo
 * que salió cuando ya se sabe -al cerrar un evento, al terminar una
 * oportunidad, cada mes en lo recurrente- y la app dice a cuánto ha salido la
 * hora. Ese es el número que se mira: la facturación por hora.
 */
export function ResultadosProyecto({
  entradas,
  resultados,
  objetivoHora,
}: {
  entradas: EntradaVista[]
  resultados: Resultado[]
  /** Facturación por hora a la que se aspira. En LEINN, 17 €/h. */
  objetivoHora: number | null
}) {
  /**
   * Las horas de un cierre: por edición si la lleva, y si no, las del proyecto
   * dentro de su periodo. Solo cuentan las que llevan el euro: son las que se
   * han hecho para ganar ese dinero.
   */
  const total = useMemo(() => {
    const horasDe = (r: Resultado) =>
      entradas
        .filter((e) => {
          if (!e.end_at || !e.billable) return false
          if (r.edition_id) return e.edition_id === r.edition_id
          return e.local_date >= r.starts_on && e.local_date <= r.ends_on
        })
        .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

    const ingresos = resultados.reduce((s, r) => s + Number(r.income), 0)
    const gastos = resultados.reduce((s, r) => s + Number(r.expenses), 0)
    const segundos = resultados.reduce((s, r) => s + horasDe(r), 0)
    const horas = segundos / 3600
    return {
      ingresos,
      gastos,
      neto: ingresos - gastos,
      segundos,
      porHora: horas > 0 ? ingresos / horas : null,
    }
  }, [entradas, resultados])

  if (resultados.length === 0) return null

  return (
    <section className="card min-w-0 p-4">
      <h2 className="mb-3 text-sm font-semibold">Resultado del proyecto</h2>

      <div className="flex flex-wrap items-center gap-4">
        {total.porHora !== null && (
          <Rueda valor={total.porHora} objetivo={objetivoHora} />
        )}
        <div className="min-w-0 space-y-0.5 text-sm">
          <p>
            <span className="cifra font-semibold">
              {formatMoney(total.ingresos)}
            </span>{" "}
            <span className="text-muted">facturado</span>
          </p>
          <p className="text-muted">
            en{" "}
            <span className="cifra">{formatDurationShort(total.segundos)}</span>{" "}
            de horas que se cobran
          </p>
          <p className={cn("text-muted", total.neto < 0 && "text-danger")}>
            {formatMoney(total.neto)} después de gastos
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * La facturación por hora en un círculo: lo que llevas del objetivo. Se pasa
 * de vuelta si lo superas, que es justo lo que se quiere ver.
 */
function Rueda({ valor, objetivo }: { valor: number; objetivo: number | null }) {
  const meta = objetivo && objetivo > 0 ? objetivo : null
  const parte = meta ? Math.min(1, valor / meta) : 1
  const radio = 34
  const vuelta = 2 * Math.PI * radio
  const llega = meta === null ? null : valor >= meta

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radio}
          fill="none"
          strokeWidth="8"
          className="stroke-surface-2"
        />
        <circle
          cx="40"
          cy="40"
          r={radio}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${vuelta * parte} ${vuelta}`}
          className={cn(
            "transition-all",
            llega === false ? "stroke-danger" : "stroke-billable",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "cifra text-base font-semibold leading-none",
            llega === false && "text-danger",
            llega === true && "text-billable",
          )}
        >
          {valor.toLocaleString("es-ES", { maximumFractionDigits: 0 })}
        </span>
        <span className="text-[10px] leading-tight text-muted">€/h</span>
        {meta !== null && (
          <span className="text-[10px] leading-tight text-muted">de {meta}</span>
        )}
      </div>
    </div>
  )
}

/** El número que se mira, con su verde o su rojo según el objetivo. */
function PorHora({
  valor,
  objetivo,
  grande = false,
}: {
  valor: number
  objetivo: number | null
  grande?: boolean
}) {
  const llega = objetivo === null ? null : valor >= objetivo
  return (
    <span
      className={cn(
        "cifra whitespace-nowrap font-semibold",
        grande ? "text-lg" : "text-sm",
        llega === null ? "" : llega ? "text-billable" : "text-danger",
      )}
      title={
        objetivo === null
          ? "Facturación por hora"
          : `Objetivo del equipo: ${objetivo} €/h`
      }
    >
      {valor.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €/h
    </span>
  )
}

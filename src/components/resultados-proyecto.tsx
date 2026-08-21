import type { EntradaVista } from "@/lib/tipos"

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
 * Lo que ha dejado un trabajo y lo que ha costado en horas: ingresos, gastos y
 * la facturacion por hora.
 *
 * Las horas de un cierre son las de su edicion si la lleva, y si no las del
 * proyecto dentro de su periodo -pero solo las que no son ya de otra edicion:
 * si no, un cierre del proyecto entero que se reguarda despues de crear
 * ediciones se estira hasta hoy y cuenta dos veces las horas que ya llevaba
 * cada edicion-. Solo cuentan las que llevan el euro: son las que se han
 * hecho para ganar ese dinero.
 */
export function resumenDeResultados(
  entradas: EntradaVista[],
  resultados: Resultado[],
) {
  const horasDe = (r: Resultado) =>
    entradas
      .filter((e) => {
        if (!e.end_at || !e.billable) return false
        if (r.edition_id) return e.edition_id === r.edition_id
        return !e.edition_id && e.local_date >= r.starts_on && e.local_date <= r.ends_on
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
    /**
     * Con menos de una hora marcada el reparto no dice nada: mil euros entre
     * dieciocho segundos son doscientos mil euros la hora, y eso no es un dato,
     * es una division. Por debajo de ahi no se ensena.
     */
    porHora: horas >= 1 ? ingresos / horas : null,
    /** Hay dinero apuntado pero faltan horas con el euro para repartirlo. */
    faltanHoras: ingresos > 0 && horas < 1,
  }
}

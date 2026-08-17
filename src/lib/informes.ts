/** Agregaciones de los informes: siempre en segundos, y el dinero aparte. */

import { toDateKey, fromDateKey, addDays } from "@/lib/time"
import type { EntradaVista } from "@/lib/tipos"

export type Grupo = {
  clave: string
  etiqueta: string
  color?: string | null
  segundos: number
  facturables: number
  importe: number
  entradas: number
}

export function totales(entradas: EntradaVista[]) {
  let segundos = 0
  let facturables = 0
  let importe = 0

  for (const entrada of entradas) {
    const duracion = entrada.duration_seconds ?? 0
    segundos += duracion
    if (entrada.billable) {
      facturables += duracion
      importe += Number(entrada.amount ?? 0)
    }
  }

  return { segundos, facturables, importe, entradas: entradas.length }
}

export function agrupar(
  entradas: EntradaVista[],
  clave: (e: EntradaVista) => string,
  etiqueta: (e: EntradaVista) => string,
  color?: (e: EntradaVista) => string | null,
): Grupo[] {
  const mapa = new Map<string, Grupo>()

  for (const entrada of entradas) {
    const id = clave(entrada)
    if (!mapa.has(id)) {
      mapa.set(id, {
        clave: id,
        etiqueta: etiqueta(entrada),
        color: color?.(entrada) ?? null,
        segundos: 0,
        facturables: 0,
        importe: 0,
        entradas: 0,
      })
    }
    const grupo = mapa.get(id)!
    const duracion = entrada.duration_seconds ?? 0
    grupo.segundos += duracion
    grupo.entradas += 1
    if (entrada.billable) {
      grupo.facturables += duracion
      grupo.importe += Number(entrada.amount ?? 0)
    }
  }

  return [...mapa.values()].sort((a, b) => b.segundos - a.segundos)
}

/** Serie continua para el grafico: los dias sin horas tambien ocupan sitio. */
export function porDia(entradas: EntradaVista[], desde: string, hasta: string) {
  const acumulado = new Map<string, { segundos: number; facturables: number }>()

  for (const entrada of entradas) {
    const dia = entrada.local_date
    if (!acumulado.has(dia)) acumulado.set(dia, { segundos: 0, facturables: 0 })
    const punto = acumulado.get(dia)!
    const duracion = entrada.duration_seconds ?? 0
    punto.segundos += duracion
    if (entrada.billable) punto.facturables += duracion
  }

  const serie: { dia: string; horas: number; facturables: number }[] = []
  let cursor = fromDateKey(desde)
  const fin = fromDateKey(hasta)
  let vueltas = 0

  while (cursor <= fin && vueltas < 400) {
    const dia = toDateKey(cursor)
    const punto = acumulado.get(dia)
    serie.push({
      dia,
      horas: Math.round(((punto?.segundos ?? 0) / 3600) * 100) / 100,
      facturables: Math.round(((punto?.facturables ?? 0) / 3600) * 100) / 100,
    })
    cursor = addDays(cursor, 1)
    vueltas += 1
  }

  return serie
}

/** Rangos de uso diario, ya calculados en fechas concretas. */
export function rangos(hoy = new Date()) {
  const dia = (d: Date) => toDateKey(d)
  const inicioSemana = new Date(hoy)
  inicioSemana.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7))

  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const finMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0)
  const inicioMesPasado = new Date(
    finMesPasado.getFullYear(),
    finMesPasado.getMonth(),
    1,
  )

  return [
    { clave: "semana", etiqueta: "Esta semana", desde: dia(inicioSemana), hasta: dia(hoy) },
    { clave: "mes", etiqueta: "Este mes", desde: dia(inicioMes), hasta: dia(hoy) },
    {
      clave: "mes-pasado",
      etiqueta: "Mes pasado",
      desde: dia(inicioMesPasado),
      hasta: dia(finMesPasado),
    },
    {
      clave: "trimestre",
      etiqueta: "Ultimos 90 dias",
      desde: dia(addDays(hoy, -89)),
      hasta: dia(hoy),
    },
    {
      clave: "ano",
      etiqueta: "Este ano",
      desde: dia(new Date(hoy.getFullYear(), 0, 1)),
      hasta: dia(hoy),
    },
  ]
}

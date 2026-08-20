/** Cuentas de la pantalla de estadisticas. Siempre en segundos, el dinero aparte. */

import { addDays, fromDateKey, toDateKey, startOfWeek } from "@/lib/time"
import type { EntradaVista } from "@/lib/tipos"

export type Rango = { desde: string; hasta: string }

/** Un dia, una semana o un mes de la serie. */
export type Punto = {
  clave: string
  etiqueta: string
  horas: number
  cobrables: number
  /** Lo que no se cobra: es lo que se apila encima en la grafica. */
  resto: number
  /** Lo mismo en el periodo anterior, para poder comparar. */
  antes?: number
}

const MESES = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
]

export const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]

/** Cuantos dias hay entre las dos puntas, contando las dos. */
export function diasDe(rango: Rango) {
  const a = fromDateKey(rango.desde).getTime()
  const b = fromDateKey(rango.hasta).getTime()
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1)
}

/**
 * El periodo justo antes, del mismo tamaño. Es con lo que se compara: decir que
 * este mes van 120 horas no dice nada hasta que sabes que el anterior fueron 90.
 */
export function anterior(rango: Rango): Rango {
  const dias = diasDe(rango)
  const hasta = addDays(fromDateKey(rango.desde), -1)
  const desde = addDays(hasta, -(dias - 1))
  return { desde: toDateKey(desde), hasta: toDateKey(hasta) }
}

export function dentro(entrada: EntradaVista, rango: Rango) {
  return entrada.local_date >= rango.desde && entrada.local_date <= rango.hasta
}

/**
 * La unidad de la serie se elige sola: un mes se mira por dias y dos años por
 * meses. Nadie quiere leer trescientas barras.
 */
export type Unidad = "dia" | "semana" | "mes" | "ano"

export function unidadPara(rango: Rango): Unidad {
  const dias = diasDe(rango)
  if (dias <= 45) return "dia"
  if (dias <= 200) return "semana"
  if (dias <= 900) return "mes"
  return "ano"
}

function claveYEtiqueta(dia: string, unidad: Unidad) {
  const fecha = fromDateKey(dia)
  if (unidad === "dia") {
    return { clave: dia, etiqueta: `${fecha.getDate()} ${MESES[fecha.getMonth()]}` }
  }
  if (unidad === "semana") {
    const lunes = startOfWeek(fecha)
    return {
      clave: toDateKey(lunes),
      etiqueta: `${lunes.getDate()} ${MESES[lunes.getMonth()]}`,
    }
  }
  if (unidad === "mes") {
    return {
      clave: dia.slice(0, 7),
      etiqueta: `${MESES[fecha.getMonth()]} ${String(fecha.getFullYear()).slice(2)}`,
    }
  }
  return { clave: dia.slice(0, 4), etiqueta: dia.slice(0, 4) }
}

/**
 * La serie del periodo, con los huecos rellenos: un dia sin horas tiene que
 * ocupar su sitio, que si no la grafica miente sobre el ritmo.
 */
export function serie(
  entradas: EntradaVista[],
  rango: Rango,
  unidad: Unidad,
  comparar?: EntradaVista[],
): Punto[] {
  const mapa = new Map<string, Punto>()

  for (
    let f = fromDateKey(rango.desde);
    toDateKey(f) <= rango.hasta;
    f = addDays(f, 1)
  ) {
    const { clave, etiqueta } = claveYEtiqueta(toDateKey(f), unidad)
    if (!mapa.has(clave)) {
      mapa.set(clave, { clave, etiqueta, horas: 0, cobrables: 0, resto: 0 })
    }
  }

  for (const e of entradas) {
    const { clave } = claveYEtiqueta(e.local_date, unidad)
    const punto = mapa.get(clave)
    if (!punto) continue
    const horas = (e.duration_seconds ?? 0) / 3600
    punto.horas += horas
    if (e.billable) punto.cobrables += horas
  }

  const puntos = [...mapa.values()].sort((a, b) => a.clave.localeCompare(b.clave))

  /* El periodo anterior se pega punto a punto por posicion, no por fecha: lo
     que interesa es "el primer dia contra el primer dia". */
  if (comparar) {
    const previo = new Map<string, number>()
    const antes = anterior(rango)
    for (
      let f = fromDateKey(antes.desde);
      toDateKey(f) <= antes.hasta;
      f = addDays(f, 1)
    ) {
      const { clave } = claveYEtiqueta(toDateKey(f), unidad)
      if (!previo.has(clave)) previo.set(clave, 0)
    }
    for (const e of comparar) {
      const { clave } = claveYEtiqueta(e.local_date, unidad)
      if (previo.has(clave)) {
        previo.set(clave, previo.get(clave)! + (e.duration_seconds ?? 0) / 3600)
      }
    }
    const viejos = [...previo.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([, v]) => v)
    puntos.forEach((p, i) => {
      p.antes = Math.round((viejos[i] ?? 0) * 100) / 100
    })
  }

  for (const p of puntos) {
    p.horas = Math.round(p.horas * 100) / 100
    p.cobrables = Math.round(p.cobrables * 100) / 100
    p.resto = Math.round((p.horas - p.cobrables) * 100) / 100
  }
  return puntos
}

/**
 * Cuando se trabaja: siete dias por veinticuatro horas.
 *
 * Se reparte cada rato por las horas que ocupa, no se apunta entero en la hora
 * en que empezo: un rato de 9 a 13 son cuatro casillas, no una.
 */
export function mapaDeCalor(entradas: EntradaVista[]) {
  const rejilla: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))

  for (const e of entradas) {
    if (!e.end_at) continue
    const inicio = new Date(e.start_at)
    const fin = new Date(e.end_at)
    // Los ratos larguisimos son casi siempre un cronometro olvidado
    if (fin.getTime() - inicio.getTime() > 16 * 3600_000) continue

    for (
      let t = new Date(inicio);
      t < fin;
      t = new Date(t.getTime() + 15 * 60_000)
    ) {
      const dia = (t.getDay() + 6) % 7
      rejilla[dia][t.getHours()] += 0.25
    }
  }
  return rejilla
}

/** La franja con horas, para no pintar la noche entera vacia. */
export function franjaViva(rejilla: number[][]) {
  let min = 24
  let max = 0
  for (const fila of rejilla) {
    fila.forEach((v, h) => {
      if (v <= 0) return
      if (h < min) min = h
      if (h > max) max = h
    })
  }
  if (min > max) return { min: 8, max: 20 }
  return { min: Math.max(0, min - 1), max: Math.min(23, max + 1) }
}

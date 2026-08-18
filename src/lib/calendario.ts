/** Cuentas de la rejilla del calendario: minutos a pixeles y reparto de solapes. */

import type { EntradaVista } from "@/lib/tipos"

/** Alto de una hora, en pixeles. Todo lo demas se deriva de aqui. */
export const ALTO_HORA = 52
export const MINUTOS_PASO = 15
export const ALTO_PASO = (ALTO_HORA / 60) * MINUTOS_PASO

export type Bloque = {
  entrada: EntradaVista
  /** minutos desde medianoche */
  desde: number
  hasta: number
  /** reparto horizontal cuando varias entradas se pisan */
  columna: number
  columnas: number
}

export function minutosDe(iso: string): number {
  const fecha = new Date(iso)
  return fecha.getHours() * 60 + fecha.getMinutes()
}

export function redondear(minutos: number): number {
  return Math.round(minutos / MINUTOS_PASO) * MINUTOS_PASO
}

export function limitar(minutos: number): number {
  return Math.max(0, Math.min(24 * 60, minutos))
}

/** "9:30" a partir de minutos desde medianoche. */
export function comoHora(minutos: number): string {
  const m = limitar(Math.round(minutos))
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`
}

/** "09:30", para los <input type="time"> */
export function comoHoraInput(minutos: number): string {
  const m = limitar(Math.round(minutos))
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

/**
 * Reparte en columnas las entradas que se pisan, como hace un calendario: se
 * agrupan las que se solapan entre si y dentro del grupo cada una se queda con
 * la primera columna libre.
 */
export function repartir(entradas: EntradaVista[]): Bloque[] {
  const bloques = entradas
    .filter((e) => e.end_at)
    .map((entrada) => {
      const desde = minutosDe(entrada.start_at)
      const hasta = minutosDe(entrada.end_at!)
      return {
        entrada,
        desde,
        // Una entrada que cruza la medianoche se corta a las 24:00
        hasta: hasta <= desde ? 24 * 60 : hasta,
        columna: 0,
        columnas: 1,
      }
    })
    .sort((a, b) => a.desde - b.desde || b.hasta - a.hasta)

  let grupo: Bloque[] = []
  let finDelGrupo = -1

  const cerrarGrupo = () => {
    for (const bloque of grupo) bloque.columnas = Math.max(...grupo.map((b) => b.columna + 1))
    grupo = []
  }

  for (const bloque of bloques) {
    if (bloque.desde >= finDelGrupo && grupo.length > 0) {
      cerrarGrupo()
      finDelGrupo = -1
    }

    // primera columna que no choque con nadie del grupo
    let columna = 0
    while (
      grupo.some((otro) => otro.columna === columna && otro.hasta > bloque.desde)
    ) {
      columna += 1
    }
    bloque.columna = columna
    grupo.push(bloque)
    finDelGrupo = Math.max(finDelGrupo, bloque.hasta)
  }
  if (grupo.length > 0) cerrarGrupo()

  return bloques
}

/**
 * La rejilla siempre pinta el dia entero: si se recortara a lo ya apuntado no
 * se podrian anadir horas fuera de esa franja, que es justo lo que hace falta
 * el dia que se empieza antes o se acaba mas tarde de lo normal.
 */
export const DIA_ENTERO = { desde: 0, hasta: 24 * 60 }

/**
 * A que hora conviene dejar el scroll al abrir: una hora antes de lo mas
 * temprano que haya, y si no hay nada, a las siete.
 */
export function horaParaEmpezar(bloques: Bloque[]): number {
  if (bloques.length === 0) return 7 * 60
  const primera = Math.min(...bloques.map((b) => b.desde))
  return Math.max(0, Math.floor((primera - 60) / 60) * 60)
}

/** "09:30" -> 570. Devuelve null si el campo esta a medias. */
export function minutosDeHora(valor: string): number | null {
  const trozos = valor.match(/^(\d{1,2}):(\d{2})$/)
  if (!trozos) return null
  const horas = Number(trozos[1])
  const minutos = Number(trozos[2])
  if (horas > 23 || minutos > 59) return null
  return horas * 60 + minutos
}

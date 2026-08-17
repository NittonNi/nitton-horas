/**
 * Duraciones, fechas y dinero. Todo en formato espanol: coma decimal,
 * semana que empieza en lunes y horario de Europe/Madrid (el mismo que usa
 * la columna generada `local_date` en Postgres).
 */

export const TIMEZONE = "Europe/Madrid"

/* ---------------------------------------------------------------- duracion */

/** 5025 -> "1:23:45" */
export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

/** 5025 -> "1:23". Para totales, donde los segundos son ruido. */
export function formatDurationShort(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(seconds ?? 0))
  const h = Math.floor(total / 3600)
  const m = Math.round((total % 3600) / 60)
  // redondear los minutos puede dar 60
  const carry = m === 60 ? 1 : 0
  return `${h + carry}:${String(carry ? 0 : m).padStart(2, "0")}`
}

/** 5025 -> "1,40". Lo que se factura. */
export function formatHoursDecimal(seconds: number | null | undefined): string {
  return ((seconds ?? 0) / 3600).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function hoursDecimal(seconds: number | null | undefined): number {
  return Math.round(((seconds ?? 0) / 3600) * 10000) / 10000
}

/**
 * Acepta lo que la gente escribe de verdad:
 * "1:30" "1,5" "1.5" "90m" "1h30" "1h 30m" "45" (minutos si no hay unidad ni coma)
 * Devuelve segundos, o null si no hay forma de interpretarlo.
 */
export function parseDurationToSeconds(raw: string): number | null {
  const input = raw.trim().toLowerCase().replace(/\s+/g, "")
  if (!input) return null

  // 1:30 o 1:30:45
  const colon = input.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/)
  if (colon) {
    const [, h, m, s] = colon
    return Number(h) * 3600 + Number(m) * 60 + Number(s ?? 0)
  }

  // 1h30, 1h30m, 1h, 30m, 1h30m20s
  const units = input.match(/^(?:(\d+(?:[.,]\d+)?)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (units && (units[1] || units[2] || units[3])) {
    const h = units[1] ? Number(units[1].replace(",", ".")) : 0
    const m = units[2] ? Number(units[2]) : 0
    const s = units[3] ? Number(units[3]) : 0
    return Math.round(h * 3600 + m * 60 + s)
  }

  // 1,5 o 1.5 -> horas decimales
  const decimal = input.match(/^(\d+)[.,](\d+)$/)
  if (decimal) {
    return Math.round(Number(`${decimal[1]}.${decimal[2]}`) * 3600)
  }

  // un numero pelado: minutos hasta 59, horas a partir de ahi seria ambiguo,
  // asi que se tratan siempre como minutos (es lo que espera quien teclea "45")
  const bare = input.match(/^(\d+)$/)
  if (bare) return Number(bare[1]) * 60

  return null
}

/* ------------------------------------------------------------------ dinero */

export function formatMoney(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  })
}

/* ------------------------------------------------------------------ fechas */

/** Date -> "2026-08-17" en hora local, sin pasar por UTC (toISOString desplaza). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** "2026-08-17" -> Date a mediodia local, inmune a saltos de huso. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function todayKey(): string {
  return toDateKey(new Date())
}

/** Lunes de la semana de `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(12, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - day)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function weekDays(anchor: Date): Date[] {
  const monday = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })
}

export function formatDateLong(key: string): string {
  const date = fromDateKey(key)
  const label = date.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatDateShort(key: string): string {
  return fromDateKey(key).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/** "17:30" a partir de un timestamptz ISO. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "--:--"
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Combina "2026-08-17" + "09:30" en un ISO con el huso del navegador. */
export function combineDateAndTime(dateKey: string, clock: string): string {
  const [y, m, d] = dateKey.split("-").map(Number)
  const [hh, mm] = clock.split(":").map(Number)
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString()
}

/** "09:30" para rellenar un <input type="time"> */
export function toClockInput(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function relativeDayLabel(key: string): string {
  const today = todayKey()
  if (key === today) return "Hoy"
  if (key === toDateKey(addDays(new Date(), -1))) return "Ayer"
  return formatDateLong(key)
}

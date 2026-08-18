/**
 * Lectura de los informes detallados que exporta Clockify en CSV.
 *
 * El fichero cambia de idioma y de formato de fecha según la configuración de
 * la cuenta, así que las cabeceras se reconocen por sinonimos y el formato de
 * fecha se deduce mirando todas las filas antes de convertir ninguna.
 *
 * Las horas del informe vienen en el huso del espacio de trabajo, que damos por
 * el mismo que el de la app (Europe/Madrid).
 */

import Papa from "papaparse"

export type FormatoFecha = "iso" | "dmy" | "mdy"

export type FilaClockify = {
  fila: number
  usuario: string
  email: string
  cliente: string
  proyecto: string
  tarea: string
  descripcion: string
  etiquetas: string[]
  facturable: boolean
  inicio: string
  fin: string
  segundos: number
  clave: string
}

export type Analisis = {
  filas: FilaClockify[]
  descartadas: { fila: number; motivo: string }[]
  formato: FormatoFecha
  cabecerasFaltan: string[]
}

const CAMPOS = {
  proyecto: ["project", "proyecto"],
  cliente: ["client", "cliente"],
  descripcion: ["description", "descripcion"],
  tarea: ["task", "tarea"],
  usuario: ["user", "usuario"],
  email: ["email", "correo electronico", "correo"],
  etiquetas: ["tags", "etiquetas"],
  facturable: ["billable", "facturable"],
  fechaInicio: ["start date", "fecha de inicio", "fecha inicio"],
  horaInicio: ["start time", "hora de inicio", "hora inicio"],
  fechaFin: ["end date", "fecha de finalizacion", "fecha de fin", "fecha fin"],
  horaFin: ["end time", "hora de finalizacion", "hora de fin", "hora fin"],
  duracion: ["duration (h)", "duración (h)", "duration", "duracion"],
  duracionDecimal: ["duration (decimal)", "duración (decimal)"],
} as const

type Campo = keyof typeof CAMPOS

/** minusculas, sin acentos y sin espacios de más */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function mapearCabeceras(cabeceras: string[]): Partial<Record<Campo, string>> {
  const mapa: Partial<Record<Campo, string>> = {}
  for (const cabecera of cabeceras) {
    const limpia = normalizar(cabecera)
    for (const [campo, alias] of Object.entries(CAMPOS) as [
      Campo,
      readonly string[],
    ][]) {
      if (mapa[campo]) continue
      if (alias.includes(limpia)) mapa[campo] = cabecera
    }
  }
  return mapa
}

/* -------------------------------------------------------------------- fechas */

const SEPARADORES = /[/.\-]/

/**
 * Mira todas las fechas del fichero: si alguna tiene un primer número mayor
 * que 12 solo puede ser día/mes; si lo tiene el segundo, mes/día. Sin pistas,
 * día/mes, que es lo que exporta una cuenta configurada en español.
 */
export function detectarFormato(valores: string[]): FormatoFecha {
  let vistoDiaPrimero = false
  let vistoMesPrimero = false

  for (const valor of valores) {
    const limpio = valor?.trim()
    if (!limpio) continue
    if (/^\d{4}-\d{2}-\d{2}/.test(limpio)) return "iso"
    const partes = limpio.split(SEPARADORES)
    if (partes.length < 3) continue
    const a = Number(partes[0])
    const b = Number(partes[1])
    if (a > 12) vistoDiaPrimero = true
    if (b > 12) vistoMesPrimero = true
  }

  if (vistoDiaPrimero && !vistoMesPrimero) return "dmy"
  if (vistoMesPrimero && !vistoDiaPrimero) return "mdy"
  return "dmy"
}

function parsearFecha(
  valor: string,
  formato: FormatoFecha,
): [number, number, number] | null {
  const limpio = valor?.trim()
  if (!limpio) return null

  const iso = limpio.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return [Number(iso[1]), Number(iso[2]), Number(iso[3])]

  const partes = limpio.split(SEPARADORES).map((p) => p.trim())
  if (partes.length < 3) return null

  const [p1, p2, p3] = partes.map(Number)
  if ([p1, p2, p3].some((n) => !Number.isFinite(n))) return null

  const anio = p3 < 100 ? 2000 + p3 : p3
  const [dia, mes] = formato === "mdy" ? [p2, p1] : [p1, p2]
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null

  return [anio, mes, dia]
}

/** "09:30", "09:30:15", "9:30 AM", "09:30 p. m." */
function parsearHora(valor: string): [number, number, number] | null {
  const limpio = normalizar(valor ?? "").replace(/\./g, "")
  if (!limpio) return null

  const trozos = limpio.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!trozos) return null

  let horas = Number(trozos[1])
  const minutos = Number(trozos[2])
  const segundos = Number(trozos[3] ?? 0)
  const sufijo = trozos[4]

  if (sufijo === "pm" && horas < 12) horas += 12
  if (sufijo === "am" && horas === 12) horas = 0
  if (horas > 23 || minutos > 59 || segundos > 59) return null

  return [horas, minutos, segundos]
}

/** "01:23:45" o "1,5" -> segundos */
export function parsearDuracion(texto: string): number | null {
  const limpio = (texto ?? "").trim()
  if (!limpio) return null

  const reloj = limpio.match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/)
  if (reloj) {
    return (
      Number(reloj[1]) * 3600 + Number(reloj[2]) * 60 + Number(reloj[3] ?? 0)
    )
  }

  const decimal = Number(limpio.replace(",", "."))
  if (Number.isFinite(decimal)) return Math.round(decimal * 3600)

  return null
}

function aIso(
  fecha: [number, number, number],
  hora: [number, number, number],
): string {
  const [y, m, d] = fecha
  const [hh, mm, ss] = hora
  return new Date(y, m - 1, d, hh, mm, ss, 0).toISOString()
}

/* ------------------------------------------------------------------ análisis */

function esSi(valor: string): boolean {
  const limpio = normalizar(valor ?? "")
  return ["yes", "si", "true", "1", "y"].includes(limpio)
}

/**
 * Identificador estable de cada entrada para poder reimportar el mismo informe
 * sin duplicar: Clockify no exporta el id de la entrada, así que se construye
 * con la persona y el intervalo exacto, que no se repite.
 */
export function claveExterna(quien: string, inicio: string, fin: string): string {
  return `${quien.toLowerCase()}|${inicio}|${fin}`
}

export function analizarCsv(texto: string, forzarFormato?: FormatoFecha): Analisis {
  const resultado = Papa.parse<Record<string, string>>(texto, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  })

  const registros = resultado.data ?? []
  const cabeceras = resultado.meta?.fields ?? []
  const mapa = mapearCabeceras(cabeceras)

  const obligatorias: Campo[] = ["fechaInicio", "horaInicio"]
  const cabecerasFaltan = obligatorias
    .filter((c) => !mapa[c])
    .map((c) => CAMPOS[c][0])

  if (cabecerasFaltan.length > 0) {
    return { filas: [], descartadas: [], formato: "dmy", cabecerasFaltan }
  }

  const valor = (registro: Record<string, string>, campo: Campo) => {
    const clave = mapa[campo]
    return clave ? (registro[clave] ?? "").trim() : ""
  }

  const formato =
    forzarFormato ??
    detectarFormato(registros.map((r) => valor(r, "fechaInicio")))

  const filas: FilaClockify[] = []
  const descartadas: { fila: number; motivo: string }[] = []

  registros.forEach((registro, indice) => {
    const numero = indice + 2 // +1 por la cabecera, +1 para contar desde uno

    const fechaInicio = parsearFecha(valor(registro, "fechaInicio"), formato)
    const horaInicio = parsearHora(valor(registro, "horaInicio"))
    if (!fechaInicio || !horaInicio) {
      descartadas.push({ fila: numero, motivo: "Fecha u hora de inicio ilegible" })
      return
    }

    const inicio = aIso(fechaInicio, horaInicio)

    // El fin puede venir en columnas propias o deducirse de la duración
    const fechaFin = parsearFecha(valor(registro, "fechaFin"), formato)
    const horaFin = parsearHora(valor(registro, "horaFin"))
    const duracion =
      parsearDuracion(valor(registro, "duracion")) ??
      parsearDuracion(valor(registro, "duracionDecimal"))

    let fin: string
    if (fechaFin && horaFin) {
      fin = aIso(fechaFin, horaFin)
    } else if (duracion !== null && duracion > 0) {
      fin = new Date(new Date(inicio).getTime() + duracion * 1000).toISOString()
    } else {
      descartadas.push({ fila: numero, motivo: "Sin hora de fin ni duración" })
      return
    }

    let segundos = Math.round(
      (new Date(fin).getTime() - new Date(inicio).getTime()) / 1000,
    )

    // Una entrada que cruza la medianoche sin columna de fecha de fin sale negativa
    if (segundos < 0) {
      fin = new Date(new Date(fin).getTime() + 86400000).toISOString()
      segundos += 86400
    }
    if (segundos <= 0) {
      descartadas.push({ fila: numero, motivo: "Duración cero o negativa" })
      return
    }

    const email = valor(registro, "email").toLowerCase()
    const usuario = valor(registro, "usuario")

    filas.push({
      fila: numero,
      usuario,
      email,
      cliente: valor(registro, "cliente"),
      proyecto: valor(registro, "proyecto"),
      tarea: valor(registro, "tarea"),
      descripcion: valor(registro, "descripcion"),
      etiquetas: valor(registro, "etiquetas")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      facturable: esSi(valor(registro, "facturable")),
      inicio,
      fin,
      segundos,
      clave: claveExterna(email || usuario || "?", inicio, fin),
    })
  })

  return { filas, descartadas, formato, cabecerasFaltan: [] }
}

/** Las personas distintas que aparecen en el informe, con su email si lo trae. */
export function personasDe(filas: FilaClockify[]) {
  const mapa = new Map<string, { clave: string; nombre: string; email: string; filas: number }>()
  for (const fila of filas) {
    const clave = (fila.email || fila.usuario || "?").toLowerCase()
    const previo = mapa.get(clave)
    if (previo) previo.filas += 1
    else
      mapa.set(clave, {
        clave,
        nombre: fila.usuario || fila.email || "Sin nombre",
        email: fila.email,
        filas: 1,
      })
  }
  return [...mapa.values()].sort((a, b) => b.filas - a.filas)
}

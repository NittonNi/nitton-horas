/**
 * Como se reparte entre las personas la facturacion ya calculada por
 * `rates`/`amount` -esto no decide cuanto se factura, solo como se enseña
 * repartido en Estadisticas. Se calcula siempre sobre las entradas ya
 * filtradas por el periodo que se esta mirando: es "de esto, quien se lleva
 * que", no un historico aparte.
 */

import type { EntradaVista, Miembro, Reparto, RepartoShare } from "@/lib/tipos"

/** Edicion exacta gana, luego proyecto (edicion nula), luego el espacio entero. */
export function resolverReparto(
  repartos: Reparto[],
  projectId: string | null,
  editionId: string | null,
): Reparto | null {
  if (editionId) {
    const porEdicion = repartos.find((r) => r.edition_id === editionId)
    if (porEdicion) return porEdicion
  }
  if (projectId) {
    const porProyecto = repartos.find(
      (r) => r.project_id === projectId && !r.edition_id,
    )
    if (porProyecto) return porProyecto
  }
  return repartos.find((r) => !r.project_id && !r.edition_id) ?? null
}

/**
 * Dinero atribuido a cada persona, sumado entre todos los proyectos/ediciones
 * presentes en `entradas`. Sin reparto configurado para un ambito, se
 * comporta como hoy: cada uno se lleva lo que generaron sus propias horas a
 * su propia tarifa (mismo resultado que el modo "horas").
 */
export function calcularAtribucion(
  entradas: EntradaVista[],
  repartos: Reparto[],
  shares: RepartoShare[],
  miembros: Miembro[],
): Map<string, number> {
  const atribuido = new Map<string, number>()
  const sumar = (userId: string, importe: number) =>
    atribuido.set(userId, (atribuido.get(userId) ?? 0) + importe)

  const grupos = new Map<string, EntradaVista[]>()
  for (const e of entradas) {
    if (!e.billable || !e.amount) continue
    const clave = `${e.project_id ?? "-"}|${e.edition_id ?? "-"}`
    const lista = grupos.get(clave)
    if (lista) lista.push(e)
    else grupos.set(clave, [e])
  }

  for (const grupo of grupos.values()) {
    const total = grupo.reduce((s, e) => s + Number(e.amount ?? 0), 0)
    if (total <= 0) continue

    const reparto = resolverReparto(
      repartos,
      grupo[0].project_id,
      grupo[0].edition_id,
    )
    const modo = reparto?.mode ?? "horas"

    if (modo === "porcentajes" && reparto) {
      const partes = shares.filter((s) => s.split_id === reparto.id)
      for (const parte of partes) sumar(parte.user_id, total * (parte.percent / 100))
      continue
    }

    if (modo === "equipo") {
      const activos = miembros.filter((m) => m.active)
      if (activos.length === 0) continue
      for (const m of activos) sumar(m.id, total / activos.length)
      continue
    }

    // "horas" (o sin reparto configurado) y "equitativo" reparten entre quien
    // ha metido horas facturables en este grupo; solo cambia el criterio.
    const horasPorPersona = new Map<string, number>()
    const importePorPersona = new Map<string, number>()
    for (const e of grupo) {
      horasPorPersona.set(
        e.user_id,
        (horasPorPersona.get(e.user_id) ?? 0) + (e.duration_seconds ?? 0),
      )
      importePorPersona.set(
        e.user_id,
        (importePorPersona.get(e.user_id) ?? 0) + Number(e.amount ?? 0),
      )
    }
    const participantes = [...horasPorPersona.keys()]
    if (participantes.length === 0) continue

    if (modo === "equitativo") {
      for (const userId of participantes) sumar(userId, total / participantes.length)
      continue
    }

    // "horas" por defecto: cada persona se lleva su propio importe, no una
    // proporcion de `total` sobre horas en bruto. Repartir por horas en
    // bruto solo da el mismo resultado que "lo que cada uno genero" cuando
    // todos cobran la misma tarifa; en cuanto hay tarifas distintas por
    // persona (`rates.user_id`), transfiere dinero de quien cobra mas caro a
    // quien cobra mas barato. `total` es la suma de los `amount` de este
    // grupo y cada `amount` ya viene calculado a la tarifa propia de quien
    // apunto la hora, asi que atribuir el `amount` de cada uno cuadra exacto
    // con `total`, sin prorratear nada.
    for (const userId of participantes) {
      sumar(userId, importePorPersona.get(userId) ?? 0)
    }
  }

  return atribuido
}

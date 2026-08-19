"use client"

import { useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { agrupar, totales } from "@/lib/informes"
import { formatDurationShort, formatMoney } from "@/lib/time"
import { resumenDeResultados, type Resultado } from "@/components/resultados-proyecto"
import type { Edicion, EntradaVista } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/**
 * El resumen del proyecto.
 *
 * En LEINN la pregunta no es cuántas horas llevas: es a cuánto te ha salido la
 * hora. Por eso manda la aguja de facturación por hora contra el objetivo del
 * equipo, y todo lo demás -el dinero, el ritmo, en qué se va el tiempo- cuelga
 * de ahí.
 */
export function ResumenProyecto({
  entradas,
  resultados,
  ediciones,
  objetivoHora,
  color,
  puedeVerImportes,
}: {
  /** Solo las cerradas: las que están corriendo aún no son horas. */
  entradas: EntradaVista[]
  resultados: Resultado[]
  ediciones: Edicion[]
  objetivoHora: number | null
  /** El del proyecto: las barras van de su color. */
  color: string
  puedeVerImportes: boolean
}) {
  const suma = useMemo(() => totales(entradas), [entradas])
  const dinero = useMemo(
    () => resumenDeResultados(entradas, resultados),
    [entradas, resultados],
  )

  const porTarea = useMemo(
    () =>
      agrupar(
        entradas,
        (e) => e.task_id ?? "sin",
        (e) => e.task_name ?? "Sin tarea",
      ),
    [entradas],
  )
  const porPersona = useMemo(
    () => agrupar(entradas, (e) => e.user_id, (e) => e.user_name),
    [entradas],
  )
  const porEdicion = useMemo(
    () =>
      agrupar(
        entradas,
        (e) => e.edition_id ?? "sin",
        (e) => e.edition_name ?? "Sin edición",
      ),
    [entradas],
  )

  const periodos = useMemo(() => porPeriodo(entradas), [entradas])

  /* Cuánto se trabaja de media a la semana: dice más del proyecto que el total,
     que solo crece. */
  const ritmo = useMemo(() => {
    if (entradas.length === 0) return null
    const dias = entradas.map((e) => e.local_date).sort()
    const desde = new Date(dias[0])
    const hasta = new Date(dias[dias.length - 1])
    const semanas = Math.max(
      1,
      (hasta.getTime() - desde.getTime()) / (7 * 24 * 3600 * 1000),
    )
    return suma.segundos / semanas
  }, [entradas, suma.segundos])

  const hayDinero = puedeVerImportes && resultados.length > 0
  const conCuentas = hayDinero && dinero.porHora !== null

  if (entradas.length === 0 && !hayDinero) {
    return (
      <section className="card px-6 py-14 text-center">
        <p className="text-sm font-medium">Aquí todavía no hay nada que resumir</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          En cuanto se apunten horas contra este proyecto, aquí saldrá a cuánto
          está saliendo la hora, en qué se va el tiempo y quién lo está poniendo.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------- el dinero */}
      {hayDinero && (
        <section className="card overflow-hidden">
          <div className="grid grid-cols-1 divide-y divide-line lg:grid-cols-[auto_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
            <div className="flex items-center justify-center p-5">
              {dinero.porHora === null ? (
                <SinAguja faltanHoras={dinero.faltanHoras} />
              ) : (
                <Aguja valor={dinero.porHora} objetivo={objetivoHora} />
              )}
            </div>

            <div className="min-w-0 p-5">
              <h2 className="text-sm font-semibold">
                Lo que ha dejado y lo que ha costado
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {conCuentas
                  ? `Cada hora que se cobra de este proyecto sale a ${dinero.porHora!.toLocaleString(
                      "es-ES",
                      { maximumFractionDigits: 2 },
                    )} €.`
                  : "Marca con el euro las horas que se han hecho para ganar este dinero y aquí saldrá a cuánto sale la hora."}
              </p>

              <div className="mt-4 space-y-3">
                <Linea
                  etiqueta="Ingresos"
                  valor={dinero.ingresos}
                  parte={
                    dinero.ingresos + dinero.gastos > 0
                      ? dinero.ingresos / Math.max(dinero.ingresos, dinero.gastos)
                      : 0
                  }
                  tono="ingreso"
                />
                <Linea
                  etiqueta="Gastos"
                  valor={dinero.gastos}
                  parte={
                    dinero.ingresos + dinero.gastos > 0
                      ? dinero.gastos / Math.max(dinero.ingresos, dinero.gastos)
                      : 0
                  }
                  tono="gasto"
                />
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-t border-line pt-3">
                <div>
                  <p
                    className={cn(
                      "cifra text-2xl font-semibold leading-none",
                      dinero.neto < 0 ? "text-danger" : "text-billable",
                    )}
                  >
                    {formatMoney(dinero.neto)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {dinero.neto < 0 ? "de pérdida" : "queda después de gastos"}
                  </p>
                </div>
                <div>
                  <p className="cifra text-2xl font-semibold leading-none">
                    {formatDurationShort(dinero.segundos)}
                  </p>
                  <p className="mt-1 text-xs text-muted">horas que se cobran</p>
                </div>
                {resultados.length > 1 && (
                  <div>
                    <p className="cifra text-2xl font-semibold leading-none">
                      {resultados.length}
                    </p>
                    <p className="mt-1 text-xs text-muted">cierres apuntados</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- el ritmo */}
      <section className="card p-4">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <h2 className="text-sm font-semibold">Cuándo se ha trabajado</h2>
            <p className="mt-0.5 text-sm text-muted">
              {periodos.unidad === "dia"
                ? "Día a día."
                : periodos.unidad === "semana"
                  ? "Semana a semana."
                  : "Mes a mes."}{" "}
              En verde, las horas que se cobran.
            </p>
          </div>
          <div className="flex items-end gap-5">
            {ritmo !== null && (
              <Mini
                etiqueta="de media a la semana"
                valor={formatDurationShort(ritmo)}
              />
            )}
            <Mini
              etiqueta={suma.entradas === 1 ? "apunte" : "apuntes"}
              valor={String(suma.entradas)}
            />
            <Mini
              etiqueta="se cobran"
              valor={
                suma.segundos > 0
                  ? `${Math.round((suma.facturables / suma.segundos) * 100)}%`
                  : "0%"
              }
              tono={suma.facturables > 0 ? "billable" : undefined}
            />
          </div>
        </div>

        {periodos.filas.length === 0 ? (
          <p className="py-3 text-sm text-muted">Todavía no hay horas apuntadas.</p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={periodos.filas}
                margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  vertical={false}
                  stroke="var(--line)"
                />
                <XAxis
                  dataKey="etiqueta"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--radio-sm)",
                    fontSize: 12,
                    color: "var(--ink)",
                  }}
                  formatter={(valor, nombre) => [
                    `${Number(valor ?? 0).toLocaleString("es-ES", {
                      maximumFractionDigits: 2,
                    })} h`,
                    nombre === "cobrables" ? "Se cobran" : "No se cobran",
                  ]}
                />
                <Bar
                  dataKey="cobrables"
                  stackId="h"
                  fill="var(--billable-fill)"
                  radius={[0, 0, 3, 3]}
                  maxBarSize={56}
                />
                <Bar
                  dataKey="resto"
                  stackId="h"
                  fill="var(--accent)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={56}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- el reparto */}
      <div
        className={cn(
          "grid grid-cols-1 gap-5",
          ediciones.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-2",
        )}
      >
        <Reparto
          titulo="En qué se va"
          pie="Por tarea"
          grupos={porTarea}
          total={suma.segundos}
          color={color}
          vacio="Las horas de este proyecto no están repartidas en tareas."
        />
        <Reparto
          titulo="Quién lo pone"
          pie="Por persona"
          grupos={porPersona}
          total={suma.segundos}
          color={color}
          vacio="Todavía no hay horas apuntadas."
        />
        {ediciones.length > 0 && (
          <Reparto
            titulo="Cada edición"
            pie="Por edición"
            grupos={porEdicion}
            total={suma.segundos}
            color={color}
            vacio="Las horas no están repartidas en ediciones."
          />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- aguja */

/** El hueco de la aguja cuando todavia no hay horas con las que repartir. */
function SinAguja({ faltanHoras }: { faltanHoras: boolean }) {
  return (
    <div className="w-[13rem] shrink-0 px-2 py-6 text-center">
      <p className="cifra text-3xl font-semibold leading-none text-muted">
        &mdash;&nbsp;&euro;/h
      </p>
      <p className="mx-auto mt-3 max-w-[11rem] text-xs leading-relaxed text-muted">
        {faltanHoras
          ? "Hay dinero apuntado, pero casi ninguna hora lleva el euro: no hay entre qué repartirlo."
          : "En cuanto haya horas marcadas con el euro, aquí sale a cuánto está saliendo la hora."}
      </p>
    </div>
  )
}

/**
 * La facturación por hora, en una aguja de medio círculo. El objetivo del
 * equipo es una marca en el arco: se ve de un vistazo si te has quedado corto
 * o si lo has pasado, que es justo lo que se quiere saber.
 */
function Aguja({
  valor,
  objetivo,
}: {
  valor: number | null
  objetivo: number | null
}) {
  const meta = objetivo && objetivo > 0 ? objetivo : null
  const real = valor ?? 0

  // El arco llega un poco más allá del objetivo: pasarse tiene que verse.
  const tope = Math.max(meta ? meta * 1.5 : 0, real * 1.15, 1)
  const parte = Math.min(1, real / tope)

  const r = 76
  const cx = 100
  const cy = 96
  const largo = Math.PI * r

  const llega = meta === null ? null : real >= meta
  const cerca = meta !== null && real >= meta * 0.75
  const trazo =
    llega === null
      ? "var(--accent)"
      : llega
        ? "var(--billable-fill)"
        : cerca
          ? "var(--live-fill)"
          : "var(--danger)"

  /** Dónde cae el objetivo en el arco, para clavar la marca. */
  const marca = meta === null ? null : Math.min(1, meta / tope)
  const angulo = marca === null ? 0 : Math.PI * (1 - marca)
  const mx = cx + Math.cos(angulo) * r
  const my = cy - Math.sin(angulo) * r

  return (
    <div className="w-[13rem] shrink-0">
      <svg viewBox="0 0 200 116" className="w-full">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          className="stroke-surface-2"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          strokeWidth="13"
          strokeLinecap="round"
          stroke={trazo}
          strokeDasharray={`${largo * parte} ${largo}`}
          style={{ transition: "stroke-dasharray .4s ease" }}
        />
        {marca !== null && (
          <g>
            <line
              x1={cx + Math.cos(angulo) * (r - 10)}
              y1={cy - Math.sin(angulo) * (r - 10)}
              x2={cx + Math.cos(angulo) * (r + 10)}
              y2={cy - Math.sin(angulo) * (r + 10)}
              strokeWidth="2.5"
              strokeLinecap="round"
              className="stroke-ink"
            />
            <circle cx={mx} cy={my} r="0" />
          </g>
        )}
      </svg>

      <div className="-mt-12 text-center">
        <p
          className={cn(
            "cifra text-3xl font-semibold leading-none",
            llega === true && "text-billable",
            llega === false && (cerca ? "text-running" : "text-danger"),
          )}
        >
          {real.toLocaleString("es-ES", { maximumFractionDigits: 0 })}
          <span className="ml-0.5 text-base font-medium">€/h</span>
        </p>
        <p className="mt-2 text-xs text-muted">
          {meta === null
            ? "sin objetivo puesto"
            : llega
              ? `por encima de los ${meta} €/h`
              : `el equipo va a ${meta} €/h`}
        </p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ piezas */

/** Una línea de dinero con su barra: verde lo que entra, rojo lo que sale. */
function Linea({
  etiqueta,
  valor,
  parte,
  tono,
}: {
  etiqueta: string
  valor: number
  parte: number
  tono: "ingreso" | "gasto"
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">{etiqueta}</span>
        <span
          className={cn(
            "cifra font-medium",
            tono === "ingreso" ? "text-billable" : "text-danger",
          )}
        >
          {tono === "gasto" && valor > 0 && "− "}
          {formatMoney(valor)}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tono === "ingreso" ? "bg-billable-fill" : "bg-danger",
          )}
          style={{ width: `${Math.max(0, Math.min(100, parte * 100))}%` }}
        />
      </div>
    </div>
  )
}

/** Un número pequeño de los que acompañan a un título. */
function Mini({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string
  valor: string
  tono?: "billable"
}) {
  return (
    <div className="min-w-0">
      <p
        className={cn(
          "cifra whitespace-nowrap text-base font-semibold leading-none",
          tono === "billable" && "text-billable",
        )}
      >
        {valor}
      </p>
      <p className="mt-1 whitespace-nowrap text-xs text-muted">{etiqueta}</p>
    </div>
  )
}

/** Un reparto de horas en barras, del color del proyecto. */
function Reparto({
  titulo,
  pie,
  grupos,
  total,
  color,
  vacio,
}: {
  titulo: string
  pie: string
  grupos: ReturnType<typeof agrupar>
  total: number
  color: string
  vacio: string
}) {
  const visibles = grupos.slice(0, 8)
  const resto = grupos.slice(8)
  const sobran = resto.reduce((s, g) => s + g.segundos, 0)

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <span className="text-xs text-muted">{pie}</span>
      </div>

      {grupos.length === 0 ? (
        <p className="py-2 text-sm text-muted">{vacio}</p>
      ) : (
        <ul className="space-y-2.5">
          {visibles.map((grupo, i) => {
            const porcentaje = total > 0 ? (grupo.segundos / total) * 100 : 0
            return (
              <li key={grupo.clave}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{grupo.etiqueta}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {Math.round(porcentaje)}%
                  </span>
                  <span className="cifra shrink-0 font-medium">
                    {formatDurationShort(grupo.segundos)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  {/* El primero a plomo y los siguientes cada vez más claros:
                      el orden se lee sin mirar los números. */}
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${porcentaje}%`,
                      background: color,
                      opacity: Math.max(0.35, 1 - i * 0.11),
                    }}
                  />
                </div>
              </li>
            )
          })}
          {resto.length > 0 && (
            <li className="pt-1 text-xs text-muted">
              y {resto.length} más, {formatDurationShort(sobran)}
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ series */

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

/**
 * Las horas repartidas en el tiempo. La unidad se elige sola según lo que dure
 * el proyecto: un evento de dos semanas se mira por días y uno de dos años por
 * meses.
 */
function porPeriodo(entradas: EntradaVista[]) {
  const filas: { clave: string; etiqueta: string; cobrables: number; resto: number }[] =
    []
  if (entradas.length === 0) return { unidad: "mes" as const, filas }

  const dias = entradas.map((e) => e.local_date).sort()
  const desde = new Date(dias[0])
  const hasta = new Date(dias[dias.length - 1])
  const span = (hasta.getTime() - desde.getTime()) / (24 * 3600 * 1000)

  const unidad = span <= 21 ? "dia" : span <= 120 ? "semana" : "mes"

  const mapa = new Map<string, { etiqueta: string; cobrables: number; resto: number }>()
  for (const entrada of entradas) {
    const fecha = new Date(entrada.local_date)
    let clave: string
    let etiqueta: string

    if (unidad === "dia") {
      clave = entrada.local_date
      etiqueta = `${fecha.getDate()} ${MESES[fecha.getMonth()]}`
    } else if (unidad === "semana") {
      // El lunes de esa semana
      const lunes = new Date(fecha)
      lunes.setDate(fecha.getDate() - ((fecha.getDay() + 6) % 7))
      clave = lunes.toISOString().slice(0, 10)
      etiqueta = `${lunes.getDate()} ${MESES[lunes.getMonth()]}`
    } else {
      clave = entrada.local_date.slice(0, 7)
      etiqueta = `${MESES[fecha.getMonth()]} ${String(fecha.getFullYear()).slice(2)}`
    }

    if (!mapa.has(clave)) mapa.set(clave, { etiqueta, cobrables: 0, resto: 0 })
    const fila = mapa.get(clave)!
    const horas = (entrada.duration_seconds ?? 0) / 3600
    if (entrada.billable) fila.cobrables += horas
    else fila.resto += horas
  }

  for (const [clave, fila] of [...mapa.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    filas.push({
      clave,
      etiqueta: fila.etiqueta,
      cobrables: Number(fila.cobrables.toFixed(2)),
      resto: Number(fila.resto.toFixed(2)),
    })
  }

  return { unidad, filas }
}

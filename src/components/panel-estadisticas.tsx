"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { agrupar, totales } from "@/lib/informes"
import { SIN_CATEGORIA } from "@/lib/categorias"
import { formatDurationShort, formatMoney } from "@/lib/time"
import type { Catalogo, EntradaVista, Miembro } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/**
 * Los informes responden "que horas hay". Esto responde "como vamos": si el
 * mes va mejor o peor que el anterior, en que se va el tiempo del equipo y que
 * proyectos se estan comiendo su presupuesto.
 */
export function PanelEstadisticas({
  entradas,
  catalogo,
  miembros,
  perfilId,
  puedeVerImportes,
  meses,
}: {
  entradas: EntradaVista[]
  catalogo: Catalogo
  miembros: Miembro[]
  perfilId: string
  puedeVerImportes: boolean
  /** Claves "2026-08" de los ultimos doce meses, la mas vieja primero. */
  meses: string[]
}) {
  const hayEquipo = miembros.length > 1
  const [ambito, setAmbito] = useState<"mias" | "equipo">("mias")

  const cerradas = useMemo(
    () =>
      entradas.filter(
        (e) => e.end_at && (ambito === "equipo" || e.user_id === perfilId),
      ),
    [entradas, ambito, perfilId],
  )

  const suma = useMemo(() => totales(cerradas), [cerradas])

  /** Horas por mes, con las facturables aparte para poder compararlas. */
  const porMes = useMemo(() => {
    const mapa = new Map<string, { horas: number; facturables: number }>()
    for (const mes of meses) mapa.set(mes, { horas: 0, facturables: 0 })
    for (const e of cerradas) {
      const mes = e.local_date.slice(0, 7)
      const dato = mapa.get(mes)
      if (!dato) continue
      const horas = (e.duration_seconds ?? 0) / 3600
      dato.horas += horas
      if (e.billable) dato.facturables += horas
    }
    return [...mapa.entries()].map(([mes, dato]) => ({
      mes,
      etiqueta: new Date(mes + "-01T00:00:00").toLocaleDateString("es-ES", {
        month: "short",
      }),
      horas: Math.round(dato.horas * 100) / 100,
      facturables: Math.round(dato.facturables * 100) / 100,
    }))
  }, [cerradas, meses])

  const esteMes = porMes[porMes.length - 1]?.horas ?? 0
  const mesPasado = porMes[porMes.length - 2]?.horas ?? 0
  const diferencia = esteMes - mesPasado

  const porCategoria = useMemo(
    () =>
      agrupar(
        cerradas,
        (e) => e.category_id ?? "sin",
        (e) =>
          e.category_name
            ? e.subcategory_name
              ? e.category_name + " / " + e.subcategory_name
              : e.category_name
            : SIN_CATEGORIA,
      ),
    [cerradas],
  )

  const porPersona = useMemo(
    () => agrupar(cerradas, (e) => e.user_id, (e) => e.user_name),
    [cerradas],
  )

  /** Proyectos con presupuesto: cuanto llevan comido. */
  const presupuestos = useMemo(() => {
    return catalogo.proyectos
      .filter((p) => !p.archived && p.budget_hours)
      .map((p) => {
        const segundos = cerradas
          .filter((e) => e.project_id === p.id)
          .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
        const presupuesto = Number(p.budget_hours)
        return {
          id: p.id,
          nombre: p.name,
          color: p.color,
          horas: segundos / 3600,
          presupuesto,
          consumido: presupuesto > 0 ? (segundos / 3600 / presupuesto) * 100 : 0,
        }
      })
      .sort((a, b) => b.consumido - a.consumido)
  }, [catalogo.proyectos, cerradas])

  const semanasConHoras =
    new Set(cerradas.map((e) => e.local_date.slice(0, 4) + e.local_date.slice(5, 7))).size
  const mediaMensual = semanasConHoras > 0 ? suma.segundos / semanasConHoras : 0

  return (
    <div className="space-y-5">
      {hayEquipo && (
        <div className="flex rounded-[var(--radio-sm)] border border-line bg-surface-2 p-0.5 text-sm sm:w-64">
          {(["mias", "equipo"] as const).map((cual) => (
            <button
              key={cual}
              type="button"
              onClick={() => setAmbito(cual)}
              aria-pressed={ambito === cual}
              className={cn(
                "flex-1 rounded-[var(--radio-sm)] px-3 py-1.5 font-medium transition",
                ambito === cual
                  ? "bg-surface shadow-sm"
                  : "text-muted hover:text-ink",
              )}
            >
              {cual === "mias" ? "Mis horas" : "Todo el equipo"}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta
          etiqueta="En doce meses"
          valor={formatDurationShort(suma.segundos)}
          pie={suma.entradas + (suma.entradas === 1 ? " hora apuntada" : " horas apuntadas")}
        />
        <Tarjeta
          etiqueta="Este mes"
          valor={formatDurationShort(esteMes * 3600)}
          pie={
            mesPasado === 0
              ? "sin mes anterior con el que comparar"
              : diferencia >= 0
                ? "+" + Math.round(diferencia) + " h respecto al mes pasado"
                : Math.round(diferencia) + " h respecto al mes pasado"
          }
          acento={diferencia >= 0}
        />
        <Tarjeta
          etiqueta="Media al mes"
          valor={formatDurationShort(mediaMensual)}
          pie={semanasConHoras + (semanasConHoras === 1 ? " mes con horas" : " meses con horas")}
        />
        {puedeVerImportes ? (
          <Tarjeta
            etiqueta="Facturado"
            valor={formatMoney(suma.importe)}
            pie={
              suma.segundos > 0
                ? Math.round((suma.facturables / suma.segundos) * 100) +
                  "% del tiempo se cobra"
                : "sin horas todavía"
            }
          />
        ) : (
          <Tarjeta
            etiqueta="Facturable"
            valor={formatDurationShort(suma.facturables)}
            pie={
              suma.segundos > 0
                ? Math.round((suma.facturables / suma.segundos) * 100) + "% del tiempo"
                : "sin horas todavía"
            }
          />
        )}
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-semibold">Mes a mes</h2>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Los últimos doce meses. En verde, lo que se cobra.
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porMes} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
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
                  fontSize: "0.8rem",
                  color: "var(--ink)",
                }}
                formatter={(valor, nombre) => [
                  Number(valor ?? 0).toLocaleString("es-ES") + " h",
                  nombre === "facturables" ? "Facturables" : "Horas",
                ]}
              />
              <Legend
                formatter={(nombre) =>
                  nombre === "facturables" ? "Facturables" : "Horas"
                }
                wrapperStyle={{ fontSize: "0.75rem", color: "var(--muted)" }}
              />
              <Bar dataKey="horas" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="facturables" fill="var(--billable)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Reparto
          titulo="En qué se va el tiempo"
          vacio="Cuando los proyectos cuelguen de una rama, aquí se verá el reparto."
          grupos={porCategoria}
          total={suma.segundos}
        />
        {ambito === "equipo" ? (
          <Reparto
            titulo="Quién apunta"
            vacio="Todavía no hay horas del equipo."
            grupos={porPersona}
            total={suma.segundos}
          />
        ) : (
          <section className="card p-4">
            <h2 className="text-sm font-semibold">Presupuestos</h2>
            <p className="mb-3 mt-0.5 text-xs text-muted">
              Proyectos con horas presupuestadas, por lo que llevan comido.
            </p>
            <Presupuestos lista={presupuestos} />
          </section>
        )}
      </div>

      {ambito === "equipo" && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Presupuestos</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted">
            Proyectos con horas presupuestadas, por lo que llevan comido.
          </p>
          <Presupuestos lista={presupuestos} />
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ piezas */

function Tarjeta({
  etiqueta,
  valor,
  pie,
  acento = false,
}: {
  etiqueta: string
  valor: string
  pie: string
  acento?: boolean
}) {
  return (
    <div className="card px-4 py-3">
      <p className="rotulo">{etiqueta}</p>
      <p className="mt-1.5">
        <span
          className={cn(
            "caja-horas caja-horas-grande text-xl font-semibold tracking-tight",
            acento && "border-billable-line bg-billable-soft text-billable",
          )}
        >
          {valor}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-muted">{pie}</p>
    </div>
  )
}

function Reparto({
  titulo,
  vacio,
  grupos,
  total,
}: {
  titulo: string
  vacio: string
  grupos: ReturnType<typeof agrupar>
  total: number
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      {grupos.length === 0 ? (
        <p className="py-2 text-sm text-muted">{vacio}</p>
      ) : (
        <ul className="space-y-2.5">
          {grupos.slice(0, 8).map((grupo) => {
            const porcentaje = total > 0 ? (grupo.segundos / total) * 100 : 0
            return (
              <li key={grupo.clave}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{grupo.etiqueta}</span>
                  <span className="cifra shrink-0 text-ink-soft">
                    {formatDurationShort(grupo.segundos)}
                    <span className="ml-1.5 text-xs text-muted">
                      {Math.round(porcentaje)}%
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: porcentaje + "%" }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Presupuestos({
  lista,
}: {
  lista: {
    id: string
    nombre: string
    color: string
    horas: number
    presupuesto: number
    consumido: number
  }[]
}) {
  if (lista.length === 0) {
    return (
      <p className="py-2 text-sm text-muted">
        Ningún proyecto tiene horas presupuestadas. Se ponen en la ficha del
        proyecto y sirven para ver cuánto queda.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {lista.slice(0, 8).map((p) => (
        <li key={p.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: p.color }}
              />
              <span className="truncate">{p.nombre}</span>
            </span>
            <span className="cifra shrink-0 text-ink-soft">
              {Math.round(p.horas)} / {p.presupuesto} h
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn(
                "h-full rounded-full",
                p.consumido > 100 && "bg-danger",
              )}
              style={{
                width: Math.min(100, p.consumido) + "%",
                background: p.consumido > 100 ? undefined : p.color,
              }}
            />
          </div>
          {p.consumido > 100 && (
            <p className="mt-1 text-xs text-danger">
              Se ha pasado {Math.round(p.horas - p.presupuesto)} h.
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

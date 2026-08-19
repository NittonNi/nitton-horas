"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Maximize2, Minimize2, TrendingDown, TrendingUp } from "lucide-react"

import { agrupar, totales } from "@/lib/informes"
import { SIN_CATEGORIA } from "@/lib/categorias"
import {
  anterior,
  DIAS,
  dentro,
  diasDe,
  franjaViva,
  mapaDeCalor,
  serie,
  unidadPara,
  type Rango,
} from "@/lib/estadisticas"
import {
  addDays,
  formatDurationShort,
  formatMoney,
  toDateKey,
  todayKey,
} from "@/lib/time"
import { FiltroMultiple } from "@/components/filtro-multiple"
import {
  filtrarHoras,
  FiltrosDeHoras,
  hayFiltros,
  SIN_FILTROS,
  type Filtros,
} from "@/components/filtros-horas"
import type { Catalogo, EntradaVista, Miembro } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/**
 * Los informes responden «qué horas hay». Esto responde «cómo vamos», y está
 * hecho para mirarlo en grupo: se acota el periodo, se compara con el anterior
 * y cada corte -por área, por persona, por proyecto- tiene su forma de verse.
 *
 * Nada de esto se corrige aquí. Para arreglar una hora están los informes.
 */

type Preset = { clave: string; etiqueta: string; rango: () => Rango }

function mesDe(fecha: Date): Rango {
  const primero = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
  const ultimo = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
  return { desde: toDateKey(primero), hasta: toDateKey(ultimo) }
}

const PRESETS: Preset[] = [
  {
    clave: "mes",
    etiqueta: "Este mes",
    rango: () => ({ ...mesDe(new Date()), hasta: todayKey() }),
  },
  {
    clave: "pasado",
    etiqueta: "Mes pasado",
    rango: () => {
      const hoy = new Date()
      return mesDe(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1))
    },
  },
  {
    clave: "90",
    etiqueta: "90 días",
    rango: () => ({
      desde: toDateKey(addDays(new Date(), -89)),
      hasta: todayKey(),
    }),
  },
  {
    clave: "ano",
    etiqueta: "Este año",
    rango: () => ({
      desde: `${new Date().getFullYear()}-01-01`,
      hasta: todayKey(),
    }),
  },
  {
    clave: "12m",
    etiqueta: "12 meses",
    rango: () => {
      const hoy = new Date()
      return {
        desde: toDateKey(new Date(hoy.getFullYear(), hoy.getMonth() - 11, 1)),
        hasta: todayKey(),
      }
    },
  },
]

/**
 * Los colores del donut. No se usa el de cada área a proposito: nacen todas
 * del mismo gris y el grafico salia de un solo color.
 */
const PALETA = [
  "var(--accent)",
  "var(--billable-fill)",
  "var(--live-fill)",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#64748b",
]

export function PanelEstadisticas({
  entradas,
  catalogo,
  miembros,
  perfilId,
  puedeVerImportes,
  objetivoHora,
}: {
  entradas: EntradaVista[]
  catalogo: Catalogo
  miembros: Miembro[]
  perfilId: string
  puedeVerImportes: boolean
  /** Facturación por hora a la que aspira el equipo. */
  objetivoHora: number | null
}) {
  const hayEquipo = miembros.length > 1

  const [preset, setPreset] = useState("12m")
  const [rangoLibre, setRangoLibre] = useState<Rango | null>(null)
  const [ambito, setAmbito] = useState<"mias" | "equipo">(
    hayEquipo ? "equipo" : "mias",
  )
  const [personas, setPersonas] = useState<string[]>([])
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS)
  const [comparar, setComparar] = useState(true)
  const [presentando, setPresentando] = useState(false)

  const rango = useMemo(
    () =>
      rangoLibre ??
      (PRESETS.find((p) => p.clave === preset) ?? PRESETS[4]).rango(),
    [preset, rangoLibre],
  )

  /* -------------------------------------------------------------- filtrar */

  const suyas = useMemo(() => {
    const base = entradas.filter(
      (e) => e.end_at && (ambito === "equipo" || e.user_id === perfilId),
    )
    const porPersona =
      personas.length > 0 ? base.filter((e) => personas.includes(e.user_id)) : base
    return filtrarHoras(porPersona, filtros)
  }, [entradas, ambito, perfilId, personas, filtros])

  const dentroDel = useMemo(
    () => suyas.filter((e) => dentro(e, rango)),
    [suyas, rango],
  )
  const antes = useMemo(() => {
    const previo = anterior(rango)
    return suyas.filter((e) => dentro(e, previo))
  }, [suyas, rango])

  /* --------------------------------------------------------------- cuentas */

  const suma = useMemo(() => totales(dentroDel), [dentroDel])
  const sumaAntes = useMemo(() => totales(antes), [antes])

  const unidad = useMemo(() => unidadPara(rango), [rango])
  const puntos = useMemo(
    () => serie(dentroDel, rango, unidad, comparar ? antes : undefined),
    [dentroDel, rango, unidad, comparar, antes],
  )

  const porArea = useMemo(
    () =>
      agrupar(
        dentroDel,
        (e) => e.category_id ?? "sin",
        (e) => e.category_name ?? SIN_CATEGORIA,
      ),
    [dentroDel],
  )
  const porPersona = useMemo(
    () => agrupar(dentroDel, (e) => e.user_id, (e) => e.user_name),
    [dentroDel],
  )
  const porProyecto = useMemo(
    () =>
      agrupar(
        dentroDel,
        (e) => e.project_id ?? "sin",
        (e) => e.project_name ?? "Sin proyecto",
        (e) => e.project_color,
      ),
    [dentroDel],
  )

  const rejilla = useMemo(() => mapaDeCalor(dentroDel), [dentroDel])
  const franja = useMemo(() => franjaViva(rejilla), [rejilla])
  const techo = useMemo(
    () => Math.max(...rejilla.flat(), 0.1),
    [rejilla],
  )

  const dias = diasDe(rango)
  const conHoras = new Set(dentroDel.map((e) => e.local_date)).size
  const mediaDia = conHoras > 0 ? suma.segundos / conHoras : 0
  const gente = new Set(dentroDel.map((e) => e.user_id)).size

  /* Igual que en el proyecto: con menos de una hora cobrable esto no es un
     dato, es una division. */
  const porHora =
    suma.facturables >= 3600 ? suma.importe / (suma.facturables / 3600) : null

  /* ---------------------------------------------------------- presentacion */

  useEffect(() => {
    function alCambiar() {
      setPresentando(Boolean(document.fullscreenElement))
    }
    document.addEventListener("fullscreenchange", alCambiar)
    return () => document.removeEventListener("fullscreenchange", alCambiar)
  }, [])

  function presentar() {
    if (document.fullscreenElement) void document.exitFullscreen?.()
    else void document.documentElement.requestFullscreen?.()
  }

  return (
    <div
      className={cn(
        "space-y-4",
        presentando && "fixed inset-0 z-50 overflow-y-auto bg-paper p-6",
      )}
    >
      {/* ----------------------------------------------------------- mandos */}
      <div className="no-print space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-[3px] border border-line-strong bg-surface p-0.5 text-sm">
            {PRESETS.map((p) => (
              <button
                key={p.clave}
                type="button"
                onClick={() => {
                  setPreset(p.clave)
                  setRangoLibre(null)
                }}
                aria-pressed={!rangoLibre && preset === p.clave}
                className={cn(
                  "whitespace-nowrap rounded-[2px] px-2.5 py-1 transition",
                  !rangoLibre && preset === p.clave
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-muted hover:text-ink",
                )}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={rango.desde}
              onChange={(e) =>
                e.target.value &&
                setRangoLibre({ desde: e.target.value, hasta: rango.hasta })
              }
              className="field tabular h-[2.125rem] w-36 rounded-[3px] py-0"
              aria-label="Desde"
            />
            <span className="text-muted">-</span>
            <input
              type="date"
              value={rango.hasta}
              onChange={(e) =>
                e.target.value &&
                setRangoLibre({ desde: rango.desde, hasta: e.target.value })
              }
              className="field tabular h-[2.125rem] w-36 rounded-[3px] py-0"
              aria-label="Hasta"
            />
          </div>

          <button
            type="button"
            onClick={presentar}
            className="btn ml-auto h-[2.125rem] rounded-[3px]"
            title="A pantalla completa, para enseñarlo"
          >
            {presentando ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
            {presentando ? "Salir" : "Presentar"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hayEquipo && (
            <div className="flex rounded-[3px] border border-line-strong bg-surface p-0.5 text-sm">
              {(["equipo", "mias"] as const).map((cual) => (
                <button
                  key={cual}
                  type="button"
                  onClick={() => setAmbito(cual)}
                  aria-pressed={ambito === cual}
                  className={cn(
                    "whitespace-nowrap rounded-[2px] px-2.5 py-1 transition",
                    ambito === cual
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {cual === "equipo" ? "Todo el equipo" : "Solo mis horas"}
                </button>
              ))}
            </div>
          )}

          {hayEquipo && ambito === "equipo" && (
            <FiltroMultiple
              etiqueta="Personas"
              todos="Todo el equipo"
              opciones={miembros.map((m) => ({ id: m.id, nombre: m.full_name }))}
              elegidas={personas}
              onChange={setPersonas}
            />
          )}

          <FiltrosDeHoras
            catalogo={catalogo}
            valor={filtros}
            onChange={setFiltros}
          />

          <label className="flex items-center gap-1.5 text-sm text-muted">
            <input
              type="checkbox"
              checked={comparar}
              onChange={(e) => setComparar(e.target.checked)}
              className="h-4 w-4 accent-[color:var(--accent)]"
            />
            Comparar con el periodo anterior
          </label>
        </div>
      </div>

      {/* ------------------------------------------------------------ cifras */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cifra
          etiqueta="Horas"
          valor={formatDurationShort(suma.segundos)}
          antes={sumaAntes.segundos}
          ahora={suma.segundos}
          comparar={comparar}
          pie={`${dias} días · ${conHoras} con horas`}
        />
        <Cifra
          etiqueta="Se cobran"
          valor={formatDurationShort(suma.facturables)}
          antes={sumaAntes.facturables}
          ahora={suma.facturables}
          comparar={comparar}
          tono="billable"
          pie={
            suma.segundos > 0
              ? `${Math.round((suma.facturables / suma.segundos) * 100)}% del total`
              : "sin horas"
          }
        />
        <Cifra
          etiqueta="Media al día"
          valor={formatDurationShort(mediaDia)}
          pie={gente === 1 ? "de quien apunta" : `entre ${gente} personas`}
        />
        {puedeVerImportes ? (
          <Cifra
            etiqueta={porHora !== null ? "Por hora" : "Facturado"}
            valor={
              porHora !== null
                ? `${porHora.toLocaleString("es-ES", { maximumFractionDigits: 0 })} €/h`
                : formatMoney(suma.importe)
            }
            tono={
              porHora === null || objetivoHora === null
                ? undefined
                : porHora >= objetivoHora
                  ? "billable"
                  : "danger"
            }
            pie={
              objetivoHora
                ? `objetivo ${objetivoHora} €/h · ${formatMoney(suma.importe)}`
                : formatMoney(suma.importe)
            }
          />
        ) : (
          <Cifra
            etiqueta="Apuntes"
            valor={String(suma.entradas)}
            antes={sumaAntes.entradas}
            ahora={suma.entradas}
            comparar={comparar}
            pie="ratos apuntados"
          />
        )}
      </div>

      {/* --------------------------------------------------------- evolucion */}
      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Cómo va el ritmo</h2>
            <p className="mt-0.5 text-xs text-muted">
              {unidad === "dia"
                ? "Día a día"
                : unidad === "semana"
                  ? "Semana a semana"
                  : "Mes a mes"}
              . En verde lo que se cobra
              {comparar && ", y la línea es el periodo anterior"}.
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={puntos}
              margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="etiqueta"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--line)" }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={CAJA}
                formatter={(valor, nombre) => [
                  `${Number(valor ?? 0).toLocaleString("es-ES", {
                    maximumFractionDigits: 2,
                  })} h`,
                  nombre === "cobrables"
                    ? "Se cobran"
                    : nombre === "antes"
                      ? "Periodo anterior"
                      : "No se cobran",
                ]}
              />
              <Bar
                dataKey="cobrables"
                stackId="h"
                fill="var(--billable-fill)"
                radius={[0, 0, 3, 3]}
                maxBarSize={48}
              />
              <Bar
                dataKey="resto"
                stackId="h"
                fill="var(--accent)"
                radius={[3, 3, 0, 0]}
                maxBarSize={48}
              />
              {comparar && (
                <Line
                  type="monotone"
                  dataKey="antes"
                  stroke="var(--muted)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ------------------------------------------------- area y mapa horas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="card p-4">
          <h2 className="text-sm font-semibold">En qué se va</h2>
          <p className="mb-2 mt-0.5 text-xs text-muted">Por área.</p>

          {porArea.length === 0 ? (
            <Vacio />
          ) : (
            <>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porArea.map((g) => ({
                        nombre: g.etiqueta,
                        horas: Math.round((g.segundos / 3600) * 100) / 100,
                      }))}
                      dataKey="horas"
                      nameKey="nombre"
                      innerRadius="58%"
                      outerRadius="88%"
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {porArea.map((g, i) => (
                        <Cell key={g.clave} fill={PALETA[i % PALETA.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CAJA}
                      formatter={(v) => [
                        `${Number(v ?? 0).toLocaleString("es-ES", {
                          maximumFractionDigits: 2,
                        })} h`,
                        "Horas",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="mt-2 space-y-1">
                {porArea.slice(0, 6).map((g, i) => (
                  <li
                    key={g.clave}
                    className="flex items-baseline gap-2 text-sm"
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: PALETA[i % PALETA.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate">{g.etiqueta}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {suma.segundos > 0
                        ? Math.round((g.segundos / suma.segundos) * 100)
                        : 0}
                      %
                    </span>
                    <span className="cifra shrink-0 font-medium">
                      {formatDurationShort(g.segundos)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-semibold">Cuándo se trabaja</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted">
            Dónde cae de verdad el trabajo en la semana. Cuanto más oscuro, más
            horas.
          </p>
          <MapaDeCalor rejilla={rejilla} franja={franja} techo={techo} />
        </section>
      </div>

      {/* ------------------------------------------------ personas y ranking */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {hayEquipo && (
          <section className="card p-4">
            <h2 className="text-sm font-semibold">Quién lo pone</h2>
            <p className="mb-3 mt-0.5 text-xs text-muted">
              Horas por persona en el periodo.
            </p>
            {porPersona.length === 0 ? (
              <Vacio />
            ) : (
              <div style={{ height: Math.max(140, porPersona.length * 34) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={porPersona.map((g) => ({
                      nombre: g.etiqueta,
                      horas: Math.round((g.segundos / 3600) * 100) / 100,
                      cobrables: Math.round((g.facturables / 3600) * 100) / 100,
                    }))}
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 4"
                      horizontal={false}
                      stroke="var(--line)"
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: "var(--muted)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={110}
                      tick={{ fontSize: 12, fill: "var(--ink)" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--surface-2)" }}
                      contentStyle={CAJA}
                      formatter={(v, n) => [
                        `${Number(v ?? 0).toLocaleString("es-ES", {
                          maximumFractionDigits: 2,
                        })} h`,
                        n === "cobrables" ? "Se cobran" : "Total",
                      ]}
                    />
                    <Bar dataKey="horas" fill="var(--accent)" radius={[0, 3, 3, 0]} />
                    <Bar
                      dataKey="cobrables"
                      fill="var(--billable-fill)"
                      radius={[0, 3, 3, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        <section className={cn("card p-4", !hayEquipo && "lg:col-span-2")}>
          <h2 className="text-sm font-semibold">Los proyectos que más pesan</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted">
            De más a menos horas en el periodo.
          </p>
          {porProyecto.length === 0 ? (
            <Vacio />
          ) : (
            <ul className="space-y-2.5">
              {porProyecto.slice(0, 8).map((g) => {
                const parte =
                  suma.segundos > 0 ? (g.segundos / suma.segundos) * 100 : 0
                const cobrable =
                  g.segundos > 0 ? (g.facturables / g.segundos) * 100 : 0
                return (
                  <li key={g.clave}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{g.etiqueta}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {Math.round(parte)}%
                      </span>
                      <span className="cifra shrink-0 font-medium">
                        {formatDurationShort(g.segundos)}
                      </span>
                    </div>
                    {/* La barra entera es lo que pesa; el trozo verde, lo que
                        de eso se cobra */}
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="relative h-full rounded-full"
                        style={{
                          width: `${parte}%`,
                          background: g.color ?? "var(--accent)",
                        }}
                      >
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-billable-fill"
                          style={{ width: `${cobrable}%` }}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      {/* --------------------------------------------------------- por hora */}
      {puedeVerImportes && porProyecto.some((g) => g.importe > 0) && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold">A cuánto sale la hora</h2>
          <p className="mb-3 mt-0.5 text-xs text-muted">
            Por proyecto, contando solo las horas que se cobran
            {objetivoHora ? `. La línea es el objetivo: ${objetivoHora} €/h` : ""}.
          </p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={porProyecto
                  .filter((g) => g.facturables > 0 && g.importe > 0)
                  .map((g) => ({
                    nombre: g.etiqueta,
                    color: g.color ?? "var(--accent)",
                    porHora:
                      Math.round((g.importe / (g.facturables / 3600)) * 10) / 10,
                  }))
                  .sort((a, b) => b.porHora - a.porHora)
                  .slice(0, 10)}
                margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  vertical={false}
                  stroke="var(--line)"
                />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  interval={0}
                  height={40}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--muted)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={CAJA}
                  formatter={(v) => [`${Number(v ?? 0)} €/h`, "Por hora"]}
                />
                {objetivoHora ? (
                  <ReferenceLine
                    y={objetivoHora}
                    stroke="var(--ink)"
                    strokeDasharray="4 3"
                  />
                ) : null}
                <Bar dataKey="porHora" radius={[3, 3, 0, 0]} maxBarSize={56}>
                  {porProyecto
                    .filter((g) => g.facturables > 0 && g.importe > 0)
                    .slice(0, 10)
                    .map((g) => (
                      <Cell key={g.clave} fill={g.color ?? "var(--accent)"} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {hayFiltros(filtros) && (
        <p className="no-print text-center text-xs text-accent">
          Con filtros puestos: todo lo de arriba es solo de lo filtrado.
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ piezas */

const CAJA = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radio-sm)",
  fontSize: 12,
  color: "var(--ink)",
} as const

function Vacio() {
  return <p className="py-6 text-center text-sm text-muted">Nada en este periodo.</p>
}

/** Un número grande con su comparación contra el periodo anterior. */
function Cifra({
  etiqueta,
  valor,
  pie,
  tono,
  antes,
  ahora,
  comparar,
}: {
  etiqueta: string
  valor: string
  pie?: string
  tono?: "billable" | "danger"
  antes?: number
  ahora?: number
  comparar?: boolean
}) {
  const hayComparacion =
    comparar && antes !== undefined && ahora !== undefined && antes > 0
  const cambio = hayComparacion ? ((ahora! - antes!) / antes!) * 100 : null
  const sube = (cambio ?? 0) >= 0

  return (
    <div className="card p-4">
      <p className="rotulo">{etiqueta}</p>
      <p
        className={cn(
          "cifra mt-1 text-2xl font-semibold leading-none",
          tono === "billable" && "text-billable",
          tono === "danger" && "text-danger",
        )}
      >
        {valor}
      </p>
      {cambio !== null && (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs font-medium",
            sube ? "text-billable" : "text-danger",
          )}
        >
          {sube ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {sube ? "+" : ""}
          {Math.round(cambio)}% que antes
        </p>
      )}
      {pie && <p className="mt-1 text-xs text-muted">{pie}</p>}
    </div>
  )
}

/** Siete filas y una columna por hora: dónde cae el trabajo en la semana. */
function MapaDeCalor({
  rejilla,
  franja,
  techo,
}: {
  rejilla: number[][]
  franja: { min: number; max: number }
  techo: number
}) {
  const horas = Array.from(
    { length: franja.max - franja.min + 1 },
    (_, i) => franja.min + i,
  )

  return (
    <div className="scroll-thin overflow-x-auto">
      <div className="min-w-[22rem]">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `2.2rem repeat(${horas.length}, minmax(0, 1fr))`,
          }}
        >
          {rejilla.map((fila, d) => (
            <Fragment key={DIAS[d]}>
              <span className="flex items-center text-[11px] text-muted">
                {DIAS[d]}
              </span>
              {horas.map((h) => {
                const valor = fila[h]
                return (
                  <span
                    key={h}
                    title={`${DIAS[d]} a las ${h}:00 · ${formatDurationShort(valor * 3600)}`}
                    className="aspect-square rounded-[2px] bg-accent transition"
                    style={{
                      opacity: valor <= 0 ? 0.06 : 0.15 + (valor / techo) * 0.85,
                    }}
                  />
                )
              })}
            </Fragment>
          ))}

          <span />
          {horas.map((h) => (
            <span
              key={h}
              className="pt-1 text-center text-[10px] leading-none text-muted"
            >
              {h % 3 === 0 ? h : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

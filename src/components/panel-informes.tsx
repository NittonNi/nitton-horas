"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useSesion } from "@/components/proveedor-sesion"
import { categoriasRaiz } from "@/lib/categorias"
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar"
import { agrupar, porDia, rangos, totales } from "@/lib/informes"
import {
  formatDateShort,
  formatDurationShort,
  formatHoursDecimal,
  formatMoney,
  fromDateKey,
} from "@/lib/time"
import type { Catalogo, EntradaVista, Miembro } from "@/lib/tipos"
import { cn } from "@/lib/utils"

type Facturable = "todo" | "si" | "no"

export function PanelInformes({
  entradas,
  catalogo,
  miembros,
  desde,
  hasta,
  puedeVerImportes,
}: {
  entradas: EntradaVista[]
  catalogo: Catalogo
  miembros: Miembro[]
  desde: string
  hasta: string
  puedeVerImportes: boolean
}) {
  const router = useRouter()
  const { espacio } = useSesion()
  const [persona, setPersona] = useState("")
  const [categoria, setCategoria] = useState("")
  const [cliente, setCliente] = useState("")
  const [proyecto, setProyecto] = useState("")
  const [etiqueta, setEtiqueta] = useState("")
  const [facturable, setFacturable] = useState<Facturable>("todo")
  const [busqueda, setBusqueda] = useState("")
  const [verTodo, setVerTodo] = useState(false)
  const [generando, setGenerando] = useState<"excel" | "pdf" | "todo" | null>(
    null,
  )
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null)

  function cambiarRango(nuevoDesde: string, nuevoHasta: string) {
    router.push(`/informes?desde=${nuevoDesde}&hasta=${nuevoHasta}`)
  }

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return entradas.filter((entrada) => {
      if (!entrada.end_at) return false
      if (persona && entrada.user_id !== persona) return false
      if (cliente && entrada.client_id !== cliente) return false
      if (categoria && entrada.category_id !== categoria) return false
      if (proyecto && entrada.project_id !== proyecto) return false
      if (etiqueta && !entrada.tags.includes(etiqueta)) return false
      if (facturable === "si" && !entrada.billable) return false
      if (facturable === "no" && entrada.billable) return false
      if (texto) {
        const donde = `${entrada.description} ${entrada.project_name ?? ""} ${entrada.task_name ?? ""} ${entrada.client_name ?? ""}`
        if (!donde.toLowerCase().includes(texto)) return false
      }
      return true
    })
  }, [
    entradas,
    persona,
    cliente,
    categoria,
    proyecto,
    etiqueta,
    facturable,
    busqueda,
  ])

  const suma = useMemo(() => totales(filtradas), [filtradas])
  const serie = useMemo(() => porDia(filtradas, desde, hasta), [filtradas, desde, hasta])

  const porProyecto = useMemo(
    () =>
      agrupar(
        filtradas,
        (e) => e.project_id ?? "sin",
        (e) => e.project_name ?? "Sin proyecto",
        (e) => e.project_color,
      ),
    [filtradas],
  )
  const porCliente = useMemo(
    () =>
      agrupar(
        filtradas,
        (e) => e.client_id ?? "sin",
        (e) => e.client_name ?? "Sin cliente",
      ),
    [filtradas],
  )
  const porPersona = useMemo(
    () => agrupar(filtradas, (e) => e.user_id, (e) => e.user_name),
    [filtradas],
  )

  const diasConHoras = serie.filter((d) => d.horas > 0).length
  const nombreFichero = `horas-${desde}-a-${hasta}`

  async function excel() {
    setGenerando("excel")
    try {
      await exportarExcel(filtradas, {
        nombre: nombreFichero,
        desde,
        hasta,
        conImportes: puedeVerImportes,
      })
    } finally {
      setGenerando(null)
    }
  }

  /** Todo lo que hay, sin filtros ni fechas: el boton de "dame el Excel". */
  async function todoElHistorico() {
    setGenerando("todo")
    setErrorDescarga(null)
    try {
      const { data, error } = await createClient()
        .from("v_entries")
        .select("*")
        .eq("workspace_id", espacio.id)
        .not("end_at", "is", null)
        .order("local_date", { ascending: true })
        .limit(50000)
      if (error) throw error

      const todas = (data ?? []) as EntradaVista[]
      if (todas.length === 0) {
        setErrorDescarga("Todavía no hay horas que descargar.")
        return
      }

      await exportarExcel(todas, {
        nombre: "horas-" + espacio.slug + "-completo",
        desde: todas[0].local_date,
        hasta: todas[todas.length - 1].local_date,
        conImportes: puedeVerImportes,
      })
    } catch (err) {
      setErrorDescarga(mensajeError(err))
    } finally {
      setGenerando(null)
    }
  }

  async function pdf() {
    setGenerando("pdf")
    try {
      await exportarPdf({
        titulo: "Informe de horas",
        subtitulo: `${formatDateShort(desde)} - ${formatDateShort(hasta)}`,
        resumen: [
          { etiqueta: "Total", valor: `${formatHoursDecimal(suma.segundos)} h` },
          {
            etiqueta: "Facturable",
            valor: `${formatHoursDecimal(suma.facturables)} h`,
          },
          ...(puedeVerImportes
            ? [{ etiqueta: "Importe", valor: formatMoney(suma.importe) }]
            : []),
        ],
        columnas: [
          "Fecha",
          "Persona",
          "Cliente",
          "Proyecto",
          "Descripción",
          "Horas",
          ...(puedeVerImportes ? ["Importe"] : []),
        ],
        filas: filtradas.map((entrada) => [
          formatDateShort(entrada.local_date),
          entrada.user_name,
          entrada.client_name ?? "",
          entrada.project_name ?? "",
          entrada.description,
          formatHoursDecimal(entrada.duration_seconds),
          ...(puedeVerImportes
            ? [entrada.amount != null ? formatMoney(Number(entrada.amount)) : ""]
            : []),
        ]),
        nombre: nombreFichero,
      })
    } finally {
      setGenerando(null)
    }
  }

  const visibles = verTodo ? filtradas : filtradas.slice(0, 50)

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------ filtros */}
      <section className="card no-print space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {rangos().map((rango) => {
            const activo = rango.desde === desde && rango.hasta === hasta
            return (
              <button
                key={rango.clave}
                type="button"
                onClick={() => cambiarRango(rango.desde, rango.hasta)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-sm font-medium transition",
                  activo
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-ink",
                )}
              >
                {rango.etiqueta}
              </button>
            )
          })}

          <div className="ml-auto flex items-center gap-2">
            <input
              type="date"
              className="field tabular w-36 py-1"
              value={desde}
              onChange={(e) => cambiarRango(e.target.value, hasta)}
              aria-label="Desde"
            />
            <span className="text-muted">-</span>
            <input
              type="date"
              className="field tabular w-36 py-1"
              value={hasta}
              onChange={(e) => cambiarRango(desde, e.target.value)}
              aria-label="Hasta"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {miembros.length > 0 && (
            <select
              className="field w-auto py-1"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              aria-label="Persona"
            >
              <option value="">Todo el equipo</option>
              {miembros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          )}

          <select
            className="field w-auto py-1"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            aria-label="Cliente"
          >
            <option value="">Todos los clientes</option>
            {catalogo.clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="field w-auto py-1"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Categoría"
          >
            <option value="">Todas las categorías</option>
            {categoriasRaiz(catalogo.categorias).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            className="field w-auto py-1"
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            aria-label="Proyecto"
          >
            <option value="">Todos los proyectos</option>
            {catalogo.proyectos
              .filter((p) => !cliente || p.client_id === cliente)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>

          <select
            className="field w-auto py-1"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            aria-label="Etiqueta"
          >
            <option value="">Todas las etiquetas</option>
            {catalogo.etiquetas.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>

          <select
            className="field w-auto py-1"
            value={facturable}
            onChange={(e) => setFacturable(e.target.value as Facturable)}
            aria-label="Facturable"
          >
            <option value="todo">Facturable y no</option>
            <option value="si">Solo facturable</option>
            <option value="no">Solo no facturable</option>
          </select>

          <input
            className="field w-auto flex-1 py-1"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en la descripción"
            aria-label="Buscar"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void excel()}
            disabled={filtradas.length === 0 || generando !== null}
            className="btn btn-primary py-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {generando === "excel" ? "Generando..." : "Excel"}
          </button>
          <button
            type="button"
            onClick={() => exportarCsv(filtradas, nombreFichero)}
            disabled={filtradas.length === 0}
            className="btn py-1.5"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => void pdf()}
            disabled={filtradas.length === 0 || generando !== null}
            className="btn py-1.5"
          >
            <FileText className="h-4 w-4" />
            {generando === "pdf" ? "Generando..." : "PDF"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn py-1.5"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>

          <span className="hidden w-px self-stretch bg-line sm:block" />

          <button
            type="button"
            onClick={() => void todoElHistorico()}
            disabled={generando !== null}
            title="Un Excel con todas las horas del espacio, sin filtros ni fechas"
            className="btn py-1.5"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {generando === "todo" ? "Generando..." : "Todo, desde el principio"}
          </button>
        </div>

        {errorDescarga && (
          <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
            {errorDescarga}
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------ resumen */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta etiqueta="Total" valor={formatDurationShort(suma.segundos)} pie={`${suma.entradas} entradas`} />
        <Tarjeta
          etiqueta="Facturable"
          valor={formatDurationShort(suma.facturables)}
          pie={
            suma.segundos > 0
              ? `${Math.round((suma.facturables / suma.segundos) * 100)}% del total`
              : "-"
          }
          acento
        />
        {puedeVerImportes ? (
          <Tarjeta
            etiqueta="Importe"
            valor={formatMoney(suma.importe)}
            pie="Según tarifas vigentes"
          />
        ) : (
          <Tarjeta
            etiqueta="Proyectos"
            valor={String(porProyecto.length)}
            pie="con horas en el rango"
          />
        )}
        <Tarjeta
          etiqueta="Media por día"
          valor={formatDurationShort(
            diasConHoras > 0 ? suma.segundos / diasConHoras : 0,
          )}
          pie={`${diasConHoras} días con horas`}
        />
      </section>

      {/* ------------------------------------------------------------ grafico */}
      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Horas por día</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="dia"
                tickFormatter={(dia: string) =>
                  fromDateKey(dia).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                  })
                }
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
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
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  fontSize: "0.8rem",
                  color: "var(--text)",
                }}
                labelFormatter={(dia) => formatDateShort(String(dia))}
                formatter={(valor, nombre) => [
                  `${Number(valor ?? 0).toLocaleString("es-ES")} h`,
                  nombre === "facturables" ? "Facturables" : "Horas",
                ]}
              />
              <Bar dataKey="horas" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="facturables" fill="var(--billable)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ---------------------------------------------------------- desgloses */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Desglose
          titulo="Por proyecto"
          grupos={porProyecto}
          total={suma.segundos}
          conImporte={puedeVerImportes}
        />
        {miembros.length > 0 ? (
          <Desglose
            titulo="Por persona"
            grupos={porPersona}
            total={suma.segundos}
            conImporte={puedeVerImportes}
          />
        ) : (
          <Desglose
            titulo="Por cliente"
            grupos={porCliente}
            total={suma.segundos}
            conImporte={puedeVerImportes}
          />
        )}
      </div>

      {/* ------------------------------------------------------------ detalle */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Detalle <span className="text-muted">({filtradas.length})</span>
          </h2>
          {filtradas.length > 50 && (
            <button
              type="button"
              onClick={() => setVerTodo((v) => !v)}
              className="no-print text-xs font-medium text-accent"
            >
              {verTodo ? "Ver solo las 50 primeras" : `Ver las ${filtradas.length}`}
            </button>
          )}
        </div>

        {filtradas.length === 0 ? (
          <p className="py-3 text-sm text-muted">
            No hay horas con estos filtros.
          </p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3 font-semibold">Fecha</th>
                  <th className="py-2 pr-3 font-semibold">Persona</th>
                  <th className="py-2 pr-3 font-semibold">Proyecto</th>
                  <th className="py-2 pr-3 font-semibold">Descripción</th>
                  <th className="py-2 pr-3 text-right font-semibold">Horas</th>
                  {puedeVerImportes && (
                    <th className="py-2 text-right font-semibold">Importe</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibles.map((entrada) => (
                  <tr key={entrada.id}>
                    <td className="tabular whitespace-nowrap py-2 pr-3 text-muted">
                      {formatDateShort(entrada.local_date)}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3">{entrada.user_name}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: entrada.project_color ?? "var(--border-strong)",
                          }}
                        />
                        <span className="truncate">
                          {entrada.project_name ?? "Sin proyecto"}
                          {entrada.task_name && ` · ${entrada.task_name}`}
                        </span>
                      </span>
                    </td>
                    <td className="max-w-[22rem] truncate py-2 pr-3 text-muted">
                      {entrada.description || "-"}
                    </td>
                    <td
                      className={cn(
                        "tabular py-2 pr-3 text-right font-medium",
                        entrada.billable && "text-billable",
                      )}
                    >
                      {formatHoursDecimal(entrada.duration_seconds)}
                    </td>
                    {puedeVerImportes && (
                      <td className="tabular py-2 text-right">
                        {entrada.amount != null
                          ? formatMoney(Number(entrada.amount))
                          : "-"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

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
      <p className="text-xs font-medium text-muted">{etiqueta}</p>
      <p
        className={cn(
          "tabular mt-0.5 text-xl font-semibold",
          acento && "text-billable",
        )}
      >
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-muted">{pie}</p>
    </div>
  )
}

function Desglose({
  titulo,
  grupos,
  total,
  conImporte,
}: {
  titulo: string
  grupos: ReturnType<typeof agrupar>
  total: number
  conImporte: boolean
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>

      {grupos.length === 0 ? (
        <p className="py-2 text-sm text-muted">Sin datos.</p>
      ) : (
        <ul className="space-y-2.5">
          {grupos.map((grupo) => {
            const porcentaje = total > 0 ? (grupo.segundos / total) * 100 : 0
            return (
              <li key={grupo.clave}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: grupo.color ?? "var(--accent)" }}
                    />
                    <span className="truncate">{grupo.etiqueta}</span>
                  </span>
                  <span className="tabular shrink-0 font-medium">
                    {formatDurationShort(grupo.segundos)}
                    {conImporte && grupo.importe > 0 && (
                      <span className="ml-2 text-xs font-normal text-muted">
                        {formatMoney(grupo.importe)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${porcentaje}%`,
                      background: grupo.color ?? "var(--accent)",
                    }}
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

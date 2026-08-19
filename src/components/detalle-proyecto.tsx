"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import {
  Archive,
  ArrowLeft,
  Check,
  Euro,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { SelectorColor } from "@/components/selector-color"
import { SelectorCliente } from "@/components/selector-cliente"
import { useAvisos } from "@/components/avisos"
import { caminoDe, ramas, SIN_CATEGORIA } from "@/lib/categorias"
import { agrupar, totales } from "@/lib/informes"
import {
  formatDateShort,
  formatDurationShort,
  formatHoursDecimal,
  formatMoney,
} from "@/lib/time"
import type {
  Categoria,
  Cliente,
  Edicion,
  EntradaVista,
  ProyectoConCliente,
  Tarea,
} from "@/lib/tipos"
import {
  ResultadosProyecto,
  type Resultado,
} from "@/components/resultados-proyecto"
import { TarjetasEdicion } from "@/components/tarjetas-edicion"
import { ClientesProyecto } from "@/components/clientes-proyecto"
import { cn } from "@/lib/utils"

/** Los cuatro tipos de trabajo del equipo, cada uno se cierra a su ritmo. */
const TIPOS = [
  { clave: "evento", etiqueta: "Evento" },
  { clave: "b2b", etiqueta: "B2B recurrente" },
  { clave: "oportunidad", etiqueta: "Oportunidad" },
  { clave: "b2c", etiqueta: "B2C recurrente" },
] as const

export function DetalleProyecto({
  proyecto,
  clientes,
  categorias,
  tareas,
  ediciones,
  entradas,
  resultados,
  clientesDelProyecto,
  clientesDeEdiciones,
  objetivoHora,
  espacioId,
  puedeGestionar,
  puedeVerImportes,
}: {
  proyecto: ProyectoConCliente
  clientes: Cliente[]
  categorias: Categoria[]
  tareas: Tarea[]
  ediciones: Edicion[]
  entradas: EntradaVista[]
  resultados: Resultado[]
  /** Los clientes de este proyecto. Pueden ser varios. */
  clientesDelProyecto: string[]
  /** Que clientes participan en cada edicion. */
  clientesDeEdiciones: { edition_id: string; client_id: string }[]
  /** Facturacion por hora a la que aspira el equipo. */
  objetivoHora: number | null
  espacioId: string
  puedeGestionar: boolean
  puedeVerImportes: boolean
}) {
  const cerradas = useMemo(() => entradas.filter((e) => e.end_at), [entradas])
  const suma = useMemo(() => totales(cerradas), [cerradas])

  const porTarea = useMemo(
    () =>
      agrupar(
        cerradas,
        (e) => e.task_id ?? "sin",
        (e) => e.task_name ?? "Sin tarea",
      ),
    [cerradas],
  )
  const porPersona = useMemo(
    () => agrupar(cerradas, (e) => e.user_id, (e) => e.user_name),
    [cerradas],
  )

  /** Para cada cliente, en que ediciones participa: se lee de un vistazo. */
  const enEdiciones = useMemo(() => {
    const mapa = new Map<string, string[]>()
    for (const enlace of clientesDeEdiciones) {
      const edicion = ediciones.find((e) => e.id === enlace.edition_id)
      if (!edicion) continue
      mapa.set(enlace.client_id, [
        ...(mapa.get(enlace.client_id) ?? []),
        edicion.name,
      ])
    }
    return mapa
  }, [clientesDeEdiciones, ediciones])

  /* Cuando empezo y cuando acabo, sin escribir una sola fecha: la primera hora
     apuntada -o el dia que se creo- y la ultima. */
  const dias = cerradas.map((e) => e.local_date).sort()
  const nacio = dias[0] ?? proyecto.created_at.slice(0, 10)
  const ultima = dias[dias.length - 1] ?? null

  return (
    <div className="space-y-5">
      <Link
        href="/proyectos"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Proyectos
      </Link>

      {/* ------------------------------------------------------- cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="h-10 w-1.5 shrink-0 rounded-full"
            style={{ background: proyecto.color }}
          />
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-2">
              <span className="truncate text-lg font-semibold tracking-tight">
                {proyecto.name}
              </span>
              {proyecto.kind && (
                <span className="chip shrink-0">
                  {TIPOS.find((t) => t.clave === proyecto.kind)?.etiqueta}
                </span>
              )}
              {caminoDe(categorias, proyecto.category_id) && (
                <span className="chip shrink-0">
                  {caminoDe(categorias, proyecto.category_id)}
                </span>
              )}
            </h1>
            <p className="truncate text-sm text-muted">
              {proyecto.clients?.name ?? "Sin cliente"}
              {proyecto.billable_default && " · facturable por defecto"}
              {proyecto.archived && " · archivado"}
            </p>
          </div>
        </div>

        {puedeGestionar && (
          <EditarProyecto
            proyecto={proyecto}
            clientes={clientes}
            categorias={categorias}
          />
        )}
      </div>

      {/* ---------------------------------------------------------- datos */}
      <div className="card grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
        <Dato etiqueta="Total" valor={formatDurationShort(suma.segundos)} />
        <Dato
          etiqueta="Facturable"
          valor={formatDurationShort(suma.facturables)}
          resaltado={suma.facturables > 0}
          pie={
            suma.segundos > 0
              ? `${Math.round((suma.facturables / suma.segundos) * 100)}% del total`
              : undefined
          }
        />
        {puedeVerImportes ? (
          <Dato etiqueta="Importe" valor={formatMoney(suma.importe)} />
        ) : (
          <Dato etiqueta="Entradas" valor={String(suma.entradas)} />
        )}
        {/* Cuando nacio y cuando fue la ultima hora. Nada de esto se escribe:
            lo dice el propio trabajo apuntado. */}
        <Dato
          etiqueta="Desde"
          valor={formatDateShort(nacio)}
          pie={ultima ? `hasta el ${formatDateShort(ultima)}` : "sin horas todavía"}
        />
      </div>

      {puedeVerImportes && (
        <ResultadosProyecto
          entradas={entradas}
          resultados={resultados}
          objetivoHora={objetivoHora}
        />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Desglose
          titulo="Por tarea"
          grupos={porTarea}
          total={suma.segundos}
          vacio="Las horas de este proyecto no están repartidas en tareas."
        />
        <Desglose
          titulo="Por persona"
          grupos={porPersona}
          total={suma.segundos}
          vacio="Todavía no hay horas apuntadas."
        />
      </div>


      <ClientesProyecto
        espacioId={espacioId}
        proyectoId={proyecto.id}
        clientes={clientes}
        puestos={clientesDelProyecto}
        enEdiciones={enEdiciones}
        puedeGestionar={puedeGestionar}
      />

      <TarjetasEdicion
        espacioId={espacioId}
        proyectoId={proyecto.id}
        clientesDelProyecto={clientesDelProyecto}
        clientesDeEdiciones={clientesDeEdiciones}
        ediciones={ediciones}
        entradas={cerradas}
        resultados={resultados}
        clientes={clientes}
        objetivoHora={objetivoHora}
        predeterminada={proyecto.default_edition_id}
        puedeGestionar={puedeGestionar}
        puedeVerImportes={puedeVerImportes}
      />

      <Tareas
        espacioId={espacioId}
        proyectoId={proyecto.id}
        tareas={tareas}
        porTarea={porTarea}
        puedeGestionar={puedeGestionar}
      />

      <UltimasEntradas entradas={cerradas.slice(0, 12)} conImportes={puedeVerImportes} />
    </div>
  )
}

/* ------------------------------------------------------------------ piezas */

function Dato({
  etiqueta,
  valor,
  pie,
  resaltado = false,
}: {
  etiqueta: string
  valor: string
  pie?: string
  resaltado?: boolean
}) {
  return (
    <div className="px-4 py-3">
      <p className="rotulo">{etiqueta}</p>
      <p
        className={cn(
          "cifra mt-1 text-xl font-semibold leading-none",
          resaltado && "text-billable",
        )}
      >
        {valor}
      </p>
      <p className="mt-1.5 h-4 text-xs text-muted">{pie}</p>
    </div>
  )
}

function Desglose({
  titulo,
  grupos,
  total,
  vacio,
}: {
  titulo: string
  grupos: ReturnType<typeof agrupar>
  total: number
  vacio: string
}) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">{titulo}</h2>
      {grupos.length === 0 ? (
        <p className="py-2 text-sm text-muted">{vacio}</p>
      ) : (
        <ul className="space-y-2.5">
          {grupos.map((grupo) => {
            const porcentaje = total > 0 ? (grupo.segundos / total) * 100 : 0
            return (
              <li key={grupo.clave}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{grupo.etiqueta}</span>
                  <span className="cifra shrink-0 font-medium">
                    {formatDurationShort(grupo.segundos)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${porcentaje}%` }}
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

/* ------------------------------------------------------------------ tareas */

function Tareas({
  espacioId,
  proyectoId,
  tareas,
  porTarea,
  puedeGestionar,
}: {
  espacioId: string
  proyectoId: string
  tareas: Tarea[]
  porTarea: ReturnType<typeof agrupar>
  puedeGestionar: boolean
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [editando, setEditando] = useState<string | null>(null)
  const [borrador, setBorrador] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const horasDe = (id: string) =>
    porTarea.find((g) => g.clave === id)?.segundos ?? 0

  async function ejecutar(accion: () => PromiseLike<{ error: unknown }>) {
    setOcupado(true)
    setError(null)
    const { error: err } = await accion()
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return false
    }
    router.refresh()
    return true
  }

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) return
    const supabase = createClient()
    const ok = await ejecutar(() =>
      supabase
        .from("tasks")
        .insert({ workspace_id: espacioId, project_id: proyectoId, name: limpio }),
    )
    if (ok) setNombre("")
  }

  async function renombrar(id: string) {
    const limpio = borrador.trim()
    if (!limpio) return
    const supabase = createClient()
    const ok = await ejecutar(() =>
      supabase.from("tasks").update({ name: limpio }).eq("id", id),
    )
    if (ok) setEditando(null)
  }

  async function archivar(tarea: Tarea) {
    const supabase = createClient()
    await ejecutar(() =>
      supabase.from("tasks").update({ archived: !tarea.archived }).eq("id", tarea.id),
    )
  }

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-sm font-semibold">
        Tareas <span className="text-muted">({tareas.filter((t) => !t.archived).length})</span>
      </h2>
      <p className="mb-3 text-xs text-muted">
        Las formas fijas de desglosar este proyecto. Salen al elegir proyecto, y
        se pueden crear también desde ahi.
      </p>

      {puedeGestionar && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void crear()
          }}
          className="mb-3 flex gap-2"
        >
          <input
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nueva tarea"
            aria-label="Nueva tarea"
          />
          <button
            type="submit"
            disabled={ocupado || !nombre.trim()}
            className="btn btn-primary shrink-0"
          >
            {ocupado ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Añadir
          </button>
        </form>
      )}

      {error && (
        <p className="mb-2 rounded-[var(--radio-sm)] bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      {tareas.length === 0 ? (
        <p className="py-2 text-sm text-muted">
          Este proyecto no tiene tareas todavía.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {tareas.map((tarea) => (
            <li
              key={tarea.id}
              className={cn(
                "flex items-center gap-2 py-2",
                tarea.archived && "opacity-55",
              )}
            >
              {editando === tarea.id ? (
                <>
                  <input
                    autoFocus
                    className="field py-1"
                    value={borrador}
                    onChange={(e) => setBorrador(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void renombrar(tarea.id)
                      if (e.key === "Escape") setEditando(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void renombrar(tarea.id)}
                    className="btn btn-ghost p-1.5"
                    aria-label="Guardar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditando(null)}
                    className="btn btn-ghost p-1.5"
                    aria-label="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm">{tarea.name}</span>
                  {tarea.archived && <span className="chip">Archivada</span>}
                  <span className="cifra shrink-0 text-sm text-muted">
                    {formatDurationShort(horasDe(tarea.id))}
                  </span>
                  {puedeGestionar && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditando(tarea.id)
                          setBorrador(tarea.name)
                        }}
                        className="btn btn-ghost p-1.5 text-muted"
                        aria-label={`Renombrar ${tarea.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void archivar(tarea)}
                        disabled={ocupado}
                        className="btn btn-ghost p-1.5 text-muted"
                        aria-label={
                          tarea.archived
                            ? `Reactivar ${tarea.name}`
                            : `Archivar ${tarea.name}`
                        }
                      >
                        {tarea.archived ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/* -------------------------------------------------------------- últimas */

function UltimasEntradas({
  entradas,
  conImportes,
}: {
  entradas: EntradaVista[]
  conImportes: boolean
}) {
  if (entradas.length === 0) return null

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">Últimas horas</h2>
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="th">Fecha</th>
              <th className="th">Persona</th>
              <th className="th">Descripción</th>
              <th className="th text-right">Horas</th>
              {conImportes && <th className="th text-right">Importe</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entradas.map((entrada) => (
              <tr key={entrada.id}>
                <td className="cifra whitespace-nowrap py-2 pr-3 text-muted">
                  {formatDateShort(entrada.local_date)}
                </td>
                <td className="whitespace-nowrap py-2 pr-3">{entrada.user_name}</td>
                <td className="max-w-[24rem] truncate py-2 pr-3 text-muted">
                  {entrada.description || "-"}
                  {entrada.task_name && (
                    <span className="chip ml-2">{entrada.task_name}</span>
                  )}
                </td>
                <td className="cifra py-2 pr-3 text-right font-medium">
                  <span className="inline-flex items-center gap-1">
                    {entrada.billable && (
                      <Euro className="h-3 w-3 text-billable" aria-label="Facturable" />
                    )}
                    {formatHoursDecimal(entrada.duration_seconds)}
                  </span>
                </td>
                {conImportes && (
                  <td className="cifra py-2 text-right text-billable">
                    {entrada.amount != null ? formatMoney(Number(entrada.amount)) : "-"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ editar */

function EditarProyecto({
  proyecto,
  clientes,
  categorias,
}: {
  proyecto: ProyectoConCliente
  clientes: Cliente[]
  categorias: Categoria[]
}) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [nombre, setNombre] = useState(proyecto.name)
  const [categoriaId, setCategoriaId] = useState(proyecto.category_id ?? "")
  const [color, setColor] = useState(proyecto.color)
  const [facturable, setFacturable] = useState(proyecto.billable_default)
  const [tipo, setTipo] = useState(proyecto.kind ?? "")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    const limpio = nombre.trim()
    if (!limpio) {
      setError("El proyecto necesita un nombre.")
      return
    }
    setGuardando(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("projects")
      .update({
        name: limpio,
        category_id: categoriaId || null,
        color,
        billable_default: facturable,
        kind: (tipo || null) as ProyectoConCliente["kind"],
      })
      .eq("id", proyecto.id)

    setGuardando(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setAbierto(false)
    router.refresh()
  }

  async function archivar() {
    setGuardando(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("projects")
      .update({ archived: !proyecto.archived })
      .eq("id", proyecto.id)
    setGuardando(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setAbierto(false)
    router.refresh()
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger className="btn">
        <Pencil className="h-4 w-4" />
        Editar
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="card fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">
              Editar proyecto
            </Dialog.Title>
            <Dialog.Close className="btn btn-ghost p-1" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void guardar()
            }}
            className="space-y-3 p-4"
          >
            <div>
              <label className="label" htmlFor="ep-nombre">
                Nombre
              </label>
              <input
                id="ep-nombre"
                className="field"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="ep-tipo">
                Tipo de trabajo
              </label>
              <select
                id="ep-tipo"
                className="field"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as typeof tipo)}
              >
                <option value="">Sin decidir</option>
                {TIPOS.map((t) => (
                  <option key={t.clave} value={t.clave}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="ep-categoria">
                Categoría
              </label>
              <select
                id="ep-categoria"
                className="field"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                <option value="">{SIN_CATEGORIA}</option>
                {ramas(
                  categorias.filter((c) => !c.archived || c.id === categoriaId),
                ).map(({ categoria, camino }) => (
                  <option key={categoria.id} value={categoria.id}>
                    {camino}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="label">Color</span>
              <SelectorColor valor={color} onChange={setColor} />
            </div>

            <button
              type="button"
              onClick={() => setFacturable((v) => !v)}
              aria-pressed={facturable}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-[var(--radio-sm)] border px-3 text-sm transition",
                facturable
                  ? "border-billable-line bg-billable-soft text-billable"
                  : "border-line-strong bg-surface text-muted hover:bg-surface-2",
              )}
            >
              <Euro className="h-4 w-4" />
              {facturable
                ? "Las horas nacen facturables"
                : "Las horas nacen sin facturar"}
            </button>

            {error && (
              <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => void archivar()}
                disabled={guardando}
                className="btn btn-danger"
              >
                {proyecto.archived ? (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Reactivar
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" />
                    Archivar
                  </>
                )}
              </button>
              <div className="flex gap-2">
                <Dialog.Close className="btn">Cancelar</Dialog.Close>
                <button
                  type="submit"
                  disabled={guardando}
                  className="btn btn-primary"
                >
                  {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

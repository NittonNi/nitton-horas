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
import { EdicionesProyecto } from "@/components/ediciones-proyecto"
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
import { cn } from "@/lib/utils"

export function DetalleProyecto({
  proyecto,
  clientes,
  categorias,
  tareas,
  ediciones,
  entradas,
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

  const presupuesto = proyecto.budget_hours ?? null
  const horas = suma.segundos / 3600
  const consumido =
    presupuesto && presupuesto > 0 ? (horas / presupuesto) * 100 : null

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
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {proyecto.name}
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
        <Dato
          etiqueta="Presupuesto"
          valor={presupuesto ? `${formatHoursDecimal(suma.segundos)} / ${presupuesto} h` : "Sin fijar"}
          pie={consumido !== null ? `${Math.round(consumido)}% consumido` : undefined}
        />
      </div>

      {consumido !== null && (
        <div className="card p-4">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                consumido > 100 && "bg-danger",
              )}
              style={{
                width: `${Math.min(100, consumido)}%`,
                background: consumido > 100 ? undefined : proyecto.color,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {consumido > 100
              ? `Te has pasado ${formatHoursDecimal(suma.segundos - (presupuesto ?? 0) * 3600)} h del presupuesto.`
              : `Quedan ${formatHoursDecimal((presupuesto ?? 0) * 3600 - suma.segundos)} h.`}
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
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

      <EdicionesProyecto
        espacioId={espacioId}
        proyectoId={proyecto.id}
        ediciones={ediciones}
        entradas={cerradas}
        puedeGestionar={puedeGestionar}
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
            Anadir
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
  const [clienteId, setClienteId] = useState(proyecto.client_id ?? "")
  const [categoriaId, setCategoriaId] = useState(proyecto.category_id ?? "")
  const [color, setColor] = useState(proyecto.color)
  const [facturable, setFacturable] = useState(proyecto.billable_default)
  const [presupuesto, setPresupuesto] = useState(
    proyecto.budget_hours != null ? String(proyecto.budget_hours) : "",
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    const limpio = nombre.trim()
    if (!limpio) {
      setError("El proyecto necesita un nombre.")
      return
    }
    const horas = presupuesto.trim().replace(",", ".")
    if (horas && Number.isNaN(Number(horas))) {
      setError("El presupuesto tiene que ser un número de horas.")
      return
    }

    setGuardando(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("projects")
      .update({
        name: limpio,
        client_id: clienteId || null,
        category_id: categoriaId || null,
        color,
        billable_default: facturable,
        budget_hours: horas ? Number(horas) : null,
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ep-cliente">
                  Cliente
                </label>
                <select
                  id="ep-cliente"
                  className="field"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                >
                  <option value="">Sin cliente</option>
                  {clientes
                    .filter((c) => !c.archived || c.id === clienteId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="ep-presupuesto">
                  Presupuesto (horas)
                </label>
                <input
                  id="ep-presupuesto"
                  className="field cifra"
                  value={presupuesto}
                  onChange={(e) => setPresupuesto(e.target.value)}
                  placeholder="Sin fijar"
                  inputMode="decimal"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="ep-categoria">
                Categoria
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

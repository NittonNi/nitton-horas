"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Archive, Euro, Loader2, Plus, RotateCcw, Star } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useAvisos } from "@/components/avisos"
import { SelectorCliente } from "@/components/selector-cliente"
import { formatDateShort, formatDurationShort, formatMoney, todayKey } from "@/lib/time"
import type { Cliente, Edicion, EntradaVista } from "@/lib/tipos"
import type { Resultado } from "@/components/resultados-proyecto"
import { cn } from "@/lib/utils"

/**
 * Cada edición, una tarjeta. Es la unidad de trabajo de verdad: un evento
 * tiene sus horas, su cliente y su resultado, y el proyecto solo es el paraguas
 * que los junta. Los proyectos que no se repiten no necesitan ediciones: ahí la
 * tarjeta es el proyecto entero.
 */
export function TarjetasEdicion({
  espacioId,
  proyectoId,
  clientesDelProyecto,
  clientesDeEdiciones,
  ediciones,
  entradas,
  resultados,
  clientes,
  objetivoHora,
  predeterminada,
  puedeGestionar,
  puedeVerImportes,
}: {
  espacioId: string
  proyectoId: string
  /** Los clientes del proyecto: de ahi se eligen los de cada edicion. */
  clientesDelProyecto: string[]
  clientesDeEdiciones: { edition_id: string; client_id: string }[]
  ediciones: Edicion[]
  entradas: EntradaVista[]
  resultados: Resultado[]
  clientes: Cliente[]
  objetivoHora: number | null
  predeterminada: string | null
  puedeGestionar: boolean
  puedeVerImportes: boolean
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [creando, setCreando] = useState(false)
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visibles = ediciones.filter((e) => verArchivadas || !e.archived)
  const archivadas = ediciones.filter((e) => e.archived).length
  const sueltas = entradas.filter((e) => !e.edition_id)

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) return
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient().from("project_editions").insert({
      workspace_id: espacioId,
      project_id: proyectoId,
      name: limpio,
      position: ediciones.length,
    })
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setNombre("")
    setCreando(false)
    router.refresh()
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Ediciones</h2>
          <p className="text-sm text-muted">
            Lo que se repite va en ediciones: TBCE 1 y TBCE 2 son el mismo
            proyecto en dos años, cada una con sus horas, su cliente y su
            resultado.
          </p>
        </div>
        {archivadas > 0 && (
          <button
            type="button"
            onClick={() => setVerArchivadas((v) => !v)}
            className="text-xs font-medium text-muted transition hover:text-ink"
          >
            {verArchivadas ? "Ocultar" : "Ver"} cerradas ({archivadas})
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibles.map((edicion) => (
          <Tarjeta
            key={edicion.id}
            espacioId={espacioId}
            proyectoId={proyectoId}
            edicion={edicion}
            entradas={entradas.filter((e) => e.edition_id === edicion.id)}
            resultado={resultados.find((r) => r.edition_id === edicion.id) ?? null}
            clientes={clientes}
            delProyecto={clientesDelProyecto}
            suyos={clientesDeEdiciones
              .filter((c) => c.edition_id === edicion.id)
              .map((c) => c.client_id)}
            objetivoHora={objetivoHora}
            enCurso={predeterminada === edicion.id}
            puedeGestionar={puedeGestionar}
            puedeVerImportes={puedeVerImportes}
          />
        ))}

        {/* Lo apuntado sin edición: para los proyectos que no se repiten, esta
            es la única tarjeta y hace de proyecto entero. */}
        {(sueltas.length > 0 || ediciones.length === 0) && (
          <Tarjeta
            espacioId={espacioId}
            proyectoId={proyectoId}
            edicion={null}
            entradas={sueltas}
            resultado={resultados.find((r) => !r.edition_id) ?? null}
            clientes={clientes}
            delProyecto={clientesDelProyecto}
            suyos={clientesDelProyecto}
            objetivoHora={objetivoHora}
            enCurso={false}
            puedeGestionar={puedeGestionar}
            puedeVerImportes={puedeVerImportes}
          />
        )}
      </div>

      {puedeGestionar &&
        (creando ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void crear()
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              autoFocus
              className="field w-auto min-w-[12rem] flex-1"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="TBCE 3, edición de mayo, 2027..."
              aria-label="Nombre de la edición"
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
              Crear
            </button>
            <button
              type="button"
              onClick={() => setCreando(false)}
              className="btn shrink-0"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setCreando(true)} className="btn">
            <Plus className="h-4 w-4" />
            Nueva edición
          </button>
        ))}
    </section>
  )
}

/* ------------------------------------------------------------ una tarjeta */

function Tarjeta({
  espacioId,
  proyectoId,
  edicion,
  entradas,
  resultado,
  clientes,
  delProyecto,
  suyos,
  objetivoHora,
  enCurso,
  puedeGestionar,
  puedeVerImportes,
}: {
  espacioId: string
  proyectoId: string
  /** Null: lo que se apunto sin edicion, o el proyecto entero. */
  edicion: Edicion | null
  entradas: EntradaVista[]
  resultado: Resultado | null
  clientes: Cliente[]
  /** Los clientes del proyecto: son los que se pueden marcar aqui. */
  delProyecto: string[]
  /** Los que participan en esta edicion. */
  suyos: string[]
  objetivoHora: number | null
  enCurso: boolean
  puedeGestionar: boolean
  puedeVerImportes: boolean
}) {
  const router = useRouter()
  const { avisar } = useAvisos()
  const [editando, setEditando] = useState(false)
  const [ingresos, setIngresos] = useState("")
  const [gastos, setGastos] = useState("")
  const [nuevoCliente, setNuevoCliente] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cerradas = entradas.filter((e) => e.end_at)
  const segundos = cerradas.reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  const cobrables = cerradas
    .filter((e) => e.billable)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

  /* De la primera hora apuntada a la ultima: las fechas no se escriben, se
     deducen de lo trabajado. */
  const dias = cerradas.map((e) => e.local_date).sort()
  const primera = dias[0] ?? null
  const ultima = dias[dias.length - 1] ?? null

  const neto = resultado
    ? Number(resultado.income) - Number(resultado.expenses)
    : null
  const horasCobrables = cobrables / 3600
  const porHora =
    resultado && horasCobrables > 0
      ? Number(resultado.income) / horasCobrables
      : null
  const llega = porHora !== null && objetivoHora ? porHora >= objetivoHora : null

  function aNumero(texto: string) {
    const limpio = texto.trim().replace(/\s|€/g, "").replace(",", ".")
    if (!limpio) return 0
    const valor = Number(limpio)
    return Number.isFinite(valor) ? valor : null
  }

  function abrir() {
    setIngresos(resultado ? String(resultado.income) : "")
    setGastos(resultado ? String(resultado.expenses) : "")
    setError(null)
    setEditando(true)
  }

  async function guardar() {
    const entra = aNumero(ingresos)
    const sale = aNumero(gastos)
    if (entra === null || sale === null) {
      setError("Los importes tienen que ser números, como 1250 o 1250,50.")
      return
    }

    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = resultado
      ? await supabase
          .from("project_results")
          .update({ income: entra, expenses: sale })
          .eq("id", resultado.id)
      : await supabase.from("project_results").insert({
          workspace_id: espacioId,
          project_id: proyectoId,
          edition_id: edicion?.id ?? null,
          label: edicion?.name ?? "Todo el proyecto",
          starts_on: primera ?? todayKey(),
          ends_on: ultima ?? todayKey(),
          income: entra,
          expenses: sale,
        })

    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setEditando(false)
    router.refresh()
  }

  /**
   * El cliente de la edicion; en la tarjeta sin edicion, el del proyecto. Los
   * dos se ponen desde aqui, que es donde se miran.
   */
  /**
   * En una edicion pueden participar varios clientes: se marcan los que sean y
   * asi se sabe entre quienes se reparten esas horas. En la tarjeta sin
   * edicion no hay nada que marcar: son los del proyecto.
   */
  async function alternarCliente(clienteId: string) {
    if (!edicion) return
    const estaba = suyos.includes(clienteId)
    setOcupado(true)
    const supabase = createClient()
    const { error: err } = estaba
      ? await supabase
          .from("edition_clients")
          .delete()
          .eq("edition_id", edicion.id)
          .eq("client_id", clienteId)
      : await supabase.from("edition_clients").insert({
          edition_id: edicion.id,
          client_id: clienteId,
          workspace_id: espacioId,
        })
    setOcupado(false)
    if (err) {
      avisar(mensajeError(err), undefined, "mal")
      return
    }
    router.refresh()
  }

  /**
   * Un cliente nuevo desde la propia edicion: se crea si hace falta, se mete en
   * el proyecto y se marca aqui. Tener que subir a la lista del proyecto para
   * poder elegirlo era el paso de mas.
   */
  async function anadirCliente(texto: string) {
    const limpio = texto.trim()
    if (!limpio) return
    setOcupado(true)
    setError(null)
    const supabase = createClient()

    let id = clientes.find(
      (c) => c.name.toLowerCase() === limpio.toLowerCase(),
    )?.id

    if (!id) {
      const { data, error: errCrear } = await supabase
        .from("clients")
        .insert({ workspace_id: espacioId, name: limpio })
        .select("id")
        .single()
      if (errCrear || !data) {
        setOcupado(false)
        setError(mensajeError(errCrear))
        return
      }
      id = data.id
    }

    if (!delProyecto.includes(id)) {
      await supabase
        .from("project_clients")
        .insert({ project_id: proyectoId, client_id: id, workspace_id: espacioId })
    }
    if (edicion && !suyos.includes(id)) {
      await supabase
        .from("edition_clients")
        .insert({ edition_id: edicion.id, client_id: id, workspace_id: espacioId })
    }

    setOcupado(false)
    setNuevoCliente("")
    router.refresh()
  }

  async function marcarEnCurso() {
    setOcupado(true)
    const { error: err } = await createClient()
      .from("projects")
      .update({ default_edition_id: enCurso ? null : (edicion?.id ?? null) })
      .eq("id", proyectoId)
    setOcupado(false)
    if (err) {
      avisar(mensajeError(err), undefined, "mal")
      return
    }
    router.refresh()
  }

  async function archivar() {
    if (!edicion) return
    setOcupado(true)
    const { error: err } = await createClient()
      .from("project_editions")
      .update({ archived: !edicion.archived })
      .eq("id", edicion.id)
    setOcupado(false)
    if (err) {
      avisar(mensajeError(err), undefined, "mal")
      return
    }
    router.refresh()
  }

  return (
    <article
      className={cn(
        "card flex min-w-0 flex-col gap-3 p-4",
        edicion?.archived && "opacity-60",
      )}
    >
      <header className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold">
              {edicion?.name ?? "Sin edición"}
            </span>
            {enCurso && (
              <span className="chip shrink-0 border-live-line bg-live-soft text-live">
                en curso
              </span>
            )}
            {edicion?.archived && <span className="chip shrink-0">cerrada</span>}
          </h3>
          <p className="cifra mt-0.5 text-xs text-muted">
            {primera ? (
              <>
                {formatDateShort(primera)}
                {ultima !== primera && ` – ${formatDateShort(ultima!)}`}
              </>
            ) : (
              <span className="cifra-no">Todavía sin horas</span>
            )}
          </p>
        </div>

        {puedeGestionar && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void marcarEnCurso()}
              disabled={ocupado}
              aria-pressed={enCurso}
              title={
                enCurso
                  ? "Es lo que se pone al elegir el proyecto"
                  : edicion
                    ? "Marcarla como la edición en curso"
                    : "Al elegir el proyecto, no se pondrá ninguna edición"
              }
              className={cn(
                "rounded-[3px] p-1 transition",
                enCurso ? "text-live" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Star className={cn("h-3.5 w-3.5", enCurso && "fill-current")} />
            </button>
            {edicion && (
              <button
                type="button"
                onClick={() => void archivar()}
                disabled={ocupado}
                title={edicion.archived ? "Reabrir" : "Cerrar la edición"}
                aria-label={edicion.archived ? "Reabrir" : "Cerrar la edición"}
                className="rounded-[3px] p-1 text-muted transition hover:bg-surface-2 hover:text-ink"
              >
                {edicion.archived ? (
                  <RotateCcw className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-end gap-x-5 gap-y-1">
        <p>
          <span className="cifra text-xl font-semibold leading-none">
            {formatDurationShort(segundos)}
          </span>
          <span className="ml-1.5 text-xs text-muted">en total</span>
        </p>
        {cobrables > 0 && (
          <p className="text-xs text-muted">
            <span className="cifra text-billable">
              {formatDurationShort(cobrables)}
            </span>{" "}
            se cobran
          </p>
        )}
      </div>

      {/* --------------------------------------------------------- clientes */}
      <div className="min-w-0">
        <span className="label">
          {edicion ? "Clientes de la edición" : "Clientes del proyecto"}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {delProyecto.map((id) => {
            const cliente = clientes.find((c) => c.id === id)
            if (!cliente) return null
            const puesto = edicion ? suyos.includes(id) : true
            if (!edicion) {
              return (
                <span key={id} className="chip">
                  {cliente.name}
                </span>
              )
            }
            return (
              <button
                key={id}
                type="button"
                disabled={!puedeGestionar || ocupado}
                onClick={() => void alternarCliente(id)}
                aria-pressed={puesto}
                className={cn(
                  "chip transition",
                  puesto
                    ? "border-accent bg-accent-soft text-accent"
                    : "text-muted hover:border-line-strong",
                )}
              >
                {cliente.name}
              </button>
            )
          })}
        </div>

        {puedeGestionar && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void anadirCliente(nuevoCliente)
            }}
            className="mt-1.5 flex gap-1.5"
          >
            <input
              className="field h-8 py-0 text-sm"
              value={nuevoCliente}
              onChange={(e) => setNuevoCliente(e.target.value)}
              placeholder={edicion ? "Añadir un cliente a esta edición" : "Añadir un cliente"}
              aria-label="Añadir un cliente"
              list={`clientes-libres-${edicion?.id ?? "proyecto"}`}
            />
            <datalist id={`clientes-libres-${edicion?.id ?? "proyecto"}`}>
              {clientes
                .filter((c) => !c.archived)
                .map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
            </datalist>
            <button
              type="submit"
              disabled={ocupado || !nuevoCliente.trim()}
              className="btn h-8 shrink-0 px-2"
              aria-label="Añadir"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* -------------------------------------------------------- resultado */}
      {puedeVerImportes && (
        <div className="border-t border-line pt-3">
          {editando ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <div className="min-w-0 flex-1">
                  <label className="label" htmlFor={`ing-${edicion?.id ?? "sin"}`}>
                    Ingresos (€)
                  </label>
                  <input
                    id={`ing-${edicion?.id ?? "sin"}`}
                    autoFocus
                    className="field cifra h-8 py-0"
                    value={ingresos}
                    onChange={(e) => setIngresos(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="label" htmlFor={`gas-${edicion?.id ?? "sin"}`}>
                    Gastos (€)
                  </label>
                  <input
                    id={`gas-${edicion?.id ?? "sin"}`}
                    className="field cifra h-8 py-0"
                    value={gastos}
                    onChange={(e) => setGastos(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditando(false)}
                  className="btn h-8"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void guardar()}
                  disabled={ocupado}
                  className="btn btn-primary h-8"
                >
                  {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          ) : resultado ? (
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="min-w-0">
                <p className="cifra text-sm">
                  {formatMoney(Number(resultado.income))}
                  <span className="text-muted">
                    {" − "}
                    {formatMoney(Number(resultado.expenses))} ={" "}
                  </span>
                  <span className={cn("font-semibold", neto! < 0 && "text-danger")}>
                    {formatMoney(neto!)}
                  </span>
                </p>
                {porHora !== null && (
                  <p
                    className={cn(
                      "cifra text-lg font-semibold leading-tight",
                      llega === null ? "" : llega ? "text-billable" : "text-danger",
                    )}
                    title={
                      objetivoHora ? `Objetivo: ${objetivoHora} €/h` : undefined
                    }
                  >
                    {porHora.toLocaleString("es-ES", { maximumFractionDigits: 0 })}{" "}
                    €/h
                  </p>
                )}
              </div>
              {puedeGestionar && (
                <button type="button" onClick={abrir} className="btn h-8 text-xs">
                  Cambiar
                </button>
              )}
            </div>
          ) : (
            puedeGestionar && (
              <button type="button" onClick={abrir} className="btn h-8 w-full text-xs">
                <Euro className="h-3.5 w-3.5" />
                Apuntar el resultado
              </button>
            )
          )}
        </div>
      )}
    </article>
  )
}

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
  clienteProyecto,
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
  /** El cliente del proyecto: vale para lo que no tiene edición. */
  clienteProyecto: string | null
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
            clienteHeredado={clienteProyecto}
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
            clienteHeredado={clienteProyecto}
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
  clienteHeredado,
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
  clienteHeredado: string | null
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
  async function cambiarCliente(clienteId: string) {
    const antes = edicion ? edicion.client_id : clienteHeredado
    setOcupado(true)
    const supabase = createClient()
    const { error: err } = edicion
      ? await supabase
          .from("project_editions")
          .update({ client_id: clienteId || null })
          .eq("id", edicion.id)
      : await supabase
          .from("projects")
          .update({ client_id: clienteId || null })
          .eq("id", proyectoId)
    setOcupado(false)
    if (err) {
      avisar(mensajeError(err), undefined, "mal")
      return
    }
    router.refresh()
    avisar(
      edicion ? "Cliente de la edición cambiado." : "Cliente del proyecto cambiado.",
      async () => {
        const cliente = createClient()
        const { error: errVolver } = edicion
          ? await cliente
              .from("project_editions")
              .update({ client_id: antes })
              .eq("id", edicion.id)
          : await cliente
              .from("projects")
              .update({ client_id: antes })
              .eq("id", proyectoId)
        if (errVolver) throw new Error(mensajeError(errVolver))
        router.refresh()
        return "Como estaba."
      },
    )
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

  const clienteDeLaTarjeta = edicion
    ? (edicion.client_id ?? "")
    : (clienteHeredado ?? "")

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

        {puedeGestionar && edicion && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void marcarEnCurso()}
              disabled={ocupado}
              aria-pressed={enCurso}
              title={
                enCurso
                  ? "Es la edición en curso: se pone sola al elegir el proyecto"
                  : "Marcarla como la edición en curso"
              }
              className={cn(
                "rounded-[3px] p-1 transition",
                enCurso ? "text-live" : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Star className={cn("h-3.5 w-3.5", enCurso && "fill-current")} />
            </button>
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

      {/* --------------------------------------------------------- cliente */}
      <div className="min-w-0">
        <span className="label">
          Cliente{!edicion && <span className="text-muted"> del proyecto</span>}
        </span>
        {puedeGestionar ? (
          <SelectorCliente
            id={`cliente-ed-${edicion?.id ?? "proyecto"}`}
            espacioId={espacioId}
            clientes={clientes}
            valor={clienteDeLaTarjeta}
            onChange={(id) => void cambiarCliente(id)}
          />
        ) : (
          <p className="text-sm">
            {clientes.find((c) => c.id === clienteDeLaTarjeta)?.name ??
              "Sin cliente"}
          </p>
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

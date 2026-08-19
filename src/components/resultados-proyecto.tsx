"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useAvisos } from "@/components/avisos"
import { formatDateShort, formatDurationShort, formatMoney } from "@/lib/time"
import type { Edicion, EntradaVista } from "@/lib/tipos"
import { cn } from "@/lib/utils"

export type Resultado = {
  id: string
  edition_id: string | null
  label: string
  starts_on: string
  ends_on: string
  income: number
  expenses: number
  notes: string
}

/**
 * Lo que ha dejado un trabajo y lo que ha costado en horas.
 *
 * Aquí no se presupuesta ni se cobra por tarifa: se apunta lo que entró y lo
 * que salió cuando ya se sabe -al cerrar un evento, al terminar una
 * oportunidad, cada mes en lo recurrente- y la app dice a cuánto ha salido la
 * hora. Ese es el número que se mira: la facturación por hora.
 */
export function ResultadosProyecto({
  espacioId,
  proyectoId,
  ediciones,
  entradas,
  resultados,
  objetivoHora,
  puedeGestionar,
}: {
  espacioId: string
  proyectoId: string
  ediciones: Edicion[]
  entradas: EntradaVista[]
  resultados: Resultado[]
  /** Facturación por hora a la que se aspira. En LEINN, 17 €/h. */
  objetivoHora: number | null
  puedeGestionar: boolean
}) {
  const router = useRouter()
  const { avisar } = useAvisos()
  const [anadiendo, setAnadiendo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Las horas que costó cada cierre: por edición si la hay, y si no por fecha.
   * Solo cuentan las que llevan el euro: son las que se han hecho para ganar
   * ese dinero, y son las que tienen que salir a la facturación por hora.
   */
  const horasDe = useMemo(() => {
    return (resultado: Resultado) => {
      const dentro = entradas.filter((e) => {
        if (!e.end_at || !e.billable) return false
        if (resultado.edition_id) return e.edition_id === resultado.edition_id
        return e.local_date >= resultado.starts_on && e.local_date <= resultado.ends_on
      })
      return dentro.reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
    }
  }, [entradas])

  const filas = useMemo(
    () =>
      resultados.map((r) => {
        const segundos = horasDe(r)
        const horas = segundos / 3600
        const neto = Number(r.income) - Number(r.expenses)
        return {
          ...r,
          segundos,
          neto,
          porHora: horas > 0 ? Number(r.income) / horas : null,
          netoPorHora: horas > 0 ? neto / horas : null,
        }
      }),
    [resultados, horasDe],
  )

  const total = useMemo(() => {
    const ingresos = filas.reduce((s, f) => s + Number(f.income), 0)
    const gastos = filas.reduce((s, f) => s + Number(f.expenses), 0)
    const segundos = filas.reduce((s, f) => s + f.segundos, 0)
    const horas = segundos / 3600
    return {
      ingresos,
      gastos,
      neto: ingresos - gastos,
      segundos,
      porHora: horas > 0 ? ingresos / horas : null,
    }
  }, [filas])

  async function borrar(resultado: Resultado) {
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient()
      .from("project_results")
      .delete()
      .eq("id", resultado.id)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
    avisar("Cierre borrado.", async () => {
      const { id: _fuera, ...devolver } = resultado
      const { error: errVolver } = await createClient()
        .from("project_results")
        .insert({ ...devolver, id: resultado.id, workspace_id: espacioId, project_id: proyectoId })
      if (errVolver) throw new Error(mensajeError(errVolver))
      router.refresh()
      return "Recuperado."
    })
  }

  return (
    <section className="card min-w-0 p-4">
      <h2 className="mb-1 text-sm font-semibold">Resultado</h2>
      <p className="mb-4 max-w-xl text-sm text-muted">
        Lo que entró y lo que salió en cada cierre, y a cuánto sale la hora
        facturable. Un evento se cierra al acabar, una oportunidad cuando se
        cobra y lo recurrente, cada mes.
      </p>

      {total.porHora !== null && (
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Rueda valor={total.porHora} objetivo={objetivoHora} />
          <div className="min-w-0 space-y-0.5 text-sm">
            <p>
              <span className="cifra font-semibold">
                {formatMoney(total.ingresos)}
              </span>{" "}
              <span className="text-muted">facturado</span>
            </p>
            <p className="text-muted">
              en{" "}
              <span className="cifra">{formatDurationShort(total.segundos)}</span>{" "}
              de horas que se cobran
            </p>
            <p className={cn("text-muted", total.neto < 0 && "text-danger")}>
              {formatMoney(total.neto)} después de gastos
            </p>
          </div>
        </div>
      )}

      {filas.length > 0 && (
        <div className="scroll-thin -mx-1 overflow-x-auto px-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-full max-w-0 py-2 pr-3 font-semibold">Cierre</th>
                <th className="py-2 pr-3 text-right font-semibold">Ingresos</th>
                <th className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">
                  Gastos
                </th>
                <th className="hidden py-2 pr-3 text-right font-semibold sm:table-cell">
                  Resultado
                </th>
                <th className="py-2 pr-3 text-right font-semibold">Horas</th>
                <th className="py-2 text-right font-semibold">€/h</th>
                {puedeGestionar && <th className="w-8 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filas.map((fila) => (
                <tr key={fila.id}>
                  <td className="w-full max-w-0 py-2 pr-3">
                    <p className="truncate font-medium">
                      {fila.label ||
                        ediciones.find((e) => e.id === fila.edition_id)?.name ||
                        "Sin nombre"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatDateShort(fila.starts_on)} –{" "}
                      {formatDateShort(fila.ends_on)}
                      <span className="sm:hidden">
                        {" · "}
                        {formatMoney(fila.neto)} de resultado
                      </span>
                    </p>
                  </td>
                  <td className="tabular whitespace-nowrap py-2 pr-3 text-right">
                    {formatMoney(Number(fila.income))}
                  </td>
                  <td className="tabular hidden whitespace-nowrap py-2 pr-3 text-right text-muted sm:table-cell">
                    {formatMoney(Number(fila.expenses))}
                  </td>
                  <td
                    className={cn(
                      "tabular hidden whitespace-nowrap py-2 pr-3 text-right font-medium sm:table-cell",
                      fila.neto < 0 && "text-danger",
                    )}
                  >
                    {formatMoney(fila.neto)}
                  </td>
                  <td className="tabular whitespace-nowrap py-2 pr-3 text-right text-muted">
                    {formatDurationShort(fila.segundos)}
                  </td>
                  <td className="py-2 text-right">
                    {fila.porHora === null ? (
                      <span className="text-muted">-</span>
                    ) : (
                      <PorHora valor={fila.porHora} objetivo={objetivoHora} />
                    )}
                  </td>
                  {puedeGestionar && (
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => void borrar(fila)}
                        aria-label="Borrar este cierre"
                        className="rounded-[3px] p-1 text-muted transition hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {filas.length > 1 && (
              <tfoot>
                <tr className="border-t border-line font-medium">
                  <td className="py-2 pr-3">Todo junto</td>
                  <td className="tabular py-2 pr-3 text-right">
                    {formatMoney(total.ingresos)}
                  </td>
                  <td className="tabular hidden py-2 pr-3 text-right text-muted sm:table-cell">
                    {formatMoney(total.gastos)}
                  </td>
                  <td
                    className={cn(
                      "tabular hidden py-2 pr-3 text-right sm:table-cell",
                      total.neto < 0 && "text-danger",
                    )}
                  >
                    {formatMoney(total.neto)}
                  </td>
                  <td className="tabular py-2 pr-3 text-right text-muted">
                    {formatDurationShort(total.segundos)}
                  </td>
                  <td className="py-2 text-right">
                    {total.porHora !== null && (
                      <PorHora valor={total.porHora} objetivo={objetivoHora} />
                    )}
                  </td>
                  {puedeGestionar && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {filas.length === 0 && !anadiendo && (
        <p className="py-2 text-sm text-muted">
          Todavía no hay ningún cierre apuntado.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {puedeGestionar &&
        (anadiendo ? (
          <FormularioCierre
            espacioId={espacioId}
            proyectoId={proyectoId}
            ediciones={ediciones}
            onHecho={() => {
              setAnadiendo(false)
              router.refresh()
            }}
            onCancelar={() => setAnadiendo(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAnadiendo(true)}
            className="btn mt-3"
          >
            <Plus className="h-4 w-4" />
            Apuntar un cierre
          </button>
        ))}
    </section>
  )
}

/**
 * La facturación por hora en un círculo: lo que llevas del objetivo. Se pasa
 * de vuelta si lo superas, que es justo lo que se quiere ver.
 */
function Rueda({ valor, objetivo }: { valor: number; objetivo: number | null }) {
  const meta = objetivo && objetivo > 0 ? objetivo : null
  const parte = meta ? Math.min(1, valor / meta) : 1
  const radio = 34
  const vuelta = 2 * Math.PI * radio
  const llega = meta === null ? null : valor >= meta

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={radio}
          fill="none"
          strokeWidth="8"
          className="stroke-surface-2"
        />
        <circle
          cx="40"
          cy="40"
          r={radio}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${vuelta * parte} ${vuelta}`}
          className={cn(
            "transition-all",
            llega === false ? "stroke-danger" : "stroke-billable",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "cifra text-base font-semibold leading-none",
            llega === false && "text-danger",
            llega === true && "text-billable",
          )}
        >
          {valor.toLocaleString("es-ES", { maximumFractionDigits: 0 })}
        </span>
        <span className="text-[10px] leading-tight text-muted">€/h</span>
        {meta !== null && (
          <span className="text-[10px] leading-tight text-muted">de {meta}</span>
        )}
      </div>
    </div>
  )
}

/** El número que se mira, con su verde o su rojo según el objetivo. */
function PorHora({
  valor,
  objetivo,
  grande = false,
}: {
  valor: number
  objetivo: number | null
  grande?: boolean
}) {
  const llega = objetivo === null ? null : valor >= objetivo
  return (
    <span
      className={cn(
        "cifra whitespace-nowrap font-semibold",
        grande ? "text-lg" : "text-sm",
        llega === null ? "" : llega ? "text-billable" : "text-danger",
      )}
      title={
        objetivo === null
          ? "Facturación por hora"
          : `Objetivo del equipo: ${objetivo} €/h`
      }
    >
      {valor.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €/h
    </span>
  )
}

/* ------------------------------------------------------------ apuntar uno */

function FormularioCierre({
  espacioId,
  proyectoId,
  ediciones,
  onHecho,
  onCancelar,
}: {
  espacioId: string
  proyectoId: string
  ediciones: Edicion[]
  onHecho: () => void
  onCancelar: () => void
}) {
  const hoy = new Date().toISOString().slice(0, 10)
  const [edicion, setEdicion] = useState("")
  const [etiqueta, setEtiqueta] = useState("")
  const [desde, setDesde] = useState(hoy.slice(0, 8) + "01")
  const [hasta, setHasta] = useState(hoy)
  const [ingresos, setIngresos] = useState("")
  const [gastos, setGastos] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Elegir la edición rellena el nombre y las fechas: casi siempre valen. */
  function elegirEdicion(id: string) {
    setEdicion(id)
    const suya = ediciones.find((e) => e.id === id)
    if (!suya) return
    if (!etiqueta.trim()) setEtiqueta(suya.name)
    if (suya.starts_on) setDesde(suya.starts_on)
    if (suya.ends_on) setHasta(suya.ends_on)
  }

  function aNumero(texto: string) {
    const limpio = texto.trim().replace(/\s|€/g, "").replace(",", ".")
    if (!limpio) return 0
    const valor = Number(limpio)
    return Number.isFinite(valor) ? valor : null
  }

  async function guardar() {
    const entra = aNumero(ingresos)
    const sale = aNumero(gastos)
    if (entra === null || sale === null) {
      setError("Los importes tienen que ser números, como 1250 o 1250,50.")
      return
    }
    if (hasta < desde) {
      setError("El final no puede ser anterior al principio.")
      return
    }

    setGuardando(true)
    setError(null)
    const { error: err } = await createClient().from("project_results").insert({
      workspace_id: espacioId,
      project_id: proyectoId,
      edition_id: edicion || null,
      label: etiqueta.trim(),
      starts_on: desde,
      ends_on: hasta,
      income: entra,
      expenses: sale,
    })
    setGuardando(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    onHecho()
  }

  return (
    <div className="mt-3 space-y-3 border-t border-line pt-3">
      {ediciones.length > 0 && (
        <div>
          <label className="label" htmlFor="cierre-edicion">
            Edición
          </label>
          <select
            id="cierre-edicion"
            className="field"
            value={edicion}
            onChange={(e) => elegirEdicion(e.target.value)}
          >
            <option value="">Todo el proyecto</option>
            {ediciones.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label" htmlFor="cierre-etiqueta">
          Qué se cierra
        </label>
        <input
          id="cierre-etiqueta"
          className="field"
          value={etiqueta}
          onChange={(e) => setEtiqueta(e.target.value)}
          placeholder="Evento de mayo, junio 2026, la venta a Konsultek..."
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cierre-desde">
            Desde
          </label>
          <input
            id="cierre-desde"
            type="date"
            className="field tabular"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="cierre-hasta">
            Hasta
          </label>
          <input
            id="cierre-hasta"
            type="date"
            className="field tabular"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="cierre-ingresos">
            Ingresos (€)
          </label>
          <input
            id="cierre-ingresos"
            className="field cifra"
            value={ingresos}
            onChange={(e) => setIngresos(e.target.value)}
            placeholder="0"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="label" htmlFor="cierre-gastos">
            Gastos (€)
          </label>
          <input
            id="cierre-gastos"
            className="field cifra"
            value={gastos}
            onChange={(e) => setGastos(e.target.value)}
            placeholder="0"
            inputMode="decimal"
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="btn">
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={guardando}
          className="btn btn-primary"
        >
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar el cierre
        </button>
      </div>
    </div>
  )
}

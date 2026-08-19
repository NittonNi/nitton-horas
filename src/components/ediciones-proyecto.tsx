"use client"

import { Fragment, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  CalendarRange,
  Euro,
  Loader2,
  Plus,
  RotateCcw,
  Star,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import {
  formatDateShort,
  formatDurationShort,
  formatMoney,
  todayKey,
} from "@/lib/time"
import type { Edicion, EntradaVista } from "@/lib/tipos"
import type { Resultado } from "@/components/resultados-proyecto"
import { cn } from "@/lib/utils"

/**
 * Un evento que se repite -TBCE 1, TBCE 2- es el mismo proyecto en dos años, no
 * dos proyectos. Las ediciones lo separan sin tocar las tareas, que se
 * necesitan para lo que son.
 */
export function EdicionesProyecto({
  espacioId,
  proyectoId,
  ediciones,
  entradas,
  resultados,
  objetivoHora,
  predeterminada,
  puedeGestionar,
}: {
  espacioId: string
  proyectoId: string
  ediciones: Edicion[]
  entradas: EntradaVista[]
  /** Lo que dejo cada edicion: se apunta y se corrige aqui mismo. */
  resultados: Resultado[]
  objetivoHora: number | null
  /** La edicion en curso: se preselecciona al elegir el proyecto. */
  predeterminada: string | null
  puedeGestionar: boolean
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")
  const [presupuesto, setPresupuesto] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)
  // Que edicion se esta cerrando, y con que numeros
  const [cerrando, setCerrando] = useState<string | null>(null)
  const [ingresos, setIngresos] = useState("")
  const [gastos, setGastos] = useState("")

  const visibles = ediciones.filter((e) => verArchivadas || !e.archived)
  const archivadas = ediciones.filter((e) => e.archived).length
  const sinEdicion = entradas.filter((e) => !e.edition_id)

  function segundosDe(edicionId: string | null) {
    return entradas
      .filter((e) => e.edition_id === edicionId)
      .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  }

  /** Las horas que se cobran de una edicion: son las que hacen el €/h. */
  function facturablesDe(edicionId: string) {
    return entradas
      .filter((e) => e.edition_id === edicionId && e.billable)
      .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  }

  const resultadoDe = (edicionId: string) =>
    resultados.find((r) => r.edition_id === edicionId) ?? null

  /**
   * De cuando a cuando fue una edicion de verdad: la primera hora que se
   * apunto y la ultima. No hace falta escribir fechas a mano -y no se olvidan
   * ni se quedan desfasadas- porque el trabajo ya las dice.
   */
  function cuandoFue(edicionId: string) {
    const dias = entradas
      .filter((e) => e.edition_id === edicionId)
      .map((e) => e.local_date)
      .sort()
    if (dias.length === 0) return null
    return { primera: dias[0], ultima: dias[dias.length - 1] }
  }

  function aNumero(texto: string) {
    const limpio = texto.trim().replace(/\s|€/g, "").replace(",", ".")
    if (!limpio) return 0
    const valor = Number(limpio)
    return Number.isFinite(valor) ? valor : null
  }

  function abrirCierre(edicion: Edicion) {
    const cierre = resultadoDe(edicion.id)
    setIngresos(cierre ? String(cierre.income) : "")
    setGastos(cierre ? String(cierre.expenses) : "")
    setCerrando(edicion.id)
    setError(null)
  }

  /**
   * El resultado de una edicion se apunta y se corrige aqui mismo: casi
   * siempre se va sabiendo sobre la marcha y no de golpe al final.
   */
  async function guardarCierre(edicion: Edicion) {
    const entra = aNumero(ingresos)
    const sale = aNumero(gastos)
    if (entra === null || sale === null) {
      setError("Los importes tienen que ser números, como 1250 o 1250,50.")
      return
    }

    const cuando = cuandoFue(edicion.id)
    const cierre = resultadoDe(edicion.id)
    setOcupado(true)
    setError(null)
    const supabase = createClient()

    const { error: err } = cierre
      ? await supabase
          .from("project_results")
          .update({ income: entra, expenses: sale })
          .eq("id", cierre.id)
      : await supabase.from("project_results").insert({
          workspace_id: espacioId,
          project_id: proyectoId,
          edition_id: edicion.id,
          label: edicion.name,
          starts_on: cuando?.primera ?? edicion.starts_on ?? todayKey(),
          ends_on: cuando?.ultima ?? edicion.ends_on ?? todayKey(),
          income: entra,
          expenses: sale,
        })

    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setCerrando(null)
    router.refresh()
  }

  /** Marcar -o desmarcar- la edicion en la que se esta trabajando ahora. */
  async function enCurso(edicion: Edicion) {
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient()
      .from("projects")
      .update({
        default_edition_id: predeterminada === edicion.id ? null : edicion.id,
      })
      .eq("id", proyectoId)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) return
    const horas = presupuesto.trim().replace(",", ".")
    if (horas && Number.isNaN(Number(horas))) {
      setError("El presupuesto tiene que ser un número de horas.")
      return
    }

    setOcupado(true)
    setError(null)
    const { error: err } = await createClient().from("project_editions").insert({
      workspace_id: espacioId,
      project_id: proyectoId,
      name: limpio,
      starts_on: desde || null,
      ends_on: hasta || null,
      budget_hours: horas ? Number(horas) : null,
      position: ediciones.length,
    })
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setNombre("")
    setDesde("")
    setHasta("")
    setPresupuesto("")
    router.refresh()
  }

  async function archivar(edicion: Edicion) {
    setOcupado(true)
    setError(null)
    const { error: err } = await createClient()
      .from("project_editions")
      .update({ archived: !edicion.archived })
      .eq("id", edicion.id)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  return (
    <section className="card p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarRange className="h-4 w-4 text-muted" aria-hidden />
          Ediciones
        </h2>
        {archivadas > 0 && (
          <button
            type="button"
            onClick={() => setVerArchivadas((v) => !v)}
            className="text-xs font-medium text-muted transition hover:text-ink"
          >
            {verArchivadas ? "Ocultar" : "Ver"} archivadas ({archivadas})
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-muted">
        Para lo que se repite: TBCE 1 y TBCE 2 son el mismo proyecto en dos
        años. Al apuntar horas se elige a cuál van.
      </p>

      {error && (
        <p className="mb-3 rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {visibles.length === 0 ? (
        <p className="py-2 text-sm text-muted">
          Todavía no hay ediciones. Sin ellas el proyecto funciona igual que
          siempre.
        </p>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Edición</th>
              <th className="th">Fechas</th>
              <th className="th text-right">Horas</th>
              <th className="th text-right">Resultado</th>
              <th className="th text-right">€/h</th>
              {puedeGestionar && <th className="th" />}
            </tr>
          </thead>
          <tbody>
            {visibles.map((edicion) => {
              const segundos = segundosDe(edicion.id)
              const cierre = resultadoDe(edicion.id)
              const neto = cierre
                ? Number(cierre.income) - Number(cierre.expenses)
                : null
              const cobrables = facturablesDe(edicion.id) / 3600
              const porHora =
                cierre && cobrables > 0 ? Number(cierre.income) / cobrables : null
              return (
                <Fragment key={edicion.id}>
                <tr
                  className={cn(
                    "border-b border-line last:border-0",
                    edicion.archived && "opacity-55",
                  )}
                >
                  <td className="py-2 pr-3 text-sm font-medium">{edicion.name}</td>
                  <td className="py-2 pr-3 text-sm text-muted">
                    {(() => {
                      const real = cuandoFue(edicion.id)
                      if (real) {
                        return (
                          <span title="De la primera hora apuntada a la última">
                            {formatDateShort(real.primera)}
                            {real.ultima !== real.primera &&
                              " – " + formatDateShort(real.ultima)}
                          </span>
                        )
                      }
                      if (edicion.starts_on) {
                        return (
                          <span title="Previsto: todavía no hay horas apuntadas">
                            {formatDateShort(edicion.starts_on)}
                            {edicion.ends_on &&
                              " – " + formatDateShort(edicion.ends_on)}
                          </span>
                        )
                      }
                      return "—"
                    })()}
                  </td>
                  <td className="cifra py-2 pr-3 text-right text-sm">
                    {formatDurationShort(segundos)}
                  </td>
                  <td className="cifra py-2 pr-3 text-right text-sm">
                    {cierre ? (
                      <span className={cn(neto !== null && neto < 0 && "text-danger")}>
                        {formatMoney(neto ?? 0)}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="cifra py-2 text-right text-sm">
                    {porHora === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span
                        className={cn(
                          "font-semibold",
                          objetivoHora === null
                            ? ""
                            : porHora >= objetivoHora
                              ? "text-billable"
                              : "text-danger",
                        )}
                        title={
                          objetivoHora
                            ? `Objetivo del equipo: ${objetivoHora} €/h`
                            : undefined
                        }
                      >
                        {porHora.toLocaleString("es-ES", {
                          maximumFractionDigits: 0,
                        })}{" "}
                        €/h
                      </span>
                    )}
                  </td>
                  {puedeGestionar && (
                    <td className="flex items-center justify-end gap-1 py-2 pl-2 text-right">
                      <button
                        type="button"
                        onClick={() => abrirCierre(edicion)}
                        disabled={ocupado}
                        className={cn(
                          "rounded-[4px] p-1 transition disabled:opacity-40",
                          cierre
                            ? "text-billable"
                            : "text-muted hover:bg-surface-2 hover:text-ink",
                        )}
                        title={
                          cierre
                            ? "Cambiar el resultado de esta edición"
                            : "Apuntar el resultado de esta edición"
                        }
                        aria-label="Resultado de la edición"
                      >
                        <Euro className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void enCurso(edicion)}
                        disabled={ocupado}
                        className={cn(
                          "rounded-[4px] p-1 transition disabled:opacity-40",
                          edicion.id === predeterminada
                            ? "text-live"
                            : "text-muted hover:bg-surface-2 hover:text-ink",
                        )}
                        aria-pressed={edicion.id === predeterminada}
                        title={
                          edicion.id === predeterminada
                            ? "Es la edición en curso: se pone sola al elegir el proyecto"
                            : "Marcarla como la edición en curso"
                        }
                      >
                        <Star
                          className={cn(
                            "h-3.5 w-3.5",
                            edicion.id === predeterminada && "fill-current",
                          )}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => void archivar(edicion)}
                        disabled={ocupado}
                        className="rounded-[4px] p-1 text-muted transition hover:bg-surface-2 hover:text-ink disabled:opacity-40"
                        aria-label={edicion.archived ? "Reactivar" : "Archivar"}
                        title={edicion.archived ? "Reactivar" : "Archivar"}
                      >
                        {edicion.archived ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  )}
                </tr>

                {cerrando === edicion.id && (
                  <tr className="border-b border-line bg-surface-2/60">
                    <td colSpan={puedeGestionar ? 6 : 5} className="px-1 py-3">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="w-32">
                          <label className="label" htmlFor={`ing-${edicion.id}`}>
                            Ingresos (€)
                          </label>
                          <input
                            id={`ing-${edicion.id}`}
                            autoFocus
                            className="field cifra h-8 py-0"
                            value={ingresos}
                            onChange={(e) => setIngresos(e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                          />
                        </div>
                        <div className="w-32">
                          <label className="label" htmlFor={`gas-${edicion.id}`}>
                            Gastos (€)
                          </label>
                          <input
                            id={`gas-${edicion.id}`}
                            className="field cifra h-8 py-0"
                            value={gastos}
                            onChange={(e) => setGastos(e.target.value)}
                            inputMode="decimal"
                            placeholder="0"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void guardarCierre(edicion)}
                          disabled={ocupado}
                          className="btn btn-primary h-8"
                        >
                          {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setCerrando(null)}
                          className="btn h-8"
                        >
                          Cancelar
                        </button>
                        <p className="w-full text-xs text-muted">
                          Se puede ir corrigiendo según avanza la edición. Las
                          horas y las fechas salen solas de lo apuntado.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
            {sinEdicion.length > 0 && (
              <tr className="border-t border-line">
                <td className="py-2 pr-3 text-sm text-muted" colSpan={2}>
                  Sin edicion ({sinEdicion.length})
                </td>
                <td className="cifra py-2 pr-3 text-right text-sm text-muted">
                  {formatDurationShort(segundosDe(null))}
                </td>
                <td colSpan={puedeGestionar ? 2 : 1} />
              </tr>
            )}
          </tbody>
        </table>
      )}

      {puedeGestionar && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void crear()
          }}
          className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto]"
        >
          <input
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="TBCE 2"
            aria-label="Nombre de la edición"
          />
          <input
            type="date"
            className="field"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            aria-label="Empieza"
          />
          <input
            type="date"
            className="field"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            aria-label="Termina"
          />
          <input
            className="field cifra"
            value={presupuesto}
            onChange={(e) => setPresupuesto(e.target.value)}
            placeholder="Horas"
            inputMode="decimal"
            aria-label="Presupuesto de horas"
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
    </section>
  )
}

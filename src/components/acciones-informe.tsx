"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Euro, Loader2, Lock, LockOpen, Tag, Trash2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import {
  SelectorProyecto,
  type Seleccion,
} from "@/components/selector-proyecto"
import { formatDurationShort } from "@/lib/time"
import type { TablesUpdate } from "@/lib/database.types"
import type { Catalogo, EntradaVista } from "@/lib/tipos"

/**
 * Lo que se puede hacer con varias horas a la vez desde los informes: es donde
 * se ven los fallos -alguien apunto en el proyecto que no era, media semana sin
 * marcar como facturable- y donde tiene sentido arreglarlos de una tacada.
 */
export function AccionesInforme({
  seleccionadas,
  catalogo,
  puedeBloquear,
  onListo,
  onLimpiar,
}: {
  seleccionadas: EntradaVista[]
  catalogo: Catalogo
  /** Cerrar horas ya facturadas es cosa de quien administra. */
  puedeBloquear: boolean
  /**
   * Se llama al terminar, con lo que ha pasado y con la forma de deshacerlo.
   * Nada de esto se avisa dos veces: se hace, se cuenta y se ofrece la vuelta
   * atras mientras siga en pantalla.
   */
  onListo: (mensaje: string, deshacer?: () => Promise<string>) => void
  onLimpiar: () => void
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [etiquetaId, setEtiquetaId] = useState("")
  // Borrar se pregunta aqui mismo: una ventana del navegador corta el paso
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false)

  const ids = seleccionadas.map((e) => e.id)
  const segundos = seleccionadas.reduce(
    (s, e) => s + (e.duration_seconds ?? 0),
    0,
  )

  /** Todas las tocan por igual: si algo falla, se dice y no se sigue. */
  async function hacer(
    trabajo: (s: ReturnType<typeof createClient>) => PromiseLike<{ error: unknown }>,
    mensaje: (n: number) => string,
    deshacer?: () => Promise<string>,
  ) {
    setOcupado(true)
    setError(null)
    const { error: err } = await trabajo(createClient())
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    onListo(mensaje(ids.length), deshacer)
    onLimpiar()
    router.refresh()
  }

  /** Devuelve cada fila a como estaba, una por una: son pocas y van seguras. */
  function restaurar(
    antes: (TablesUpdate<"time_entries"> & { id: string })[],
    contado: string,
  ) {
    return async () => {
      const supabase = createClient()
      for (const { id, ...campos } of antes) {
        const { error: err } = await supabase
          .from("time_entries")
          .update(campos)
          .eq("id", id)
        if (err) throw new Error(mensajeError(err))
      }
      return contado
    }
  }

  function cambiarProyecto(sel: Seleccion) {
    const proyecto = catalogo.proyectos.find((p) => p.id === sel.project_id)
    const antes = seleccionadas.map((e) => ({
      id: e.id,
      project_id: e.project_id,
      task_id: e.task_id,
      edition_id: e.edition_id,
    }))
    void hacer(
      (s) =>
        s
          .from("time_entries")
          .update({
            project_id: sel.project_id,
            task_id: sel.task_id,
            edition_id: sel.edition_id,
          })
          .in("id", ids),
      (n) =>
        n === 1
          ? `Movida a ${proyecto?.name ?? "sin proyecto"}.`
          : `${n} horas movidas a ${proyecto?.name ?? "sin proyecto"}.`,
      restaurar(antes, "Devueltas a su proyecto de antes."),
    )
  }

  function marcarFacturable(billable: boolean) {
    const antes = seleccionadas.map((e) => ({ id: e.id, billable: e.billable }))
    void hacer(
      (s) => s.from("time_entries").update({ billable }).in("id", ids),
      (n) =>
        billable
          ? n === 1
            ? "1 hora marcada como facturable."
            : `${n} horas marcadas como facturables.`
          : n === 1
            ? "1 hora que ya no se cobra."
            : `${n} horas que ya no se cobran.`,
      restaurar(antes, "Vuelven a estar como estaban."),
    )
  }

  function ponerEtiqueta(quitar: boolean) {
    if (!etiquetaId) return
    const etiqueta = catalogo.etiquetas.find((t) => t.id === etiquetaId)
    // Solo se deshace lo que de verdad cambio: quien ya la tenia se queda igual
    const tocadas = seleccionadas
      .filter((e) => e.tags.includes(etiqueta?.name ?? "") === quitar)
      .map((e) => e.id)

    const volver = async () => {
      const supabase = createClient()
      const { error: err } = quitar
        ? await supabase.from("time_entry_tags").upsert(
            tocadas.map((entry_id) => ({ entry_id, tag_id: etiquetaId })),
            { onConflict: "entry_id,tag_id", ignoreDuplicates: true },
          )
        : await supabase
            .from("time_entry_tags")
            .delete()
            .eq("tag_id", etiquetaId)
            .in("entry_id", tocadas)
      if (err) throw new Error(mensajeError(err))
      return quitar
        ? `Devuelta «${etiqueta?.name}» a su sitio.`
        : `Quitada «${etiqueta?.name}» otra vez.`
    }

    void hacer(
      (s) =>
        quitar
          ? s
              .from("time_entry_tags")
              .delete()
              .eq("tag_id", etiquetaId)
              .in("entry_id", ids)
          : s.from("time_entry_tags").upsert(
              ids.map((entry_id) => ({ entry_id, tag_id: etiquetaId })),
              { onConflict: "entry_id,tag_id", ignoreDuplicates: true },
            ),
      (n) =>
        quitar
          ? `Quitada «${etiqueta?.name}» de ${n} ${n === 1 ? "hora" : "horas"}.`
          : `Puesta «${etiqueta?.name}» en ${n} ${n === 1 ? "hora" : "horas"}.`,
      tocadas.length > 0 ? volver : undefined,
    )
  }

  /** Una hora cerrada no la puede tocar ni quien la apunto: es lo que hace
      falta cuando la semana ya esta facturada. */
  function bloquear(locked: boolean) {
    const antes = seleccionadas.map((e) => ({ id: e.id, locked: e.locked }))
    void hacer(
      (s) => s.from("time_entries").update({ locked }).in("id", ids),
      (n) =>
        locked
          ? n === 1
            ? "1 hora cerrada: ya no se puede tocar."
            : `${n} horas cerradas: ya no se pueden tocar.`
          : n === 1
            ? "1 hora abierta otra vez."
            : `${n} horas abiertas otra vez.`,
      restaurar(antes, "Vuelven a estar como estaban."),
    )
  }

  async function borrar() {
    setOcupado(true)
    setError(null)
    const supabase = createClient()

    /* Antes de borrar se guarda la fila entera y sus etiquetas: es la unica
       forma de devolverlas tal cual, con su origen y su `external_id` -que es
       lo que evita que el importador de Clockify las duplique despues-. */
    const [{ data: filas, error: errLeer }, { data: etiquetas }] = await Promise.all([
      supabase.from("time_entries").select("*").in("id", ids),
      supabase.from("time_entry_tags").select("entry_id, tag_id").in("entry_id", ids),
    ])

    if (errLeer || !filas) {
      setOcupado(false)
      setError(mensajeError(errLeer))
      return
    }

    const volver = async () => {
      const cliente = createClient()
      const { error: errFilas } = await cliente.from("time_entries").insert(
        filas.map(({ duration_seconds: _fuera, ...fila }) => fila),
      )
      if (errFilas) throw new Error(mensajeError(errFilas))
      if (etiquetas && etiquetas.length > 0) {
        await cliente.from("time_entry_tags").insert(etiquetas)
      }
      return filas.length === 1
        ? "Recuperada la hora borrada."
        : `Recuperadas las ${filas.length} horas.`
    }

    setOcupado(false)
    void hacer(
      (s) => s.from("time_entries").delete().in("id", ids),
      (n) => `${n} ${n === 1 ? "hora borrada" : "horas borradas"}.`,
      volver,
    )
  }

  return (
    <div className="no-print sticky top-16 z-10 mb-3 rounded-[var(--radio)] border border-accent/40 bg-accent-soft p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm font-medium">
          {seleccionadas.length}{" "}
          {seleccionadas.length === 1 ? "hora elegida" : "horas elegidas"}
          <span className="cifra ml-2 font-normal text-ink-soft">
            {formatDurationShort(segundos)}
          </span>
        </p>

        <span className="hidden h-5 w-px bg-line sm:block" />

        <div className="w-52">
          <SelectorProyecto
            catalogo={catalogo}
            compacto
            valor={{ project_id: null, task_id: null, edition_id: null }}
            onChange={cambiarProyecto}
          />
        </div>

        <button
          type="button"
          onClick={() => marcarFacturable(true)}
          disabled={ocupado}
          className="btn h-8 border-billable-line bg-billable-soft py-0 text-billable"
        >
          <Euro className="h-3.5 w-3.5" />
          Se cobra
        </button>
        <button
          type="button"
          onClick={() => marcarFacturable(false)}
          disabled={ocupado}
          className="btn h-8 py-0"
        >
          No se cobra
        </button>

        <div className="flex items-center gap-1">
          <Tag className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
          <select
            className="field h-8 w-36 py-0 text-xs"
            value={etiquetaId}
            onChange={(e) => setEtiquetaId(e.target.value)}
            aria-label="Etiqueta"
          >
            <option value="">Etiqueta...</option>
            {catalogo.etiquetas
              .filter((t) => !t.archived)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => ponerEtiqueta(false)}
            disabled={ocupado || !etiquetaId}
            className="btn h-8 px-2 py-0 text-xs"
          >
            Poner
          </button>
          <button
            type="button"
            onClick={() => ponerEtiqueta(true)}
            disabled={ocupado || !etiquetaId}
            className="btn h-8 px-2 py-0 text-xs"
          >
            Quitar
          </button>
        </div>

        {puedeBloquear && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => bloquear(true)}
              disabled={ocupado}
              title="Cerrarlas: ni quien las apuntó podrá tocarlas"
              className="btn h-8 px-2 py-0 text-xs"
            >
              <Lock className="h-3.5 w-3.5" />
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => bloquear(false)}
              disabled={ocupado}
              title="Volver a abrirlas"
              className="btn h-8 px-2 py-0 text-xs"
            >
              <LockOpen className="h-3.5 w-3.5" />
              Abrir
            </button>
          </div>
        )}

        {confirmandoBorrado ? (
          <span className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setConfirmandoBorrado(false)
                void borrar()
              }}
              disabled={ocupado}
              className="btn btn-danger h-8 py-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Sí, borrar {seleccionadas.length === 1 ? "la hora" : "las horas"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoBorrado(false)}
              className="btn btn-ghost h-8 py-0 text-muted"
            >
              Mejor no
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoBorrado(true)}
            disabled={ocupado}
            className="btn btn-danger h-8 py-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Borrar
          </button>
        )}

        <button
          type="button"
          onClick={onLimpiar}
          className="btn btn-ghost ml-auto h-8 py-0 text-muted"
        >
          <X className="h-3.5 w-3.5" />
          Quitar la selección
        </button>

        {ocupado && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
      </div>

      {error && (
        <p className="mt-2 rounded-[var(--radio-sm)] bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      <p className="mt-2 text-xs text-muted">
        Elegir un proyecto arriba mueve todas de golpe. Solo se tocan las horas
        que puedas editar, y lo último se puede deshacer.
      </p>
    </div>
  )
}

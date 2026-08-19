"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useAvisos } from "@/components/avisos"

/**
 * A cuánto tiene que salir la hora.
 *
 * Es del espacio entero, no de un proyecto: en LEINN son 17 €/h para todo, y
 * cada proyecto se mide contra ese mismo número. Por eso lo dice en voz alta
 * donde se cambie, que si no parece que se está tocando solo este proyecto.
 */
export function ObjetivoHora({
  espacioId,
  valor,
  puedeCambiar,
}: {
  espacioId: string
  /** Lo que hay puesto ahora, si hay algo. */
  valor: number | null
  /** Solo quien administra: vale para todo el equipo. */
  puedeCambiar: boolean
}) {
  const router = useRouter()
  const { avisar } = useAvisos()
  const [texto, setTexto] = useState(valor != null ? String(valor) : "")
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const limpio = texto.trim().replace(",", ".")
  const numero = limpio === "" ? null : Number(limpio)
  const vale = limpio === "" || (Number.isFinite(numero) && numero! >= 0)
  const cambiado = (valor ?? null) !== numero

  async function guardar() {
    if (!vale) return
    setGuardando(true)
    const { data, error } = await createClient()
      .from("workspaces")
      .update({ target_hourly_rate: numero })
      .eq("id", espacioId)
      .select("id")
    setGuardando(false)

    if (error) {
      avisar(mensajeError(error), undefined, "mal")
      return
    }
    /* Sin filas tocadas la RLS lo ha parado: pasa si dejas de ser
       administrador con la pantalla abierta. */
    if (!data || data.length === 0) {
      avisar("No se ha podido cambiar el objetivo.", undefined, "mal")
      return
    }
    setGuardado(true)
    router.refresh()
  }

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-sm font-semibold">El objetivo del equipo</h2>
      <p className="mb-3 text-sm text-muted">
        A cuánto tiene que salir la hora. No se cobra por esta tarifa: es el
        número contra el que se mira la facturación por hora de cada proyecto.
        Vale para todo el espacio.
      </p>

      {puedeCambiar ? (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void guardar()
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <div>
            <label className="label" htmlFor="objetivo-hora">
              Euros por hora
            </label>
            <div className="flex items-center gap-2">
              <input
                id="objetivo-hora"
                inputMode="decimal"
                className="field w-28"
                value={texto}
                onChange={(e) => {
                  setTexto(e.target.value)
                  setGuardado(false)
                }}
                placeholder="17"
              />
              <span className="text-sm text-muted">€/h</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando || !cambiado || !vale}
            className="btn btn-primary"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>

          {guardado && !cambiado && (
            <span className="flex h-9 items-center gap-1 text-sm text-running">
              <Check className="h-4 w-4" />
              Guardado
            </span>
          )}
        </form>
      ) : (
        <p className="cifra text-lg font-semibold">
          {valor != null ? `${valor} €/h` : "Sin poner"}
        </p>
      )}

      {!vale && (
        <p className="mt-2 text-sm text-danger">
          Tiene que ser un número de euros. Déjalo vacío para quitar el
          objetivo.
        </p>
      )}
    </section>
  )
}

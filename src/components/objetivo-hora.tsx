"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useAvisos } from "@/components/avisos"

/**
 * A cuánto tiene que salir la hora, para todo el espacio.
 *
 * Es el objetivo de casa: en LEINN, 17 €/h. Cada proyecto se mide contra él
 * salvo que se le ponga uno propio, y por eso la tarjeta dice en voz alta que
 * lo que se toca aquí vale para todos.
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
        A cuánto tiene que salir la hora en todo el espacio. No se cobra por
        ella: es contra lo que se mide cada proyecto.
      </p>

      {puedeCambiar ? (
        /* Un `div` y no un `form`: esto se pinta dentro del formulario de
           los ajustes del espacio, y un `<form>` dentro de otro es HTML
           invalido -el navegador se come el de dentro, y React se queja de
           que el HTML del servidor no cuadra con el del navegador y rehace
           el arbol entero-. El Enter sigue guardando, desde el campo. */
        <div className="flex flex-wrap items-end gap-2">
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
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  e.preventDefault()
                  if (!guardando && cambiado && vale) void guardar()
                }}
                placeholder="17"
              />
              <span className="text-sm text-muted">€/h</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void guardar()}
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
        </div>
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

/* ---------------------------------------------------------- el del proyecto */

/**
 * El objetivo de un proyecto concreto.
 *
 * Por defecto es el del equipo, que es lo que casi siempre quieres. Pero no
 * todo se mide con la misma vara -un evento no tiene por qué salir a lo mismo
 * que una oportunidad-, así que se le puede poner uno propio y el proyecto
 * pasa a medirse contra ese.
 */
export function ObjetivoDelProyecto({
  proyectoId,
  propio,
  delEquipo,
  puedeCambiar,
}: {
  proyectoId: string
  /** Lo suyo, si se le ha puesto algo. Null: el del equipo. */
  propio: number | null
  delEquipo: number | null
  puedeCambiar: boolean
}) {
  const router = useRouter()
  const { avisar } = useAvisos()
  const [suyo, setSuyo] = useState(propio != null)
  const [texto, setTexto] = useState(
    propio != null ? String(propio) : delEquipo != null ? String(delEquipo) : "",
  )
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const limpio = texto.trim().replace(",", ".")
  const numero = limpio === "" ? null : Number(limpio)
  const vale = !suyo || (limpio !== "" && Number.isFinite(numero) && numero! >= 0)
  const aGuardar = suyo ? numero : null
  const cambiado = (propio ?? null) !== aGuardar

  async function guardar() {
    if (!vale) return
    setGuardando(true)
    const { data, error } = await createClient()
      .from("projects")
      .update({ target_hourly_rate: aGuardar })
      .eq("id", proyectoId)
      .select("id")
    setGuardando(false)

    if (error) {
      avisar(mensajeError(error), undefined, "mal")
      return
    }
    if (!data || data.length === 0) {
      avisar("No se ha podido cambiar el objetivo.", undefined, "mal")
      return
    }
    setGuardado(true)
    router.refresh()
  }

  /** Lo que se está usando de verdad ahora mismo. */
  const vigente = propio ?? delEquipo

  if (!puedeCambiar) {
    return (
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-semibold">Objetivo por hora</h2>
        <p className="cifra text-lg font-semibold">
          {vigente != null ? `${vigente} €/h` : "Sin poner"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {propio != null ? "propio de este proyecto" : "el del equipo"}
        </p>
      </section>
    )
  }

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-sm font-semibold">Objetivo por hora</h2>
      <p className="mb-3 text-sm text-muted">
        Normalmente el del equipo. Ponle uno propio si este trabajo no se mide
        con la misma vara.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
        className="space-y-2"
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`objetivo-${proyectoId}`}
            checked={!suyo}
            onChange={() => {
              setSuyo(false)
              setGuardado(false)
            }}
          />
          El del equipo
          <span className="cifra text-muted">
            {delEquipo != null ? `${delEquipo} €/h` : "sin poner"}
          </span>
        </label>

        <label className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="radio"
            name={`objetivo-${proyectoId}`}
            checked={suyo}
            onChange={() => {
              setSuyo(true)
              setGuardado(false)
            }}
          />
          Uno propio
          <span className="flex items-center gap-1.5">
            <input
              inputMode="decimal"
              className="field h-8 w-24 py-0"
              value={suyo ? texto : ""}
              onChange={(e) => {
                setTexto(e.target.value)
                setSuyo(true)
                setGuardado(false)
              }}
              placeholder={delEquipo != null ? String(delEquipo) : "17"}
              aria-label="Euros por hora de este proyecto"
            />
            <span className="text-muted">€/h</span>
          </span>
        </label>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={guardando || !cambiado || !vale}
            className="btn btn-primary"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
          {guardado && !cambiado && (
            <span className="flex items-center gap-1 text-sm text-running">
              <Check className="h-4 w-4" />
              Guardado
            </span>
          )}
        </div>
      </form>

      {!vale && (
        <p className="mt-2 text-sm text-danger">
          Escribe cuántos euros la hora, o vuelve al del equipo.
        </p>
      )}
    </section>
  )
}

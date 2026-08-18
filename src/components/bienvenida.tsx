"use client"

import { useState, useTransition } from "react"
import { ArrowRight, Building2, Loader2, LogOut, Mail, Timer } from "lucide-react"

import { cambiarEspacio } from "@/app/acciones"
import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { NOMBRE_ROL } from "@/lib/roles"
import type { Pertenencia, Perfil } from "@/lib/tipos"
import { ZONAS_HORARIAS } from "@/lib/tipos"
import type { Enums } from "@/lib/database.types"

type Disponible = {
  id: string
  name: string
  slug: string
  motivo: string
  role: Enums<"user_role">
}

/** Zona del navegador, si es una de las que ofrecemos. */
function zonaPorDefecto(): string {
  try {
    const propuesta = Intl.DateTimeFormat().resolvedOptions().timeZone
    return (ZONAS_HORARIAS as readonly string[]).includes(propuesta)
      ? propuesta
      : "Europe/Madrid"
  } catch {
    return "Europe/Madrid"
  }
}

export function Bienvenida({
  perfil,
  pertenencias,
  disponibles,
}: {
  perfil: Perfil
  pertenencias: Pertenencia[]
  disponibles: Disponible[]
}) {
  const [nombre, setNombre] = useState("")
  const [zona, setZona] = useState(zonaPorDefecto)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, empezarTransicion] = useTransition()

  function entrar(id: string) {
    empezarTransicion(() => {
      void cambiarEspacio(id)
    })
  }

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) {
      setError("Ponle un nombre al espacio.")
      return
    }
    setOcupado(true)
    setError(null)

    const supabase = createClient()
    const { data, error: err } = await supabase.rpc("create_workspace", {
      p_name: limpio,
      p_timezone: zona,
    })

    if (err || !data) {
      setOcupado(false)
      setError(mensajeError(err))
      return
    }
    entrar(data.id)
  }

  async function unirse(id: string) {
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.rpc("join_workspace", { p_workspace: id })
    if (err) {
      setOcupado(false)
      setError(mensajeError(err))
      return
    }
    entrar(id)
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-fg">
          <Timer className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">
          Hola, {perfil.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {pertenencias.length > 0
            ? "Elige donde quieres trabajar."
            : "Crea el espacio de tu equipo para empezar a contar horas."}
        </p>
      </div>

      {pertenencias.length > 0 && (
        <section className="card mb-4 p-2">
          <ul>
            {pertenencias.map(({ espacio, rol }) => (
              <li key={espacio.id}>
                <button
                  type="button"
                  onClick={() => entrar(espacio.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-surface-2"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {espacio.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {NOMBRE_ROL[rol]}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {disponibles.length > 0 && (
        <section className="card mb-4 p-4">
          <h2 className="mb-1 text-sm font-semibold">Te están esperando</h2>
          <p className="mb-3 text-xs text-muted">
            Espacios a los que puedes unirte con tu correo.
          </p>
          <ul className="space-y-2">
            {disponibles.map((espacio) => (
              <li
                key={espacio.id}
                className="flex items-center gap-2 rounded-lg border border-line px-3 py-2"
              >
                <Mail className="h-4 w-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {espacio.name}
                  </span>
                  <span className="block text-xs text-muted">
                    {espacio.motivo === "invitacion"
                      ? `Invitación como ${NOMBRE_ROL[espacio.role].toLowerCase()}`
                      : "Tu dominio de correo está autorizado"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void unirse(espacio.id)}
                  disabled={ocupado}
                  className="btn btn-primary py-1.5"
                >
                  Unirme
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">
          {pertenencias.length > 0 ? "Crear otro espacio" : "Crear un espacio"}
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void crear()
          }}
          className="space-y-3"
        >
          <div>
            <label className="label" htmlFor="espacio-nombre">
              Nombre del equipo o la empresa
            </label>
            <input
              id="espacio-nombre"
              className="field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Mi estudio"
              autoFocus={pertenencias.length === 0}
            />
          </div>

          <div>
            <label className="label" htmlFor="espacio-zona">
              Zona horaria
            </label>
            <select
              id="espacio-zona"
              className="field"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
            >
              {ZONAS_HORARIAS.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted">
              Decide a que dia cuenta cada hora. Se puede cambiar después.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-danger-soft p-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={ocupado || !nombre.trim()}
            className="btn btn-primary w-full"
          >
            {ocupado && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear espacio
          </button>
        </form>
      </section>

      <form action="/auth/salir" method="post" className="mt-4 text-center">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" />
          Salir de la cuenta {perfil.email}
        </button>
      </form>
    </main>
  )
}

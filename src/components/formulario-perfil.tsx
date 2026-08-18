"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { SelectorTema } from "@/components/selector-tema"
import { NOMBRE_ROL, type Rol } from "@/lib/roles"
import type { Perfil } from "@/lib/tipos"

export function FormularioPerfil({
  perfil,
  rol,
  numeroEspacios,
}: {
  perfil: Perfil
  rol: Rol
  numeroEspacios: number
}) {
  const router = useRouter()
  const [nombre, setNombre] = useState(perfil.full_name)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guardar() {
    const limpio = nombre.trim()
    if (!limpio) {
      setError("El nombre no puede quedar vacio.")
      return
    }
    setGuardando(true)
    setError(null)
    setGuardado(false)

    const supabase = createClient()
    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: limpio })
      .eq("id", perfil.id)

    setGuardando(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setGuardado(true)
    router.refresh()
  }

  return (
    <section className="card space-y-4 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
        className="space-y-3"
      >
        <div>
          <label className="label" htmlFor="nombre">
            Nombre
          </label>
          <input
            id="nombre"
            className="field"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value)
              setGuardado(false)
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="label">Correo</span>
            <p className="truncate text-sm">{perfil.email}</p>
          </div>
          <div>
            <span className="label">Rol aquí</span>
            <p className="text-sm">
              {NOMBRE_ROL[rol]}
              {numeroEspacios > 1 && (
                <span className="text-muted">
                  {" "}
                  · en {numeroEspacios} espacios
                </span>
              )}
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-danger-soft p-2 text-sm text-danger">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={guardando || nombre.trim() === perfil.full_name}
            className="btn btn-primary"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
          {guardado && <span className="text-xs text-running">Guardado</span>}
        </div>
      </form>

      <div className="border-t border-line pt-4">
        <span className="label">Aspecto</span>
        <SelectorTema />
      </div>
    </section>
  )
}

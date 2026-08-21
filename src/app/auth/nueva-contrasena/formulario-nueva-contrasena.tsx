"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"

/**
 * Se llega aqui con la sesion de recuperacion ya abierta -la establece
 * /auth/confirmar al verificar el enlace del correo, antes de traer aqui-.
 * Si no hay sesion (enlace caducado, o alguien entra a la URL a pelo),
 * updateUser falla solo y se enseña el aviso de pedir un enlace nuevo.
 */
export function FormularioNuevaContrasena() {
  const router = useRouter()
  const [sinSesion, setSinSesion] = useState(false)
  const [password, setPassword] = useState("")
  const [repetir, setRepetir] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setSinSesion(!data.user))
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== repetir) {
      setError("Las dos contraseñas no coinciden.")
      return
    }

    setCargando(true)
    const { error: err } = await createClient().auth.updateUser({ password })
    setCargando(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.push("/panel")
    router.refresh()
  }

  if (sinSesion) {
    return (
      <div className="card p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-danger" />
        <h2 className="font-semibold">Ese enlace ya no vale</h2>
        <p className="mt-2 text-sm text-muted">
          Puede que ya lo hayas usado o que haya caducado. Pide uno nuevo desde
          el acceso.
        </p>
        <a href="/acceso" className="btn btn-primary mt-4 w-full">
          Ir al acceso
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <h2 className="font-semibold">Pon una contraseña nueva</h2>
        <p className="mt-1 text-sm text-muted">
          Para tu cuenta. Entrarás con ella la próxima vez.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="password">
          Contraseña nueva
        </label>
        <input
          id="password"
          type="password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          autoFocus
          required
        />
        <p className="mt-1.5 text-xs text-muted">Mínimo 8 caracteres.</p>
      </div>

      <div>
        <label className="label" htmlFor="repetir">
          Repítela
        </label>
        <input
          id="repetir"
          type="password"
          className="field"
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={cargando}>
        {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
        Guardar y entrar
      </button>
    </form>
  )
}

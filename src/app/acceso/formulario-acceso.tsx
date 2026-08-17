"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, Loader2, MailCheck } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { BotonGoogle } from "@/components/boton-google"

type Modo = "entrar" | "registrarse"

export function FormularioAcceso() {
  const router = useRouter()
  const params = useSearchParams()
  const volver = params.get("volver") || "/"

  const [modo, setModo] = useState<Modo>("entrar")
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [cargando, setCargando] = useState(false)
  // El acceso con Google vuelve por /auth/callback, que avisa por la URL
  const [error, setError] = useState<string | null>(() => {
    const fallo = params.get("error")
    return fallo ? mensajeError(fallo) : null
  })
  const [revisaCorreo, setRevisaCorreo] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const supabase = createClient()

    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        router.push(volver)
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: nombre.trim() },
            emailRedirectTo: `${window.location.origin}/auth/confirmar`,
          },
        })
        if (error) throw error

        // Si la confirmacion por correo esta activada no hay sesion todavia
        if (data.session) {
          router.push(volver)
          router.refresh()
        } else {
          setRevisaCorreo(true)
        }
      }
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }

  if (revisaCorreo) {
    return (
      <div className="card p-6 text-center">
        <MailCheck className="mx-auto mb-3 h-8 w-8 text-running" />
        <h2 className="font-semibold">Revisa tu correo</h2>
        <p className="mt-2 text-sm text-muted">
          Te hemos enviado un enlace a <strong>{email}</strong> para confirmar la
          cuenta. Al pulsarlo entraras directamente.
        </p>
        <button
          type="button"
          onClick={() => {
            setRevisaCorreo(false)
            setModo("entrar")
          }}
          className="btn btn-ghost mt-4 w-full text-accent"
        >
          Volver al acceso
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <BotonGoogle volver={volver} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-muted">o con tu correo</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex rounded-lg bg-surface-2 p-1 text-sm">
        {(["entrar", "registrarse"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setModo(m)
              setError(null)
            }}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition ${
              modo === m
                ? "bg-surface shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {m === "entrar" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      {modo === "registrarse" && (
        <div>
          <label className="label" htmlFor="nombre">
            Nombre y apellidos
          </label>
          <input
            id="nombre"
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ane Etxebarria"
            autoComplete="name"
            required
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          className="field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@nitton.es"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Contrasena
        </label>
        <input
          id="password"
          type="password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        {modo === "registrarse" && (
          <p className="mt-1.5 text-xs text-muted">Minimo 8 caracteres.</p>
        )}
      </div>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={cargando}>
        {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
        {modo === "entrar" ? "Entrar" : "Crear cuenta"}
      </button>

      {modo === "registrarse" && (
        <p className="text-center text-xs text-muted">
          Al entrar podras crear tu espacio de trabajo o unirte a uno al que te
          hayan invitado.
        </p>
      )}
    </form>
  )
}

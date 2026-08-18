"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { RUTA_APP } from "@/lib/rutas"

/** La G de Google, con sus colores. Va inline para no depender de nada. */
function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

export function BotonGoogle({ volver = RUTA_APP }: { volver?: string }) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function entrar() {
    setCargando(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(volver)}`,
      },
    })

    // Si sale bien, el navegador ya se ha ido a Google y esto no se ejecuta
    if (err) {
      setCargando(false)
      setError(mensajeError(err))
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void entrar()}
        disabled={cargando}
        className="btn w-full"
      >
        {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogoGoogle />}
        Continuar con Google
      </button>

      {error && (
        <p className="rounded-lg bg-danger-soft p-2.5 text-sm text-danger">{error}</p>
      )}
    </div>
  )
}

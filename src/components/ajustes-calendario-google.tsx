"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
import { CalendarDays, Loader2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { desconectarGoogle } from "@/app/(app)/calendario/acciones"

/**
 * Conectar y desconectar. Las reuniones que trae se aceptan directamente en
 * la rejilla del calendario -este dialogo ya no las lista, para no repetir
 * en dos sitios lo mismo.
 */
export function AjustesCalendarioGoogle({ conectado: conectadoInicial }: { conectado: boolean }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [conectado, setConectado] = useState(conectadoInicial)
  const [entrando, setEntrando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function conectar() {
    setEntrando(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: "https://www.googleapis.com/auth/calendar.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/calendario")}`,
      },
    })

    // Si sale bien, el navegador ya se ha ido a Google y esto no se ejecuta
    if (err) {
      setEntrando(false)
      setError(mensajeError(err))
    }
  }

  async function desconectar() {
    setSaliendo(true)
    setError(null)

    // En el servidor: revoca el token en Google antes de borrar la fila, sin
    // pasarle el refresh_token al navegador para que lo revoque el mismo.
    const { error: err } = await desconectarGoogle()

    setSaliendo(false)
    if (err) {
      setError(err)
      return
    }
    setConectado(false)
    setAbierto(false)
    router.refresh()
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger className={conectado ? "btn" : "btn btn-primary"}>
        <CalendarDays className="h-4 w-4" />
        {conectado ? "Google Calendar" : "Conectar Google Calendar"}
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="card fixed left-1/2 top-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">Google Calendar</Dialog.Title>
            <Dialog.Close className="btn btn-ghost p-1" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-3 p-4">
            {!conectado ? (
              <>
                <p className="text-sm text-ink-soft">
                  Las reuniones que ya hayas aceptado en Google Calendar
                  aparecerán en tu semana, listas para apuntarlas con un
                  clic. Solo se lee tu calendario, nunca se modifica.
                </p>
                <button
                  type="button"
                  onClick={() => void conectar()}
                  disabled={entrando}
                  className="btn btn-primary w-full"
                >
                  {entrando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Conectar con Google Calendar
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="chip">Conectado</span>
                  <button
                    type="button"
                    onClick={() => void desconectar()}
                    disabled={saliendo}
                    className="text-sm text-danger transition hover:underline disabled:opacity-60"
                  >
                    {saliendo ? "Desconectando…" : "Desconectar"}
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Las reuniones aceptadas de esta semana ya salen en el
                  calendario con el borde a rayas, junto a las propuestas del
                  equipo.
                </p>
              </>
            )}

            {error && (
              <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { CalendarClock, Loader2, Settings2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { eventosDeGoogle } from "@/app/(app)/calendario/acciones"
import type { EventoGoogle } from "@/lib/google"
import { dayLabel, formatClock, toDateKey } from "@/lib/time"

/**
 * De momento solo conecta y enseña los eventos: convertirlos en horas hace
 * falta decidir antes como se les asigna proyecto -por evento, o uno para
 * toda la tanda-, asi que se deja para la siguiente vuelta.
 */
export function AjustesCalendarioGoogle({ conectado: conectadoInicial }: { conectado: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [conectado, setConectado] = useState(conectadoInicial)
  const [entrando, setEntrando] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [cargandoEventos, setCargandoEventos] = useState(false)
  const [eventos, setEventos] = useState<EventoGoogle[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cargarEventos() {
    setCargandoEventos(true)
    setError(null)
    const ahora = new Date()
    const enUnaSemana = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000)
    const resultado = await eventosDeGoogle(ahora.toISOString(), enUnaSemana.toISOString())
    setCargandoEventos(false)

    if (!resultado.conectado) {
      setConectado(false)
      return
    }
    if ("error" in resultado) {
      setError(resultado.error)
      return
    }
    setEventos(resultado.eventos)
  }

  function abrir(valor: boolean) {
    setAbierto(valor)
    if (valor && conectado && !eventos) void cargarEventos()
  }

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

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from("google_connections")
      .delete()
      .eq("user_id", user?.id ?? "")

    setSaliendo(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setConectado(false)
    setEventos(null)
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={abrir}>
      <Dialog.Trigger
        title="Google Calendar"
        aria-label="Ajustes de Google Calendar"
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radio-sm)] text-muted transition hover:bg-surface-2 hover:text-ink"
      >
        <Settings2 className="h-4 w-4" />
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="card fixed left-1/2 top-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-0"
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
                  Trae tus eventos de Google Calendar para no tener que
                  teclearlos. Solo se lee, nunca se modifica tu calendario.
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

                <div>
                  <p className="label mb-1.5">Próximos 7 días</p>
                  {cargandoEventos ? (
                    <div className="flex items-center gap-2 py-3 text-sm text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando eventos…
                    </div>
                  ) : eventos && eventos.length > 0 ? (
                    <ul className="max-h-64 space-y-1 overflow-y-auto">
                      {eventos.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-start gap-2 rounded-[var(--radio-sm)] bg-surface-2 px-2.5 py-2 text-sm"
                        >
                          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{e.titulo}</span>
                            <span className="text-xs text-muted">
                              {dayLabel(toDateKey(new Date(e.inicio)))} ·{" "}
                              {formatClock(e.inicio)}–{formatClock(e.fin)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : eventos ? (
                    <p className="py-3 text-sm text-muted">
                      No hay eventos con hora en los próximos 7 días.
                    </p>
                  ) : null}
                </div>
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

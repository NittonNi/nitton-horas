"use server"

import { createClient } from "@/lib/supabase/server"
import { listarEventos, type EventoGoogle } from "@/lib/google"
import { mensajeError } from "@/lib/errores"

type ResultadoEventos =
  | { conectado: false }
  | { conectado: true; eventos: EventoGoogle[] }
  | { conectado: true; error: string }

/**
 * Eventos de Google Calendar de quien mira, entre dos fechas (ISO), quitando
 * los que ya se aceptaron antes -mismo criterio que Clockify: se marcan con
 * su id de Google en `external_id` y no se vuelven a proponer.
 */
export async function eventosDeGoogle(
  desde: string,
  hasta: string,
  espacioId: string,
): Promise<ResultadoEventos> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { conectado: false }

  const { data: conexion } = await supabase
    .from("google_connections")
    .select("refresh_token, calendar_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!conexion) return { conectado: false }

  try {
    const eventos = await listarEventos(
      conexion.refresh_token,
      conexion.calendar_id,
      new Date(desde),
      new Date(hasta),
    )

    const ids = eventos.map((e) => e.id)
    let yaAceptados = new Set<string>()
    if (ids.length > 0) {
      const { data: existentes } = await supabase
        .from("time_entries")
        .select("external_id")
        .eq("workspace_id", espacioId)
        .eq("user_id", user.id)
        .eq("source", "google_calendar")
        .in("external_id", ids)
      yaAceptados = new Set((existentes ?? []).flatMap((f) => (f.external_id ? [f.external_id] : [])))
    }

    return { conectado: true, eventos: eventos.filter((e) => !yaAceptados.has(e.id)) }
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "No se ha podido leer el calendario."
    if (mensaje === "google-desconectado") {
      /* El permiso se revoco desde fuera de la app (ej. en la cuenta de
         Google): se borra la conexion para que la pantalla vuelva a ofrecer
         conectar, en vez de fallar en silencio cada vez. */
      await supabase.from("google_connections").delete().eq("user_id", user.id)
      return { conectado: false }
    }
    return { conectado: true, error: mensaje }
  }
}

/**
 * Corta la conexion con Google Calendar: revoca el token en Google antes de
 * borrar la fila -si no, el consentimiento se queda vivo del lado de Google
 * aunque aqui ya no quede rastro, y la proxima conexion no pediria consentir
 * de nuevo-. Se hace en el servidor -nunca desde el navegador- para no tener
 * que pasarle el refresh_token al cliente para revocarlo el mismo.
 */
export async function desconectarGoogle(): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Hay que iniciar sesion." }

  const { data: conexion } = await supabase
    .from("google_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle()

  if (conexion?.refresh_token) {
    try {
      const respuesta = await fetch("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: conexion.refresh_token }),
      })
      if (!respuesta.ok) {
        // Token ya invalido, o Google no responde: no bloquea el borrado
        // local, pero se deja registrado para poder mirarlo si hace falta.
        console.error("No se ha podido revocar el token de Google:", respuesta.status)
      }
    } catch (e) {
      console.error("No se ha podido revocar el token de Google:", e)
    }
  }

  const { error } = await supabase.from("google_connections").delete().eq("user_id", user.id)
  return { error: error ? mensajeError(error) : null }
}

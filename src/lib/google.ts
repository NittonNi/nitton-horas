/**
 * Habla con Google directamente (no con Supabase): el token de acceso de
 * calendario es solo para la API de Calendar, y Supabase no lo guarda ni lo
 * renueva por su cuenta. Usa GOOGLE_CLIENT_SECRET, asi que esto es solo para
 * el servidor -nunca lo importe un componente "use client".
 */

export type EventoGoogle = {
  id: string
  titulo: string
  inicio: string
  fin: string
}

/** Cambia el refresh_token guardado por un access_token valido para esta llamada. */
async function obtenerAccessToken(refreshToken: string): Promise<string> {
  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!respuesta.ok) {
    throw new Error(
      respuesta.status === 400 || respuesta.status === 401
        ? "google-desconectado"
        : "No se ha podido hablar con Google.",
    )
  }

  const datos = (await respuesta.json()) as { access_token: string }
  return datos.access_token
}

/** Eventos con hora (se descartan los de "todo el dia", que no dicen cuanto duraron). */
export async function listarEventos(
  refreshToken: string,
  calendarId: string,
  desde: Date,
  hasta: Date,
): Promise<EventoGoogle[]> {
  const accessToken = await obtenerAccessToken(refreshToken)

  const parametros = new URLSearchParams({
    timeMin: desde.toISOString(),
    timeMax: hasta.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  })

  const respuesta = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${parametros}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!respuesta.ok) throw new Error("No se ha podido leer el calendario.")

  const datos = (await respuesta.json()) as {
    items?: {
      id: string
      summary?: string
      start?: { dateTime?: string }
      end?: { dateTime?: string }
      attendees?: { self?: boolean; responseStatus?: string }[]
    }[]
  }

  return (datos.items ?? [])
    .filter((e) => e.start?.dateTime && e.end?.dateTime)
    .filter((e) => {
      // Sin invitados es un evento propio: no hay nada que aceptar. Con
      // invitados, solo cuenta si tu respuesta en Google ya fue "si" -si no,
      // inundaria de reuniones tentativas o rechazadas que no son horas de verdad.
      const yo = e.attendees?.find((a) => a.self)
      return !yo || yo.responseStatus === "accepted"
    })
    .map((e) => ({
      id: e.id,
      titulo: e.summary?.trim() || "Sin título",
      inicio: e.start!.dateTime!,
      fin: e.end!.dateTime!,
    }))
}

import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { RUTA_APP } from "@/lib/rutas"

/**
 * Vuelta del acceso con Google. Supabase manda aquí un `code` de un solo uso
 * que hay que canjear por la sesion; a partir de ahi es una sesion normal.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? RUTA_APP

  // Google puede volver con un "no" (permiso denegado, cuenta equivocada...)
  const fallo = searchParams.get("error_description") ?? searchParams.get("error")
  if (fallo) {
    const url = new URL("/acceso", origin)
    url.searchParams.set("error", fallo)
    return NextResponse.redirect(url)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Detras de un proxy (Vercel) el host real viene en la cabecera
      const reenviado = request.headers.get("x-forwarded-host")
      const enProduccion = process.env.NODE_ENV === "production"
      const destino = new URL(next, origin)
      if (enProduccion && reenviado) destino.host = reenviado
      return NextResponse.redirect(destino)
    }
  }

  const url = new URL("/acceso", origin)
  url.searchParams.set("error", "No se ha podido completar el acceso con Google.")
  return NextResponse.redirect(url)
}

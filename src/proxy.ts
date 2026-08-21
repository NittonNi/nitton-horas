import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/session"

// Next.js 16: el antiguo `middleware` se llama ahora `proxy` y corre en Node.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Todo menos estaticos, imagenes optimizadas, el favicon, el manifiesto
    // PWA y las rutas de metadatos que generan robots.txt/sitemap.xml/og:image
    // -tienen que ser publicas siempre, las piden rastreadores sin sesion-.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|opengraph-image|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

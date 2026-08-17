import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/session"

// Next.js 16: el antiguo `middleware` se llama ahora `proxy` y corre en Node.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Todo menos estaticos, imagenes optimizadas, el favicon y el manifiesto PWA
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

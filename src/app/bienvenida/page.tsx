import { getPerfil, getPertenencias } from "@/lib/sesion"
import { createClient } from "@/lib/supabase/server"
import { Bienvenida } from "@/components/bienvenida"

export const metadata = { title: "Espacios de trabajo" }

/** Se ve antes de entrar al panel, así que va en claro como la portada. */
export const viewport = { themeColor: "#f5f5f7" }

/**
 * Primera pantalla de quien acaba de entrar: crear su espacio o unirse a uno
 * al que le han invitado. Vive fuera del grupo (app) porque ese layout da por
 * hecho que ya hay un espacio activo.
 */
export default async function PaginaBienvenida() {
  const perfil = await getPerfil()
  const supabase = await createClient()

  const [pertenencias, disponibles] = await Promise.all([
    getPertenencias(perfil.id),
    supabase.rpc("available_workspaces"),
  ])

  return (
    <Bienvenida
      perfil={perfil}
      pertenencias={pertenencias}
      disponibles={disponibles.data ?? []}
    />
  )
}

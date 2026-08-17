import { getSesion } from "@/lib/sesion"
import { createClient } from "@/lib/supabase/server"
import { cargarMiembros } from "@/lib/datos"
import { GestionEquipo } from "@/components/gestion-equipo"
import type { Invitacion } from "@/lib/tipos"

export const metadata = { title: "Equipo" }

export default async function PaginaEquipo() {
  const { perfil, espacio, rol } = await getSesion()
  const supabase = await createClient()

  const [miembros, invitaciones] = await Promise.all([
    cargarMiembros(espacio.id),
    supabase
      .from("invitations")
      .select("*")
      .eq("workspace_id", espacio.id)
      .order("created_at", { ascending: false }),
  ])

  return (
    <GestionEquipo
      yoId={perfil.id}
      rol={rol}
      espacio={espacio}
      miembros={miembros}
      invitaciones={(invitaciones.data ?? []) as Invitacion[]}
    />
  )
}

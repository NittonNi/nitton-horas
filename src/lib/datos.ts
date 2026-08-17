import { createClient } from "@/lib/supabase/server"
import type { Catalogo, EntradaVista, Miembro } from "@/lib/tipos"

/**
 * Todo lo de aqui va filtrado por espacio de trabajo. La RLS ya lo impide por
 * su cuenta, pero el filtro explicito evita traer de mas y deja claro, leyendo
 * el codigo, que ninguna consulta se sale de su espacio.
 */

export async function cargarCatalogo(
  espacioId: string,
  incluirArchivados = false,
): Promise<Catalogo> {
  const supabase = await createClient()

  const [clientes, proyectos, tareas, etiquetas] = await Promise.all([
    supabase.from("clients").select("*").eq("workspace_id", espacioId).order("name"),
    supabase
      .from("projects")
      .select("*, clients(id, name)")
      .eq("workspace_id", espacioId)
      .order("name"),
    supabase.from("tasks").select("*").eq("workspace_id", espacioId).order("name"),
    supabase.from("tags").select("*").eq("workspace_id", espacioId).order("name"),
  ])

  const vivo = <T extends { archived: boolean }>(filas: T[] | null) =>
    (filas ?? []).filter((f) => incluirArchivados || !f.archived)

  return {
    clientes: vivo(clientes.data),
    proyectos: vivo(proyectos.data) as Catalogo["proyectos"],
    tareas: vivo(tareas.data),
    etiquetas: vivo(etiquetas.data),
  }
}

/** Entradas entre dos fechas (inclusive), de la mas reciente a la mas antigua. */
export async function cargarEntradas(opciones: {
  espacioId: string
  desde: string
  hasta: string
  userId?: string
  projectId?: string
  limite?: number
}): Promise<EntradaVista[]> {
  const supabase = await createClient()

  let consulta = supabase
    .from("v_entries")
    .select("*")
    .eq("workspace_id", opciones.espacioId)
    .gte("local_date", opciones.desde)
    .lte("local_date", opciones.hasta)
    .order("start_at", { ascending: false })

  if (opciones.userId) consulta = consulta.eq("user_id", opciones.userId)
  if (opciones.projectId) consulta = consulta.eq("project_id", opciones.projectId)
  if (opciones.limite) consulta = consulta.limit(opciones.limite)

  const { data, error } = await consulta
  if (error) throw error

  return (data ?? []) as EntradaVista[]
}

/** Horas que otra persona ha apuntado contando conmigo, sin contestar todavia. */
export async function cargarPropuestas(espacioId: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc("mis_invitaciones", { p_workspace: espacioId })
  return data ?? []
}

/** El equipo de un espacio, con el rol que tiene cada uno alli. */
export async function cargarMiembros(espacioId: string): Promise<Miembro[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("workspace_members")
    .select("role, active, profiles(id, full_name, email)")
    .eq("workspace_id", espacioId)

  return (data ?? [])
    .flatMap((fila) =>
      fila.profiles
        ? [
            {
              id: fila.profiles.id,
              full_name: fila.profiles.full_name,
              email: fila.profiles.email,
              role: fila.role,
              active: fila.active,
            },
          ]
        : [],
    )
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
}

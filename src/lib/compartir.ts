import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

/**
 * Horas compartidas: a la otra persona no se le apunta nada. Le llega una
 * propuesta, como la invitacion de un calendario, y hasta que no la acepta no
 * existe ninguna hora suya.
 */
export type Propuesta = {
  espacioId: string
  entradaId: string
  deQuien: string
  aQuienes: string[]
  project_id: string | null
  edition_id: string | null
  task_id: string | null
  description: string
  start_at: string
  end_at: string
  billable: boolean
}

export async function proponerHoras(
  supabase: SupabaseClient<Database>,
  propuesta: Propuesta,
) {
  if (propuesta.aQuienes.length === 0) return { error: null }

  return supabase.from("entry_invitations").insert(
    propuesta.aQuienes.map((to_user) => ({
      workspace_id: propuesta.espacioId,
      origin_entry_id: propuesta.entradaId,
      from_user: propuesta.deQuien,
      to_user,
      project_id: propuesta.project_id,
      edition_id: propuesta.edition_id,
      task_id: propuesta.task_id,
      description: propuesta.description,
      start_at: propuesta.start_at,
      end_at: propuesta.end_at,
      billable: propuesta.billable,
    })),
  )
}

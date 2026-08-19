import type { EntradaEnMarcha } from "@/lib/tipos"

/**
 * Tiene que ser un literal: si se construye concatenando, PostgREST pierde
 * la inferencia de tipos y el resultado sale como `GenericStringError`.
 */
export const SELECT_EN_MARCHA =
  "id, workspace_id, project_id, edition_id, task_id, description, start_at, billable, projects(id, name, color, clients!projects_client_id_fkey(name)), tasks(id, name), time_entry_tags(tag_id)" as const

type FilaEnMarcha = {
  id: string
  workspace_id: string
  project_id: string | null
  edition_id: string | null
  task_id: string | null
  description: string
  start_at: string
  billable: boolean
  projects: {
    id: string
    name: string
    color: string
    clients: { name: string } | null
  } | null
  tasks: { id: string; name: string } | null
  time_entry_tags: { tag_id: string }[]
}

export function aEntradaEnMarcha(fila: unknown): EntradaEnMarcha | null {
  if (!fila) return null
  const f = fila as FilaEnMarcha
  return {
    id: f.id,
    workspace_id: f.workspace_id,
    project_id: f.project_id,
    edition_id: f.edition_id,
    task_id: f.task_id,
    description: f.description,
    start_at: f.start_at,
    billable: f.billable,
    proyecto: f.projects
      ? {
          id: f.projects.id,
          name: f.projects.name,
          color: f.projects.color,
          cliente: f.projects.clients?.name ?? null,
        }
      : null,
    tarea: f.tasks ? { id: f.tasks.id, name: f.tasks.name } : null,
    tagIds: (f.time_entry_tags ?? []).map((t) => t.tag_id),
  }
}

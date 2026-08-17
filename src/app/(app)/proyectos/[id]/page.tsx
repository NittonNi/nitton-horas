import { notFound } from "next/navigation"

import { getSesion } from "@/lib/sesion"
import { veTodo } from "@/lib/roles"
import { cargarCatalogo, cargarEntradas } from "@/lib/datos"
import { DetalleProyecto } from "@/components/detalle-proyecto"
import { todayKey } from "@/lib/time"

/** Todo lo que se ha apuntado nunca en este proyecto. */
const DESDE_SIEMPRE = "2000-01-01"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { espacio } = await getSesion()
  const catalogo = await cargarCatalogo(espacio.id, true)
  const proyecto = catalogo.proyectos.find((p) => p.id === id)
  return { title: proyecto?.name ?? "Proyecto" }
}

export default async function PaginaProyecto({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { espacio, rol } = await getSesion()
  const gestor = veTodo(rol)

  const [catalogo, entradas] = await Promise.all([
    cargarCatalogo(espacio.id, true),
    cargarEntradas({
      espacioId: espacio.id,
      desde: DESDE_SIEMPRE,
      hasta: todayKey(),
      projectId: id,
      limite: 2000,
    }),
  ])

  const proyecto = catalogo.proyectos.find((p) => p.id === id)
  if (!proyecto) notFound()

  return (
    <DetalleProyecto
      proyecto={proyecto}
      clientes={catalogo.clientes}
      tareas={catalogo.tareas.filter((t) => t.project_id === id)}
      entradas={entradas}
      espacioId={espacio.id}
      puedeGestionar={gestor}
      puedeVerImportes={gestor}
    />
  )
}

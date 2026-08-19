import { getSesion } from "@/lib/sesion"
import { cargarCatalogo, cargarEntradas } from "@/lib/datos"
import { startOfWeek, toDateKey, todayKey } from "@/lib/time"
import { GestionCategorias } from "@/components/gestion-categorias"
import { ProyectosPorCategoria } from "@/components/proyectos-por-categoria"

export const metadata = { title: "Categorización" }

export default async function PaginaCategorias() {
  const { perfil, espacio } = await getSesion()
  // Con archivadas: aquí es donde se reactivan.
  const [catalogo, entradas] = await Promise.all([
    cargarCatalogo(espacio.id, true),
    cargarEntradas({
      espacioId: espacio.id,
      desde: toDateKey(startOfWeek(new Date())),
      hasta: todayKey(),
      userId: perfil.id,
    }),
  ])

  /* Lo que lleva esta persona esta semana en cada rama. La subcategoria suma
     tambien en su categoria, que es como se leen los objetivos. */
  const segundosPorRama: Record<string, number> = {}
  for (const entrada of entradas) {
    if (!entrada.end_at) continue
    const proyecto = catalogo.proyectos.find((p) => p.id === entrada.project_id)
    const rama = proyecto?.category_id
    if (!rama) continue
    const segundos = entrada.duration_seconds ?? 0
    segundosPorRama[rama] = (segundosPorRama[rama] ?? 0) + segundos
    const padre = catalogo.categorias.find((c) => c.id === rama)?.parent_id
    if (padre) segundosPorRama[padre] = (segundosPorRama[padre] ?? 0) + segundos
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <GestionCategorias
        espacioId={espacio.id}
        categorias={catalogo.categorias}
        proyectos={catalogo.proyectos}
        segundosPorRama={segundosPorRama}
      />
      <ProyectosPorCategoria
        categorias={catalogo.categorias.filter((c) => !c.archived)}
        proyectos={catalogo.proyectos.filter((p) => !p.archived)}
      />
    </div>
  )
}

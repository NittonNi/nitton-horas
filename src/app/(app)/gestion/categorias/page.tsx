import { getSesion } from "@/lib/sesion"
import { cargarCatalogo } from "@/lib/datos"
import { GestionCategorias } from "@/components/gestion-categorias"
import { ProyectosPorCategoria } from "@/components/proyectos-por-categoria"

export const metadata = { title: "Categorización" }

export default async function PaginaCategorias() {
  const { espacio } = await getSesion()
  // Con archivadas: aquí es donde se reactivan.
  const catalogo = await cargarCatalogo(espacio.id, true)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <GestionCategorias
        espacioId={espacio.id}
        categorias={catalogo.categorias}
        proyectos={catalogo.proyectos}
      />
      <ProyectosPorCategoria
        categorias={catalogo.categorias.filter((c) => !c.archived)}
        proyectos={catalogo.proyectos.filter((p) => !p.archived)}
      />
    </div>
  )
}

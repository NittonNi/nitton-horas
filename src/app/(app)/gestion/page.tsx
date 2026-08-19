import { getSesion } from "@/lib/sesion"
import { cargarCatalogo } from "@/lib/datos"
import { GestionClientes } from "@/components/gestion-clientes"
import { GestionEtiquetas } from "@/components/gestion-etiquetas"
import { GestionProyectos } from "@/components/gestion-proyectos"

export const metadata = { title: "Catálogo" }

export default async function PaginaCatalogo() {
  const { espacio } = await getSesion()
  // Con archivados: aquí es justo donde se reactivan.
  const catalogo = await cargarCatalogo(espacio.id, true)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="space-y-5">
        <GestionClientes
          clientes={catalogo.clientes}
          proyectos={catalogo.proyectos}
        />
        <GestionEtiquetas espacioId={espacio.id} etiquetas={catalogo.etiquetas} />
      </div>
      <GestionProyectos
        espacioId={espacio.id}
        proyectos={catalogo.proyectos}
        clientes={catalogo.clientes}
        tareas={catalogo.tareas}
      />
    </div>
  )
}

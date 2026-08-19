import { getSesion } from "@/lib/sesion"
import { veTodo } from "@/lib/roles"
import { cargarCatalogo, cargarEntradas, cargarMiembros } from "@/lib/datos"
import { PanelEstadisticas } from "@/components/panel-estadisticas"
import { toDateKey, todayKey } from "@/lib/time"

export const metadata = { title: "Estadísticas" }

/** Los últimos doce meses, contando el que corre. */
function ultimosMeses(cuantos = 12) {
  const hoy = new Date()
  const meses: string[] = []
  for (let i = cuantos - 1; i >= 0; i--) {
    const mes = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    meses.push(toDateKey(mes).slice(0, 7))
  }
  return meses
}

export default async function PaginaEstadisticas() {
  const { perfil, espacio, rol } = await getSesion()
  const gestor = veTodo(rol)

  const meses = ultimosMeses()
  const desde = meses[0] + "-01"

  const [catalogo, entradas, miembros] = await Promise.all([
    cargarCatalogo(espacio.id, true),
    cargarEntradas({
      espacioId: espacio.id,
      desde,
      hasta: todayKey(),
      limite: 20000,
    }),
    cargarMiembros(espacio.id),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Estadísticas</h1>
        <p className="mt-0.5 text-sm text-muted">
          Cómo vais: mes a mes, en qué se va el tiempo y qué proyectos se comen
          su presupuesto.
        </p>
      </div>

      <PanelEstadisticas
        entradas={entradas}
        catalogo={catalogo}
        miembros={miembros.filter((m) => m.active)}
        perfilId={perfil.id}
        puedeVerImportes={gestor}
        meses={meses}
      />
    </div>
  )
}

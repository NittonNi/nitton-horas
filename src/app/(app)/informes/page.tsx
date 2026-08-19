import { getSesion } from "@/lib/sesion"
import { esAdmin, veTodo } from "@/lib/roles"
import { cargarCatalogo, cargarEntradas, cargarMiembros } from "@/lib/datos"
import { PanelInformes } from "@/components/panel-informes"
import { toDateKey, todayKey } from "@/lib/time"

export const metadata = { title: "Informes" }

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/

export default async function PaginaInformes({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const parametros = await searchParams
  const { perfil, espacio, rol } = await getSesion()
  const gestor = veTodo(rol)

  // Por defecto, el mes en curso
  const hoy = new Date()
  const desde = ES_FECHA.test(parametros.desde ?? "")
    ? parametros.desde!
    : toDateKey(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const hasta = ES_FECHA.test(parametros.hasta ?? "") ? parametros.hasta! : todayKey()

  const [catalogo, entradas, miembros] = await Promise.all([
    cargarCatalogo(espacio.id, true),
    // Un gestor ve a todo el equipo; el resto, solo lo suyo (y la RLS lo respalda)
    cargarEntradas({
      espacioId: espacio.id,
      desde,
      hasta,
      userId: gestor ? undefined : perfil.id,
    }),
    gestor ? cargarMiembros(espacio.id) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-lg font-semibold tracking-tight">Informes</h1>
        <p className="mt-0.5 text-sm text-muted">
          Filtra, exporta y corrige las horas del periodo. Pulsa una para
          cambiarla, o elige varias para arreglarlas de golpe.
        </p>
      </div>

      <PanelInformes
        entradas={entradas}
        catalogo={catalogo}
        miembros={miembros.filter((m) => m.active)}
        desde={desde}
        hasta={hasta}
        puedeVerImportes={gestor}
        perfilId={perfil.id}
        puedeEditarTodo={esAdmin(rol)}
      />
    </div>
  )
}

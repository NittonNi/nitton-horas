import { getSesion } from "@/lib/sesion"
import { veTodo } from "@/lib/roles"
import { cargarCatalogo, cargarEntradas, cargarMiembros } from "@/lib/datos"
import { TablaSemana } from "@/components/tabla-semana"
import { addDays, fromDateKey, startOfWeek, toDateKey } from "@/lib/time"

export const metadata = { title: "Semana" }

export default async function PaginaSemana({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; persona?: string }>
}) {
  const parametros = await searchParams
  const { perfil, espacio, rol } = await getSesion()

  const lunes = /^\d{4}-\d{2}-\d{2}$/.test(parametros.semana ?? "")
    ? toDateKey(startOfWeek(fromDateKey(parametros.semana!)))
    : toDateKey(startOfWeek(new Date()))
  const domingo = toDateKey(addDays(fromDateKey(lunes), 6))

  // Solo quien ve las horas de todos puede mirar la semana de otra persona
  const gestor = veTodo(rol)
  const personaId = gestor && parametros.persona ? parametros.persona : perfil.id

  const [catalogo, entradas, miembros] = await Promise.all([
    cargarCatalogo(espacio.id),
    cargarEntradas({
      espacioId: espacio.id,
      desde: lunes,
      hasta: domingo,
      userId: personaId,
    }),
    gestor ? cargarMiembros(espacio.id) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Semana</h1>
        <p className="mt-0.5 text-sm text-muted">
          Rellena las horas por dia. Acepta 1:30, 90m o 1,5.
        </p>
      </div>

      <TablaSemana
        entradas={entradas}
        catalogo={catalogo}
        lunes={lunes}
        espacioId={espacio.id}
        yoId={perfil.id}
        personaId={personaId}
        miembros={miembros.filter((m) => m.active)}
      />
    </div>
  )
}

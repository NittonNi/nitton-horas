import { getSesion } from "@/lib/sesion"
import {
  cargarCatalogo,
  cargarEntradas,
  cargarMiembros,
  cargarPropuestas,
} from "@/lib/datos"
import { RejillaCalendario } from "@/components/rejilla-calendario"
import { addDays, fromDateKey, startOfWeek, toDateKey } from "@/lib/time"

export const metadata = { title: "Calendario" }

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; persona?: string }>
}) {
  const parametros = await searchParams
  const { perfil, espacio } = await getSesion()

  const lunes = /^\d{4}-\d{2}-\d{2}$/.test(parametros.semana ?? "")
    ? toDateKey(startOfWeek(fromDateKey(parametros.semana!)))
    : toDateKey(startOfWeek(new Date()))
  const domingo = toDateKey(addDays(fromDateKey(lunes), 6))

  // Cualquiera puede mirar -y corregir- la semana de cualquiera del espacio
  const personaId = parametros.persona || perfil.id

  const [catalogo, entradas, miembros, propuestas] = await Promise.all([
    cargarCatalogo(espacio.id),
    cargarEntradas({
      espacioId: espacio.id,
      desde: lunes,
      hasta: domingo,
      userId: personaId,
    }),
    cargarMiembros(espacio.id),
    cargarPropuestas(espacio.id),
  ])

  /* Las propuestas son mias, asi que solo pintan cuando miro mi semana, y solo
     las de esta semana: en otra no habria donde ponerlas. */
  const propuestasDeLaSemana =
    personaId === perfil.id
      ? propuestas.filter((p) => {
          const dia = toDateKey(new Date(p.start_at))
          return dia >= lunes && dia <= domingo
        })
      : []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Calendario</h1>
        <p className="mt-0.5 text-sm text-muted">
          Las horas de la semana colocadas donde de verdad ocurrieron.
        </p>
      </div>

      <RejillaCalendario
        entradas={entradas}
        propuestas={propuestasDeLaSemana}
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

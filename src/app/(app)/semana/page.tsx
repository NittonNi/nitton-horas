import { getSesion } from "@/lib/sesion"
import { PistaPagina } from "@/components/pista-pagina"
import { cargarCatalogo, cargarEntradas, cargarMiembros } from "@/lib/datos"
import { TablaSemana } from "@/components/tabla-semana"
import { addDays, fromDateKey, startOfWeek, toDateKey } from "@/lib/time"

export const metadata = { title: "Semana" }

export default async function PaginaSemana({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>
}) {
  const parametros = await searchParams
  const { perfil, espacio } = await getSesion()

  const lunes = /^\d{4}-\d{2}-\d{2}$/.test(parametros.semana ?? "")
    ? toDateKey(startOfWeek(fromDateKey(parametros.semana!)))
    : toDateKey(startOfWeek(new Date(), espacio.timezone))
  const domingo = toDateKey(addDays(fromDateKey(lunes), 6))

  /* La hoja es para rellenar lo tuyo, igual que el calendario: las horas de
     otra gente se miran en informes. */

  const [catalogo, entradas, miembros] = await Promise.all([
    cargarCatalogo(espacio.id),
    cargarEntradas({
      espacioId: espacio.id,
      desde: lunes,
      hasta: domingo,
      userId: perfil.id,
      soloTerminadas: true,
    }),
    cargarMiembros(espacio.id),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Semana</h1>
        <p className="mt-0.5 text-sm text-muted">
          Rellena las horas por día. Acepta 2, 1:30, 90m o 1,5.
        </p>
      </div>

      <PistaPagina clave="semana" perfilId={perfil.id}>
        Escribe en la casilla del día: 2, 1:30, 90m o 1,5. Una fila por
        proyecto y descripción.
      </PistaPagina>

      <TablaSemana
        entradas={entradas}
        catalogo={catalogo}
        lunes={lunes}
        espacioId={espacio.id}
        yoId={perfil.id}
        miembros={miembros.filter((m) => m.active)}
      />
    </div>
  )
}

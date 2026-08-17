import { getSesion } from "@/lib/sesion"
import { veTodo } from "@/lib/roles"
import { cargarCatalogo, cargarEntradas } from "@/lib/datos"
import { BarraCronometro } from "@/components/barra-cronometro"
import { ListaEntradas } from "@/components/lista-entradas"
import {
  addDays,
  formatDurationShort,
  startOfWeek,
  toDateKey,
  todayKey,
} from "@/lib/time"

export const metadata = { title: "Cronometro" }

export default async function PaginaCronometro() {
  const { perfil, espacio, rol } = await getSesion()
  const hoy = todayKey()
  const lunes = toDateKey(startOfWeek(new Date()))
  const desde = toDateKey(addDays(new Date(), -20))

  const [catalogo, entradas] = await Promise.all([
    cargarCatalogo(espacio.id),
    cargarEntradas({ espacioId: espacio.id, desde, hasta: hoy, userId: perfil.id }),
  ])

  const cerradas = entradas.filter((e) => e.end_at)
  const segsHoy = cerradas
    .filter((e) => e.local_date === hoy)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  const semana = cerradas.filter((e) => e.local_date >= lunes)
  const segsSemana = semana.reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  const segsFacturables = semana
    .filter((e) => e.billable)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

  return (
    <div className="space-y-5">
      <BarraCronometro catalogo={catalogo} />

      <div className="grid grid-cols-3 gap-3">
        <Resumen etiqueta="Hoy" valor={formatDurationShort(segsHoy)} />
        <Resumen etiqueta="Esta semana" valor={formatDurationShort(segsSemana)} />
        <Resumen
          etiqueta="Facturable"
          valor={formatDurationShort(segsFacturables)}
          acento
        />
      </div>

      {catalogo.proyectos.length === 0 && (
        <p className="rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-sm">
          Todavia no hay proyectos.{" "}
          {veTodo(rol) ? (
            <a href="/gestion" className="font-medium text-accent underline">
              Crea el primero en Gestion
            </a>
          ) : (
            "Pide a un administrador que cree los proyectos."
          )}
        </p>
      )}

      <ListaEntradas entradas={entradas} catalogo={catalogo} />
    </div>
  )
}

function Resumen({
  etiqueta,
  valor,
  acento = false,
}: {
  etiqueta: string
  valor: string
  acento?: boolean
}) {
  return (
    <div className="card px-4 py-3">
      <p className="text-xs font-medium text-muted">{etiqueta}</p>
      <p
        className={`tabular mt-0.5 text-xl font-semibold ${acento ? "text-billable" : ""}`}
      >
        {valor}
      </p>
    </div>
  )
}

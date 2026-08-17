import Link from "next/link"

import { getSesion } from "@/lib/sesion"
import { veTodo } from "@/lib/roles"
import { cargarCatalogo, cargarEntradas, cargarPropuestas } from "@/lib/datos"
import { BarraCronometro } from "@/components/barra-cronometro"
import { ListaEntradas } from "@/components/lista-entradas"
import { PropuestasPendientes } from "@/components/propuestas-pendientes"
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

  const [catalogo, entradas, propuestas] = await Promise.all([
    cargarCatalogo(espacio.id),
    cargarEntradas({ espacioId: espacio.id, desde, hasta: hoy, userId: perfil.id }),
    cargarPropuestas(espacio.id),
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

      <PropuestasPendientes propuestas={propuestas} />

      <div className="card grid grid-cols-3 divide-x divide-line">
        <Resumen etiqueta="Hoy" valor={formatDurationShort(segsHoy)} />
        <Resumen etiqueta="Esta semana" valor={formatDurationShort(segsSemana)} />
        <Resumen
          etiqueta="Facturable"
          valor={formatDurationShort(segsFacturables)}
          pie={
            segsSemana > 0
              ? `${Math.round((segsFacturables / segsSemana) * 100)}% de la semana`
              : undefined
          }
        />
      </div>

      {catalogo.proyectos.length === 0 && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Aun no hay proyectos</p>
            <p className="mt-0.5 text-sm text-muted">
              {veTodo(rol)
                ? "Las horas se apuntan contra un proyecto. Crea el primero y ya puedes cronometrar."
                : "Las horas se apuntan contra un proyecto. Pide a un administrador que cree los del equipo."}
            </p>
          </div>
          {veTodo(rol) && (
            <Link href="/gestion" className="btn btn-primary">
              Crear proyecto
            </Link>
          )}
        </div>
      )}

      <ListaEntradas entradas={entradas} catalogo={catalogo} />
    </div>
  )
}

function Resumen({
  etiqueta,
  valor,
  pie,
}: {
  etiqueta: string
  valor: string
  pie?: string
}) {
  return (
    <div className="px-4 py-3">
      <p className="rotulo">{etiqueta}</p>
      <p className="cifra mt-1 text-2xl font-semibold leading-none">{valor}</p>
      <p className="mt-1.5 h-4 text-xs text-muted">{pie}</p>
    </div>
  )
}

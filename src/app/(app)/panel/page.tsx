import Link from "next/link"

import { getSesion } from "@/lib/sesion"
import { veTodo } from "@/lib/roles"
import {
  cargarCatalogo,
  cargarEntradas,
  cargarMiembros,
  cargarPropuestas,
} from "@/lib/datos"
import { BarraCronometro } from "@/components/barra-cronometro"
import { ListaEntradas } from "@/components/lista-entradas"
import { ResumenCronometro } from "@/components/resumen-cronometro"
import { PropuestasPendientes } from "@/components/propuestas-pendientes"
import {
  addDays,
  formatDurationShort,
  formatObjetivoCorto,
  startOfWeek,
  toDateKey,
  todayKey,
} from "@/lib/time"

export const metadata = { title: "Cronómetro" }

export default async function PaginaCronometro() {
  const { perfil, espacio, rol } = await getSesion()
  const hoy = todayKey()
  const lunes = toDateKey(startOfWeek(new Date()))
  const inicioMes = toDateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const haceVeinte = toDateKey(addDays(new Date(), -20))
  const desde = inicioMes < haceVeinte ? inicioMes : haceVeinte

  const [catalogo, entradas, propuestas, miembros] = await Promise.all([
    cargarCatalogo(espacio.id),
    cargarEntradas({ espacioId: espacio.id, desde, hasta: hoy, userId: perfil.id }),
    cargarPropuestas(espacio.id),
    cargarMiembros(espacio.id),
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
  const segsMes = cerradas
    .filter((e) => e.local_date >= inicioMes)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)
  const diasConHoras = new Set(semana.map((e) => e.local_date)).size

  return (
    <div className="space-y-5">
      <BarraCronometro
        catalogo={catalogo}
        miembros={miembros.filter((m) => m.active && m.id !== perfil.id)}
      />

      <PropuestasPendientes propuestas={propuestas} />

      <ResumenCronometro
        espacioId={espacio.id}
        cifras={{
          hoy: segsHoy,
          semana: segsSemana,
          facturableSemana: segsFacturables,
          mes: segsMes,
          diasConHoras,
          objetivoDia: espacio.goal_daily_minutes,
          objetivoSemana: espacio.goal_weekly_minutes,
        }}
      />

      {catalogo.proyectos.length === 0 && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Aún no hay proyectos</p>
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

      <ListaEntradas
        entradas={entradas}
        catalogo={catalogo}
        objetivoDia={espacio.goal_daily_minutes}
        objetivoSemana={espacio.goal_weekly_minutes}
      />
    </div>
  )
}

/** "Faltan 1:48" o "Objetivo cumplido", cuando el espacio ha fijado uno. */
function pieObjetivo(segundos: number, objetivoMinutos: number | null) {
  if (!objetivoMinutos) return undefined
  const restante = objetivoMinutos * 60 - segundos
  return restante > 0
    ? `Faltan ${formatDurationShort(restante)} de ${formatObjetivoCorto(objetivoMinutos)}`
    : "Objetivo cumplido"
}

function Resumen({
  etiqueta,
  valor,
  pie,
  resaltado = false,
}: {
  etiqueta: string
  valor: string
  pie?: string
  resaltado?: boolean
}) {
  return (
    <div className="px-4 py-3">
      <p className="rotulo">{etiqueta}</p>
      <p
        className={`cifra mt-1 text-2xl font-semibold leading-none tracking-tight ${resaltado ? "text-billable" : ""}`}
      >
        {valor}
      </p>
      <p className="mt-1.5 h-4 text-xs text-muted">{pie}</p>
    </div>
  )
}

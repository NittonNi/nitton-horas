import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { getSesion } from "@/lib/sesion"
import { veTodo } from "@/lib/roles"
import { cargarCatalogo } from "@/lib/datos"
import { caminoDe } from "@/lib/categorias"
import { createClient } from "@/lib/supabase/server"
import { NuevoProyecto } from "@/components/nuevo-proyecto"
import { formatDurationShort, formatMoney, formatDateShort } from "@/lib/time"

export const metadata = { title: "Proyectos" }

export default async function PaginaProyectos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const busqueda = (q ?? "").trim().toLowerCase()
  const { espacio, rol } = await getSesion()
  const gestor = veTodo(rol)

  const supabase = await createClient()
  const [catalogo, resumen] = await Promise.all([
    cargarCatalogo(espacio.id, true),
    supabase.rpc("resumen_proyectos", { p_workspace: espacio.id }),
  ])

  const porProyecto = new Map(
    (resumen.data ?? []).map((fila) => [fila.project_id, fila]),
  )

  /* La busqueda mira nombre, cliente y rama: es como los busca la gente. */
  const encaja = (p: (typeof catalogo.proyectos)[number]) => {
    if (!busqueda) return true
    const donde = [
      p.name,
      p.clients?.name ?? "",
      caminoDe(catalogo.categorias, p.category_id) ?? "",
    ]
      .join(" ")
      .toLowerCase()
    return donde.includes(busqueda)
  }

  const activos = catalogo.proyectos.filter((p) => !p.archived && encaja(p))
  const archivados = catalogo.proyectos.filter((p) => p.archived && encaja(p))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Proyectos</h1>
          <p className="mt-0.5 text-sm text-muted">
            {gestor
              ? "Las horas del equipo en cada uno."
              : "Tus horas en cada uno."}
          </p>
        </div>
        <form action="/proyectos" className="no-print order-last w-full sm:order-none sm:w-64">
          <label className="sr-only" htmlFor="buscar-proyecto">
            Buscar un proyecto
          </label>
          <input
            id="buscar-proyecto"
            name="q"
            defaultValue={q ?? ""}
            className="field"
            placeholder="Buscar por nombre, cliente o rama"
            type="search"
          />
        </form>

        {gestor && (
          <NuevoProyecto
            espacioId={espacio.id}
            clientes={catalogo.clientes}
            categorias={catalogo.categorias}
          />
        )}
      </div>

      {activos.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          {busqueda ? (
            <>
              <p className="text-sm font-medium">Nada encaja con esa búsqueda</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                Se busca por nombre, por cliente y por la rama de la
                categorización.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Aún no hay proyectos</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                {gestor
                  ? "Crea el primero y ya puedes empezar a apuntar horas contra el."
                  : "Pide a un administrador que cree los del equipo."}
              </p>
            </>
          )}
        </div>
      ) : (
        <Lista
          proyectos={activos}
          tareas={catalogo.tareas}
          categorias={catalogo.categorias}
          porProyecto={porProyecto}
          conImportes={gestor}
        />
      )}

      {archivados.length > 0 && (
        <div>
          <p className="rotulo mb-2">Archivados</p>
          <Lista
            proyectos={archivados}
            tareas={catalogo.tareas}
            categorias={catalogo.categorias}
            porProyecto={porProyecto}
            conImportes={gestor}
            apagados
          />
        </div>
      )}
    </div>
  )
}

type Resumen = {
  project_id: string
  segundos: number
  segundos_facturables: number
  importe: number
  entradas: number
  ultima: string | null
}

function Lista({
  proyectos,
  tareas,
  categorias,
  porProyecto,
  conImportes,
  apagados = false,
}: {
  proyectos: Awaited<ReturnType<typeof cargarCatalogo>>["proyectos"]
  tareas: Awaited<ReturnType<typeof cargarCatalogo>>["tareas"]
  categorias: Awaited<ReturnType<typeof cargarCatalogo>>["categorias"]
  porProyecto: Map<string, Resumen>
  conImportes: boolean
  apagados?: boolean
}) {
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {proyectos.map((proyecto) => {
        const datos = porProyecto.get(proyecto.id)
        const suyas = tareas.filter(
          (t) => t.project_id === proyecto.id && !t.archived,
        ).length
        const horas = datos?.segundos ?? 0
        const presupuesto = proyecto.budget_hours ?? null
        const consumido =
          presupuesto && presupuesto > 0
            ? Math.min(100, (horas / 3600 / presupuesto) * 100)
            : null

        return (
          <Link
            key={proyecto.id}
            href={`/proyectos/${proyecto.id}`}
            className={`flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2 ${apagados ? "opacity-55" : ""}`}
          >
            <span
              aria-hidden
              className="h-8 w-1 shrink-0 rounded-full"
              style={{ background: proyecto.color }}
            />

            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {proyecto.name}
                </span>
                {caminoDe(categorias, proyecto.category_id) && (
                  <span className="chip shrink-0">
                    {caminoDe(categorias, proyecto.category_id)}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted">
                {proyecto.clients?.name ?? "Sin cliente"}
                {suyas > 0 && ` · ${suyas} ${suyas === 1 ? "tarea" : "tareas"}`}
                {datos?.ultima && ` · última el ${formatDateShort(datos.ultima)}`}
              </p>
            </div>

            {consumido !== null && (
              <div className="hidden w-28 shrink-0 sm:block">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${consumido}%`, background: proyecto.color }}
                  />
                </div>
                <p className="cifra mt-1 text-[11px] text-muted">
                  {Math.round(consumido)}% de {presupuesto} h
                </p>
              </div>
            )}

            <div className="shrink-0 text-right">
              <p className="cifra text-sm font-semibold">
                {formatDurationShort(horas)}
              </p>
              {conImportes && (datos?.importe ?? 0) > 0 && (
                <p className="cifra text-[11px] text-billable">
                  {formatMoney(Number(datos?.importe ?? 0))}
                </p>
              )}
            </div>

            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </Link>
        )
      })}
    </div>
  )
}

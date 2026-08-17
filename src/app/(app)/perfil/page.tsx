import { getSesion } from "@/lib/sesion"
import { createClient } from "@/lib/supabase/server"
import { FormularioPerfil } from "@/components/formulario-perfil"
import { cargarEntradas } from "@/lib/datos"
import { formatDurationShort, todayKey, toDateKey, startOfWeek } from "@/lib/time"

export const metadata = { title: "Mi perfil" }

export default async function PaginaPerfil() {
  const { perfil, espacio, rol, espacios } = await getSesion()
  const supabase = await createClient()

  const lunes = toDateKey(startOfWeek(new Date()))
  const [entradas, { count }] = await Promise.all([
    cargarEntradas({
      espacioId: espacio.id,
      desde: lunes,
      hasta: todayKey(),
      userId: perfil.id,
    }),
    supabase
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", perfil.id)
      .eq("workspace_id", espacio.id),
  ])

  const segundosSemana = entradas
    .filter((e) => e.end_at)
    .reduce((s, e) => s + (e.duration_seconds ?? 0), 0)

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Mi perfil</h1>
        <p className="mt-0.5 text-sm text-muted">
          Tu nombre es lo que ve el resto del equipo en los informes.
        </p>
      </div>

      <FormularioPerfil
        perfil={perfil}
        rol={rol}
        numeroEspacios={espacios.length}
      />

      <section className="card grid grid-cols-2 gap-3 p-4">
        <div>
          <p className="text-xs font-medium text-muted">Esta semana</p>
          <p className="tabular mt-0.5 text-xl font-semibold">
            {formatDurationShort(segundosSemana)}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted">
            Entradas en {espacio.name}
          </p>
          <p className="tabular mt-0.5 text-xl font-semibold">{count ?? 0}</p>
        </div>
      </section>
    </div>
  )
}

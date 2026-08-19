import { redirect } from "next/navigation"

import { getSesion } from "@/lib/sesion"
import { esAdmin } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"
import { cargarCatalogo, cargarMiembros } from "@/lib/datos"
import { GestionTarifas } from "@/components/gestion-tarifas"
import { ObjetivoHora } from "@/components/objetivo-hora"
import type { Tarifa } from "@/lib/tipos"

export const metadata = { title: "Tarifas" }

export default async function PaginaTarifas() {
  const { espacio, rol } = await getSesion()
  if (!esAdmin(rol)) redirect("/gestion")

  const supabase = await createClient()
  const [tarifas, miembros, catalogo] = await Promise.all([
    supabase
      .from("rates")
      .select("*")
      .eq("workspace_id", espacio.id)
      .order("effective_from", { ascending: false }),
    cargarMiembros(espacio.id),
    cargarCatalogo(espacio.id),
  ])

  return (
    <div className="space-y-5">
      {/* Lo primero, porque es contra lo que se mira todo lo demas. */}
      <ObjetivoHora
        espacioId={espacio.id}
        valor={espacio.target_hourly_rate}
        puedeCambiar
      />

      <GestionTarifas
        espacioId={espacio.id}
        tarifas={(tarifas.data ?? []) as Tarifa[]}
        miembros={miembros.filter((m) => m.active)}
        proyectos={catalogo.proyectos}
      />
    </div>
  )
}

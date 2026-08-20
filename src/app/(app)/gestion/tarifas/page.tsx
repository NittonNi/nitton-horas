import { redirect } from "next/navigation"

import { getSesion } from "@/lib/sesion"
import { esAdmin } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"
import { cargarCatalogo, cargarMiembros, cargarReparto } from "@/lib/datos"
import { GestionTarifas } from "@/components/gestion-tarifas"
import { GestionReparto } from "@/components/gestion-reparto"
import type { Tarifa } from "@/lib/tipos"

export const metadata = { title: "Tarifas" }

export default async function PaginaTarifas() {
  const { espacio, rol } = await getSesion()
  if (!esAdmin(rol)) redirect("/gestion")

  const supabase = await createClient()
  const [tarifas, miembros, catalogo, reparto] = await Promise.all([
    supabase
      .from("rates")
      .select("*")
      .eq("workspace_id", espacio.id)
      .order("effective_from", { ascending: false }),
    cargarMiembros(espacio.id),
    cargarCatalogo(espacio.id),
    cargarReparto(espacio.id),
  ])

  return (
    <div className="space-y-8">
      <GestionTarifas
        espacioId={espacio.id}
        tarifas={(tarifas.data ?? []) as Tarifa[]}
        miembros={miembros.filter((m) => m.active)}
        proyectos={catalogo.proyectos}
      />

      <GestionReparto
        espacioId={espacio.id}
        repartos={reparto.repartos}
        shares={reparto.shares}
        miembros={miembros.filter((m) => m.active)}
        proyectos={catalogo.proyectos}
        ediciones={catalogo.ediciones}
      />
    </div>
  )
}

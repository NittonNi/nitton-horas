import { redirect } from "next/navigation"

import { getSesion } from "@/lib/sesion"
import { esAdmin } from "@/lib/roles"
import { createClient } from "@/lib/supabase/server"
import { cargarCatalogo, cargarMiembros } from "@/lib/datos"
import { GestionTarifas } from "@/components/gestion-tarifas"
import type { Tarifa } from "@/lib/tipos"

export const metadata = { title: "Tarifas" }

export default async function PaginaTarifas() {
  const { espacio, rol } = await getSesion()
  if (!esAdmin(rol)) redirect("/gestión")

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
    <GestionTarifas
      espacioId={espacio.id}
      tarifas={(tarifas.data ?? []) as Tarifa[]}
      miembros={miembros.filter((m) => m.active)}
      proyectos={catalogo.proyectos}
    />
  )
}

import { redirect } from "next/navigation"

import { getSesion } from "@/lib/sesion"
import { esAdmin } from "@/lib/roles"
import { AjustesEspacio } from "@/components/ajustes-espacio"

export const metadata = { title: "Ajustes" }

export default async function PaginaAjustes() {
  const { espacio, rol } = await getSesion()
  // Lo que vale para todo el equipo lo cambia quien administra
  if (!esAdmin(rol)) redirect("/gestion")

  return <AjustesEspacio espacio={espacio} />
}

import { redirect } from "next/navigation"

import { getSesion } from "@/lib/sesion"
import { veTodo } from "@/lib/roles"
import { SubNav } from "@/components/sub-nav"

export default async function LayoutGestion({
  children,
}: {
  children: React.ReactNode
}) {
  const { rol } = await getSesion()
  if (!veTodo(rol)) redirect("/")

  const enlaces = [
    { href: "/gestion", etiqueta: "Catalogo", exacto: true },
    { href: "/gestion/equipo", etiqueta: "Equipo" },
    { href: "/gestion/tarifas", etiqueta: "Tarifas", soloAdmin: true },
    { href: "/gestion/importar", etiqueta: "Importar" },
  ].filter((e) => !e.soloAdmin || rol === "admin")

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Gestion</h1>
        <p className="mt-0.5 text-sm text-muted">
          Clientes, proyectos, equipo y tarifas.
        </p>
      </div>
      <SubNav enlaces={enlaces} />
      {children}
    </div>
  )
}

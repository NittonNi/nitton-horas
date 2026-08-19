import { getPerfil } from "@/lib/sesion"
import { AsistenteInicio } from "@/components/asistente-inicio"

export const metadata = { title: "Montar el espacio" }

/**
 * El alta de un espacio, de una sentada. Vive fuera del grupo (app) porque ese
 * layout da por hecho que ya hay un espacio activo, y aquí es justo lo que se
 * está creando.
 */
export default async function PaginaEmpezar() {
  const perfil = await getPerfil()
  return <AsistenteInicio perfil={perfil} />
}

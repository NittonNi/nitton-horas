import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { Perfil, Pertenencia, Sesion } from "@/lib/tipos"

/**
 * Solo servidor: lee cookies y consulta con la sesion del usuario. Los
 * componentes de cliente reciben la sesion por props o por contexto.
 */

/** Espacio activo. Vive en una cookie porque no cuelga de la URL. */
export const COOKIE_ESPACIO = "espacio"

/** Quien esta usando la app. Manda a /acceso si no hay sesion. */
export async function getPerfil(): Promise<Perfil> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/acceso")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  // Usuario en auth sin fila en profiles: el alta se quedo a medias
  if (!perfil) redirect("/auth/salir")

  return perfil
}

export async function getPertenencias(userId: string): Promise<Pertenencia[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("workspace_members")
    .select("role, workspaces(*)")
    .eq("user_id", userId)
    .eq("active", true)

  return (data ?? [])
    .flatMap((fila) =>
      fila.workspaces ? [{ espacio: fila.workspaces, rol: fila.role }] : [],
    )
    .sort((a, b) => a.espacio.name.localeCompare(b.espacio.name))
}

/**
 * Perfil + espacio activo + rol en ese espacio. Manda a /bienvenida a quien
 * todavia no pertenece a ninguno.
 */
export async function getSesion(): Promise<Sesion> {
  const perfil = await getPerfil()
  const espacios = await getPertenencias(perfil.id)

  if (espacios.length === 0) redirect("/bienvenida")

  const guardado = (await cookies()).get(COOKIE_ESPACIO)?.value
  // Si la cookie apunta a un espacio del que ya no formo parte, al primero
  const actual = espacios.find((e) => e.espacio.id === guardado) ?? espacios[0]

  return {
    perfil,
    espacio: actual.espacio,
    rol: actual.rol,
    espacios,
  }
}

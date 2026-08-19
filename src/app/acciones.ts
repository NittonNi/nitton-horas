"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { COOKIE_ESPACIO } from "@/lib/sesion"
import { RUTA_APP, rutaSegura } from "@/lib/rutas"

/** Deja este espacio como el activo, sin moverse de donde estas. */
export async function activarEspacio(id: string) {
  const almacen = await cookies()
  almacen.set(COOKIE_ESPACIO, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}

/**
 * Cambia de espacio y vuelve al cronometro. Se usa como `action` de un
 * formulario, asi que no puede llevar mas argumentos.
 */
export async function cambiarEspacio(id: string) {
  await activarEspacio(id)
  redirect(RUTA_APP)
}

/** Cambia de espacio y va a donde se le diga. */
export async function entrarEnEspacio(id: string, destino: string) {
  await activarEspacio(id)
  redirect(rutaSegura(destino))
}

"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { COOKIE_ESPACIO } from "@/lib/sesion"
import { RUTA_APP } from "@/lib/rutas"

/** Cambia de espacio de trabajo y vuelve al cronómetro. */
export async function cambiarEspacio(id: string) {
  const almacen = await cookies()
  almacen.set(COOKIE_ESPACIO, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  redirect(RUTA_APP)
}

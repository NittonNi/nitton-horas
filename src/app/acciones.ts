"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { COOKIE_ESPACIO } from "@/lib/sesion"

/** Cambia de espacio de trabajo y vuelve al cronometro. */
export async function cambiarEspacio(id: string) {
  const almacen = await cookies()
  almacen.set(COOKIE_ESPACIO, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
  redirect("/")
}

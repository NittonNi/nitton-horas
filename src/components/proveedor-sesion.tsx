"use client"

import { createContext, useContext } from "react"

import type { Sesion } from "@/lib/tipos"

const ContextoSesion = createContext<Sesion | null>(null)

export function ProveedorSesion({
  sesion,
  children,
}: {
  sesion: Sesion
  children: React.ReactNode
}) {
  return (
    <ContextoSesion.Provider value={sesion}>{children}</ContextoSesion.Provider>
  )
}

export function useSesion(): Sesion {
  const sesion = useContext(ContextoSesion)
  if (!sesion) {
    throw new Error("useSesion tiene que usarse dentro de <ProveedorSesion>")
  }
  return sesion
}

export function usePuedeVerTodo(): boolean {
  const { rol } = useSesion()
  return rol === "admin" || rol === "manager"
}

export function useEsAdmin(): boolean {
  return useSesion().rol === "admin"
}

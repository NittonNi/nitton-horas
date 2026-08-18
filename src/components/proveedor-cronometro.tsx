"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { aEntradaEnMarcha, SELECT_EN_MARCHA } from "@/lib/cronometro"
import type { BorradorEntrada, Entrada, EntradaEnMarcha } from "@/lib/tipos"

type Contexto = {
  enMarcha: EntradaEnMarcha | null
  /** Segundos transcurridos, refrescado cada segundo. */
  segundos: number
  cargando: boolean
  arrancar: (borrador: BorradorEntrada) => Promise<void>
  /** Devuelve la entrada ya cerrada: hace falta para proponerla a otros. */
  parar: () => Promise<Entrada | null>
  descartar: () => Promise<void>
  /** Vuelve a leer el cronómetro del servidor (otra pestaña, el movil...). */
  recargar: () => Promise<void>
}

const ContextoCronometro = createContext<Contexto | null>(null)

export function ProveedorCronometro({
  espacioId,
  inicial,
  children,
}: {
  /** El cronómetro es único por persona, pero solo se ve en su espacio. */
  espacioId: string
  inicial: EntradaEnMarcha | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const [enMarcha, setEnMarcha] = useState<EntradaEnMarcha | null>(inicial)
  const [ahora, setAhora] = useState(() => Date.now())
  const [cargando, setCargando] = useState(false)
  const supabaseRef = useRef(createClient())

  // Reloj: los segundos se calculan desde start_at en cada render en vez de
  // acumularse, así no se desincronizan si el navegador congela el intervalo
  // (movil en segundo plano). Lo único que se guarda es "qué hora es".
  const segundos = enMarcha
    ? Math.max(
        0,
        Math.floor((ahora - new Date(enMarcha.start_at).getTime()) / 1000),
      )
    : 0

  useEffect(() => {
    if (!enMarcha) return
    // El primer tick va aparte para que la cuenta arranque ya, sin esperar un segundo
    const primero = setTimeout(() => setAhora(Date.now()), 0)
    const id = setInterval(() => setAhora(Date.now()), 1000)
    return () => {
      clearTimeout(primero)
      clearInterval(id)
    }
  }, [enMarcha])

  const recargar = useCallback(async () => {
    const supabase = supabaseRef.current
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("time_entries")
      .select(SELECT_EN_MARCHA)
      .eq("user_id", user.id)
      .eq("workspace_id", espacioId)
      .is("end_at", null)
      .maybeSingle()

    setEnMarcha(aEntradaEnMarcha(data))
  }, [espacioId])

  // Si arrancaste el cronómetro en el movil y abres el portatil, que cuadre.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible") void recargar()
    }
    document.addEventListener("visibilitychange", alVolver)
    window.addEventListener("focus", alVolver)
    return () => {
      document.removeEventListener("visibilitychange", alVolver)
      window.removeEventListener("focus", alVolver)
    }
  }, [recargar])

  const arrancar = useCallback(
    async (borrador: BorradorEntrada) => {
      setCargando(true)
      try {
        const { error } = await supabaseRef.current.rpc("start_timer", {
          p_workspace_id: espacioId,
          // La funcion recibe uuid opcional: null y undefined valen lo mismo
          p_project_id: borrador.project_id ?? undefined,
          p_edition_id: borrador.edition_id ?? undefined,
          p_task_id: borrador.task_id ?? undefined,
          p_description: borrador.description,
          p_billable: borrador.billable,
          p_tag_ids: borrador.tagIds,
        })
        if (error) throw error
        await recargar()
        router.refresh()
      } catch (err) {
        alert(mensajeError(err))
      } finally {
        setCargando(false)
      }
    },
    [espacioId, recargar, router],
  )

  const parar = useCallback(async () => {
    setCargando(true)
    try {
      const { data, error } = await supabaseRef.current.rpc("stop_timer")
      if (error) throw error
      setEnMarcha(null)
      router.refresh()
      return (data as Entrada | null) ?? null
    } catch (err) {
      alert(mensajeError(err))
      return null
    } finally {
      setCargando(false)
    }
  }, [router])

  const descartar = useCallback(async () => {
    if (!enMarcha) return
    setCargando(true)
    try {
      const { error } = await supabaseRef.current
        .from("time_entries")
        .delete()
        .eq("id", enMarcha.id)
      if (error) throw error
      setEnMarcha(null)
      router.refresh()
    } catch (err) {
      alert(mensajeError(err))
    } finally {
      setCargando(false)
    }
  }, [enMarcha, router])

  return (
    <ContextoCronometro.Provider
      value={{ enMarcha, segundos, cargando, arrancar, parar, descartar, recargar }}
    >
      {children}
    </ContextoCronometro.Provider>
  )
}

export function useCronometro(): Contexto {
  const ctx = useContext(ContextoCronometro)
  if (!ctx) {
    throw new Error("useCronometro tiene que usarse dentro de <ProveedorCronometro>")
  }
  return ctx
}

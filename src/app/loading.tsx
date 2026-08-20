import { Loader2 } from "lucide-react"

/**
 * El unico tramo que los loading.tsx de cada seccion no cubren: la sesion
 * del layout de (app) -quien eres, si tienes el cronometro en marcha-, que
 * se resuelve antes que cualquier Suspense mas especifico. Sin marca de
 * ningun layout a proposito: esto tambien envuelve las paginas publicas.
 */
export default function Cargando() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted" aria-hidden />
    </div>
  )
}

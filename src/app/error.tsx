"use client"

import { useEffect } from "react"
import { AlertCircle } from "lucide-react"

export default function ErrorRaiz({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card max-w-sm p-6 text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-danger" aria-hidden />
        <h2 className="font-semibold">Algo se ha roto</h2>
        <p className="mt-2 text-sm text-muted">
          No hemos podido cargar esto. Puede ser cosa de un momento.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted">{error.digest}</p>
        )}
        <div className="mt-4 flex gap-2">
          <a href="/panel" className="btn flex-1">
            Ir a hitoo
          </a>
          <button type="button" onClick={() => retry()} className="btn btn-primary flex-1">
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}

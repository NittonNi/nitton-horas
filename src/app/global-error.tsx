"use client"

import { useEffect } from "react"

import "./globals.css"

/**
 * Solo salta si se rompe el layout raiz, algo que no deberia pasar nunca en
 * marcha normal. Va sin next/font ni el resto del layout -reemplaza el
 * documento entero-, con su propio <html>/<body> y el mismo script de tema
 * que el layout real, para que no parpadee en claro si el sistema esta en
 * oscuro.
 */
export default function ErrorGlobal({
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("tema");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="flex min-h-dvh items-center justify-center p-6">
        <div className="card max-w-sm p-6 text-center">
          <h2 className="font-semibold">Algo se ha roto</h2>
          <p className="mt-2 text-sm text-muted">
            hitoo no ha podido arrancar. Puede ser cosa de un momento.
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
      </body>
    </html>
  )
}

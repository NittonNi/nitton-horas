import { Suspense } from "react"
import Link from "next/link"

import { FormularioAcceso } from "./formulario-acceso"

export const metadata = { title: "Acceso" }

export default function PaginaAcceso() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-fg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-6 w-6"
              aria-hidden
            >
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2.5M9 2h6" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">ClockLEINN</h1>
          <p className="mt-1 text-sm text-muted">
            El control de horas de los equipos LEINN
          </p>
        </Link>

        <Suspense
          fallback={<div className="card h-72 animate-pulse bg-surface-2" />}
        >
          <FormularioAcceso />
        </Suspense>
      </div>
    </main>
  )
}

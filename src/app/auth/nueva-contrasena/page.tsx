import Link from "next/link"

import { FormularioNuevaContrasena } from "./formulario-nueva-contrasena"

export const metadata = { title: "Nueva contraseña" }

/** Se ve antes de entrar al panel, así que va en claro como la portada. */
export const viewport = { themeColor: "#f5f5f7" }

export default function PaginaNuevaContrasena() {
  return (
    <main className="tema-claro flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center">
          <h1 className="sr-only">hitoo</h1>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca, no necesita next/image */}
          <img
            src="/hitoo-logo.svg"
            alt="hitoo"
            className="mx-auto mb-4 h-12 w-auto"
          />
        </Link>

        <FormularioNuevaContrasena />
      </div>
    </main>
  )
}

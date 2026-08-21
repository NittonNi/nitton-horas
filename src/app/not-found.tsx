import Link from "next/link"
import { SearchX } from "lucide-react"

/**
 * Cubre tambien cualquier URL que no case con ninguna ruta de la app entera,
 * no solo el notFound() explicito de una pagina -asi lo documenta Next-.
 */
export default function NoEncontrado() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="card max-w-sm p-6 text-center">
        <SearchX className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden />
        <h2 className="font-semibold">No se encuentra</h2>
        <p className="mt-2 text-sm text-muted">
          Puede que se haya borrado o que el enlace esté mal escrito.
        </p>
        <Link href="/panel" className="btn btn-primary mt-4 w-full">
          Ir a hitoo
        </Link>
      </div>
    </div>
  )
}

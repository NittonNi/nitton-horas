import Link from "next/link"
import { SearchX } from "lucide-react"

export default function NoEncontrado() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="card max-w-sm p-6 text-center">
        <SearchX className="mx-auto mb-3 h-8 w-8 text-muted" aria-hidden />
        <h2 className="font-semibold">No se encuentra</h2>
        <p className="mt-2 text-sm text-muted">
          Puede que se haya borrado o que el enlace esté mal escrito.
        </p>
        <Link href="/panel" className="btn btn-primary mt-4 w-full">
          Ir al cronómetro
        </Link>
      </div>
    </div>
  )
}

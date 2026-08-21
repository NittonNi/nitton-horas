import { cn } from "@/lib/utils"

/**
 * Un rectangulo que respira: la pieza minima de cualquier esqueleto de carga.
 * Sin radio de esquina propio -cada sitio pone el que le toca, "card" incluido-,
 * para poder componer a mano el esqueleto de una pagina con su forma real
 * (vease panel/loading.tsx, estadisticas/loading.tsx o calendario/loading.tsx).
 */
export function BloquePulso({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-surface-2", className)} />
}

/** Aviso de carga generico para las paginas del panel: mismo aspecto en toda
 * la app, para que una recarga o un cambio de pagina se note en vez de
 * quedarse en blanco hasta que todo aparece de golpe.
 *
 * Sirve para paginas sencillas -un titulo y N bloques iguales apilados-. Las
 * que tienen una forma mas particular componen la suya con `BloquePulso`
 * directamente en su propio `loading.tsx`. */
export function EsqueletoPagina({
  bloques = 3,
  alturaBloque = "h-24",
}: {
  bloques?: number
  alturaBloque?: string
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <BloquePulso className="h-5 w-40 rounded" />
        <BloquePulso className="h-4 w-64 rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: bloques }).map((_, i) => (
          <BloquePulso key={i} className={cn("card", alturaBloque)} />
        ))}
      </div>
    </div>
  )
}

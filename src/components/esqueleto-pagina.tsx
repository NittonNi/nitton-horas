/** Aviso de carga generico para las paginas del panel: mismo aspecto en toda
 * la app, para que una recarga o un cambio de pagina se note en vez de
 * quedarse en blanco hasta que todo aparece de golpe. */
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
        <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
        <div className="h-4 w-64 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: bloques }).map((_, i) => (
          <div key={i} className={`card ${alturaBloque} animate-pulse bg-surface-2`} />
        ))}
      </div>
    </div>
  )
}

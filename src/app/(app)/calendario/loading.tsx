import { BloquePulso } from "@/components/esqueleto-pagina"

/** Calca la cabecera real -titulo y subtitulo a la izquierda, ajustes de
 * Google a la derecha-, la barra de navegacion de semana y la rejilla, con
 * su propia fila de dias arriba en vez de un bloque unico sin forma. */
export default function Cargando() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <BloquePulso className="h-5 w-32 rounded" />
          <BloquePulso className="h-4 w-56 rounded" />
        </div>
        <BloquePulso className="h-9 w-40 shrink-0 rounded-lg" />
      </div>

      {/* navegacion de semana, rango de fechas, filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <BloquePulso className="h-8 w-20 rounded-lg" />
        <BloquePulso className="h-6 w-48 rounded" />
        <BloquePulso className="ml-auto h-8 w-36 rounded-lg" />
      </div>

      {/* rejilla: cabecera de los 7 dias + la franja horaria debajo */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] border-b border-line">
          <div />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-1.5 border-l border-line px-2 py-2">
              <BloquePulso className="mx-auto h-3 w-6 rounded" />
              <BloquePulso className="mx-auto h-6 w-6 rounded-full" />
            </div>
          ))}
        </div>
        <BloquePulso className="h-[32rem] w-full" />
      </div>
    </div>
  )
}

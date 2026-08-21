import { BloquePulso } from "@/components/esqueleto-pagina"

/** Calca la forma real de PanelEstadisticas: mandos, las 4 cifras, el
 * grafico de evolucion (256px el solo, igual que en la pagina real), el
 * area/mapa de calor y personas/proyectos. Objetivos y PistaPagina son
 * condicionales -no todo espacio los tiene, o solo salen la primera vez- y
 * se han dejado fuera para no ensanchar el esqueleto en el caso comun. */
export default function Cargando() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <BloquePulso className="h-5 w-40 rounded" />
        <BloquePulso className="h-4 w-72 rounded" />
      </div>

      {/* mandos: presets, rango de fechas, unidad, presentar */}
      <div className="flex flex-wrap items-center gap-2">
        <BloquePulso className="h-8 w-64 rounded-[3px]" />
        <BloquePulso className="h-8 w-64 rounded-[3px]" />
        <BloquePulso className="ml-auto h-8 w-28 rounded-[3px]" />
      </div>

      {/* las 4 cifras */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-2 p-4">
            <BloquePulso className="h-3 w-16 rounded" />
            <BloquePulso className="h-7 w-20 rounded" />
            <BloquePulso className="h-3 w-24 rounded" />
          </div>
        ))}
      </div>

      {/* como va el ritmo: 256px, igual que el grafico real */}
      <div className="card space-y-3 p-4">
        <BloquePulso className="h-4 w-36 rounded" />
        <BloquePulso className="h-64 w-full" />
      </div>

      {/* en que se va (donut por area) + cuando se trabaja (mapa de calor) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="card space-y-3 p-4">
          <BloquePulso className="h-4 w-24 rounded" />
          <BloquePulso className="mx-auto h-48 w-48 rounded-full" />
        </div>
        <div className="card space-y-3 p-4">
          <BloquePulso className="h-4 w-32 rounded" />
          <BloquePulso className="h-40 w-full rounded" />
        </div>
      </div>

      {/* quien lo pone + los proyectos que mas pesan */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card space-y-3 p-4">
          <BloquePulso className="h-4 w-28 rounded" />
          <BloquePulso className="h-36 w-full rounded" />
        </div>
        <div className="card space-y-3 p-4">
          <BloquePulso className="h-4 w-44 rounded" />
          <BloquePulso className="h-36 w-full rounded" />
        </div>
      </div>

      {/* coste por persona / a cuanto sale la hora: tablas del final,
          visibles solo para quien ve importes -se deja un hueco generico */}
      <div className="card space-y-3 p-4">
        <BloquePulso className="h-4 w-48 rounded" />
        <BloquePulso className="h-40 w-full rounded" />
      </div>
    </div>
  )
}

import { BloquePulso } from "@/components/esqueleto-pagina"

/** Calca la forma real de la pagina -BarraCronometro, ResumenCronometro y
 * ListaEntradas agrupada por semana/dia- para que el salto al terminar de
 * cargar sea pequeño. PropuestasPendientes no lleva bloque: solo aparece
 * cuando hay invitaciones sin contestar, así que casi nunca está y ponerle
 * uno de todos modos empeoraría el salto en el caso normal. */
export default function Cargando() {
  return (
    <div className="space-y-5">
      {/* BarraCronometro: una tarjeta, mas alta en movil porque los mandos
          se parten en dos filas */}
      <BloquePulso className="card h-32 sm:h-16" />

      {/* ResumenCronometro: tres cifras en una misma tarjeta */}
      <div className="card grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5 p-4">
            <BloquePulso className="h-3 w-16 rounded" />
            <BloquePulso className="h-6 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* ListaEntradas: agrupada por semana y, dentro, por dia */}
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, semana) => (
          <div key={semana}>
            <div className="flex items-baseline justify-between border-b border-line px-1 pb-1.5">
              <BloquePulso className="h-4 w-28 rounded" />
              <BloquePulso className="h-3 w-14 rounded" />
            </div>
            <div className="mt-3 space-y-4">
              {Array.from({ length: 2 }).map((_, dia) => (
                <div key={dia}>
                  <div className="flex items-baseline justify-between px-1 pb-1.5">
                    <BloquePulso className="h-3.5 w-24 rounded" />
                    <BloquePulso className="h-3 w-12 rounded" />
                  </div>
                  <div className="card divide-y divide-line overflow-hidden">
                    {Array.from({ length: 3 }).map((_, fila) => (
                      <BloquePulso key={fila} className="h-12" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

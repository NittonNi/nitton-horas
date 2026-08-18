"use client"

import { useEffect, useState } from "react"
import { Square } from "lucide-react"

/**
 * El cronómetro de la portada. No es un dibujo: es la misma tarjeta que se ve
 * dentro, contando de verdad. Arranca en un valor fijo -el mismo en servidor y
 * en cliente- y solo empieza a correr al montarse, así no hay dos horas
 * distintas al hidratar.
 */
const INICIO = 5047

function reloj(total: number) {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

/** Lo de debajo del cronómetro: horas ya cerradas del dia. */
const CERRADAS = [
  { que: "Presupuesto de barras", proyecto: "TBCE 2", color: "#ff9500", rato: "2:15", cobra: true },
  { que: "Sesión de conocimiento", proyecto: "BL 3", color: "#5856d6", rato: "1:30", cobra: false },
  { que: "Reunión semanal", proyecto: "Care team", color: "#34c759", rato: "0:45", cobra: false },
]

export function CronometroDemo() {
  const [segundos, setSegundos] = useState(INICIO)

  useEffect(() => {
    // Quien pide menos movimiento se queda con la hora quieta
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="card p-4 sm:p-5" style={{ boxShadow: "var(--shadow-lg)" }}>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Hoy</p>
        <p className="cifra text-sm text-ink-soft">
          6:12 <span className="text-muted">/ 8:00</span>
        </p>
      </div>

      {/* ------------------------------------------------ corriendo ahora */}
      <div className="mt-3 flex items-center gap-3 rounded-[var(--radio-sm)] border border-live-line bg-live-soft p-3">
        <span aria-hidden className="latido h-10 w-[3px] shrink-0 rounded-full bg-live-fill" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Cierre de proveedores</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-live-fill" />
            TBCE 2 · Eventos
          </p>
        </div>
        <p className="cifra shrink-0 text-2xl font-semibold leading-none text-live">
          {reloj(segundos)}
        </p>
        <span
          aria-hidden
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radio-sm)] bg-live-fill text-white sm:flex"
        >
          <Square className="h-3 w-3 fill-current" />
        </span>
      </div>

      {/* -------------------------------------------------- ya cerradas */}
      <ul className="mt-1 divide-y divide-line">
        {CERRADAS.map(({ que, proyecto, color, rato, cobra }) => (
          <li key={que} className="flex items-center gap-3 py-2.5">
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-full ${cobra ? "marca-facturable" : ""}`}
              style={{ background: color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{que}</p>
              <p className="truncate text-xs text-muted">{proyecto}</p>
            </div>
            {cobra && <span className="chip chip-facturable hidden sm:inline-flex">Se cobra</span>}
            <p className="cifra shrink-0 text-sm text-ink-soft">{rato}</p>
          </li>
        ))}
      </ul>

      <div className="mt-1 flex items-baseline justify-between border-t border-line pt-3">
        <p className="rotulo">Esta semana</p>
        <p className="cifra text-sm font-medium">
          27:40 <span className="font-normal text-muted">/ 35:00</span>
        </p>
      </div>
    </div>
  )
}

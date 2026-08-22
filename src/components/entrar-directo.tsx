"use client"

import { useSyncExternalStore } from "react"
import { Check } from "lucide-react"

import { COOKIE_DIRECTO } from "@/lib/cookies"

/**
 * "Llévame directo la próxima vez".
 *
 * Va en una **cookie** y no en `localStorage` a propósito: así la decide el
 * servidor al pedir la portada y se salta antes de pintar nada, sin el
 * fogonazo de ver la portada un instante y desaparecer.
 *
 * La portada sigue siendo visible siempre desde `/?portada` -y desde ahí se
 * puede desmarcar-, que si no, quien la marca no puede volver a enseñarla.
 *
 * Se lee con `useSyncExternalStore` porque la cookie no es estado de React,
 * igual que el tema: en el servidor no hay ninguna, y al hidratar se lee la
 * de verdad sin quejas.
 */

const oyentes = new Set<() => void>()

function suscribir(avisar: () => void) {
  oyentes.add(avisar)
  return () => {
    oyentes.delete(avisar)
  }
}

function leer() {
  return document.cookie
    .split("; ")
    .some((trozo) => trozo === `${COOKIE_DIRECTO}=1`)
}

/** En el servidor no se sabe: se pinta como si no estuviera puesta. */
const enServidor = () => false

export function EntrarDirecto() {
  const puesto = useSyncExternalStore(suscribir, leer, enServidor)

  function cambiar(nuevo: boolean) {
    document.cookie = nuevo
      ? `${COOKIE_DIRECTO}=1; path=/; max-age=31536000; samesite=lax`
      : `${COOKIE_DIRECTO}=; path=/; max-age=0; samesite=lax`
    for (const avisar of oyentes) avisar()
  }

  return (
    <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-xs text-muted transition hover:text-ink-soft">
      <input
        type="checkbox"
        checked={puesto}
        onChange={(e) => cambiar(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden
        className={
          "flex h-4 w-4 items-center justify-center rounded-[4px] border transition " +
          (puesto
            ? "border-accent bg-accent text-accent-fg"
            : "border-line-strong bg-surface")
        }
      >
        {puesto && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {puesto
        ? "La próxima vez entrarás directo a tu espacio"
        : "Llévame directo la próxima vez"}
    </label>
  )
}

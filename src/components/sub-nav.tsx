"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export type EnlaceSub = {
  href: string
  etiqueta: string
  exacto?: boolean
}

/** Pestañas de segundo nivel, dentro de una seccion. */
export function SubNav({ enlaces }: { enlaces: EnlaceSub[] }) {
  const pathname = usePathname()

  return (
    <nav className="no-print -mx-1 flex gap-1 overflow-x-auto border-b border-line pb-px">
      {enlaces.map(({ href, etiqueta, exacto }) => {
        const activo = exacto
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition",
              activo
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}

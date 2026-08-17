"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  CalendarRange,
  Check,
  ChevronDown,
  FolderKanban,
  LogOut,
  Menu,
  Plus,
  Square,
  Timer,
  X,
} from "lucide-react"

import { cambiarEspacio } from "@/app/acciones"
import { useSesion } from "@/components/proveedor-sesion"
import { useCronometro } from "@/components/proveedor-cronometro"
import { SelectorTema } from "@/components/selector-tema"
import { formatDuration } from "@/lib/time"
import { NOMBRE_ROL } from "@/lib/roles"
import { cn } from "@/lib/utils"

const ENLACES = [
  { href: "/", etiqueta: "Cronometro", icono: Timer, exacto: true },
  { href: "/semana", etiqueta: "Semana", icono: CalendarRange },
  { href: "/informes", etiqueta: "Informes", icono: BarChart3 },
  { href: "/gestion", etiqueta: "Gestion", icono: FolderKanban, soloGestores: true },
]

export function Armazon({ children }: { children: React.ReactNode }) {
  const { rol } = useSesion()
  const pathname = usePathname()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const puedeGestionar = rol === "admin" || rol === "manager"

  const enlaces = ENLACES.filter((e) => !e.soloGestores || puedeGestionar)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <SelectorEspacio />

          <nav className="hidden items-center gap-0.5 md:flex">
            {enlaces.map(({ href, etiqueta, icono: Icono, exacto }) => {
              const activo = exacto
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    activo
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-ink",
                  )}
                >
                  <Icono className="h-4 w-4" />
                  {etiqueta}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <IndicadorCronometro />
            <div className="hidden sm:block">
              <SelectorTema />
            </div>
            <MenuUsuario />
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              className="btn btn-ghost p-1.5 md:hidden"
              aria-label="Menu"
              aria-expanded={menuAbierto}
            >
              {menuAbierto ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {menuAbierto && (
          <nav className="border-t border-line px-4 py-2 md:hidden">
            {enlaces.map(({ href, etiqueta, icono: Icono, exacto }) => {
              const activo = exacto
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuAbierto(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
                    activo ? "bg-accent-soft text-accent" : "text-muted",
                  )}
                >
                  <Icono className="h-4 w-4" />
                  {etiqueta}
                </Link>
              )
            })}
            <div className="mt-2 border-t border-line pt-3 sm:hidden">
              <SelectorTema />
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </div>
  )
}

/** Cambia de espacio de trabajo, o lleva a crear uno nuevo. */
function SelectorEspacio() {
  const { espacio, espacios } = useSesion()
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const cerrar = () => setAbierto(false)
    const id = setTimeout(() => document.addEventListener("click", cerrar))
    return () => {
      clearTimeout(id)
      document.removeEventListener("click", cerrar)
    }
  }, [abierto])

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-fg">
          <Timer className="h-4 w-4" />
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-semibold tracking-tight sm:block">
          {espacio.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="card absolute left-0 top-full z-40 mt-1 w-64 overflow-hidden p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <p className="border-b border-line px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Espacios de trabajo
          </p>
          <ul>
            {espacios.map(({ espacio: e, rol }) => (
              <li key={e.id}>
                <form action={cambiarEspacio.bind(null, e.id)}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.name}</span>
                      <span className="block text-xs text-muted">
                        {NOMBRE_ROL[rol]}
                      </span>
                    </span>
                    {e.id === espacio.id && (
                      <Check className="h-4 w-4 shrink-0 text-accent" />
                    )}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <Link
            href="/bienvenida"
            className="flex items-center gap-2 border-t border-line px-3 py-2 text-sm text-accent transition hover:bg-surface-2"
          >
            <Plus className="h-4 w-4" />
            Crear o unirse a otro
          </Link>
        </div>
      )}
    </div>
  )
}

/** Cronometro visible desde cualquier pantalla, y en el titulo de la pestana. */
function IndicadorCronometro() {
  const { enMarcha, segundos, parar, cargando } = useCronometro()

  useEffect(() => {
    if (!enMarcha) {
      document.title = "Horas"
      return
    }
    const etiqueta = enMarcha.description || enMarcha.proyecto?.name || "En marcha"
    document.title = `${formatDuration(segundos)} · ${etiqueta}`
  }, [enMarcha, segundos])

  if (!enMarcha) return null

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-running/30 bg-running-soft py-1 pl-2.5 pr-1">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-running opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-running" />
      </span>
      <span className="tabular text-sm font-semibold text-running">
        {formatDuration(segundos)}
      </span>
      <button
        type="button"
        onClick={() => void parar()}
        disabled={cargando}
        title="Parar el cronometro"
        aria-label="Parar el cronometro"
        className="rounded-md p-1 text-running transition hover:bg-running/15 disabled:opacity-50"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
      </button>
    </div>
  )
}

function MenuUsuario() {
  const { perfil, rol } = useSesion()
  const [abierto, setAbierto] = useState(false)

  const iniciales = perfil.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")

  useEffect(() => {
    if (!abierto) return
    const cerrar = () => setAbierto(false)
    // en el siguiente tick, para no cazar el propio clic que lo abre
    const id = setTimeout(() => document.addEventListener("click", cerrar))
    return () => {
      clearTimeout(id)
      document.removeEventListener("click", cerrar)
    }
  }, [abierto])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1 rounded-lg py-1 pl-1 pr-1.5 transition hover:bg-surface-2"
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">
          {iniciales || "?"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>

      {abierto && (
        <div
          role="menu"
          className="card absolute right-0 top-full z-40 mt-1 w-60 overflow-hidden p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-medium">{perfil.full_name}</p>
            <p className="truncate text-xs text-muted">{perfil.email}</p>
            <span className="chip mt-1.5">{NOMBRE_ROL[rol]}</span>
          </div>
          <Link
            href="/perfil"
            className="block px-3 py-2 text-sm transition hover:bg-surface-2"
          >
            Mi perfil
          </Link>
          <form action="/auth/salir" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger transition hover:bg-danger-soft"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

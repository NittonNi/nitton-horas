"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import {
  BarChart3,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronsUpDown,
  FolderKanban,
  LogOut,
  Plus,
  Settings2,
  Square,
  Timer,
  User,
} from "lucide-react"

import { cambiarEspacio } from "@/app/acciones"
import { useSesion } from "@/components/proveedor-sesion"
import { useCronometro } from "@/components/proveedor-cronometro"
import { SelectorTema } from "@/components/selector-tema"
import { formatDuration } from "@/lib/time"
import { NOMBRE_ROL } from "@/lib/roles"
import { cn } from "@/lib/utils"

/**
 * Agrupado por lo que se va a hacer, no por lo que es cada pantalla: primero se
 * apuntan las horas, luego se miran, y de vez en cuando se configura algo.
 */
type Enlace = {
  href: string
  etiqueta: string
  icono: typeof Timer
  exacto?: boolean
}

const GRUPOS: {
  titulo: string
  soloGestores?: boolean
  enlaces: Enlace[]
}[] = [
  {
    titulo: "Apuntar",
    enlaces: [
      { href: "/", etiqueta: "Cronometro", icono: Timer, exacto: true },
      { href: "/calendario", etiqueta: "Calendario", icono: CalendarDays },
      { href: "/semana", etiqueta: "Semana", icono: CalendarRange },
    ],
  },
  {
    titulo: "Revisar",
    enlaces: [
      { href: "/proyectos", etiqueta: "Proyectos", icono: FolderKanban },
      { href: "/informes", etiqueta: "Informes", icono: BarChart3 },
    ],
  },
  {
    titulo: "Ajustar",
    soloGestores: true,
    enlaces: [{ href: "/gestion", etiqueta: "Gestion", icono: Settings2 }],
  },
]

function useGrupos() {
  const { rol } = useSesion()
  const puedeGestionar = rol === "admin" || rol === "manager"
  return GRUPOS.filter((g) => !g.soloGestores || puedeGestionar)
}

function useEnlaces() {
  return useGrupos().flatMap((g) => g.enlaces)
}

function estaActivo(pathname: string, href: string, exacto?: boolean) {
  return exacto ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export function Armazon({ children }: { children: React.ReactNode }) {
  const grupos = useGrupos()
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh">
      {/* ------------------------------------------------ barra lateral */}
      <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface-2/60 lg:flex">
        <div className="p-2">
          <SelectorEspacio />
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-2 pt-3">
          {grupos.map((grupo) => (
            <div key={grupo.titulo}>
              <p className="rotulo px-3 pb-1">{grupo.titulo}</p>
              <ul className="space-y-0.5">
                {grupo.enlaces.map(({ href, etiqueta, icono: Icono, exacto }) => {
                  const activo = estaActivo(pathname, href, exacto)
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={activo ? "page" : undefined}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-[var(--radio-sm)] py-2 pl-3 pr-2 text-sm font-medium transition",
                          activo
                            ? "bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0_/_0.06)]"
                            : "text-ink-soft hover:bg-surface-3/60",
                        )}
                      >
                        <Icono
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            activo && "text-accent",
                          )}
                          strokeWidth={1.9}
                        />
                        {etiqueta}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-2 p-2">
          <CronometroLateral />
          <MenuUsuario />
        </div>
      </aside>

      {/* ------------------------------------------------------ contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-surface/85 px-4 backdrop-blur lg:hidden">
          <SelectorEspacio />
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <CronometroPastilla />
            <MenuUsuario />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-5 pb-24 lg:px-8 lg:py-7 lg:pb-7">
          {children}
        </main>

        <BarraInferior />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- espacios */

function SelectorEspacio() {
  const { espacio, espacios } = useSesion()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex w-full items-center gap-2.5 rounded-[var(--radio-sm)] p-1.5 text-left transition hover:bg-surface-3/60">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radio-sm)] bg-accent text-[13px] font-semibold text-[color:var(--accent-fg)]">
          {espacio.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold tracking-tight">
            {espacio.name}
          </span>
          <span className="block truncate text-xs leading-tight text-muted">Espacio</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 overflow-hidden rounded-[var(--radio)] border border-line bg-surface p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <p className="rotulo px-2 py-1.5">Espacios de trabajo</p>
          {espacios.map(({ espacio: e, rol }) => (
            <DropdownMenu.Item key={e.id} asChild>
              <form action={cambiarEspacio.bind(null, e.id)}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-left text-sm outline-none transition hover:bg-surface-2 data-highlighted:bg-surface-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{e.name}</span>
                    <span className="rotulo block leading-tight">{NOMBRE_ROL[rol]}</span>
                  </span>
                  {e.id === espacio.id && (
                    <Check className="h-4 w-4 shrink-0 text-accent" />
                  )}
                </button>
              </form>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link
              href="/bienvenida"
              className="flex items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-sm outline-none transition hover:bg-surface-2 data-highlighted:bg-surface-2"
            >
              <Plus className="h-4 w-4" />
              Crear o unirse a otro
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

/* -------------------------------------------------------------- cronometro */

/** Titulo de la pestana: la cuenta corre aunque la ventana este de fondo. */
function useTituloCronometro() {
  const { enMarcha, segundos } = useCronometro()

  useEffect(() => {
    if (!enMarcha) {
      document.title = "Horas"
      return
    }
    const etiqueta = enMarcha.description || enMarcha.proyecto?.name || "En marcha"
    document.title = `${formatDuration(segundos)} · ${etiqueta}`
  }, [enMarcha, segundos])
}

/** En escritorio el cronometro vive abajo del todo, siempre a la vista. */
function CronometroLateral() {
  const { enMarcha, segundos, parar, cargando } = useCronometro()
  useTituloCronometro()

  if (!enMarcha) return null

  return (
    <div className="rounded-[var(--radio-sm)] border border-live-line bg-live-soft p-2">
      <div className="flex items-center gap-2">
        <span aria-hidden className="latido h-8 w-[3px] shrink-0 rounded-full bg-live-fill" />
        <div className="min-w-0 flex-1">
          <p className="cifra text-lg font-semibold leading-none text-live">
            {formatDuration(segundos)}
          </p>
          <p className="mt-1 truncate text-xs text-ink-soft">
            {enMarcha.description || enMarcha.proyecto?.name || "Sin descripcion"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void parar()}
          disabled={cargando}
          aria-label="Parar el cronometro"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radio-sm)] bg-live-fill text-white transition hover:brightness-110 disabled:opacity-50"
        >
          <Square className="h-3 w-3 fill-current" />
        </button>
      </div>
    </div>
  )
}

/** En movil, una pastilla en la cabecera. */
function CronometroPastilla() {
  const { enMarcha, segundos, parar, cargando } = useCronometro()
  useTituloCronometro()

  if (!enMarcha) return null

  return (
    <div className="flex items-center gap-1.5 rounded-[var(--radio-sm)] border border-live-line bg-live-soft py-1 pl-2 pr-1">
      <span aria-hidden className="latido h-4 w-[3px] rounded-full bg-live-fill" />
      <span className="cifra text-sm font-semibold text-live">
        {formatDuration(segundos)}
      </span>
      <button
        type="button"
        onClick={() => void parar()}
        disabled={cargando}
        aria-label="Parar el cronometro"
        className="rounded p-1 text-live transition hover:bg-live/15 disabled:opacity-50"
      >
        <Square className="h-3 w-3 fill-current" />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ movil */

function BarraInferior() {
  const enlaces = useEnlaces()
  const pathname = usePathname()

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {enlaces.map(({ href, etiqueta, icono: Icono, exacto }) => {
        const activo = estaActivo(pathname, href, exacto)
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
              activo ? "text-accent" : "text-muted",
            )}
          >
            <Icono className="h-5 w-5" strokeWidth={activo ? 2.1 : 1.75} />
            {etiqueta}
          </Link>
        )
      })}
    </nav>
  )
}

/* ---------------------------------------------------------------- usuario */

function MenuUsuario() {
  const { perfil, rol } = useSesion()

  const iniciales = perfil.full_name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radio-sm)] p-1.5 text-left transition hover:bg-surface-3/60">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold">
          {iniciales || <User className="h-3.5 w-3.5" />}
        </span>
        <span className="hidden min-w-0 flex-1 truncate text-sm lg:block">
          {perfil.full_name}
        </span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-60 overflow-hidden rounded-[var(--radio)] border border-line bg-surface p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="px-2 py-1.5">
            <p className="truncate text-sm font-medium">{perfil.full_name}</p>
            <p className="truncate text-xs text-muted">{perfil.email}</p>
            <span className="chip mt-1.5">{NOMBRE_ROL[rol]}</span>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span className="text-sm">Aspecto</span>
            <SelectorTema />
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link
              href="/perfil"
              className="block rounded-[var(--radio-sm)] px-2 py-1.5 text-sm outline-none transition hover:bg-surface-2 data-highlighted:bg-surface-2"
            >
              Mi perfil
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <form action="/auth/salir" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-left text-sm text-danger outline-none transition hover:bg-danger-soft data-highlighted:bg-danger-soft"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesion
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, FolderOpen, FolderPlus, ListPlus, Loader2, Search, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useSesion } from "@/components/proveedor-sesion"
import { COLORES_PROYECTO, type ProyectoConCliente, type Tarea } from "@/lib/tipos"
import type { Catalogo } from "@/lib/tipos"
import { cn } from "@/lib/utils"

type Seleccion = { project_id: string | null; task_id: string | null }

type Opcion = {
  clave: string
  project_id: string
  task_id: string | null
  proyecto: string
  cliente: string | null
  tarea: string | null
  color: string
  /** Texto sobre el que se busca */
  busqueda: string
}

export function SelectorProyecto({
  catalogo,
  valor,
  onChange,
  compacto = false,
  autoFoco = false,
}: {
  catalogo: Catalogo
  valor: Seleccion
  onChange: (seleccion: Seleccion) => void
  compacto?: boolean
  autoFoco?: boolean
}) {
  const router = useRouter()
  const { espacio, rol } = useSesion()
  const puedeCrear = rol === "admin" || rol === "manager"

  const [abierto, setAbierto] = useState(false)
  const [filtro, setFiltro] = useState("")
  const [resaltado, setResaltado] = useState(0)
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const campoBusqueda = useRef<HTMLInputElement>(null)

  /**
   * Lo que se acaba de crear desde aqui. El catalogo llega del servidor y
   * tarda un instante en volver, asi que hasta entonces se pinta de esta lista
   * y la seleccion funciona ya.
   */
  const [reciente, setReciente] = useState<{
    proyectos: ProyectoConCliente[]
    tareas: Tarea[]
  }>({ proyectos: [], tareas: [] })

  const proyectos = useMemo(() => {
    const conocidos = new Set(catalogo.proyectos.map((p) => p.id))
    return [...catalogo.proyectos, ...reciente.proyectos.filter((p) => !conocidos.has(p.id))]
  }, [catalogo.proyectos, reciente.proyectos])

  const tareas = useMemo(() => {
    const conocidas = new Set(catalogo.tareas.map((t) => t.id))
    return [...catalogo.tareas, ...reciente.tareas.filter((t) => !conocidas.has(t.id))]
  }, [catalogo.tareas, reciente.tareas])

  const opciones = useMemo<Opcion[]>(() => {
    const lista: Opcion[] = []
    const ordenados = [...proyectos].sort((a, b) => {
      const ca = a.clients?.name ?? ""
      const cb = b.clients?.name ?? ""
      return ca.localeCompare(cb, "es") || a.name.localeCompare(b.name, "es")
    })

    for (const p of ordenados) {
      const cliente = p.clients?.name ?? null
      lista.push({
        clave: p.id,
        project_id: p.id,
        task_id: null,
        proyecto: p.name,
        cliente,
        tarea: null,
        color: p.color,
        busqueda: `${cliente ?? ""} ${p.name}`.toLowerCase(),
      })
      for (const t of tareas.filter((t) => t.project_id === p.id)) {
        lista.push({
          clave: `${p.id}:${t.id}`,
          project_id: p.id,
          task_id: t.id,
          proyecto: p.name,
          cliente,
          tarea: t.name,
          color: p.color,
          busqueda: `${cliente ?? ""} ${p.name} ${t.name}`.toLowerCase(),
        })
      }
    }
    return lista
  }, [proyectos, tareas])

  const consulta = filtro.trim()

  const filtradas = useMemo(() => {
    const q = consulta.toLowerCase()
    if (!q) return opciones
    const trozos = q.split(/\s+/)
    return opciones.filter((o) => trozos.every((t) => o.busqueda.includes(t)))
  }, [opciones, consulta])

  const actual = useMemo(() => {
    if (!valor.project_id) return null
    return (
      opciones.find(
        (o) => o.project_id === valor.project_id && o.task_id === valor.task_id,
      ) ??
      opciones.find((o) => o.project_id === valor.project_id) ??
      null
    )
  }, [opciones, valor])

  /* Solo se ofrece crear si no existe ya algo que se llame igual */
  const hayProyectoIgual = proyectos.some(
    (p) => p.name.toLowerCase() === consulta.toLowerCase(),
  )
  const hayTareaIgual = tareas.some(
    (t) =>
      t.project_id === valor.project_id &&
      t.name.toLowerCase() === consulta.toLowerCase(),
  )

  const puedeCrearProyecto = puedeCrear && consulta.length > 0 && !hayProyectoIgual
  const puedeCrearTarea =
    puedeCrear && consulta.length > 0 && !!valor.project_id && !hayTareaIgual

  useEffect(() => {
    if (!abierto) return
    campoBusqueda.current?.focus()
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener("mousedown", fuera)
    return () => document.removeEventListener("mousedown", fuera)
  }, [abierto])

  function elegir(o: Opcion | null) {
    onChange(
      o
        ? { project_id: o.project_id, task_id: o.task_id }
        : { project_id: null, task_id: null },
    )
    setAbierto(false)
    setFiltro("")
    setError(null)
  }

  async function crearProyecto() {
    const nombre = consulta
    if (!nombre) return
    setCreando(true)
    setError(null)

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("projects")
      .insert({
        workspace_id: espacio.id,
        name: nombre,
        // Un color distinto al del ultimo, para no tener todo del mismo
        color: COLORES_PROYECTO[proyectos.length % COLORES_PROYECTO.length],
      })
      .select("*, clients(id, name)")
      .single()

    setCreando(false)
    if (err || !data) {
      setError(mensajeError(err))
      return
    }

    const nuevo = data as ProyectoConCliente
    setReciente((r) => ({ ...r, proyectos: [...r.proyectos, nuevo] }))
    onChange({ project_id: nuevo.id, task_id: null })
    setFiltro("")
    setAbierto(false)
    router.refresh()
  }

  async function crearTarea() {
    const nombre = consulta
    if (!nombre || !valor.project_id) return
    setCreando(true)
    setError(null)

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("tasks")
      .insert({
        workspace_id: espacio.id,
        project_id: valor.project_id,
        name: nombre,
      })
      .select("*")
      .single()

    setCreando(false)
    if (err || !data) {
      setError(mensajeError(err))
      return
    }

    setReciente((r) => ({ ...r, tareas: [...r.tareas, data] }))
    onChange({ project_id: valor.project_id, task_id: data.id })
    setFiltro("")
    setAbierto(false)
    router.refresh()
  }

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setResaltado((r) => Math.min(r + 1, filtradas.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setResaltado((r) => Math.max(r - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const o = filtradas[resaltado]
      if (o) elegir(o)
      else if (puedeCrearProyecto) void crearProyecto()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setAbierto(false)
    }
  }

  const nombreProyectoActual =
    proyectos.find((p) => p.id === valor.project_id)?.name ?? ""

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => {
          // Al abrir, el resaltado vuelve arriba: mas barato aqui que en un efecto
          setResaltado(0)
          setAbierto((v) => !v)
        }}
        autoFocus={autoFoco}
        className={cn(
          "flex w-full items-center gap-2 rounded-[var(--radio-sm)] border border-line-strong bg-surface px-3 text-left text-sm transition hover:bg-surface-2",
          compacto ? "h-8" : "h-9",
        )}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        {actual ? (
          <>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: actual.color }}
            />
            <span className="min-w-0 flex-1 truncate">
              {actual.cliente && (
                <span className="text-muted">{actual.cliente} · </span>
              )}
              <span className="font-medium">{actual.proyecto}</span>
              {actual.tarea && <span className="text-muted"> · {actual.tarea}</span>}
            </span>
            <span
              role="button"
              tabIndex={-1}
              aria-label="Quitar proyecto"
              onClick={(e) => {
                e.stopPropagation()
                elegir(null)
              }}
              className="shrink-0 rounded p-0.5 text-muted transition hover:bg-surface-3 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          </>
        ) : (
          <>
            <FolderOpen className="h-4 w-4 shrink-0 text-muted" />
            <span className="flex-1 truncate text-muted">Sin proyecto</span>
          </>
        )}
      </button>

      {abierto && (
        <div
          className="card absolute left-0 top-full z-50 mt-1 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted" />
            <input
              ref={campoBusqueda}
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value)
                setResaltado(0)
              }}
              onKeyDown={teclas}
              placeholder={
                puedeCrear
                  ? "Buscar o escribir uno nuevo"
                  : "Buscar cliente, proyecto o tarea"
              }
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </div>

          <ul role="listbox" className="scroll-thin max-h-72 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => elegir(null)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition hover:bg-surface-2",
                  !valor.project_id && "font-medium",
                )}
              >
                <FolderOpen className="h-3.5 w-3.5 text-muted" />
                Sin proyecto
                {!valor.project_id && <Check className="ml-auto h-3.5 w-3.5" />}
              </button>
            </li>

            {filtradas.map((o, i) => {
              const elegido =
                o.project_id === valor.project_id && o.task_id === valor.task_id
              return (
                <li key={o.clave}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={elegido}
                    onMouseEnter={() => setResaltado(i)}
                    onClick={() => elegir(o)}
                    className={cn(
                      "flex w-full items-center gap-2 py-1.5 pr-3 text-left text-sm transition",
                      o.tarea ? "pl-8" : "pl-3",
                      i === resaltado && "bg-surface-2",
                      elegido && "font-medium",
                    )}
                  >
                    {o.tarea ? (
                      <span
                        aria-hidden
                        className="h-3 w-px shrink-0 bg-line-strong"
                      />
                    ) : (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: o.color }}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">
                      {o.tarea ? (
                        o.tarea
                      ) : (
                        <>
                          {o.cliente && (
                            <span className="text-muted">{o.cliente} · </span>
                          )}
                          {o.proyecto}
                        </>
                      )}
                    </span>
                    {elegido && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </li>
              )
            })}

            {filtradas.length === 0 && !puedeCrearProyecto && (
              <li className="px-3 py-6 text-center text-sm text-muted">
                {consulta
                  ? `Nada coincide con «${consulta}».`
                  : "Todavia no hay proyectos."}
              </li>
            )}
          </ul>

          {(puedeCrearProyecto || puedeCrearTarea) && (
            <div className="border-t border-line p-1">
              {puedeCrearTarea && (
                <button
                  type="button"
                  onClick={() => void crearTarea()}
                  disabled={creando}
                  className="flex w-full items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-left text-sm transition hover:bg-surface-2"
                >
                  {creando ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : (
                    <ListPlus className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                  <span className="min-w-0 truncate">
                    Crear tarea <span className="font-medium">{consulta}</span> en{" "}
                    {nombreProyectoActual}
                  </span>
                </button>
              )}
              {puedeCrearProyecto && (
                <button
                  type="button"
                  onClick={() => void crearProyecto()}
                  disabled={creando}
                  className="flex w-full items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-left text-sm transition hover:bg-surface-2"
                >
                  {creando ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : (
                    <FolderPlus className="h-3.5 w-3.5 shrink-0 text-muted" />
                  )}
                  <span className="min-w-0 truncate">
                    Crear proyecto <span className="font-medium">{consulta}</span>
                  </span>
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="border-t border-line bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

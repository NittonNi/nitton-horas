"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Loader2,
  Plus,
  Search,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { useSesion } from "@/components/proveedor-sesion"
import { SelectorColor } from "@/components/selector-color"
import {
  COLORES_PROYECTO,
  type Catalogo,
  type ProyectoConCliente,
  type Tarea,
} from "@/lib/tipos"
import { cn } from "@/lib/utils"

type Seleccion = { project_id: string | null; task_id: string | null }

const sinAcentos = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

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
  const [vista, setVista] = useState<"lista" | "nuevo">("lista")
  const [filtro, setFiltro] = useState("")
  const [desplegados, setDesplegados] = useState<string[]>([])
  const [anadiendoEn, setAnadiendoEn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const contenedor = useRef<HTMLDivElement>(null)
  const campoBusqueda = useRef<HTMLInputElement>(null)

  /**
   * Lo recien creado desde aqui. El catalogo viene del servidor y tarda un
   * instante en volver; hasta entonces se pinta de esta lista.
   */
  const [reciente, setReciente] = useState<{
    proyectos: ProyectoConCliente[]
    tareas: Tarea[]
  }>({ proyectos: [], tareas: [] })

  const proyectos = useMemo(() => {
    const vistos = new Set(catalogo.proyectos.map((p) => p.id))
    return [...catalogo.proyectos, ...reciente.proyectos.filter((p) => !vistos.has(p.id))]
      .filter((p) => !p.archived)
      .sort((a, b) => {
        const ca = a.clients?.name ?? ""
        const cb = b.clients?.name ?? ""
        return ca.localeCompare(cb, "es") || a.name.localeCompare(b.name, "es")
      })
  }, [catalogo.proyectos, reciente.proyectos])

  const tareas = useMemo(() => {
    const vistas = new Set(catalogo.tareas.map((t) => t.id))
    return [...catalogo.tareas, ...reciente.tareas.filter((t) => !vistas.has(t.id))].filter(
      (t) => !t.archived,
    )
  }, [catalogo.tareas, reciente.tareas])

  const consulta = filtro.trim()
  const q = sinAcentos(consulta)

  /** Proyectos que encajan, con las tareas que encajan dentro. */
  const visibles = useMemo(() => {
    return proyectos
      .map((proyecto) => {
        const suyas = tareas.filter((t) => t.project_id === proyecto.id)
        if (!q) return { proyecto, tareas: suyas, coincide: true }

        const textoProyecto = sinAcentos(
          `${proyecto.clients?.name ?? ""} ${proyecto.name}`,
        )
        const proyectoEncaja = textoProyecto.includes(q)
        const tareasQueEncajan = suyas.filter((t) => sinAcentos(t.name).includes(q))
        return {
          proyecto,
          tareas: proyectoEncaja ? suyas : tareasQueEncajan,
          coincide: proyectoEncaja || tareasQueEncajan.length > 0,
        }
      })
      .filter((fila) => fila.coincide)
  }, [proyectos, tareas, q])

  const proyectoElegido = proyectos.find((p) => p.id === valor.project_id) ?? null
  const tareaElegida = tareas.find((t) => t.id === valor.task_id) ?? null

  useEffect(() => {
    if (!abierto) return
    campoBusqueda.current?.focus()
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) cerrar()
    }
    document.addEventListener("mousedown", fuera)
    return () => document.removeEventListener("mousedown", fuera)
  }, [abierto])

  function cerrar() {
    setAbierto(false)
    setVista("lista")
    setFiltro("")
    setAnadiendoEn(null)
    setError(null)
  }

  function elegir(project_id: string | null, task_id: string | null) {
    onChange({ project_id, task_id })
    cerrar()
  }

  function alternar(id: string) {
    setDesplegados((previos) =>
      previos.includes(id) ? previos.filter((x) => x !== id) : [...previos, id],
    )
  }

  async function crearTarea(proyectoId: string, nombre: string) {
    const limpio = nombre.trim()
    if (!limpio) return

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("tasks")
      .insert({ workspace_id: espacio.id, project_id: proyectoId, name: limpio })
      .select("*")
      .single()

    if (err || !data) {
      setError(mensajeError(err))
      return
    }
    setReciente((r) => ({ ...r, tareas: [...r.tareas, data] }))
    setAnadiendoEn(null)
    router.refresh()
    elegir(proyectoId, data.id)
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        autoFocus={autoFoco}
        className={cn(
          "flex w-full items-center gap-2 rounded-[var(--radio-sm)] border border-line-strong bg-surface px-2.5 text-left text-sm transition hover:bg-surface-2",
          compacto ? "h-8" : "h-9",
        )}
        aria-haspopup="listbox"
        aria-expanded={abierto}
      >
        {proyectoElegido ? (
          <>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: proyectoElegido.color }}
            />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{proyectoElegido.name}</span>
              {tareaElegida && (
                <span className="text-muted"> · {tareaElegida.name}</span>
              )}
            </span>
          </>
        ) : (
          <>
            <FolderOpen className="h-4 w-4 shrink-0 text-muted" />
            <span className="flex-1 truncate text-muted">Sin proyecto</span>
          </>
        )}
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted" />
      </button>

      {abierto && (
        <div
          className="card absolute left-0 top-full z-50 mt-1.5 w-[23rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          {vista === "nuevo" ? (
            <FormularioProyecto
              espacioId={espacio.id}
              clientes={catalogo.clientes.filter((c) => !c.archived)}
              nombreSugerido={consulta}
              cuantos={proyectos.length}
              onVolver={() => setVista("lista")}
              onCreado={(proyecto) => {
                setReciente((r) => ({ ...r, proyectos: [...r.proyectos, proyecto] }))
                router.refresh()
                elegir(proyecto.id, null)
              }}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-muted" />
                <input
                  ref={campoBusqueda}
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault()
                      cerrar()
                    }
                  }}
                  placeholder="Buscar proyecto o tarea"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </div>

              <div className="scroll-thin max-h-[19rem] overflow-y-auto py-1">
                <button
                  type="button"
                  onClick={() => elegir(null, null)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition hover:bg-surface-2"
                >
                  <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="flex-1">Sin proyecto</span>
                  {!valor.project_id && <Check className="h-4 w-4 text-accent" />}
                </button>

                {visibles.map(({ proyecto, tareas: suyas }) => {
                  const desplegado = desplegados.includes(proyecto.id) || q.length > 0
                  const elegido = valor.project_id === proyecto.id

                  return (
                    <div key={proyecto.id}>
                      <div
                        className={cn(
                          "flex items-center gap-1 pr-2 transition hover:bg-surface-2",
                          elegido && !valor.task_id && "bg-surface-2",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => elegir(proyecto.id, null)}
                          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-3 text-left text-sm"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: proyecto.color }}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {proyecto.clients?.name && (
                              <span className="text-muted">
                                {proyecto.clients.name} ·{" "}
                              </span>
                            )}
                            {proyecto.name}
                          </span>
                          {elegido && !valor.task_id && (
                            <Check className="h-4 w-4 shrink-0 text-accent" />
                          )}
                        </button>

                        {/* Desplegar no es elegir: por eso va aparte */}
                        <button
                          type="button"
                          onClick={() => alternar(proyecto.id)}
                          aria-label={
                            desplegado
                              ? `Ocultar tareas de ${proyecto.name}`
                              : `Ver tareas de ${proyecto.name}`
                          }
                          aria-expanded={desplegado}
                          className="shrink-0 rounded p-1 text-muted transition hover:bg-surface-3"
                        >
                          {desplegado ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>

                      {desplegado && (
                        <div className="ml-[1.4rem] border-l border-line pl-1">
                          {suyas.map((tarea) => (
                            <button
                              key={tarea.id}
                              type="button"
                              onClick={() => elegir(proyecto.id, tarea.id)}
                              className={cn(
                                "flex w-full items-center gap-2 py-1.5 pl-3 pr-2 text-left text-sm transition hover:bg-surface-2",
                                valor.task_id === tarea.id && "bg-surface-2",
                              )}
                            >
                              <span className="min-w-0 flex-1 truncate">
                                {tarea.name}
                              </span>
                              {valor.task_id === tarea.id && (
                                <Check className="h-4 w-4 shrink-0 text-accent" />
                              )}
                            </button>
                          ))}

                          {puedeCrear &&
                            (anadiendoEn === proyecto.id ? (
                              <CampoNuevaTarea
                                onGuardar={(nombre) => void crearTarea(proyecto.id, nombre)}
                                onCancelar={() => setAnadiendoEn(null)}
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAnadiendoEn(proyecto.id)}
                                className="flex w-full items-center gap-1.5 py-1.5 pl-3 pr-2 text-left text-sm text-accent transition hover:bg-surface-2"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Anadir tarea
                              </button>
                            ))}

                          {suyas.length === 0 && !puedeCrear && (
                            <p className="py-1.5 pl-3 text-xs text-muted">
                              Sin tareas.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {visibles.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted">
                    {consulta
                      ? `Nada coincide con «${consulta}».`
                      : "Todavia no hay proyectos."}
                  </p>
                )}
              </div>

              {error && (
                <p className="border-t border-line bg-danger-soft px-3 py-2 text-sm text-danger">
                  {error}
                </p>
              )}

              {puedeCrear && (
                <button
                  type="button"
                  onClick={() => setVista("nuevo")}
                  className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left text-sm font-medium text-accent transition hover:bg-surface-2"
                >
                  <Plus className="h-4 w-4" />
                  Crear nuevo proyecto
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ tarea nueva */

function CampoNuevaTarea({
  onGuardar,
  onCancelar,
}: {
  onGuardar: (nombre: string) => void
  onCancelar: () => void
}) {
  const [nombre, setNombre] = useState("")
  const [guardando, setGuardando] = useState(false)

  return (
    <div className="flex items-center gap-1 py-1 pl-3 pr-2">
      <input
        autoFocus
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            if (!nombre.trim()) return
            setGuardando(true)
            onGuardar(nombre)
          }
          if (e.key === "Escape") {
            e.preventDefault()
            onCancelar()
          }
        }}
        onBlur={() => !guardando && !nombre.trim() && onCancelar()}
        placeholder="Nombre de la tarea"
        className="field py-1 text-sm"
      />
      <button
        type="button"
        onClick={() => {
          if (!nombre.trim()) return
          setGuardando(true)
          onGuardar(nombre)
        }}
        disabled={guardando || !nombre.trim()}
        className="btn btn-primary shrink-0 px-2 py-1"
        aria-label="Guardar tarea"
      >
        {guardando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

/* --------------------------------------------------------- proyecto nuevo */

function FormularioProyecto({
  espacioId,
  clientes,
  nombreSugerido,
  cuantos,
  onVolver,
  onCreado,
}: {
  espacioId: string
  clientes: Catalogo["clientes"]
  nombreSugerido: string
  cuantos: number
  onVolver: () => void
  onCreado: (proyecto: ProyectoConCliente) => void
}) {
  const [nombre, setNombre] = useState(nombreSugerido)
  const [clienteId, setClienteId] = useState("")
  const [color, setColor] = useState<string>(
    COLORES_PROYECTO[cuantos % COLORES_PROYECTO.length],
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) {
      setError("Ponle un nombre.")
      return
    }
    setGuardando(true)
    setError(null)

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from("projects")
      .insert({
        workspace_id: espacioId,
        name: limpio,
        client_id: clienteId || null,
        color,
      })
      .select("*, clients(id, name)")
      .single()

    setGuardando(false)
    if (err || !data) {
      setError(mensajeError(err))
      return
    }
    onCreado(data as ProyectoConCliente)
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-line px-2 py-2">
        <button
          type="button"
          onClick={onVolver}
          className="btn btn-ghost p-1"
          aria-label="Volver a la lista"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold">Nuevo proyecto</p>
      </div>

      <div className="space-y-3 p-3">
        <div>
          <label className="label" htmlFor="sp-nombre">
            Nombre
          </label>
          <input
            id="sp-nombre"
            autoFocus
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void crear()
              }
            }}
            placeholder="Rediseno de la web"
          />
        </div>

        <div>
          <label className="label" htmlFor="sp-cliente">
            Cliente
          </label>
          <select
            id="sp-cliente"
            className="field"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Sin cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="label">Color</span>
          <SelectorColor valor={color} onChange={setColor} />
        </div>

        {error && (
          <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onVolver} className="btn">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void crear()}
            disabled={guardando || !nombre.trim()}
            className="btn btn-primary"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear y usar
          </button>
        </div>
      </div>
    </div>
  )
}

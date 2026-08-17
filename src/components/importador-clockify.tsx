"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import {
  analizarCsv,
  personasDe,
  type Analisis,
  type FilaClockify,
  type FormatoFecha,
} from "@/lib/clockify"
import { formatDateShort, formatDurationShort } from "@/lib/time"
import type { Rol } from "@/lib/roles"
import type { Catalogo, Miembro } from "@/lib/tipos"
import { cn } from "@/lib/utils"

const LOTE = 200
const OMITIR = "__omitir__"

type Resultado = {
  insertadas: number
  duplicadas: number
  omitidas: number
  creados: { clientes: number; proyectos: number; tareas: number; etiquetas: number }
}

const clave = (texto: string) => texto.trim().toLowerCase()

export function ImportadorClockify({
  espacioId,
  yoId,
  rol,
  catalogo,
  miembros,
}: {
  espacioId: string
  yoId: string
  rol: Rol
  catalogo: Catalogo
  miembros: Miembro[]
}) {
  const router = useRouter()
  const entrada = useRef<HTMLInputElement>(null)

  const [texto, setTexto] = useState<string | null>(null)
  const [nombreFichero, setNombreFichero] = useState("")
  const [formato, setFormato] = useState<FormatoFecha | undefined>(undefined)
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [asignacion, setAsignacion] = useState<Record<string, string>>({})
  const [crearFaltantes, setCrearFaltantes] = useState(true)
  const [progreso, setProgreso] = useState<number | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [error, setError] = useState<string | null>(null)

  const esAdmin = rol === "admin"

  function analizar(contenido: string, forzado?: FormatoFecha) {
    const salida = analizarCsv(contenido, forzado)
    setAnalisis(salida)
    setFormato(salida.formato)
    setResultado(null)

    // Cada persona del informe se enchufa a quien tenga el mismo correo
    const inicial: Record<string, string> = {}
    for (const persona of personasDe(salida.filas)) {
      const encontrado = miembros.find(
        (m) => m.email.toLowerCase() === persona.clave || m.email.toLowerCase() === persona.email,
      )
      inicial[persona.clave] = esAdmin
        ? (encontrado?.id ?? OMITIR)
        : (encontrado?.id === yoId ? yoId : OMITIR)
    }
    setAsignacion(inicial)
  }

  async function cargarFichero(fichero: File) {
    setError(null)
    if (!/\.csv$/i.test(fichero.name)) {
      setError(
        "Hace falta el CSV. En Clockify: Informes > Detallado > Exportar > CSV.",
      )
      return
    }
    const contenido = await fichero.text()
    setTexto(contenido)
    setNombreFichero(fichero.name)
    analizar(contenido)
  }

  const personas = useMemo(
    () => (analisis ? personasDe(analisis.filas) : []),
    [analisis],
  )

  const seleccionadas = useMemo(
    () =>
      (analisis?.filas ?? []).filter((f) => {
        const destino = asignacion[(f.email || f.usuario || "?").toLowerCase()]
        return destino && destino !== OMITIR
      }),
    [analisis, asignacion],
  )

  const resumen = useMemo(() => {
    if (seleccionadas.length === 0) return null
    const fechas = seleccionadas.map((f) => f.inicio.slice(0, 10)).sort()
    const segundos = seleccionadas.reduce((s, f) => s + f.segundos, 0)

    const nuevosClientes = new Set<string>()
    const nuevosProyectos = new Set<string>()
    const nuevasTareas = new Set<string>()
    const nuevasEtiquetas = new Set<string>()

    const clientesExistentes = new Set(catalogo.clientes.map((c) => clave(c.name)))
    const proyectosExistentes = new Set(catalogo.proyectos.map((p) => clave(p.name)))
    const tareasExistentes = new Set(
      catalogo.tareas.map((t) => `${t.project_id}|${clave(t.name)}`),
    )
    const etiquetasExistentes = new Set(catalogo.etiquetas.map((t) => clave(t.name)))

    for (const fila of seleccionadas) {
      if (fila.cliente && !clientesExistentes.has(clave(fila.cliente)))
        nuevosClientes.add(clave(fila.cliente))
      if (fila.proyecto && !proyectosExistentes.has(clave(fila.proyecto)))
        nuevosProyectos.add(clave(fila.proyecto))
      if (fila.tarea) {
        const proyecto = catalogo.proyectos.find(
          (p) => clave(p.name) === clave(fila.proyecto),
        )
        const clavecita = `${proyecto?.id ?? "?"}|${clave(fila.tarea)}`
        if (!proyecto || !tareasExistentes.has(clavecita))
          nuevasTareas.add(`${clave(fila.proyecto)}|${clave(fila.tarea)}`)
      }
      for (const etiqueta of fila.etiquetas) {
        if (!etiquetasExistentes.has(clave(etiqueta)))
          nuevasEtiquetas.add(clave(etiqueta))
      }
    }

    return {
      filas: seleccionadas.length,
      desde: fechas[0],
      hasta: fechas[fechas.length - 1],
      segundos,
      nuevosClientes: nuevosClientes.size,
      nuevosProyectos: nuevosProyectos.size,
      nuevasTareas: nuevasTareas.size,
      nuevasEtiquetas: nuevasEtiquetas.size,
    }
  }, [seleccionadas, catalogo])

  async function importar() {
    if (seleccionadas.length === 0) return
    setError(null)
    setResultado(null)
    setProgreso(0)

    const supabase = createClient()
    const creados = { clientes: 0, proyectos: 0, tareas: 0, etiquetas: 0 }

    try {
      /* ------------------------------------------------ catalogo que falta */
      const clientes = new Map(catalogo.clientes.map((c) => [clave(c.name), c.id]))
      const proyectos = new Map(catalogo.proyectos.map((p) => [clave(p.name), p.id]))
      const tareas = new Map(
        catalogo.tareas.map((t) => [`${t.project_id}|${clave(t.name)}`, t.id]),
      )
      const etiquetas = new Map(catalogo.etiquetas.map((t) => [clave(t.name), t.id]))

      if (crearFaltantes) {
        const faltanClientes = [
          ...new Set(
            seleccionadas
              .map((f) => f.cliente.trim())
              .filter((n) => n && !clientes.has(clave(n))),
          ),
        ]
        if (faltanClientes.length > 0) {
          const { data, error: err } = await supabase
            .from("clients")
            .insert(faltanClientes.map((name) => ({ workspace_id: espacioId, name })))
            .select("id, name")
          if (err) throw err
          for (const fila of data ?? []) clientes.set(clave(fila.name), fila.id)
          creados.clientes = data?.length ?? 0
        }

        const faltanProyectos = new Map<string, { name: string; client_id: string | null }>()
        for (const fila of seleccionadas) {
          const nombre = fila.proyecto.trim()
          if (!nombre || proyectos.has(clave(nombre))) continue
          faltanProyectos.set(clave(nombre), {
            name: nombre,
            client_id: fila.cliente ? (clientes.get(clave(fila.cliente)) ?? null) : null,
          })
        }
        if (faltanProyectos.size > 0) {
          const { data, error: err } = await supabase
            .from("projects")
            .insert(
              [...faltanProyectos.values()].map((p) => ({
                ...p,
                workspace_id: espacioId,
              })),
            )
            .select("id, name")
          if (err) throw err
          for (const fila of data ?? []) proyectos.set(clave(fila.name), fila.id)
          creados.proyectos = data?.length ?? 0
        }

        const faltanTareas = new Map<string, { name: string; project_id: string }>()
        for (const fila of seleccionadas) {
          const nombre = fila.tarea.trim()
          const proyectoId = proyectos.get(clave(fila.proyecto))
          if (!nombre || !proyectoId) continue
          const clavecita = `${proyectoId}|${clave(nombre)}`
          if (tareas.has(clavecita)) continue
          faltanTareas.set(clavecita, { name: nombre, project_id: proyectoId })
        }
        if (faltanTareas.size > 0) {
          const { data, error: err } = await supabase
            .from("tasks")
            .insert(
              [...faltanTareas.values()].map((t) => ({
                ...t,
                workspace_id: espacioId,
              })),
            )
            .select("id, name, project_id")
          if (err) throw err
          for (const fila of data ?? [])
            tareas.set(`${fila.project_id}|${clave(fila.name)}`, fila.id)
          creados.tareas = data?.length ?? 0
        }

        const faltanEtiquetas = [
          ...new Set(
            seleccionadas
              .flatMap((f) => f.etiquetas)
              .map((t) => t.trim())
              .filter((n) => n && !etiquetas.has(clave(n))),
          ),
        ]
        if (faltanEtiquetas.length > 0) {
          const { data, error: err } = await supabase
            .from("tags")
            .insert(faltanEtiquetas.map((name) => ({ workspace_id: espacioId, name })))
            .select("id, name")
          if (err) throw err
          for (const fila of data ?? []) etiquetas.set(clave(fila.name), fila.id)
          creados.etiquetas = data?.length ?? 0
        }
      }

      /* ------------------------------------------- lo que ya esta importado */
      const claves = seleccionadas.map((f) => f.clave)
      const yaEstan = new Set<string>()
      for (let i = 0; i < claves.length; i += LOTE) {
        const { data, error: err } = await supabase
          .from("time_entries")
          .select("external_id")
          .eq("workspace_id", espacioId)
          .eq("source", "clockify")
          .in("external_id", claves.slice(i, i + LOTE))
        if (err) throw err
        for (const fila of data ?? []) {
          if (fila.external_id) yaEstan.add(fila.external_id)
        }
      }

      const pendientes = seleccionadas.filter((f) => !yaEstan.has(f.clave))

      /* ----------------------------------------------------------- insercion */
      let insertadas = 0
      for (let i = 0; i < pendientes.length; i += LOTE) {
        const lote = pendientes.slice(i, i + LOTE)

        const filas = lote.map((fila: FilaClockify) => {
          const proyectoId = fila.proyecto
            ? (proyectos.get(clave(fila.proyecto)) ?? null)
            : null
          const tareaId =
            fila.tarea && proyectoId
              ? (tareas.get(`${proyectoId}|${clave(fila.tarea)}`) ?? null)
              : null
          return {
            workspace_id: espacioId,
            user_id: asignacion[(fila.email || fila.usuario || "?").toLowerCase()],
            project_id: proyectoId,
            task_id: tareaId,
            description: fila.descripcion,
            start_at: fila.inicio,
            end_at: fila.fin,
            billable: fila.facturable,
            source: "clockify",
            external_id: fila.clave,
          }
        })

        const { data, error: err } = await supabase
          .from("time_entries")
          .insert(filas)
          .select("id, external_id")
        if (err) throw err

        insertadas += data?.length ?? 0

        // Etiquetas de las entradas recien creadas
        const porClave = new Map(
          (data ?? []).map((fila) => [fila.external_id ?? "", fila.id]),
        )
        const relaciones: { entry_id: string; tag_id: string }[] = []
        for (const fila of lote) {
          const entryId = porClave.get(fila.clave)
          if (!entryId) continue
          for (const etiqueta of fila.etiquetas) {
            const tagId = etiquetas.get(clave(etiqueta))
            if (tagId) relaciones.push({ entry_id: entryId, tag_id: tagId })
          }
        }
        if (relaciones.length > 0) {
          const { error: errTags } = await supabase
            .from("time_entry_tags")
            .insert(relaciones)
          if (errTags) throw errTags
        }

        setProgreso(Math.round(((i + lote.length) / pendientes.length) * 100))
      }

      setResultado({
        insertadas,
        duplicadas: yaEstan.size,
        omitidas: (analisis?.filas.length ?? 0) - seleccionadas.length,
        creados,
      })
      router.refresh()
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setProgreso(null)
    }
  }

  /* ------------------------------------------------------------------ vista */

  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h2 className="mb-1 text-sm font-semibold">Importar de Clockify</h2>
        <p className="mb-3 text-xs text-muted">
          En Clockify: Informes &gt; Detallado, elige el rango de fechas y exporta
          en CSV. Las entradas se reconocen por persona y hora exacta, asi que
          puedes reimportar el mismo fichero sin duplicar nada.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const fichero = e.dataTransfer.files?.[0]
            if (fichero) void cargarFichero(fichero)
          }}
          className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-center"
        >
          <FileUp className="h-6 w-6 text-muted" />
          <p className="text-sm">
            {nombreFichero || "Arrastra aqui el CSV o eligelo"}
          </p>
          <input
            ref={entrada}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const fichero = e.target.files?.[0]
              if (fichero) void cargarFichero(fichero)
            }}
          />
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="btn"
          >
            <Upload className="h-4 w-4" />
            Elegir fichero
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger-soft p-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        {analisis && analisis.cabecerasFaltan.length > 0 && (
          <p className="mt-3 rounded-lg bg-danger-soft p-2.5 text-sm text-danger">
            No encuentro las columnas de fecha y hora de inicio. Comprueba que es
            un informe detallado y no un resumen.
          </p>
        )}
      </section>

      {analisis && analisis.filas.length > 0 && (
        <>
          <section className="card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Que voy a importar</h2>
              <label className="flex items-center gap-2 text-xs text-muted">
                Formato de fecha
                <select
                  className="field w-36 py-1"
                  value={formato}
                  onChange={(e) => {
                    const nuevo = e.target.value as FormatoFecha
                    setFormato(nuevo)
                    if (texto) analizar(texto, nuevo)
                  }}
                >
                  <option value="dmy">Dia/Mes/Ano</option>
                  <option value="mdy">Mes/Dia/Ano</option>
                  <option value="iso">Ano-Mes-Dia</option>
                </select>
              </label>
            </div>

            {resumen ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Dato etiqueta="Entradas" valor={String(resumen.filas)} />
                <Dato
                  etiqueta="Horas"
                  valor={formatDurationShort(resumen.segundos)}
                />
                <Dato etiqueta="Desde" valor={formatDateShort(resumen.desde)} />
                <Dato etiqueta="Hasta" valor={formatDateShort(resumen.hasta)} />
              </div>
            ) : (
              <p className="text-sm text-muted">
                Ninguna persona del fichero esta asignada todavia.
              </p>
            )}

            {resumen && crearFaltantes && (
              <p className="mt-3 text-xs text-muted">
                Se crearan {resumen.nuevosClientes} clientes,{" "}
                {resumen.nuevosProyectos} proyectos, {resumen.nuevasTareas} tareas
                y {resumen.nuevasEtiquetas} etiquetas que no existen aun.
              </p>
            )}

            {analisis.descartadas.length > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-billable/30 bg-billable-soft p-2.5 text-xs text-billable">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {analisis.descartadas.length} filas del fichero no se pueden
                  leer y quedan fuera (la primera, la {analisis.descartadas[0].fila}:{" "}
                  {analisis.descartadas[0].motivo.toLowerCase()}).
                </span>
              </p>
            )}

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={crearFaltantes}
                onChange={(e) => setCrearFaltantes(e.target.checked)}
              />
              Crear los clientes, proyectos, tareas y etiquetas que falten
            </label>
          </section>

          <section className="card p-4">
            <h2 className="mb-1 text-sm font-semibold">Personas</h2>
            <p className="mb-3 text-xs text-muted">
              {esAdmin
                ? "Empareja cada persona del informe con su cuenta. Lo que dejes sin asignar no se importa."
                : "Solo puedes importar tus propias horas. Pide a un administrador que importe las del resto."}
            </p>

            <ul className="divide-y divide-line">
              {personas.map((persona) => (
                <li key={persona.clave} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{persona.nombre}</p>
                    <p className="truncate text-xs text-muted">
                      {persona.email || "sin correo"} · {persona.filas} entradas
                    </p>
                  </div>
                  <select
                    className="field w-52 py-1"
                    value={asignacion[persona.clave] ?? OMITIR}
                    onChange={(e) =>
                      setAsignacion({
                        ...asignacion,
                        [persona.clave]: e.target.value,
                      })
                    }
                  >
                    <option value={OMITIR}>No importar</option>
                    {(esAdmin ? miembros : miembros.filter((m) => m.id === yoId)).map(
                      (miembro) => (
                        <option key={miembro.id} value={miembro.id}>
                          {miembro.full_name}
                        </option>
                      ),
                    )}
                  </select>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-4">
            {progreso !== null && (
              <div className="mb-3">
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${progreso}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">Importando... {progreso}%</p>
              </div>
            )}

            {resultado && (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-running/30 bg-running-soft p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-running" />
                <div>
                  <p className="font-medium text-running">
                    {resultado.insertadas} entradas importadas
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {resultado.duplicadas} ya estaban de una importacion anterior
                    {resultado.omitidas > 0 &&
                      `, ${resultado.omitidas} omitidas por no tener persona asignada`}
                    . Se crearon {resultado.creados.clientes} clientes,{" "}
                    {resultado.creados.proyectos} proyectos,{" "}
                    {resultado.creados.tareas} tareas y{" "}
                    {resultado.creados.etiquetas} etiquetas.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => void importar()}
              disabled={progreso !== null || seleccionadas.length === 0}
              className={cn("btn btn-primary w-full")}
            >
              {progreso !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              Importar {seleccionadas.length} entradas
            </button>
          </section>
        </>
      )}
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <p className="text-xs font-medium text-muted">{etiqueta}</p>
      <p className="tabular mt-0.5 text-base font-semibold">{valor}</p>
    </div>
  )
}

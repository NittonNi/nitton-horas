"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { formatObjetivo, parseObjetivo } from "@/lib/categorias"
import { ObjetivoHora } from "@/components/objetivo-hora"
import { ZONAS_HORARIAS, type Espacio } from "@/lib/tipos"

/**
 * Todo lo que vale para el espacio entero, en un solo sitio.
 *
 * Antes vivía escondido en un lado de la pantalla de Equipo, que trata de
 * personas y no de reglas. Aquí está separado por lo que decide cada cosa: qué
 * es este espacio, quién entra, a qué aspira y cómo se recoge lo que se
 * apunta.
 */
export function AjustesEspacio({ espacio }: { espacio: Espacio }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(espacio.name)
  const [zona, setZona] = useState(espacio.timezone)
  const [dominios, setDominios] = useState(espacio.allowed_domains.join(", "))
  const [estiloTexto, setEstiloTexto] = useState(espacio.text_case)
  const [modoEtiquetas, setModoEtiquetas] = useState(espacio.tag_mode)
  const [exigeProyecto, setExigeProyecto] = useState(espacio.require_project)
  const [exigeDescripcion, setExigeDescripcion] = useState(
    espacio.require_description,
  )
  const [objDia, setObjDia] = useState(formatObjetivo(espacio.goal_daily_minutes))
  const [objSemana, setObjSemana] = useState(
    formatObjetivo(espacio.goal_weekly_minutes),
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [normalizando, setNormalizando] = useState(false)
  const [normalizado, setNormalizado] = useState<number | null>(null)

  /** Reescribe en mayusculas lo que ya estaba apuntado. */
  async function normalizar() {
    setNormalizando(true)
    setError(null)
    const { data, error: err } = await createClient().rpc(
      "normalizar_texto_existente",
      { p_workspace: espacio.id },
    )
    setNormalizando(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setNormalizado(data ?? 0)
    router.refresh()
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    setGuardado(false)

    const lista = dominios
      .split(/[,\s]+/)
      .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
      .filter(Boolean)

    const dia = objDia.trim() ? parseObjetivo(objDia) : null
    const semana = objSemana.trim() ? parseObjetivo(objSemana) : null
    if ((objDia.trim() && dia === null) || (objSemana.trim() && semana === null)) {
      setGuardando(false)
      setError("No entiendo esas horas. Prueba con 8, 8h o 7:30.")
      return
    }

    const { data, error: err } = await createClient()
      .from("workspaces")
      .update({
        name: nombre.trim() || espacio.name,
        timezone: zona,
        allowed_domains: lista,
        text_case: estiloTexto,
        tag_mode: modoEtiquetas,
        require_project: exigeProyecto,
        require_description: exigeDescripcion,
        goal_daily_minutes: dia,
        goal_weekly_minutes: semana,
      })
      .eq("id", espacio.id)
      .select("id")

    setGuardando(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    if (!data || data.length === 0) {
      setError("No se ha podido guardar. ¿Sigues siendo administrador?")
      return
    }
    setGuardado(true)
    router.refresh()
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void guardar()
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ------------------------------------------------- qué es esto */}
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Este espacio</h2>
          <p className="mb-3 mt-0.5 text-sm text-muted">
            Cómo se llama y en qué huso vive.
          </p>

          <div className="space-y-3">
            <div>
              <label className="label" htmlFor="ws-nombre">
                Nombre
              </label>
              <input
                id="ws-nombre"
                className="field"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value)
                  setGuardado(false)
                }}
              />
            </div>

            <div>
              <label className="label" htmlFor="ws-zona">
                Zona horaria
              </label>
              <select
                id="ws-zona"
                className="field"
                value={zona}
                onChange={(e) => {
                  setZona(e.target.value)
                  setGuardado(false)
                }}
              >
                {[...new Set([espacio.timezone, ...ZONAS_HORARIAS])].map((z) => (
                  <option key={z} value={z}>
                    {z.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">
                Decide a qué día cuenta cada hora. Cambiarla no recalcula lo ya
                registrado.
              </p>
            </div>

            <div>
              <label className="label" htmlFor="ws-dominios">
                Alta automática por dominio
              </label>
              <input
                id="ws-dominios"
                className="field"
                value={dominios}
                onChange={(e) => {
                  setDominios(e.target.value)
                  setGuardado(false)
                }}
                placeholder="miempresa.com, otra.com"
              />
              <p className="mt-1 text-xs text-muted">
                Con un correo de estos dominios se entra sin invitación, como
                miembro. Vacío, hace falta invitación.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- a qué aspira */}
        <section className="card p-4">
          <h2 className="text-sm font-semibold">A qué aspira el equipo</h2>
          <p className="mb-3 mt-0.5 text-sm text-muted">
            Horas por persona, iguales para todos. Los de un área van en
            Categorización y los de un proyecto, dentro del proyecto.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="ws-objetivo-dia">
                Objetivo al día
              </label>
              <input
                id="ws-objetivo-dia"
                className="field cifra"
                value={objDia}
                onChange={(e) => {
                  setObjDia(e.target.value)
                  setGuardado(false)
                }}
                placeholder="Sin objetivo"
              />
            </div>
            <div>
              <label className="label" htmlFor="ws-objetivo-semana">
                Objetivo a la semana
              </label>
              <input
                id="ws-objetivo-semana"
                className="field cifra"
                value={objSemana}
                onChange={(e) => {
                  setObjSemana(e.target.value)
                  setGuardado(false)
                }}
                placeholder="Sin objetivo"
              />
            </div>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Se ven en el cronómetro, restando lo que falta. Acepta 8, 8h o 7:30.
          </p>
        </section>

        {/* ------------------------------------------------ cómo se apunta */}
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Qué hay que rellenar</h2>
          <p className="mb-3 mt-0.5 text-sm text-muted">
            Lo que no se puede dejar a medias al apuntar.
          </p>

          <div className="space-y-2">
            <Regla
              titulo="No dejar parar el cronómetro sin proyecto"
              pie="Así no quedan horas sueltas que luego nadie sabe dónde meter."
              puesta={exigeProyecto}
              onChange={(v) => {
                setExigeProyecto(v)
                setGuardado(false)
              }}
            />
            <Regla
              titulo="No dejar parar el cronómetro sin descripción"
              pie="«Sin descripción» dentro de un proyecto no le dice nada a nadie tres meses después."
              puesta={exigeDescripcion}
              onChange={(v) => {
                setExigeDescripcion(v)
                setGuardado(false)
              }}
            />

            <div className="pt-1">
              <label className="label" htmlFor="ws-etiquetas">
                Etiquetas por entrada
              </label>
              <select
                id="ws-etiquetas"
                className="field"
                value={modoEtiquetas}
                onChange={(e) => {
                  setModoEtiquetas(e.target.value)
                  setGuardado(false)
                }}
              >
                <option value="varias">Se pueden poner varias</option>
                <option value="una">Solo una por entrada</option>
              </select>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- el formato */}
        <section className="card p-4">
          <h2 className="text-sm font-semibold">Cómo se escribe</h2>
          <p className="mb-3 mt-0.5 text-sm text-muted">
            Para que la misma cosa se llame siempre igual y no haya tres
            versiones del mismo nombre.
          </p>

          <div>
            <label className="label" htmlFor="ws-texto">
              Estilo del texto
            </label>
            <select
              id="ws-texto"
              className="field"
              value={estiloTexto}
              onChange={(e) => {
                setEstiloTexto(e.target.value)
                setGuardado(false)
              }}
            >
              <option value="libre">Tal cual lo escriba cada uno</option>
              <option value="mayusculas">Siempre en MAYÚSCULAS</option>
            </select>
            <p className="mt-1 text-xs text-muted">
              Se aplica al guardar, también a lo que entra por el importador:
              descripciones y nombres de proyectos, ediciones, tareas, áreas y
              etiquetas.
            </p>
          </div>

          {espacio.text_case === "mayusculas" && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm font-medium">Lo que ya estaba escrito</p>
              <p className="mt-0.5 text-xs text-muted">
                El estilo solo afecta a lo nuevo. Esto pasa a mayúsculas lo que
                ya hay, nombres del equipo incluidos, y no tiene vuelta atrás.
              </p>
              <button
                type="button"
                onClick={() => void normalizar()}
                disabled={normalizando}
                className="btn mt-2"
              >
                {normalizando && <Loader2 className="h-4 w-4 animate-spin" />}
                Pasar lo anterior a mayúsculas
              </button>
              {normalizado !== null && (
                <p className="mt-2 text-xs text-billable">
                  {normalizado === 0
                    ? "Ya estaba todo en mayúsculas."
                    : `${normalizado} registros actualizados.`}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* El objetivo por hora se guarda solo, con su propio botón: es del
          espacio pero no vive en este formulario. */}
      <ObjetivoHora
        espacioId={espacio.id}
        valor={espacio.target_hourly_rate}
        puedeCambiar
      />

      {error && (
        <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Uno solo para todo: la pantalla es un formulario, no cinco. */}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-paper/90 py-3 backdrop-blur">
        <button type="submit" disabled={guardando} className="btn btn-primary">
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar los ajustes
        </button>
        {guardado && (
          <span className="flex items-center gap-1 text-sm text-running">
            <Check className="h-4 w-4" />
            Guardado
          </span>
        )}
      </div>
    </form>
  )
}

/** Una regla de las que se pueden exigir o no. */
function Regla({
  titulo,
  pie,
  puesta,
  onChange,
}: {
  titulo: string
  pie: string
  puesta: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2.5 rounded-[var(--radio-sm)] border border-line bg-surface-2/60 p-3">
      <input
        type="checkbox"
        checked={puesta}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
      />
      <span>
        <span className="block text-sm font-medium">{titulo}</span>
        <span className="mt-0.5 block text-xs text-muted">{pie}</span>
      </span>
    </label>
  )
}

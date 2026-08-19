"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Mail, Plus, Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import { formatObjetivo, parseObjetivo } from "@/lib/categorias"
import { formatDateShort } from "@/lib/time"
import { NOMBRE_ROL, type Rol } from "@/lib/roles"
import {
  ZONAS_HORARIAS,
  type Espacio,
  type Invitacion,
  type Miembro,
} from "@/lib/tipos"
import { cn } from "@/lib/utils"

const ROLES: { valor: Rol; ayuda: string }[] = [
  { valor: "admin", ayuda: "Todo, incluidas tarifas y equipo" },
  { valor: "manager", ayuda: "Ve las horas de todos y el catalogo" },
  { valor: "member", ayuda: "Solo sus propias horas" },
]

export function GestionEquipo({
  yoId,
  rol,
  espacio,
  miembros,
  invitaciones,
}: {
  yoId: string
  rol: Rol
  espacio: Espacio
  miembros: Miembro[]
  invitaciones: Invitacion[]
}) {
  const esAdmin = rol === "admin"
  const pendientes = invitaciones.filter((i) => !i.accepted_at)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <Miembros
        espacioId={espacio.id}
        miembros={miembros}
        yoId={yoId}
        esAdmin={esAdmin}
      />
      <div className="space-y-5">
        <Invitaciones
          espacioId={espacio.id}
          yoId={yoId}
          pendientes={pendientes}
          esAdmin={esAdmin}
        />
        {esAdmin && <Ajustes espacio={espacio} />}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ miembros */

function Miembros({
  espacioId,
  miembros,
  yoId,
  esAdmin,
}: {
  espacioId: string
  miembros: Miembro[]
  yoId: string
  esAdmin: boolean
}) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function cambiar(id: string, cambios: { role?: Rol; active?: boolean }) {
    setOcupado(id)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from("workspace_members")
      .update(cambios)
      .eq("workspace_id", espacioId)
      .eq("user_id", id)
    setOcupado(null)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  const admins = miembros.filter((m) => m.role === "admin" && m.active).length

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">
        Miembros <span className="text-muted">({miembros.length})</span>
      </h2>

      {error && (
        <p className="mb-2 rounded-lg bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="divide-y divide-line">
        {miembros.map((miembro) => {
          const soyYo = miembro.id === yoId
          // No dejar el espacio sin ningún administrador activo
          const ultimoAdmin = miembro.role === "admin" && miembro.active && admins <= 1

          return (
            <li
              key={miembro.id}
              className={cn(
                "flex flex-wrap items-center gap-2 py-2.5",
                !miembro.active && "opacity-55",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {miembro.full_name}
                  {soyYo && <span className="ml-1.5 text-xs text-muted">(tu)</span>}
                </p>
                <p className="truncate text-xs text-muted">{miembro.email}</p>
              </div>

              {esAdmin ? (
                <select
                  className="field w-40 py-1"
                  value={miembro.role}
                  disabled={ocupado === miembro.id || ultimoAdmin}
                  title={
                    ultimoAdmin
                      ? "Es el único administrador activo"
                      : "Rol dentro de este espacio"
                  }
                  onChange={(e) =>
                    void cambiar(miembro.id, { role: e.target.value as Rol })
                  }
                >
                  {ROLES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {NOMBRE_ROL[r.valor]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="chip">{NOMBRE_ROL[miembro.role]}</span>
              )}

              {esAdmin && (
                <button
                  type="button"
                  onClick={() => void cambiar(miembro.id, { active: !miembro.active })}
                  disabled={ocupado === miembro.id || ultimoAdmin || soyYo}
                  title={
                    soyYo
                      ? "No puedes sacarte a ti mismo"
                      : miembro.active
                        ? "Quitar el acceso a este espacio"
                        : "Devolver el acceso"
                  }
                  className={cn("btn py-1", miembro.active && "btn-danger")}
                >
                  {ocupado === miembro.id && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {miembro.active ? "Desactivar" : "Reactivar"}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {esAdmin && (
        <p className="mt-3 text-xs text-muted">
          Desactivar conserva las horas ya registradas: solo cierra el acceso a
          este espacio.
        </p>
      )}
    </section>
  )
}

/* -------------------------------------------------------------- invitaciones */

function Invitaciones({
  espacioId,
  yoId,
  pendientes,
  esAdmin,
}: {
  espacioId: string
  yoId: string
  pendientes: Invitacion[]
  esAdmin: boolean
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [nombre, setNombre] = useState("")
  const [rol, setRol] = useState<Rol>("member")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function invitar() {
    const correo = email.trim().toLowerCase()
    if (!correo.includes("@")) {
      setError("Escribe una dirección de correo válida.")
      return
    }
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from("invitations").insert({
      workspace_id: espacioId,
      email: correo,
      full_name: nombre.trim(),
      role: rol,
      invited_by: yoId,
    })
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setEmail("")
    setNombre("")
    router.refresh()
  }

  async function retirar(id: string) {
    setOcupado(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from("invitations").delete().eq("id", id)
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    router.refresh()
  }

  return (
    <section className="card p-4">
      <h2 className="mb-1 text-sm font-semibold">Invitaciones</h2>
      <p className="mb-3 text-xs text-muted">
        Autoriza una dirección y esa persona vera este espacio nada más entrar en
        la app, sin que le mandes nada.
      </p>

      {esAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void invitar()
          }}
          className="space-y-2"
        >
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="companero@empresa.com"
            aria-label="Correo a invitar"
          />
          <div className="flex gap-2">
            <input
              className="field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre (opcional)"
              aria-label="Nombre"
            />
            <select
              className="field w-40"
              value={rol}
              onChange={(e) => setRol(e.target.value as Rol)}
              aria-label="Rol"
            >
              {ROLES.map((r) => (
                <option key={r.valor} value={r.valor}>
                  {NOMBRE_ROL[r.valor]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={ocupado || !email.trim()}
            className="btn btn-primary w-full"
          >
            {ocupado ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Invitar
          </button>
        </form>
      )}

      {error && (
        <p className="mt-2 rounded-lg bg-danger-soft p-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="mt-3 divide-y divide-line">
        {pendientes.length === 0 && (
          <li className="py-2 text-sm text-muted">No hay invitaciones pendientes.</li>
        )}
        {pendientes.map((inv) => (
          <li key={inv.id} className="flex items-center gap-2 py-2">
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{inv.email}</p>
              <p className="text-xs text-muted">
                {NOMBRE_ROL[inv.role]} · {formatDateShort(inv.created_at.slice(0, 10))}
              </p>
            </div>
            {esAdmin && (
              <button
                type="button"
                onClick={() => void retirar(inv.id)}
                disabled={ocupado}
                className="btn btn-ghost p-1.5 text-danger"
                aria-label={`Retirar la invitación de ${inv.email}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ------------------------------------------------------------------- ajustes */

function Ajustes({ espacio }: { espacio: Espacio }) {
  const router = useRouter()
  const [nombre, setNombre] = useState(espacio.name)
  const [zona, setZona] = useState(espacio.timezone)
  const [dominios, setDominios] = useState(espacio.allowed_domains.join(", "))
  const [estiloTexto, setEstiloTexto] = useState(espacio.text_case)
  const [modoEtiquetas, setModoEtiquetas] = useState(espacio.tag_mode)
  const [exigeProyecto, setExigeProyecto] = useState(espacio.require_project)
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
    const supabase = createClient()
    const { data, error: err } = await supabase.rpc("normalizar_texto_existente", {
      p_workspace: espacio.id,
    })
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

    const supabase = createClient()
    const { error: err } = await supabase
      .from("workspaces")
      .update({
        name: nombre.trim() || espacio.name,
        timezone: zona,
        allowed_domains: lista,
        text_case: estiloTexto,
        tag_mode: modoEtiquetas,
        require_project: exigeProyecto,
        goal_daily_minutes: dia,
        goal_weekly_minutes: semana,
      })
      .eq("id", espacio.id)

    setGuardando(false)
    if (err) {
      setError(mensajeError(err))
      return
    }
    setGuardado(true)
    router.refresh()
  }

  return (
    <section className="card p-4">
      <h2 className="mb-3 text-sm font-semibold">Este espacio</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void guardar()
        }}
        className="space-y-3"
      >
        <div>
          <label className="label" htmlFor="ws-nombre">
            Nombre
          </label>
          <input
            id="ws-nombre"
            className="field"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
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
            onChange={(e) => setZona(e.target.value)}
          >
            {[...new Set([espacio.timezone, ...ZONAS_HORARIAS])].map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Decide a que dia cuenta cada hora. Cambiarla no recalcula lo ya
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
            onChange={(e) => setDominios(e.target.value)}
            placeholder="miempresa.com, otra.com"
          />
          <p className="mt-1 text-xs text-muted">
            Quien entre con un correo de estos dominios podra unirse solo, como
            miembro. Dejalo vacio para exigir invitación.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ws-objetivo-dia">
              Objetivo al día
            </label>
            <input
              id="ws-objetivo-dia"
              className="field cifra"
              value={objDia}
              onChange={(e) => setObjDia(e.target.value)}
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
              onChange={(e) => setObjSemana(e.target.value)}
              placeholder="Sin objetivo"
            />
          </div>
        </div>
        <p className="-mt-1 text-xs text-muted">
          Horas por persona: lo mismo para todo el equipo. Se ven en el
          cronómetro, restando lo que falta. Los objetivos por rama van en
          Categorización, y los de un proyecto dentro del proyecto.
        </p>

        <div>
          <label className="label" htmlFor="ws-etiquetas">
            Etiquetas por entrada
          </label>
          <select
            id="ws-etiquetas"
            className="field"
            value={modoEtiquetas}
            onChange={(e) => setModoEtiquetas(e.target.value)}
          >
            <option value="varias">Se pueden poner varias</option>
            <option value="una">Solo una por entrada</option>
          </select>
        </div>

        <label className="flex items-start gap-2.5 rounded-[var(--radio-sm)] border border-line bg-surface-2/60 p-3">
          <input
            type="checkbox"
            checked={exigeProyecto}
            onChange={(e) => setExigeProyecto(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[color:var(--accent)]"
          />
          <span>
            <span className="block text-sm font-medium">
              No dejar parar el cronómetro sin proyecto
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              Así no quedan horas sueltas que luego nadie sabe dónde meter.
            </span>
          </span>
        </label>

        <div>
          <label className="label" htmlFor="ws-texto">
            Como se escribe el texto
          </label>
          <select
            id="ws-texto"
            className="field"
            value={estiloTexto}
            onChange={(e) => setEstiloTexto(e.target.value)}
          >
            <option value="libre">Tal cual lo escriba cada uno</option>
            <option value="mayusculas">Siempre en MAYUSCULAS</option>
          </select>
          <p className="mt-1 text-xs text-muted">
            Se aplica al guardar, a las descripciones y a los nombres de
            clientes, proyectos, tareas y etiquetas. Vale también para lo que
            entra por el importador, así que nadie tiene que acordarse.
          </p>
        </div>

        {error && (
          <p className="rounded-[var(--radio-sm)] bg-danger-soft p-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button type="submit" disabled={guardando} className="btn btn-primary">
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
          {guardado && <span className="text-xs text-billable">Guardado</span>}
        </div>
      </form>

      {espacio.text_case === "mayusculas" && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm font-medium">Lo que ya estaba escrito</p>
          <p className="mt-0.5 text-xs text-muted">
            El cambio solo afecta a lo nuevo. Esto pasa a mayusculas lo que ya
            hay apuntado, y no tiene vuelta atras.
          </p>
          <button
            type="button"
            onClick={() => void normalizar()}
            disabled={normalizando}
            className="btn mt-2"
          >
            {normalizando && <Loader2 className="h-4 w-4 animate-spin" />}
            Pasar lo anterior a mayusculas
          </button>
          {normalizado !== null && (
            <p className="mt-2 text-xs text-billable">
              {normalizado === 0
                ? "Ya estaba todo en mayusculas."
                : `${normalizado} registros actualizados.`}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

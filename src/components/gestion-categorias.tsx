"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import {
  Archive,
  CornerDownRight,
  GripVertical,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { useAvisos } from "@/components/avisos"
import { mensajeError } from "@/lib/errores"
import {
  categoriasRaiz,
  formatObjetivo,
  parseObjetivo,
  subcategoriasDe,
} from "@/lib/categorias"
import { formatDurationShort } from "@/lib/time"
import type { Categoria, Proyecto } from "@/lib/tipos"
import { cn } from "@/lib/utils"

/**
 * El arbol del equipo: como se organiza, no quien paga. Son dos niveles y cada
 * proyecto cuelga de uno solo, que es lo que deja sacar en el Excel una columna
 * por nivel.
 */
export function GestionCategorias({
  espacioId,
  categorias,
  proyectos,
  segundosPorRama = {},
}: {
  espacioId: string
  categorias: Categoria[]
  proyectos: Proyecto[]
  /** Lo que llevas tu esta semana en cada rama, para leer el objetivo. */
  segundosPorRama?: Record<string, number>
}) {
  const router = useRouter()
  const { avisar } = useAvisos()
  const [ocupado, setOcupado] = useState(false)
  /**
   * El arrastre, hecho con eventos de puntero y no con el `draggable` de HTML:
   * el de HTML no existe en el movil, que es justo donde hace mas falta.
   * `id` es lo que se lleva en la mano, `dy` cuanto se ha movido y `encima` el
   * area por la que va pasando.
   */
  const [arrastre, setArrastre] = useState<{
    id: string
    dy: number
    encima: string | null
  } | null>(null)
  /** Desde donde empezo el dedo, para saber si esto es un arrastre o un toque. */
  const inicio = useRef<{ y: number; movido: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nueva, setNueva] = useState("")
  const [anadiendoEn, setAnadiendoEn] = useState<string | null>(null)
  const [verArchivadas, setVerArchivadas] = useState(false)

  const raiz = categoriasRaiz(categorias).filter(
    (c) => verArchivadas || !c.archived,
  )
  const archivadas = categorias.filter((c) => c.archived).length

  async function conSupabase(
    hacer: (s: ReturnType<typeof createClient>) => PromiseLike<{ error: unknown }>,
  ) {
    setOcupado(true)
    setError(null)
    const { error: err } = await hacer(createClient())
    setOcupado(false)
    if (err) {
      setError(mensajeError(err))
      return false
    }
    router.refresh()
    return true
  }

  async function crear(nombre: string, padreId: string | null) {
    const limpio = nombre.trim()
    if (!limpio) return
    const hermanas = padreId
      ? subcategoriasDe(categorias, padreId)
      : categoriasRaiz(categorias)

    const ok = await conSupabase((s) =>
      s.from("categories").insert({
        workspace_id: espacioId,
        parent_id: padreId,
        name: limpio,
        position: hermanas.length,
      }),
    )
    if (!ok) return
    if (padreId) setAnadiendoEn(null)
    else setNueva("")
  }

  async function renombrar(categoria: Categoria, nombre: string) {
    const limpio = nombre.trim()
    if (!limpio || limpio === categoria.name) return
    await conSupabase((s) =>
      s.from("categories").update({ name: limpio }).eq("id", categoria.id),
    )
  }

  async function ponerObjetivo(categoria: Categoria, texto: string) {
    const minutos = texto.trim() ? parseObjetivo(texto) : null
    if (texto.trim() && minutos === null) {
      setError("No entiendo esas horas. Prueba con 5, 5h o 5:30.")
      return
    }
    if (minutos === categoria.goal_weekly_minutes) return
    await conSupabase((s) =>
      s
        .from("categories")
        .update({ goal_weekly_minutes: minutos })
        .eq("id", categoria.id),
    )
  }

  /**
   * Cambiar una categoria de area. Antes habia que borrarla y volver a
   * escribirla, y con ella se iba lo que colgara debajo; ahora es mover el
   * `parent_id` y ponerla la ultima de su nueva area.
   *
   * Los proyectos que cuelgan se van con ella -es lo que espera cualquiera-,
   * y por eso el aviso lo dice: cambia el area con la que salen en los
   * informes. Se deshace desde ahi mismo.
   */
  async function mover(categoria: Categoria, destinoId: string) {
    if (categoria.parent_id === destinoId || categoria.id === destinoId) return
    const antes = categoria.parent_id
    const hermanas = subcategoriasDe(categorias, destinoId)
    const destino = categorias.find((c) => c.id === destinoId)

    const ok = await conSupabase((s) =>
      s
        .from("categories")
        .update({ parent_id: destinoId, position: hermanas.length })
        .eq("id", categoria.id),
    )
    if (!ok) return

    const cuantos = proyectos.filter(
      (p) => p.category_id === categoria.id,
    ).length

    avisar(
      `${categoria.name} ahora está en ${destino?.name ?? "otra área"}` +
        (cuantos > 0
          ? `, y con ella ${cuantos === 1 ? "su proyecto" : `sus ${cuantos} proyectos`}`
          : ""),
      antes
        ? async () => {
            const vuelta = subcategoriasDe(categorias, antes)
            await createClient()
              .from("categories")
              .update({ parent_id: antes, position: vuelta.length })
              .eq("id", categoria.id)
            router.refresh()
            return "Devuelta a su sitio."
          }
        : undefined,
    )
  }

  async function archivar(categoria: Categoria) {
    await conSupabase((s) =>
      s
        .from("categories")
        .update({ archived: !categoria.archived })
        .eq("id", categoria.id),
    )
  }

  return (
    <section className="card p-4">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Categorización</h2>
        {archivadas > 0 && (
          <button
            type="button"
            onClick={() => setVerArchivadas((v) => !v)}
            className="text-xs font-medium text-muted transition hover:text-ink"
          >
            {verArchivadas ? "Ocultar" : "Ver"} archivadas ({archivadas})
          </button>
        )}
      </div>
      <p className="mb-4 max-w-xl text-sm text-muted">
        Áreas arriba, categorías dentro. Cada proyecto cuelga de una de las
        dos y en los informes sale una columna por nivel. El objetivo son horas
        por persona y semana.
      </p>

      {error && (
        <p className="mb-3 rounded-[var(--radio-sm)] bg-danger-soft p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="space-y-1">
        {raiz.map((padre) => {
          const hijas = subcategoriasDe(categorias, padre.id).filter(
            (c) => verArchivadas || !c.archived,
          )
          return (
            <li
              key={padre.id}
              /* El area entera es la zona donde soltar -apuntar a una linea de
                 un pixel es un castigo, con el raton y mas con el dedo-. Quien
                 esta debajo se busca con `elementFromPoint`, y por eso hace
                 falta la marca. */
              data-area={padre.id}
              className={cn(
                "rounded-[var(--radio-sm)] bg-surface-2/60 p-1.5 transition",
                arrastre?.encima === padre.id &&
                  "ring-2 ring-accent ring-offset-1 ring-offset-[color:var(--surface)]",
              )}
            >
              <Fila
                categoria={padre}
                proyectos={proyectos}
                segundos={segundosPorRama[padre.id] ?? 0}
                ocupado={ocupado}
                onRenombrar={(n) => void renombrar(padre, n)}
                onObjetivo={(t) => void ponerObjetivo(padre, t)}
                onArchivar={() => void archivar(padre)}
              />

              <ul className="mt-0.5 space-y-0.5 pl-5">
                {hijas.map((hija) => (
                  <li
                    key={hija.id}
                    data-fila={hija.id}
                    className={cn(
                      "flex items-center gap-1 rounded-[4px]",
                      arrastre?.id === hija.id &&
                        "relative z-10 bg-surface shadow-[var(--shadow-lg)]",
                    )}
                    /* Nada de `pointer-events: none` aqui: anula la captura
                       del puntero y entonces el "solte el dedo" no llega
                       nunca, asi que la fila se quedaba levantada. Para saber
                       por encima de que area va se mira la pila de debajo del
                       dedo, saltandose esta misma fila. */
                    style={
                      arrastre?.id === hija.id
                        ? {
                            transform: `translateY(${arrastre.dy}px) scale(1.02)`,
                          }
                        : undefined
                    }
                  >
                    <Asa
                      areas={raiz.filter((a) => a.id !== padre.id)}
                      arrastrando={arrastre?.id === hija.id}
                      onEmpezar={(y) => {
                        inicio.current = { y, movido: false }
                        setArrastre({ id: hija.id, dy: 0, encima: null })
                      }}
                      onMoverse={(y, x) => {
                        const desde = inicio.current
                        if (!desde) return
                        const dy = y - desde.y
                        if (Math.abs(dy) > 6) desde.movido = true
                        const area = document
                          .elementsFromPoint(x, y)
                          .find(
                            (el) =>
                              el.closest("[data-area]") &&
                              !el.closest(`[data-fila="${hija.id}"]`),
                          )
                          ?.closest("[data-area]")
                        setArrastre({
                          id: hija.id,
                          dy,
                          encima: area?.getAttribute("data-area") ?? null,
                        })
                      }}
                      onSoltar={() => {
                        const movido = inicio.current?.movido
                        const destino = arrastre?.encima
                        inicio.current = null
                        setArrastre(null)
                        if (movido && destino) void mover(hija, destino)
                        return Boolean(movido)
                      }}
                      onElegir={(destino) => void mover(hija, destino)}
                    />
                    <Fila
                      categoria={hija}
                      proyectos={proyectos}
                      segundos={segundosPorRama[hija.id] ?? 0}
                      ocupado={ocupado}
                      onRenombrar={(n) => void renombrar(hija, n)}
                      onObjetivo={(t) => void ponerObjetivo(hija, t)}
                      onArchivar={() => void archivar(hija)}
                    />
                  </li>
                ))}

                <li className="pl-4">
                  {anadiendoEn === padre.id ? (
                    <NuevoNombre
                      placeholder="Nueva categoría dentro de esta área"
                      onGuardar={(n) => void crear(n, padre.id)}
                      onCancelar={() => setAnadiendoEn(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAnadiendoEn(padre.id)}
                      className="flex items-center gap-1 py-1 text-xs font-medium text-muted transition hover:text-accent"
                    >
                      <Plus className="h-3 w-3" />
                      Categoría
                    </button>
                  )}
                </li>
              </ul>
            </li>
          )
        })}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void crear(nueva, null)
        }}
        className="mt-3 flex gap-2"
      >
        <input
          className="field"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Nueva área: Backoffice, Conocimiento, Proyectos..."
          aria-label="Nombre del área"
        />
        <button
          type="submit"
          disabled={ocupado || !nueva.trim()}
          className="btn btn-primary shrink-0"
        >
          {ocupado ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Añadir
        </button>
      </form>
    </section>
  )
}

/* ------------------------------------------------------------------- fila */

function Fila({
  categoria,
  proyectos,
  segundos,
  ocupado,
  onRenombrar,
  onObjetivo,
  onArchivar,
}: {
  categoria: Categoria
  proyectos: Proyecto[]
  segundos: number
  ocupado: boolean
  onRenombrar: (nombre: string) => void
  onObjetivo: (texto: string) => void
  onArchivar: () => void
}) {
  const cuantos = proyectos.filter((p) => p.category_id === categoria.id).length

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radio-sm)] px-1.5 py-1",
        categoria.archived && "opacity-55",
      )}
    >
      <input
        key={categoria.name}
        defaultValue={categoria.name}
        onBlur={(e) => onRenombrar(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "Escape") {
            e.currentTarget.value = categoria.name
            e.currentTarget.blur()
          }
        }}
        aria-label="Nombre de la categoría"
        className="min-w-0 flex-1 truncate rounded-[4px] bg-transparent px-1 py-0.5 text-sm font-medium outline-none transition hover:bg-surface-3/60 focus:bg-surface"
      />

      <span className="shrink-0 text-xs text-muted">
        {cuantos === 0
          ? "sin proyectos"
          : cuantos === 1
            ? "1 proyecto"
            : cuantos + " proyectos"}
      </span>

      <span
        className={cn(
          "cifra shrink-0 text-xs",
          categoria.goal_weekly_minutes &&
            segundos >= categoria.goal_weekly_minutes * 60
            ? "font-medium text-billable"
            : "text-muted",
        )}
        title="Lo que llevas tú esta semana en esta rama"
      >
        {segundos > 0 ? formatDurationShort(segundos) : ""}
      </span>

      <input
        key={"objetivo-" + categoria.goal_weekly_minutes}
        defaultValue={formatObjetivo(categoria.goal_weekly_minutes)}
        onBlur={(e) => onObjetivo(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
        }}
        placeholder="—"
        aria-label="Objetivo semanal"
        title="Objetivo de horas por persona y semana"
        className="cifra w-16 shrink-0 rounded-[4px] bg-transparent px-1 py-0.5 text-right text-sm outline-none transition hover:bg-surface-3/60 focus:bg-surface"
      />

      <button
        type="button"
        onClick={onArchivar}
        disabled={ocupado}
        className="shrink-0 rounded-[4px] p-1 text-muted transition hover:bg-surface-3 hover:text-ink disabled:opacity-40"
        aria-label={categoria.archived ? "Reactivar" : "Archivar"}
        title={categoria.archived ? "Reactivar" : "Archivar"}
      >
        {categoria.archived ? (
          <RotateCcw className="h-3.5 w-3.5" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

/**
 * El asa de una categoria. Dos gestos en un solo mando, que es lo que evita
 * llenar la fila de botones:
 *
 * - **Arrastrarla** la lleva a otra area. Con el dedo tambien: por eso son
 *   eventos de puntero y no el `draggable` de HTML, que en el movil no
 *   existe.
 * - **Tocarla** sin mover abre la lista de areas **a las que puede ir** -la
 *   suya no sale: decirle a alguien que Backoffice esta en Backoffice es
 *   repetir lo que ya dice el sitio donde esta pintada-.
 */
function Asa({
  areas,
  arrastrando,
  onEmpezar,
  onMoverse,
  onSoltar,
  onElegir,
}: {
  /** Solo las otras: la propia no se ofrece. */
  areas: Categoria[]
  arrastrando: boolean
  onEmpezar: (y: number) => void
  onMoverse: (y: number, x: number) => void
  /** Devuelve si hubo arrastre de verdad; si no, es un toque. */
  onSoltar: () => boolean
  onElegir: (destinoId: string) => void
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <DropdownMenu.Root open={abierto} onOpenChange={setAbierto}>
      <DropdownMenu.Trigger
        aria-label="Mover a otra área"
        title="Arrástrala a otra área, o tócala para elegirla"
        onPointerDown={(e) => {
          // Solo el boton principal o el dedo
          if (e.button !== 0) return
          /* Radix abre el menu en `pointerdown`, y entonces se queda con el
             puntero y aqui no llega ni el `move` ni el `up`: la fila se
             quedaba levantada. Con esto el menu no abre solo, y lo abrimos
             nosotros al soltar, pero solo si no ha habido arrastre. */
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          onEmpezar(e.clientY)
        }}
        onPointerMove={(e) => {
          if (!arrastrando) return
          onMoverse(e.clientY, e.clientX)
        }}
        onPointerUp={() => {
          if (!onSoltar()) setAbierto(true)
        }}
        onPointerCancel={() => onSoltar()}
        onLostPointerCapture={() => onSoltar()}
        /* Sin esto, arrastrar hacia abajo en el movil hace rodar la pagina en
           vez de coger la categoria. */
        className="-ml-1 shrink-0 cursor-grab touch-none rounded-[4px] p-1 text-muted/70 transition hover:bg-surface-3/60 hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-44 overflow-hidden rounded-[var(--radio)] border border-line bg-surface p-1"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <p className="rotulo px-2 py-1.5">Mover a</p>
          {areas.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted">
              No hay otra área todavía.
            </p>
          ) : (
            areas.map((area) => (
              <DropdownMenu.Item
                key={area.id}
                onSelect={() => onElegir(area.id)}
                className="pulsable flex cursor-pointer items-center gap-2 rounded-[var(--radio-sm)] px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-surface-2"
              >
                <CornerDownRight className="h-3.5 w-3.5 text-muted" aria-hidden />
                {area.name}
              </DropdownMenu.Item>
            ))
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function NuevoNombre({
  placeholder,
  onGuardar,
  onCancelar,
}: {
  placeholder: string
  onGuardar: (nombre: string) => void
  onCancelar: () => void
}) {
  const [valor, setValor] = useState("")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar(valor)
      }}
      className="flex gap-1.5 py-1"
    >
      <input
        autoFocus
        className="field h-7 py-0 text-sm"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancelar()}
        placeholder={placeholder}
      />
      <button
        type="submit"
        disabled={!valor.trim()}
        className="btn h-7 shrink-0 px-2 py-0"
      >
        Añadir
      </button>
      <button
        type="button"
        onClick={onCancelar}
        className="btn btn-ghost h-7 shrink-0 px-2 py-0"
      >
        Cancelar
      </button>
    </form>
  )
}

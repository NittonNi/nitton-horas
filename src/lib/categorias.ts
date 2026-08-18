import type { Categoria, RamaCategoria } from "@/lib/tipos"

/**
 * La categorizacion tiene dos niveles a proposito: categoria y subcategoría.
 * Con eso se cubre "Backoffice > TLT" y "Proyectos > Eventos", y en el Excel
 * sale una columna por nivel siempre en el mismo sitio.
 */

export const SIN_CATEGORIA = "Sin categorizar"

/** Las de primer nivel, ordenadas como las dejo el equipo. */
export function categoriasRaiz(categorias: Categoria[]): Categoria[] {
  return categorias
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}

/** Las hijas de una categoria, en su orden. */
export function subcategoriasDe(
  categorias: Categoria[],
  padreId: string,
): Categoria[] {
  return categorias
    .filter((c) => c.parent_id === padreId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}

/**
 * Todas las ramas a las que se puede colgar un proyecto, en el orden en que se
 * leen: primero la categoria y debajo sus subcategorías.
 */
export function ramas(categorias: Categoria[]): RamaCategoria[] {
  const salida: RamaCategoria[] = []
  for (const padre of categoriasRaiz(categorias)) {
    salida.push({ categoria: padre, padre: null, camino: padre.name })
    for (const hija of subcategoriasDe(categorias, padre.id)) {
      salida.push({
        categoria: hija,
        padre,
        camino: `${padre.name} / ${hija.name}`,
      })
    }
  }
  return salida
}

/** Las dos columnas de un proyecto: categoria y subcategoría. */
export function columnasDe(
  categorias: Categoria[],
  categoriaId: string | null | undefined,
): { categoria: string | null; subcategoria: string | null } {
  if (!categoriaId) return { categoria: null, subcategoria: null }
  const propia = categorias.find((c) => c.id === categoriaId)
  if (!propia) return { categoria: null, subcategoria: null }
  if (!propia.parent_id) return { categoria: propia.name, subcategoria: null }
  const padre = categorias.find((c) => c.id === propia.parent_id)
  return { categoria: padre?.name ?? null, subcategoria: propia.name }
}

/** "Proyectos / Eventos" para pintar en una linea. */
export function caminoDe(
  categorias: Categoria[],
  categoriaId: string | null | undefined,
): string | null {
  const { categoria, subcategoria } = columnasDe(categorias, categoriaId)
  if (!categoria) return null
  return subcategoria ? `${categoria} / ${subcategoria}` : categoria
}

/** Minutos a "5h" o "5h 30" para pintar un objetivo. */
export function formatObjetivo(minutos: number | null | undefined): string {
  if (!minutos) return ""
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (!m) return `${h}h`
  return h ? `${h}h ${m}` : `${m}m`
}

/** "5", "5h", "5:30", "5,5" -> minutos. Devuelve null si no se entiende. */
export function parseObjetivo(texto: string): number | null {
  const limpio = texto.trim().toLowerCase().replace(",", ".")
  if (!limpio) return null

  const reloj = limpio.match(/^(\d+):([0-5]?\d)$/)
  if (reloj) return Number(reloj[1]) * 60 + Number(reloj[2])

  const conUnidad = limpio.match(/^(\d+(?:\.\d+)?)\s*(h|m)?$/)
  if (!conUnidad) return null

  const valor = Number(conUnidad[1])
  if (!Number.isFinite(valor) || valor <= 0) return null
  return conUnidad[2] === "m" ? Math.round(valor) : Math.round(valor * 60)
}

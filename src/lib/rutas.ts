/**
 * La raiz "/" es la landing publica, asi que la aplicacion vive un escalon mas
 * abajo. Aqui en un sitio para no repartir la ruta por medio codigo.
 */
export const RUTA_APP = "/panel"

/**
 * Los destinos de vuelta llegan por la URL (`?volver=`, `?next=`), asi que hay
 * que desconfiar: solo se acepta una ruta de esta misma web. Sin esto, un
 * enlace preparado -`?volver=https://sitio-falso`- te dejaria fuera justo
 * despues de entrar, con la sesion recien abierta y creyendo que sigues aqui.
 */
export function rutaSegura(valor: string | null | undefined): string {
  if (!valor) return RUTA_APP
  // Una sola barra al principio: "//otro-sitio" y "/\otro" el navegador los
  // entiende como absolutos.
  if (valor[0] !== "/" || valor[1] === "/" || valor[1] === "\\") return RUTA_APP
  if (valor.includes("://")) return RUTA_APP
  return valor
}

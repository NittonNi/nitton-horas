/**
 * Nombres de cookies que leen a la vez el servidor y el navegador.
 *
 * Viven aquí y no junto al componente que las escribe por un motivo que costó
 * un rato: una constante exportada desde un módulo `"use client"` no llega al
 * servidor como su valor, sino como una referencia de cliente, así que
 * `cookies().get(...)` no encontraba nada aunque la cookie sí estuviera.
 */

/** "Llévame directo a mi espacio en vez de a la portada." */
export const COOKIE_DIRECTO = "directo"

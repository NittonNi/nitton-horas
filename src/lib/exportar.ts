/**
 * Descargas del informe. El CSV sale con punto y coma y BOM porque el destino
 * casi siempre es un Excel en espanol, que si no parte mal las columnas.
 */

import Papa from "papaparse"

import { formatDateShort, formatHoursDecimal } from "@/lib/time"
import type { EntradaVista } from "@/lib/tipos"

function descargar(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

export function exportarCsv(entradas: EntradaVista[], nombre: string) {
  const filas = entradas.map((entrada) => ({
    Fecha: formatDateShort(entrada.local_date),
    Persona: entrada.user_name,
    Cliente: entrada.client_name ?? "",
    Proyecto: entrada.project_name ?? "",
    Tarea: entrada.task_name ?? "",
    Descripcion: entrada.description,
    Etiquetas: entrada.tags.join(", "),
    Horas: formatHoursDecimal(entrada.duration_seconds),
    Facturable: entrada.billable ? "Si" : "No",
    // Con coma decimal: es lo que espera un Excel en espanol
    Importe:
      entrada.amount != null
        ? Number(entrada.amount).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
  }))

  const csv = Papa.unparse(filas, { delimiter: ";" })
  descargar(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `${nombre}.csv`,
  )
}

export async function exportarPdf(opciones: {
  titulo: string
  subtitulo: string
  resumen: { etiqueta: string; valor: string }[]
  columnas: string[]
  filas: string[][]
  nombre: string
}) {
  // jsPDF pesa: solo se carga cuando alguien pide el PDF de verdad
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })

  doc.setFontSize(16)
  doc.text(opciones.titulo, 40, 44)
  doc.setFontSize(10)
  doc.setTextColor(110)
  doc.text(opciones.subtitulo, 40, 62)

  doc.setTextColor(30)
  doc.setFontSize(11)
  const resumen = opciones.resumen
    .map((dato) => `${dato.etiqueta}: ${dato.valor}`)
    .join("     ")
  doc.text(resumen, 40, 84)

  autoTable(doc, {
    startY: 100,
    head: [opciones.columnas],
    body: opciones.filas,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [67, 56, 202], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 245, 242] },
    margin: { left: 40, right: 40 },
  })

  doc.save(`${opciones.nombre}.pdf`)
}

/**
 * Descargas del informe.
 *
 * El Excel es el formato que de verdad se usa después: va con columnas
 * tipadas -la fecha es una fecha, las horas son un número y el importe es
 * moneda-, cabecera fijada y filtros, para poder ordenar y hacer tablas
 * dinamicas sin tener que arreglar nada antes.
 */

import Papa from "papaparse"

import type { CellObject, Row, SheetData } from "write-excel-file/browser"

import { formatDateShort, formatHoursDecimal, fromDateKey, hoursDecimal } from "@/lib/time"
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

/* --------------------------------------------------------------------- csv */

export function exportarCsv(entradas: EntradaVista[], nombre: string) {
  const filas = entradas.map((entrada) => ({
    Fecha: formatDateShort(entrada.local_date),
    Persona: entrada.user_name,
    Cliente: entrada.client_name ?? "",
    Categoria: entrada.category_name ?? "",
    Subcategoria: entrada.subcategory_name ?? "",
    Proyecto: entrada.project_name ?? "",
    Edicion: entrada.edition_name ?? "",
    Tarea: entrada.task_name ?? "",
    Descripcion: entrada.description,
    Etiquetas: entrada.tags.join(", "),
    Horas: formatHoursDecimal(entrada.duration_seconds),
    Facturable: entrada.billable ? "Si" : "No",
    Importe:
      entrada.amount != null
        ? Number(entrada.amount).toLocaleString("es-ES", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : "",
  }))

  // Punto y coma y BOM: es lo que espera un Excel en español
  const csv = Papa.unparse(filas, { delimiter: ";" })
  descargar(
    new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    `${nombre}.csv`,
  )
}

/* ------------------------------------------------------------------- excel */

const EUROS = '#,##0.00\\ "€"'

function cabecera(texto: string): CellObject {
  return {
    value: texto,
    type: String,
    fontWeight: "bold",
    backgroundColor: "#0F1419",
    textColor: "#FFFFFF",
    align: "left",
  }
}

export async function exportarExcel(
  entradas: EntradaVista[],
  opciones: { nombre: string; desde: string; hasta: string; conImportes: boolean },
) {
  // El paquete no tiene entrada raiz: hay que pedir la versión de navegador
  const { default: writeXlsxFile } = await import("write-excel-file/browser")

  const columnas = [
    { column: "Fecha", width: 12 },
    { column: "Persona", width: 22 },
    { column: "Cliente", width: 22 },
    { column: "Categoría", width: 20 },
    { column: "Subcategoría", width: 20 },
    { column: "Proyecto", width: 26 },
    { column: "Edición", width: 18 },
    { column: "Tarea", width: 22 },
    { column: "Descripción", width: 46 },
    { column: "Etiquetas", width: 22 },
    { column: "Horas", width: 10 },
    { column: "Facturable", width: 12 },
    ...(opciones.conImportes ? [{ column: "Importe", width: 14 }] : []),
  ]

  const filas: SheetData = [
    columnas.map((c) => cabecera(c.column)),
    ...entradas.map((entrada) => {
      const fila: Row = [
        { value: fromDateKey(entrada.local_date), type: Date, format: "dd/mm/yyyy" },
        { value: entrada.user_name, type: String },
        { value: entrada.client_name ?? "", type: String },
        { value: entrada.category_name ?? "", type: String },
        { value: entrada.subcategory_name ?? "", type: String },
        { value: entrada.project_name ?? "", type: String },
        { value: entrada.edition_name ?? "", type: String },
        { value: entrada.task_name ?? "", type: String },
        { value: entrada.description, type: String, wrap: true },
        { value: entrada.tags.join(", "), type: String },
        {
          value: hoursDecimal(entrada.duration_seconds),
          type: Number,
          format: "0.00",
        },
        { value: entrada.billable ? "Si" : "No", type: String, align: "center" },
      ]
      if (opciones.conImportes) {
        fila.push(
          entrada.amount != null
            ? { value: Number(entrada.amount), type: Number, format: EUROS }
            : null,
        )
      }
      return fila
    }),
  ]

  /* Hoja aparte con los totales por proyecto: es la primera pregunta que se
     hace cualquiera al abrir el fichero. */
  const porProyecto = new Map<string, { horas: number; importe: number }>()
  for (const entrada of entradas) {
    const clave = entrada.project_name ?? "Sin proyecto"
    const acumulado = porProyecto.get(clave) ?? { horas: 0, importe: 0 }
    acumulado.horas += hoursDecimal(entrada.duration_seconds)
    acumulado.importe += Number(entrada.amount ?? 0)
    porProyecto.set(clave, acumulado)
  }

  const totalHoras = [...porProyecto.values()].reduce((s, v) => s + v.horas, 0)
  const totalImporte = [...porProyecto.values()].reduce((s, v) => s + v.importe, 0)

  const resumen: SheetData = [
    [{ value: "Informe de horas", type: String, fontWeight: "bold" }],
    [
      { value: "Periodo", type: String, textColor: "#69737F" },
      {
        value: `${formatDateShort(opciones.desde)} - ${formatDateShort(opciones.hasta)}`,
        type: String,
      },
    ],
    [],
    [
      cabecera("Proyecto"),
      cabecera("Horas"),
      ...(opciones.conImportes ? [cabecera("Importe")] : []),
    ],
    ...[...porProyecto.entries()]
      .sort((a, b) => b[1].horas - a[1].horas)
      .map(([nombre, v]): Row => [
        { value: nombre, type: String },
        { value: Math.round(v.horas * 100) / 100, type: Number, format: "0.00" },
        ...(opciones.conImportes
          ? [{ value: v.importe, type: Number, format: EUROS }]
          : []),
      ]),
    [
      { value: "Total", type: String, fontWeight: "bold" },
      {
        value: Math.round(totalHoras * 100) / 100,
        type: Number,
        format: "0.00",
        fontWeight: "bold",
      },
      ...(opciones.conImportes
        ? [
            {
              value: totalImporte,
              type: Number,
              format: EUROS,
              fontWeight: "bold" as const,
            },
          ]
        : []),
    ],
  ]

  await writeXlsxFile([
    {
      data: resumen,
      sheet: "Resumen",
      columns: [
        { width: 34 },
        { width: 14 },
        ...(opciones.conImportes ? [{ width: 16 }] : []),
      ],
    },
    {
      data: filas,
      sheet: "Detalle",
      columns: columnas.map((c) => ({ width: c.width })),
      // La cabecera se queda fija al bajar por las filas
      stickyRowsCount: 1,
    },
  ]).toFile(`${opciones.nombre}.xlsx`)
}

/* --------------------------------------------------------------------- pdf */

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
    headStyles: { fillColor: [15, 20, 25], textColor: 255 },
    alternateRowStyles: { fillColor: [241, 243, 245] },
    margin: { left: 40, right: 40 },
  })

  doc.save(`${opciones.nombre}.pdf`)
}

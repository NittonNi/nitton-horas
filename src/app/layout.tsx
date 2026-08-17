import type { Metadata, Viewport } from "next"
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google"

import "./globals.css"

/** Humanista y algo estrecha: aguanta bien la letra pequena de las tablas. */
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
})

/** Todas las cifras van aqui: duraciones, importes y fechas cuadran en columna. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Horas",
    template: "%s · Horas",
  },
  description: "Cronometro, hojas de horas e informes para equipos",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#efeeea" },
    { media: "(prefers-color-scheme: dark)", color: "#101214" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      // El script de abajo pone data-theme antes de hidratar: el servidor no
      // puede saber el tema guardado, y esa diferencia es esperada.
      suppressHydrationWarning
      className={`${instrument.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        {/* Aplica el tema guardado antes de pintar, para que no parpadee */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("tema");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}

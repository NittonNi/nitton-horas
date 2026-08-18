import type { MetadataRoute } from "next"

/** Next sirve esto en /manifest.webmanifest, que el proxy ya deja pasar sin sesion. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ClockLEINN",
    short_name: "ClockLEINN",
    description: "Cronómetro, hojas de horas e informes para equipos",
    start_url: "/panel",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#4338ca",
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}

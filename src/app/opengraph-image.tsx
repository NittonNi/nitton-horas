import { ImageResponse } from "next/og"

export const alt = "hitoo — las horas del equipo, cada una en su sitio"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/**
 * Mismo dibujo que el wordmark de public/hitoo-logo.svg -blanco en negrita
 * sobre #0e0e0e-, para que la vista previa al compartir el enlace (Slack,
 * WhatsApp, iMessage...) sea reconocible de un vistazo.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e0e",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 160,
            fontWeight: 700,
            letterSpacing: -6,
            color: "#ffffff",
          }}
        >
          hitoo
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 36,
            color: "#8e8e93",
          }}
        >
          Las horas del equipo, cada una en su sitio
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 44,
            width: 64,
            height: 6,
            borderRadius: 999,
            background: "#0a84ff",
          }}
        />
      </div>
    ),
    { ...size },
  )
}

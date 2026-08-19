"use client"

import { useEffect, useState } from "react"

/**
 * El enlace, en un cuadro que se escanea.
 *
 * En LEINN el alta pasa casi siempre con todo el equipo en la misma sala: es
 * más rápido enseñar la pantalla y que cada uno apunte con el móvil que
 * mandar un enlace por cinco sitios distintos.
 *
 * Se dibuja en el navegador a partir del enlace que ya existe: no hay nada que
 * guardar ni que pedirle a nadie.
 */
export function CodigoQr({
  valor,
  tamano = 200,
}: {
  valor: string
  /** Lado del cuadro, en píxeles. */
  tamano?: number
}) {
  /* Se guarda junto con el enlace del que salio: asi, mientras se dibuja el
     nuevo, no se enseña el cuadro del anterior como si fuera este. */
  const [hecho, setHecho] = useState<{ de: string; url: string } | null>(null)

  useEffect(() => {
    let vivo = true

    // Se carga al usarlo: la mayoría de las pantallas no lo necesitan
    void import("qrcode")
      .then((qr) =>
        qr.toDataURL(valor, {
          width: tamano * 2,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#1d1d1f", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (vivo) setHecho({ de: valor, url })
      })
      .catch(() => {
        // Sin cuadro se sigue pudiendo copiar el enlace, que es lo que importa
        if (vivo) setHecho(null)
      })

    return () => {
      vivo = false
    }
  }, [valor, tamano])

  const imagen = hecho?.de === valor ? hecho.url : null

  return (
    <div
      className="shrink-0 overflow-hidden rounded-[var(--radio)] border border-line bg-white p-2"
      style={{ width: tamano + 20, height: tamano + 20 }}
    >
      {imagen ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imagen}
          alt="Código QR con el enlace para unirse"
          width={tamano}
          height={tamano}
          className="h-full w-full"
        />
      ) : (
        <div className="h-full w-full animate-pulse rounded bg-surface-2" />
      )}
    </div>
  )
}

import type { NextConfig } from "next"

/**
 * Cabeceras de seguridad. La politica de contenido solo se pone en produccion:
 * en desarrollo Next recarga en caliente con `eval` y una politica estricta lo
 * rompe.
 */
const enProduccion = process.env.NODE_ENV === "production"

const POLITICA_CONTENIDO = [
  "default-src 'self'",
  // Next mete scripts en linea -entre ellos el que aplica el tema antes de
  // pintar-, asi que 'unsafe-inline' hace falta mientras no haya nonce.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Supabase: base de datos, sesion y tiempo real
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ")

const CABECERAS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(enProduccion
    ? [{ key: "Content-Security-Policy", value: POLITICA_CONTENIDO }]
    : []),
]

const nextConfig: NextConfig = {
  // Que no vaya diciendo por ahi con que esta hecho
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECERAS }]
  },
}

export default nextConfig

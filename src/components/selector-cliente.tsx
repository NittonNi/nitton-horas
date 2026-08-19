"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Plus, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { mensajeError } from "@/lib/errores"
import type { Cliente } from "@/lib/tipos"

/**
 * El cliente se elige -y se crea- desde el proyecto, que es donde se sabe quien
 * paga. En el catalogo solo se miran y se ordenan.
 */
export function SelectorCliente({
  id,
  espacioId,
  clientes,
  valor,
  onChange,
}: {
  id: string
  espacioId: string
  clientes: Cliente[]
  valor: string
  onChange: (clienteId: string) => void
}) {
  const router = useRouter()
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // El recien creado se pinta ya, sin esperar a que refresque el servidor
  const [reciente, setReciente] = useState<Cliente | null>(null)

  const lista = reciente ? [...clientes, reciente] : clientes

  async function crear() {
    const limpio = nombre.trim()
    if (!limpio) return
    setOcupado(true)
    setError(null)

    const { data, error: err } = await createClient()
      .from("clients")
      .insert({ workspace_id: espacioId, name: limpio })
      .select("*")
      .single()

    setOcupado(false)
    if (err || !data) {
      setError(mensajeError(err))
      return
    }

    setReciente(data)
    onChange(data.id)
    setNombre("")
    setCreando(false)
    router.refresh()
  }

  if (creando) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          className="field"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void crear()
            }
            if (e.key === "Escape") setCreando(false)
          }}
          placeholder="Nombre del cliente"
          aria-label="Nombre del cliente nuevo"
        />
        <button
          type="button"
          onClick={() => void crear()}
          disabled={ocupado || !nombre.trim()}
          className="btn btn-primary shrink-0"
        >
          {ocupado ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Crear
        </button>
        <button
          type="button"
          onClick={() => setCreando(false)}
          className="btn btn-ghost shrink-0"
          aria-label="Dejarlo"
        >
          <X className="h-4 w-4" />
        </button>
        {error && (
          <p className="w-full text-xs text-danger">{error}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <select
        id={id}
        className="field"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Sin cliente</option>
        {lista
          .filter((c) => !c.archived || c.id === valor)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      <button
        type="button"
        onClick={() => setCreando(true)}
        className="btn shrink-0"
        title="Crear un cliente nuevo"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

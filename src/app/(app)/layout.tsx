import { getSesion } from "@/lib/sesion"
import { createClient } from "@/lib/supabase/server"
import { aEntradaEnMarcha, SELECT_EN_MARCHA } from "@/lib/cronometro"
import { ProveedorSesion } from "@/components/proveedor-sesion"
import { ProveedorCronometro } from "@/components/proveedor-cronometro"
import { Armazon } from "@/components/armazon"

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode
}) {
  const sesion = await getSesion()
  const supabase = await createClient()

  // El cronómetro es único por persona, pero solo se muestra si corre aquí
  const { data } = await supabase
    .from("time_entries")
    .select(SELECT_EN_MARCHA)
    .eq("user_id", sesion.perfil.id)
    .eq("workspace_id", sesion.espacio.id)
    .is("end_at", null)
    .maybeSingle()

  return (
    <ProveedorSesion sesion={sesion}>
      <ProveedorCronometro espacioId={sesion.espacio.id} inicial={aEntradaEnMarcha(data)}>
        <Armazon>{children}</Armazon>
      </ProveedorCronometro>
    </ProveedorSesion>
  )
}

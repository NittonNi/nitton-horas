/** Traduce los errores que devuelven Supabase Auth y Postgres a algo legible. */
export function mensajeError(error: unknown): string {
  if (!error) return "Ha ocurrido un error inesperado."

  const raw =
    typeof error === "string"
      ? error
      : ((error as { message?: string }).message ?? String(error))

  const code = (error as { code?: string }).code

  // Postgres
  if (code === "23505") {
    if (raw.includes("one_running_per_user")) {
      return "Ya tienes un cronómetro en marcha."
    }
    if (raw.includes("clients_name_unique")) return "Ya existe un cliente con ese nombre."
    if (raw.includes("projects_name_per_client")) return "Ese cliente ya tiene un proyecto con ese nombre."
    if (raw.includes("tasks_name_per_project")) return "Ese proyecto ya tiene una tarea con ese nombre."
    if (raw.includes("tags_name_unique")) return "Ya existe una etiqueta con ese nombre."
    if (raw.includes("rates_scope_unique")) return "Ya hay una tarifa para ese ambito y esa fecha."
    return "Ese registro ya existe."
  }
  if (code === "23514" && raw.includes("end_after_start")) {
    return "La hora de fin tiene que ser posterior a la de inicio."
  }
  if (code === "42501" || code === "PGRST301") {
    return raw.includes("autorizada")
      ? raw
      : "No tienes permisos para hacer eso."
  }

  // Acceso con Google
  const oauth: Record<string, string> = {
    "Unsupported provider": "El acceso con Google no esta activado en el servidor.",
    "provider is not enabled":
      "El acceso con Google no esta activado en el servidor.",
    access_denied: "Has cancelado el acceso con Google.",
    "enlace-invalido": "Ese enlace ya no vale. Pide uno nuevo.",
  }
  for (const [clave, es] of Object.entries(oauth)) {
    if (raw.includes(clave)) return es
  }

  // Supabase Auth
  const auth: Record<string, string> = {
    "Invalid login credentials": "Correo o contrasena incorrectos.",
    "Email not confirmed":
      "Tu correo esta sin confirmar. Revisa la bandeja de entrada.",
    "User already registered": "Ya existe una cuenta con ese correo. Inicia sesión.",
    "Password should be at least 6 characters":
      "La contrasena tiene que tener al menos 6 caracteres.",
    "Email rate limit exceeded":
      "Se ha superado el límite de correos. Espera unos minutos.",
    "Signups not allowed for this instance":
      "El registro esta cerrado. Pide a un administrador que te invite.",
  }
  for (const [en, es] of Object.entries(auth)) {
    if (raw.includes(en)) return es
  }

  if (raw.includes("Database error saving new user") || raw.includes("no esta autorizada")) {
    return "Esa dirección no esta autorizada. Pide a un administrador que te invite."
  }
  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
    return "No hay conexion con el servidor. Comprueba tu red."
  }

  return raw
}

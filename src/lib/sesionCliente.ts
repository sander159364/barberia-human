const CLAVE = "huaman_session_id";

export function obtenerSessionId(): string {
  let id = sessionStorage.getItem(CLAVE);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(CLAVE, id);
  }
  return id;
}
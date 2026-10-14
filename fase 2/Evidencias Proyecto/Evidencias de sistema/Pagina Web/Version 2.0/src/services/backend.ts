import "server-only";
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function backendRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const base = process.env.API_BASE_URL;
  if (!base) throw new ApiError(503, "API_BASE_URL no está configurada.");
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Ruta inválida.");
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      503,
      "No se pudo conectar al backend. Intenta nuevamente.",
    );
  }
  if (!response.ok) {
    let message =
      response.status === 401
        ? "La sesión no es válida."
        : response.status === 403
          ? "No tienes permiso para esta operación."
          : "No se pudo completar la solicitud.";
    // Only expose validated business messages, never internal errors or database diagnostics.
    if (response.status >= 400 && response.status < 500) {
      try {
        const data: unknown = await response.json();
        if (data && typeof data === "object" && "message" in data) {
          const m = data.message;
          if (typeof m === "string") message = m;
          else if (Array.isArray(m) && m.every((v) => typeof v === "string"))
            message = m.join(" ");
        }
      } catch {}
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

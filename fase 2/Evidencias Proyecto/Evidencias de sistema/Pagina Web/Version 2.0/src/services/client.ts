export class ClientError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    });
  } catch {
    throw new ClientError(503, "No se pudo conectar. Reintenta.");
  }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path.startsWith("/api/admin/"))
      window.dispatchEvent(new Event("serviciosya:expired"));
    throw new ClientError(
      response.status,
      typeof data.message === "string" ? data.message : "Ocurrió un error.",
    );
  }
  return data as T;
}

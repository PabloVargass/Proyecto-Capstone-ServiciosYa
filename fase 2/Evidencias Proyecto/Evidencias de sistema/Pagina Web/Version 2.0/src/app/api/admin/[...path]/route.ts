import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sameOrigin, sessionToken, SESSION_COOKIE } from "@/auth/session";
import { backendRequest, ApiError } from "@/services/backend";
const allowed: Record<string, RegExp> = {
  GET: /^(me|summary|roles|users(?:\/[a-zA-Z0-9-]+)?|jobs(?:\/[a-zA-Z0-9-]+)?|categories|reviews|audit)$/,
  POST: /^(users|categories|users\/[a-zA-Z0-9-]+\/invitation)$/,
  PATCH:
    /^(users\/[a-zA-Z0-9-]+(?:\/access)?|categories\/[a-zA-Z0-9-]+|(?:jobs|reviews)\/[a-zA-Z0-9-]+\/moderation)$/,
};
async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  if (request.method !== "GET" && !sameOrigin(request))
    return NextResponse.json(
      { message: "Origen no autorizado." },
      { status: 403 },
    );
  const path = (await context.params).path.join("/");
  if (!allowed[request.method]?.test(path))
    return NextResponse.json(
      { message: "Ruta no disponible." },
      { status: 404 },
    );
  const token = await sessionToken();
  if (!token)
    return NextResponse.json({ message: "Inicia sesión." }, { status: 401 });
  const search = new URLSearchParams();
  for (const [key, value] of new URL(request.url).searchParams)
    if (["q", "rol", "activo", "page"].includes(key)) search.set(key, value);
  try {
    const data = await backendRequest(
      `/admin/${path}?${search}`,
      {
        method: request.method,
        ...(request.method !== "GET"
          ? { body: JSON.stringify(await request.json()) }
          : {}),
      },
      token,
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      (await cookies()).delete(SESSION_COOKIE);
    return NextResponse.json(
      {
        message:
          error instanceof ApiError ? error.message : "Solicitud inválida.",
      },
      { status: error instanceof ApiError ? error.status : 400 },
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH };

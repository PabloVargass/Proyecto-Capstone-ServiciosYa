import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError, backendRequest } from "@/services/backend";
import type { User } from "@/types/admin";
export const SESSION_COOKIE = "serviciosya_admin";
export const sessionOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
};
export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
export async function requireAdmin(): Promise<User> {
  const token = await sessionToken();
  if (!token) redirect("/login");
  try {
    return await backendRequest<User>("/admin/me", {}, token);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      redirect("/login?expired=1");
    throw error;
  }
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

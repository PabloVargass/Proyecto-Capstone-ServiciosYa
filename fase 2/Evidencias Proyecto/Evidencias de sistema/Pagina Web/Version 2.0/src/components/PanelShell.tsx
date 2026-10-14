"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "./Brand";
import { request } from "@/services/client";
import type { User } from "@/types/admin";
const sections = [
  ["resumen", "Resumen"],
  ["usuarios", "Usuarios"],
  ["roles", "Roles"],
  ["trabajos", "Trabajos"],
  ["categorias", "Categorías"],
  ["resenas", "Calificaciones y comentarios"],
  ["auditoria", "Auditoría"],
];
export function PanelShell({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const expired = () => {
      router.replace("/login?expired=1");
      router.refresh();
    };
    window.addEventListener("serviciosya:expired", expired);
    return () => window.removeEventListener("serviciosya:expired", expired);
  }, [router]);
  async function logout() {
    setBusy(true);
    try {
      await request("/api/auth/logout", "POST");
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al salir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell">
      <aside>
        <Brand />
        <p className="eyebrow">Panel administrativo</p>
        <nav aria-label="Administración">
          {sections.map(([path, label]) => (
            <Link
              key={path}
              href={`/${path}`}
              aria-current={
                pathname.startsWith(`/${path}`) ? "page" : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="session">
          <strong>{user.nombre}</strong>
          <p>Administrador</p>
          <button disabled={busy} onClick={logout}>
            Cerrar sesión
          </button>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

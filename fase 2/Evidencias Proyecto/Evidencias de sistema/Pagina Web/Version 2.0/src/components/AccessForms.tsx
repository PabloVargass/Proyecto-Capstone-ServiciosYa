"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { request } from "@/services/client";
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await request("/api/auth/login", "POST", {
        email: f.get("email"),
        password: f.get("password"),
      });
      router.replace("/resumen");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de acceso.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <label>
        Correo electrónico
        <input name="email" type="email" required autoComplete="username" />
      </label>
      <label>
        Contraseña
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button disabled={busy}>{busy ? "Ingresando…" : "Iniciar sesión"}</button>
      <p>Acceso exclusivo para administradores.</p>
      <Link href="/activar">Activar una cuenta invitada</Link>
    </form>
  );
}
export function InvitationForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const result = await request<{ message: string }>(
        "/api/invitation",
        "POST",
        {
          correo: f.get("correo"),
          codigo: f.get("codigo"),
          password: f.get("password"),
        },
      );
      setMessage(result.message);
      e.currentTarget?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al activar.");
    } finally {
      setBusy(false);
    }
  }
  return message ? (
    <>
      <p role="status">{message}</p>
      <Link href="/login">Ir al acceso administrativo</Link>
      <p>
        Las cuentas invitadas se crean como usuarios comunes. Usa la app móvil
        hasta que un administrador te otorgue el permiso ADMIN.
      </p>
    </>
  ) : (
    <form onSubmit={submit}>
      <label>
        Correo
        <input name="correo" type="email" required autoComplete="email" />
      </label>
      <label>
        Código de invitación
        <input
          name="codigo"
          required
          minLength={64}
          maxLength={64}
          autoComplete="off"
        />
      </label>
      <label>
        Elige tu contraseña
        <input
          name="password"
          type="password"
          required
          minLength={6}
          maxLength={72}
          autoComplete="new-password"
        />
      </label>
      <p>La invitación vence en 24 horas y solo se usa una vez.</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button disabled={busy}>{busy ? "Activando…" : "Activar cuenta"}</button>
    </form>
  );
}

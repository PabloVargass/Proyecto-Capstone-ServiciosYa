"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="access">
      <section className="card">
        <h1>No se pudo abrir el panel</h1>
        <p>
          Comprueba la conexión con el backend y que tu cuenta conserve permisos
          administrativos. La sesión se conserva ante errores de red.
        </p>
        <button onClick={reset}>Reintentar</button>
        <p>
          <Link href="/login">Volver al acceso</Link>
        </p>
      </section>
    </main>
  );
}

import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/AccessForms";
export default function Login() {
  return (
    <main className="access">
      <section className="card">
        <Brand />
        <h1>Administración</h1>
        <p>Gestiona ServiciosYa con tu cuenta administradora.</p>
        <LoginForm />
      </section>
    </main>
  );
}

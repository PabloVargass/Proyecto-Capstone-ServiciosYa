import { Brand } from "@/components/Brand";
import { InvitationForm } from "@/components/AccessForms";
export default function Activate() {
  return (
    <main className="access">
      <section className="card">
        <Brand />
        <h1>Activa tu cuenta</h1>
        <InvitationForm />
      </section>
    </main>
  );
}

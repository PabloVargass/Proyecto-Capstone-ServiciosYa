"use client";
import Link from "next/link";
import type { User, Job } from "@/types/admin";
import { useResource, ResourceStatus, date } from "./Resource";
import { MutationButton } from "./MutationButton";
export function UserDetail({ id }: { id: string }) {
  const r = useResource<User>(`users/${id}`);
  return (
    <>
      <Link href="/usuarios">← Volver a usuarios</Link>
      <h1>Detalle de cuenta</h1>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <>
          <section className="panel">
            <h2>{r.data.nombre}</h2>
            <dl>
              <dt>Correo</dt>
              <dd>{r.data.correo}</dd>
              <dt>RUT</dt>
              <dd>{r.data.rut}</dd>
              <dt>Teléfono</dt>
              <dd>{r.data.telefono || "Sin teléfono"}</dd>
              <dt>Permiso</dt>
              <dd>{r.data.rol}</dd>
              <dt>Estado</dt>
              <dd>
                {r.data.activo ? "Activa" : "Inactiva"} ·{" "}
                {r.data.correoVerificadoEn
                  ? "Correo verificado"
                  : "Verificación pendiente"}
              </dd>
              <dt>Registro</dt>
              <dd>{date(r.data.creadoEn)}</dd>
              <dt>Actividad</dt>
              <dd>
                {r.data._count?.trabajos} trabajos ·{" "}
                {r.data._count?.postulaciones} postulaciones ·{" "}
                {r.data._count?.resenasRecibidas} reseñas recibidas
              </dd>
            </dl>
            <div className="actions">
              <MutationButton
                label="Editar información"
                path={`users/${id}`}
                fields={[
                  {
                    name: "nombre",
                    label: "Nombre",
                    value: r.data.nombre,
                    minLength: 3,
                    maxLength: 120,
                  },
                  {
                    name: "telefono",
                    label: "Teléfono",
                    value: r.data.telefono ?? "",
                    required: false,
                    pattern: "[0-9]{9}",
                  },
                ]}
                description="Actualiza el nombre y teléfono. El correo y RUT conservan su identidad verificada."
                onDone={r.reload}
              />
              <MutationButton
                label="Cambiar rol"
                path={`users/${id}/access`}
                fields={[
                  {
                    name: "rol",
                    label: "Permiso administrativo",
                    type: "select",
                    value: r.data.rol,
                    options: [
                      { value: "USUARIO", label: "Usuario" },
                      { value: "ADMIN", label: "Administrador" },
                    ],
                  },
                ]}
                description="Este cambio revoca las sesiones anteriores. ADMIN permite administrar usuarios y moderar contenidos. El servidor protege al último administrador activo y bloquea cambiar tu propio rol."
                onDone={r.reload}
              />
              <MutationButton
                label={r.data.activo ? "Desactivar cuenta" : "Activar cuenta"}
                path={`users/${id}/access`}
                payload={{ activo: !r.data.activo }}
                description="Se revocarán las sesiones anteriores. Los trabajos y postulaciones se conservarán sin cancelación automática."
                onDone={r.reload}
              />
              {!r.data.correoVerificadoEn && r.data.activo && (
                <MutationButton
                  label="Reenviar invitación"
                  path={`users/${id}/invitation`}
                  method="POST"
                  description="Invalida las invitaciones anteriores y envía una nueva al correo de esta cuenta."
                  onDone={r.reload}
                />
              )}
            </div>
          </section>
          <p>
            Para recuperar una cuenta verificada, su titular debe utilizar el
            flujo de recuperación existente en la app móvil.
          </p>
        </>
      )}
    </>
  );
}
export function JobDetail({ id }: { id: string }) {
  const r = useResource<Job>(`jobs/${id}`);
  return (
    <>
      <Link href="/trabajos">← Volver a trabajos</Link>
      <h1>Detalle de publicación</h1>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <>
          <section className="panel">
            <h2>{r.data.titulo}</h2>
            <p className="preserve">{r.data.descripcion}</p>
            <dl>
              <dt>Cliente</dt>
              <dd>{r.data.propietario.nombre}</dd>
              <dt>Categoría histórica</dt>
              <dd>{r.data.categoria}</dd>
              <dt>Comuna</dt>
              <dd>{r.data.comuna}</dd>
              <dt>Presupuesto</dt>
              <dd>
                {new Intl.NumberFormat("es-CL", {
                  style: "currency",
                  currency: "CLP",
                }).format(r.data.presupuesto)}
              </dd>
              <dt>Estado</dt>
              <dd>{r.data.estado}</dd>
              <dt>Visibilidad pública</dt>
              <dd>{r.data.oculto ? "Oculto" : "Visible"}</dd>
            </dl>
            <MutationButton
              label={
                r.data.oculto ? "Restaurar publicación" : "Ocultar publicación"
              }
              path={`jobs/${id}/moderation`}
              payload={{ oculto: !r.data.oculto }}
              description="Cambia la visibilidad pública y disponibilidad para nuevas postulaciones. Los participantes conservarán sus trabajos y contratos. No cambia el estado de contratación."
              onDone={r.reload}
            />
          </section>
          <section className="panel">
            <h2>Postulaciones</h2>
            {r.data.postulaciones?.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.data.postulaciones.map((p) => (
                      <tr key={p.id}>
                        <td>{p.usuario.nombre}</td>
                        <td>{p.estado}</td>
                        <td>{date(p.creadoEn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Esta publicación no tiene postulaciones.</p>
            )}
          </section>
          <p>
            La selección del trabajador corresponde al cliente. El panel no da
            acceso a conversaciones privadas.
          </p>
        </>
      )}
    </>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import type {
  Summary,
  User,
  Job,
  Category,
  Review,
  Audit,
  Role,
} from "@/types/admin";
import { useResource, ResourceStatus, Pagination, date } from "./Resource";
import { MutationButton } from "./MutationButton";
export function SummaryView() {
  const r = useResource<Summary>("summary");
  return (
    <>
      <h1>Resumen</h1>
      <p>Actividad real de ServiciosYa</p>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <>
          <div className="stats">
            {[
              ["Usuarios", r.data.usuarios],
              ["Cuentas activas", r.data.activos],
              ["Trabajos", r.data.trabajos],
              ["Postulaciones", r.data.postulaciones],
              ["Reseñas", r.data.resenas],
            ].map(([label, value]) => (
              <article key={label} className="tile">
                <p>{label}</p>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <section className="panel">
            <h2>Trabajos por estado</h2>
            {r.data.estados.length ? (
              r.data.estados.map((s) => (
                <p key={s.estado}>
                  <span className="badge">{s.estado}</span> {s._count._all}
                </p>
              ))
            ) : (
              <p>Todavía no hay trabajos.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
const inviteFields = [
  { name: "nombre", label: "Nombre", minLength: 3, maxLength: 120 },
  { name: "correo", label: "Correo electrónico", type: "email" as const },
  { name: "rut", label: "RUT" },
  { name: "telefono", label: "Teléfono (9 dígitos)", pattern: "[0-9]{9}" },
];
export function UsersView() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ q: "", rol: "", activo: "" });
  const query = new URLSearchParams({ ...filters, page: String(page) });
  const r = useResource<{ items: User[]; total: number }>(`users?${query}`);
  return (
    <>
      <div className="heading">
        <div>
          <h1>Usuarios</h1>
          <p>Cuentas, permisos y estado de acceso</p>
        </div>
        <MutationButton
          label="Crear usuario"
          path="users"
          method="POST"
          fields={inviteFields}
          description="Se creará una cuenta USUARIO pendiente y se enviará una invitación de uso único. El titular elegirá su contraseña. Si el correo falla, podrás reenviar desde su detalle."
          onDone={r.reload}
        />
      </div>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setPage(1);
          setFilters({
            q: String(f.get("q") ?? ""),
            rol: String(f.get("rol") ?? ""),
            activo: String(f.get("activo") ?? ""),
          });
        }}
      >
        <label>
          Buscar
          <input name="q" placeholder="Nombre, correo o RUT" maxLength={120} />
        </label>
        <label>
          Permiso
          <select name="rol">
            <option value="">Todos</option>
            <option value="USUARIO">Usuario</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>
        <label>
          Cuenta
          <select name="activo">
            <option value="">Todas</option>
            <option value="true">Activa</option>
            <option value="false">Inactiva</option>
          </select>
        </label>
        <button>Buscar</button>
      </form>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <>
          <p>{r.data.total} cuentas encontradas</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Permiso</th>
                  <th>Estado</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {r.data.items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.correo}</td>
                    <td>{u.rol}</td>
                    <td>
                      <span className="badge">
                        {u.activo ? "Activa" : "Inactiva"}
                      </span>
                      {!u.correoVerificadoEn && " · Pendiente"}
                    </td>
                    <td>
                      <Link href={`/usuarios/${u.id}`}>Ver cuenta</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!r.data.items.length && (
              <p className="empty">
                No hay cuentas que coincidan con estos filtros.
              </p>
            )}
          </div>
          <Pagination
            page={page}
            hasNext={page * 20 < r.data.total}
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}
export function RolesView() {
  const r = useResource<Role[]>("roles");
  return (
    <>
      <h1>Roles y permisos</h1>
      <p>
        Cliente y trabajador son formas de participar en los servicios; el
        permiso ADMIN es independiente.
      </p>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <div className="stats">
          {r.data.map((role) => (
            <article className="panel" key={role.codigo}>
              <h2>{role.nombre}</h2>
              <span className="badge">{role.codigo}</span>
              <p>{role.descripcion}</p>
            </article>
          ))}
        </div>
      )}
      <p>
        Para cambiar permisos, abre el detalle de una cuenta en{" "}
        <Link href="/usuarios">Usuarios</Link>. No puedes cambiar tu propio rol
        ni retirar el acceso al último administrador activo.
      </p>
    </>
  );
}
export function JobsView() {
  const [page, setPage] = useState(1);
  const r = useResource<Job[]>(`jobs?page=${page}`);
  return (
    <>
      <h1>Trabajos</h1>
      <p>
        Consulta publicaciones y postulaciones. La moderación conserva el estado
        de contratación.
      </p>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Publicación</th>
                  <th>Cliente</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Postulaciones</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {r.data.slice(0, 20).map((j) => (
                  <tr key={j.id}>
                    <td>
                      {j.titulo}
                      {j.oculto && <p className="badge">Oculto</p>}
                    </td>
                    <td>{j.propietario.nombre}</td>
                    <td>{j.categoria}</td>
                    <td>{j.estado}</td>
                    <td>{j._count?.postulaciones}</td>
                    <td>
                      <Link href={`/trabajos/${j.id}`}>Ver trabajo</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!r.data.length && <p className="empty">No hay publicaciones.</p>}
          </div>
          <Pagination
            page={page}
            hasNext={r.data.length > 20}
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}
export function CategoriesView() {
  const r = useResource<Category[]>("categories");
  return (
    <>
      <div className="heading">
        <div>
          <h1>Categorías</h1>
          <p>Los trabajos conservan su nombre histórico de categoría.</p>
        </div>
        <MutationButton
          label="Crear categoría"
          path="categories"
          method="POST"
          fields={[
            { name: "nombre", label: "Nombre", minLength: 2, maxLength: 100 },
          ]}
          description="Agrega una categoría activa al catálogo."
          onDone={r.reload}
        />
      </div>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Trabajos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {r.data.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td>{c.activo ? "Activa" : "Inactiva"}</td>
                  <td>{c._count.trabajos}</td>
                  <td>
                    <div className="actions">
                      <MutationButton
                        label="Editar"
                        path={`categories/${c.id}`}
                        fields={[
                          {
                            name: "nombre",
                            label: "Nombre",
                            value: c.nombre,
                            minLength: 2,
                            maxLength: 100,
                          },
                        ]}
                        description="El nuevo nombre se usará en el catálogo. Los trabajos existentes conservarán su texto histórico."
                        onDone={r.reload}
                      />
                      <MutationButton
                        label={c.activo ? "Desactivar" : "Activar"}
                        path={`categories/${c.id}`}
                        payload={{ nombre: c.nombre, activo: !c.activo }}
                        description={
                          c.activo
                            ? "Impedirá nuevos usos de la categoría y sus nombres anteriores; conservará los trabajos relacionados."
                            : "Permitirá utilizar nuevamente esta categoría."
                        }
                        onDone={r.reload}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!r.data.length && <p className="empty">No hay categorías.</p>}
        </div>
      )}
    </>
  );
}
export function ReviewsView() {
  const [page, setPage] = useState(1);
  const r = useResource<Review[]>(`reviews?page=${page}`);
  return (
    <>
      <h1>Calificaciones y comentarios</h1>
      <p>
        Ocultar una reseña la retira de los perfiles públicos y del promedio
        visible; conserva su registro.
      </p>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <>
          <div className="list">
            {r.data.slice(0, 20).map((review) => (
              <article className="panel" key={review.id}>
                <div className="heading">
                  <h2>
                    {review.puntuacion}/5 · {review.receptor.nombre}
                  </h2>
                  <span className="badge">
                    {review.oculta ? "Oculta" : "Visible"}
                  </span>
                </div>
                <p>{review.comentario || "Sin comentario"}</p>
                <p>
                  Por {review.autor.nombre} ·{" "}
                  <Link href={`/trabajos/${review.trabajo.id}`}>
                    {review.trabajo.titulo}
                  </Link>
                </p>
                <MutationButton
                  label={review.oculta ? "Restaurar reseña" : "Ocultar reseña"}
                  path={`reviews/${review.id}/moderation`}
                  payload={{ oculto: !review.oculta }}
                  description="Confirma el cambio de visibilidad. No se eliminará la reseña ni se cambiará su puntuación."
                  onDone={r.reload}
                />
              </article>
            ))}
          </div>
          {!r.data.length && <p>No hay reseñas.</p>}
          <Pagination
            page={page}
            hasNext={r.data.length > 20}
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}
export function AuditView() {
  const [page, setPage] = useState(1);
  const r = useResource<Audit[]>(`audit?page=${page}`);
  return (
    <>
      <h1>Auditoría</h1>
      <p>Quién realizó cada cambio, cuándo y sobre qué recurso.</p>
      <ResourceStatus {...r} retry={r.reload} />
      {r.data && !r.error && !r.loading && (
        <>
          <div className="list">
            {r.data.slice(0, 20).map((a) => (
              <article className="panel" key={a.id}>
                <h2>{a.accion}</h2>
                <p>
                  {a.actor.nombre} · {date(a.creadoEn)}
                </p>
                <p>
                  {a.recurso}: <code>{a.recursoId}</code>
                </p>
                <p>Motivo: {a.motivo}</p>
                <details>
                  <summary>Ver cambios registrados</summary>
                  <pre>{JSON.stringify(a.cambios, null, 2)}</pre>
                </details>
              </article>
            ))}
          </div>
          {!r.data.length && <p>No hay acciones registradas.</p>}
          <Pagination
            page={page}
            hasNext={r.data.length > 20}
            onPage={setPage}
          />
        </>
      )}
    </>
  );
}

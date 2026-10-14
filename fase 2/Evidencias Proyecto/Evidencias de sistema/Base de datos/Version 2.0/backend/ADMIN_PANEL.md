# Administración de ServiciosYa

El panel independiente está en `C:/proyectos/serviciosya-admin-web`. No cambia de base de datos ni duplica el backend. Las reglas USUARIO/ADMIN, desactivación sin cancelación automática, moderación de visibilidad, invitaciones y nombres históricos fueron aprobadas por el usuario.

## Migración aplicada con autorización del usuario

Archivo: `prisma/migrations/20261007010000_admin_panel/migration.sql`.

Aplicada mediante prisma migrate deploy y verificada con migrate status. El esquema está al día. Se conservaron cantidades de usuarios, trabajos, postulaciones, reseñas, conversaciones y mensajes, además de la huella de categorías y estados originales de los trabajos. Las cuentas existentes siguen activas con rol USUARIO; no se creó un administrador. Cliente Prisma regenerado.

- Usuario: `rol` (USUARIO por defecto), `activo` (true) y `versionSesion` (0). Los JWT móviles existentes sin versión se consideran versión 0 hasta una revocación.
- Trabajo: `oculto` (false) y relación opcional `categoriaId`. El campo `categoria` conserva su valor original.
- Resena: `oculta` (false); las reseñas ocultas dejan de aparecer en los perfiles y promedios públicos.
- Categoria y CategoriaNombre: catálogo y alias históricos. Se agrupan los nombres existentes sin distinguir mayúsculas, manteniendo intactos los textos de trabajos. No se eliminan categorías.
- InvitacionCuenta: código aleatorio de 256 bits guardado como SHA-256, expiración de 24 horas y consumo único transaccional. No se devuelve el código por API.
- AuditoriaAdministrativa: actor, fecha, acción, recurso, motivo y cambios limitados a campos explícitos; sin secretos. Se escribe en la transacción del cambio.

No hay DROP, borrado de datos, cambios a estados de contratación ni pérdida de claves originales. La migración agrega restricciones de integridad para proteger referencias. Requiere coordinar una actualización del backend: el código nuevo depende de los campos nuevos y no debe ejecutarse sobre el esquema anterior. Revisar copia de seguridad y disponibilidad antes de aplicarla; PostgreSQL puede bloquear brevemente tablas durante ALTER TABLE.

Comandos utilizados para la actualización autorizada:

```powershell
cd C:\proyectos\capstone-servicios\backend
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

Recuperación: ante un problema, detener el backend nuevo y conservar la base con sus campos adicionales; una versión anterior del backend puede ignorar esos campos. No revertir con DROP ni migrate reset, porque eliminaría auditoría y cambios administrativos. Si la migración fallara, revisar el estado de Prisma y el respaldo antes de resolverla. Las nuevas reglas de bloqueo y moderación requieren el backend nuevo; una reversión de código debe tratarse como una operación coordinada para no reautorizar cuentas bloqueadas.

## Primer administrador

Registrar una cuenta local y verificar el correo desde la app existente. Tras aplicar la migración, ejecutar `npm run admin:bootstrap -- correo-verificado`, revisar la cuenta y escribir PROMOVER. El comando compila y ejecuta un script local; se niega si ya existe cualquier ADMIN. Exige cuenta activa, verificada y con contraseña local. No cambia ni solicita la contraseña. Promoción, revocación de sesiones anteriores y auditoría ocurren en una transacción. No hay endpoint público de promoción.

Administradores posteriores se designan desde el panel con sesión administrativa vigente, motivo y confirmación. Un administrador no cambia su propio rol. El último administrador activo se protege mediante transacción Serializable y un advisory lock compartido por operaciones administrativas y bootstrap; conflictos de concurrencia devuelven 409 para reintentar.

## Contratos principales

`POST /admin-auth/login` reutiliza AuthService y solo entrega la sesión si el usuario es ADMIN activo.
`POST /admin-auth/accept-invitation` consume una invitación válida y permite elegir contraseña; no acepta roles.

Todas las rutas `/admin` llevan JwtAuthGuard y AdminGuard. El primero verifica firma, expiración, propósito, cuenta activa y versión de sesión en la base actual. El segundo verifica el rol actual; un claim ADMIN en un JWT no otorga permiso.

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | /admin/me | Cuenta administrativa actual |
| POST | /admin/logout | Revoca las sesiones de la cuenta y audita |
| GET | /admin/summary | Estadísticas reales |
| GET | /admin/roles | Permisos disponibles |
| GET | /admin/users?q=&rol=&activo=&page= | Usuarios filtrados, 20 por página |
| GET | /admin/users/:id | Detalle sin secretos |
| POST | /admin/users | Cuenta USUARIO pendiente e invitación |
| PATCH | /admin/users/:id | Nombre/teléfono y motivo |
| PATCH | /admin/users/:id/access | Rol/activo y motivo; revoca sesiones |
| POST | /admin/users/:id/invitation | Reenvía invitación e invalida anteriores |
| GET | /admin/jobs | Publicaciones paginadas |
| GET | /admin/jobs/:id | Detalle y postulaciones, sin mensajes |
| PATCH | /admin/jobs/:id/moderation | Ocultar/restaurar y motivo |
| GET | /admin/categories | Catálogo y cantidad de trabajos |
| POST/PATCH | /admin/categories[/:id] | Crear/editar nombre/activo y motivo |
| GET | /admin/reviews | Reseñas paginadas |
| PATCH | /admin/reviews/:id/moderation | Ocultar/restaurar y motivo |
| GET | /admin/audit | Auditoría paginada |

Trabajos/reseñas/auditoría devuelven hasta 21 elementos para indicar si existe página siguiente; la web muestra 20. No hay borrado administrativo ni rutas de acceso a conversaciones.

La única modificación móvil es enviar el JWT existente al consultar el detalle del trabajo, para conservar el acceso de participantes cuando una publicación esté oculta. No cambia estilos, texto ni distribución. Los listados públicos excluyen trabajos ocultos; Mis trabajos conserva los contratos y postulaciones. La entrada de categoría sigue siendo texto libre; un nombre nuevo genera una categoría activa y un alias, y una categoría desactivada bloquea sus nombres actuales y anteriores.

## Verificación y límites

`npm test -- --runInBand admin-security admin-rules admin-moderation` usa un servidor Nest de prueba con repositorios y correo aislados. Comprueba rechazo de usuarios comunes en todos los endpoints administrativos, 401/403, versiones revocadas, token de recuperación inválido para sesión, rechazo de escalamiento por invitación, último administrador y acceso a trabajos moderados. No demuestra concurrencia real en PostgreSQL ni envío real de correo: quedan pendientes de un entorno y cuentas de prueba aprobados. Tampoco se ejecuta el script de primer administrador sin elegir la cuenta real.

En móvil se conservan las pruebas existentes `node scripts/test-my-jobs.cjs`. La verificación visual cubre acceso y activación del panel; pantallas con datos requieren la migración y una sesión de prueba. No se ha desplegado.


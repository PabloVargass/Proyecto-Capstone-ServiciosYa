# ServiciosYa — Panel de administración

Frontend independiente Next.js 16.4 + TypeScript. Consume exclusivamente el backend NestJS existente. No contiene Prisma ni una base propia. Colores, tipografía y radios provienen del tema de la app móvil.

## Iniciar

Backend, en otra terminal:

```powershell
cd C:\proyectos\capstone-servicios\backend
npm run start:dev
```

Web:

```powershell
cd C:\proyectos\serviciosya-admin-web
npm install
npm run dev
```

Abrir http://localhost:3001/login. `.env.local` ya contiene `API_BASE_URL=http://localhost:3000`. Cambiarlo solamente si el backend escucha en otra dirección; reiniciar Next.js después. La variable es del servidor, no lleva el prefijo NEXT_PUBLIC. Nunca copiar DATABASE_URL, JWT_SECRET ni credenciales de correo al frontend.

## Base de datos — migración aplicada y verificada

La migración aditiva del backend está preparada en `prisma/migrations/20261007010000_admin_panel/migration.sql`. Agrega rol, estado activo y versión de sesión a Usuario; visibilidad a Trabajo y Resena; categorías, sus nombres históricos, invitaciones y auditoría. No elimina registros ni altera estados de contratación. Los usuarios existentes quedan activos con permiso USUARIO y las publicaciones y reseñas siguen visibles.

**La migración ya se aplicó con autorización del usuario. Prisma confirmó que la base está al día y se verificaron cantidades y categorías/estados originales sin cambios.** Coordinar actualización y reinicio del backend, respaldar previamente la base y revisar el SQL. Comandos de actualización (migración ya aplicada):

```powershell
cd C:\proyectos\capstone-servicios\backend
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

No usar migrate reset ni db push. Consultar `backend/ADMIN_PANEL.md` para alcance, compatibilidad y recuperación.

## Primer administrador

1. Registrar y verificar una cuenta local mediante la app existente. Debe estar activa y tener contraseña local.
2. Después de aplicar la migración, desde la máquina del backend ejecutar:

```powershell
cd C:\proyectos\capstone-servicios\backend
npm run admin:bootstrap -- tu-correo-verificado
```

3. Revisar el correo mostrado y escribir PROMOVER en la terminal. El script se niega a operar si ya existe un administrador, utiliza una transacción y registra la promoción. No recibe ni cambia contraseñas.
4. Iniciar una sesión nueva en http://localhost:3001/login. Los administradores adicionales se designan desde Usuarios; el servidor impide cambiar el propio rol o quitar el acceso al último administrador activo.

El script no se ha ejecutado: requiere seleccionar la cuenta real.

## Funciones

- Acceso exclusivo para administradores y cierre con revocación de sesiones de esa cuenta.
- Resumen con estadísticas reales de usuarios, cuentas activas, trabajos por estado, postulaciones y reseñas.
- Usuarios: búsqueda por nombre/correo/RUT, filtros, paginación, detalle, edición de nombre/teléfono, activación, desactivación y permisos. Correo/RUT mantienen su identidad verificada.
- Crear cuenta: invitación por correo de uso único, código aleatorio de 256 bits almacenado como hash, vencimiento de 24 horas. El titular activa en `/activar` y elige su contraseña; se usa bcrypt con costo 12, como el backend original. No se crean administradores automáticamente. Si falla el correo, la cuenta queda pendiente y su invitación se puede reenviar.
- Roles USUARIO y ADMIN independientes de participar como cliente o trabajador. ADMIN exige correo verificado y contraseña local para acceder a este panel.
- Trabajos: publicaciones, detalle y postulaciones. Ocultar/restaurar conserva los contratos y sus estados; los participantes autenticados conservan el detalle. No hay acceso administrativo a chats privados.
- Categorías: crear, renombrar y activar/desactivar. Se conserva el texto histórico en los trabajos, y los nombres anteriores siguen asociados a la categoría. Desactivar bloquea nuevos usos, incluyendo nombres anteriores. Se mantiene la entrada libre de categorías de la app móvil; un nuevo nombre forma una categoría activa.
- Reseñas: consultar y ocultar/restaurar. Las ocultas no aparecen en perfiles públicos ni en el promedio visible.
- Auditoría: actor, fecha, recurso, motivo y cambios; sin contraseñas, hashes de acceso o tokens.

Toda operación administrativa se autoriza en NestJS. Retirar permisos o desactivar incrementa la versión de sesión; los JWT anteriores dejan de funcionar. La desactivación no cancela trabajos ni postulaciones. Requieren confirmación y motivo los cambios desde el panel.

## Comprobaciones

```powershell
npm run typecheck
npm run lint
npm run build
```

Backend:

```powershell
npm run build
npm test -- --runInBand admin-security admin-rules admin-moderation
```

Las pruebas HTTP y de reglas son aisladas, no usan la base real ni envían correos. Las pruebas de concurrencia real de PostgreSQL, envío real de invitaciones y recorrido completo con usuarios de prueba quedan pendientes del entorno aprobado. El navegador permitió revisar acceso y activación; no se ingresaron credenciales reales.

Prueba manual después de aplicar la migración y crear el administrador: acceder y salir; buscar usuarios y abrir detalle; invitar y activar una cuenta de prueba; rechazar acceso al panel con esa cuenta común; promover un segundo administrador verificado; comprobar desactivación y revocación de sesiones; probar ocultar/restaurar contenido y revisar auditoría; comprobar categorías sin alterar textos históricos. En móvil: login, Mis trabajos con y sin datos, detalle y volver; errores de red y permisos conservan una sesión válida.

La auditoría npm mantiene cinco alertas altas en dependencias de desarrollo de ESLint. Next.js fue actualizado y la alerta crítica inicial desapareció. No se ha publicado el panel.

### Resultado de esta implementación

Pasaron typecheck, lint y build de la web; validación del esquema Prisma, compilación del backend y lint de código nuevo; 46 pruebas aisladas de administración y 7 pruebas existentes de Mis trabajos. La ruta /usuarios sin sesión redirigió a /login en el navegador. El comando de primer administrador se comprobó sin argumentos y terminó mostrando su uso, sin consultar ni modificar datos.

La comprobación de tipos del móvil reportó errores en animated-icon.tsx, app-tabs.tsx, app-tabs.web.tsx y ui/collapsible.tsx, archivos que no se modificaron en esta tarea. La modificación de detalle de trabajo conserva exactamente la pantalla y agrega solamente recuperación y envío del JWT. No se abrió la app móvil en un emulador.

Las restricciones SQL de categorías comparan nombres sin distinguir mayúsculas. El código toma un bloqueo compartido de categoría al publicar para que una desactivación concurrente no permita nuevos usos después del cambio. La migración está envuelta en una transacción. La ejecución ya está completada; la verificación de concurrencia real sigue pendiente.

Cerrar sesión desde el panel revoca las sesiones de esa cuenta, incluidas las móviles. La cuenta permanece activa y puede volver a iniciar sesión.


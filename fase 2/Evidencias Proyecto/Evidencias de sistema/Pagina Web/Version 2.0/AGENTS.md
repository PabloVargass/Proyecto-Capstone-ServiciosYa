# ServiciosYa — Panel administrativo

Aplicar las reglas de C:/proyectos/capstone-servicios/AGENTS.md junto con estas reglas.
Proyecto Next.js independiente. Consumir exclusivamente el backend NestJS compartido; no crear otra base de datos ni backend de negocio.
Separar páginas, componentes, estilos, autenticación y servicios. Mantener TypeScript estricto.
Usar API_BASE_URL en el servidor; no exponer JWT ni guardarlos en localStorage. Cookies HttpOnly, SameSite y Secure en producción.
Verificar autorización vigente en NestJS para cada operación. Cliente/trabajador no equivalen a permisos administrativos.
No leer conversaciones privadas. No devolver hashes, contraseñas, códigos ni tokens en vistas o auditoría.
Confirmar roles, desactivaciones y moderación dentro del panel. Proteger al último administrador activo también ante concurrencia.
Auditar cambios en la misma transacción que la operación. Nunca borrar usuarios o categorías relacionados.
Conservar tema y tipografía de mobile/src/constants/app-theme.ts y mobile/src/global.css. Reutilizar la marca existente.
No implementar reglas de moderación o invitación sin la decisión del usuario. No ejecutar migraciones ni enviar correos de prueba a usuarios reales.
Antes de editar, revisar cambios existentes. Antes de entregar, ejecutar typecheck, lint y build; probar permisos en un entorno seguro y declarar comprobaciones pendientes.
Leer la documentación instalada en node_modules/next/dist/docs antes de usar APIs de Next.js.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

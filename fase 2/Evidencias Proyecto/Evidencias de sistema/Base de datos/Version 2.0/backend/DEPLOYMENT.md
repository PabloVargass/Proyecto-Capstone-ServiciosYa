# Despliegue de ServiciosYa

El backend todavía no tiene un alojamiento configurado. Neon aloja PostgreSQL;
no ejecuta esta API NestJS. No subir `.env`, `.temp` ni respaldos.

## Construcción y arranque

Ejecutar desde la carpeta `backend`, con las dependencias de desarrollo disponibles
durante la construcción:

```sh
npm ci
npm run prisma:generate
npm run build
npm run start:prod
```

Prisma genera su cliente en `generated/prisma`; ese cliente debe generarse antes
del build. El archivo ejecutable compilado es `dist/src/main.js`.
El servicio usa el puerto de `PORT` y necesita una URL HTTPS proporcionada por
el alojamiento. `GET /` puede comprobar el arranque, pero no acredita el flujo
de login ni una consulta a PostgreSQL.

## Variables

Consultar `.env.example`. Guardar DATABASE_URL, JWT_SECRET y las credenciales de
correo exclusivamente en el backend, mediante el gestor de secretos del proveedor.
El correo utiliza Gmail mediante Nodemailer: verificar que el alojamiento permita
SMTP antes de elegirlo. Sin las variables de correo el backend no arranca.
GOOGLE_CLIENT_ID es necesario si se valida el login con Google.

## Base de datos

La base trasladada a Neon ya tiene las diez migraciones existentes. Verificar
`npx prisma migrate status` contra el destino autorizado antes de publicar.
No incluir `migrate dev`, `db push`, resets, seeds ni el bootstrap administrativo
en el arranque. Si aparecen migraciones pendientes, revisar su SQL y autorizar
su aplicación en el destino antes de ejecutar `prisma migrate deploy`.

## Pendientes antes de publicación pública

- La ruta pública `GET /users/:id` devuelve únicamente ID, nombre y fechas.
  `GET /users/me` mantiene el perfil privado con JWT y `/users/:id/perfil` el público.
- Definir proveedor, cuenta, coste aceptado y origen HTTPS del panel para CORS.
- Confirmar envío de correos de verificación, recuperación e invitación.
- Configurar el panel con API_BASE_URL y el móvil con la URL HTTPS de esta API.
- Validar login real, permisos autorizados y denegados y consultas a Neon en la nube.

No se ha publicado ningún servicio ni contratado un plan.

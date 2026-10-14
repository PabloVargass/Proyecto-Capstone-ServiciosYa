# ServiciosYa — Evidencias de sistema, Version 2.0

Copia del código local del 14 de octubre de 2026.

- Aplicacion movil/Version 2.0: aplicación React Native y Expo, código fuente, recursos y lockfile. No incluye APK ni carpetas nativas generadas.
- Pagina Web/Version 2.0: administración Next.js, código fuente y lockfile.
- Base de datos/Version 2.0: esquema Prisma, migraciones, backend NestJS compartido y catálogo inicial de 39 categorías. No es un respaldo de registros personales.

Se excluyen dependencias instaladas, compilaciones, archivos de entorno privados, datos de ejecución, documentos de identidad y cuentas de prueba. Las versiones 2.0 son etiquetas de esta entrega; se conservan las versiones de los manifiestos originales.

## Preparación

1. En Base de datos/Version 2.0/backend ejecutar npm ci. Completar la configuración privada del backend según su README. Ejecutar npm run prisma:generate; aplicar migraciones solo a una base de desarrollo autorizada mediante npx prisma migrate deploy.
2. En esa base ejecutar catalogo/categorias-sugeridas.sql para registrar el catálogo sin alterar las categorías existentes. Configurar .env.development.local según scripts/start-development.cjs y ejecutar npm run start:dev.
3. En Aplicacion movil/Version 2.0 ejecutar npm ci, configurar .env.local desde .env.example y ejecutar npx expo start. El ejemplo de URL corresponde al emulador Android.
4. En Pagina Web/Version 2.0 ejecutar npm ci, configurar .env.local desde .env.example y ejecutar npm run dev.

## Validación

Se verificó la copia de los archivos y la exclusión de secretos antes de publicar. Las 39 categorías fueron verificadas en la base de desarrollo durante esta sesión. No se realizó una instalación nueva ni una prueba completa del sistema desde estas carpetas de evidencia. Los servicios locales se cerraron a petición del usuario.

# Guía de Despliegue en Render.com

Este documento detalla cómo desplegar el backend (Fastify + Prisma + Supabase) en Render.

## Requisitos Previos

1. Cuenta en [Render.com](https://render.com/).
2. Cuenta en [GitHub](https://github.com/) con el código subido a un repositorio.
3. Proyecto en [Supabase](https://supabase.com/) activo.

## Configuración en Render

1. **Crear nuevo Web Service**:
   - Conecta tu repositorio de GitHub.
   - Selecciona el repositorio `pos-android-supabase` (o como lo hayas nombrado).

2. **Configuración del Servicio**:
   - **Name**: `sistema-pos-api` (o tu preferencia)
   - **Region**: Elige la más cercana a tus usuarios (ej. Oregon, Frankfurt).
   - **Branch**: `main` (o tu rama principal).
   - **Root Directory**: `backend-api` (IMPORTANTE: el código del backend está en esta subcarpeta).
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate`
   - **Start Command**: `npm start`

3. **Variables de Entorno (Environment Variables)**:
   Debes agregar las siguientes variables en la sección "Environment" de Render:

   | Clave | Valor (Ejemplo / Instrucción) |
   |-------|-------------------------------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Copia la "Connection String" (URI) desde Supabase -> Settings -> Database -> Connection string (Nodejs). Reemplaza `[YOUR-PASSWORD]` con tu contraseña real. **Usa el puerto 6543 (Transaction Pooler) para mejor rendimiento en serverless, o 5432 (Session) si prefieres directo.** |
   | `JWT_SECRETO` | Genera una cadena larga y segura. |
   | `SUPABASE_URL` | `https://lczrzowgimhtwvpsuagi.supabase.co` |
   | `SUPABASE_KEY` | Tu `anon public key` de Supabase. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Tu `service_role secret` de Supabase. |
   | `ADMIN_CORREO` | Correo del administrador inicial. |
   | `ADMIN_PASSWORD` | Contraseña del administrador inicial. |

## Notas Importantes sobre Prisma y Supabase en Render

- **Migraciones**: En producción, no es recomendable ejecutar `prisma migrate dev`. Lo ideal es ejecutar las migraciones desde tu entorno local o CI/CD antes de desplegar.
  - Sin embargo, para la primera vez, puedes agregar al Build Command: `npm install && npx prisma migrate deploy && npx prisma generate`.
  - El comando `prisma migrate deploy` aplica las migraciones pendientes sin resetear la base de datos.

- **Conexión Pooling**: Si usas Supabase, se recomienda usar la URL del **Connection Pooler** (puerto 6543) en la variable `DATABASE_URL` para evitar agotar las conexiones de Postgres, especialmente si Render escala horizontalmente. Agrega `?pgbouncer=true` al final de la URL si usas el modo transacción.

## Verificación

Una vez desplegado, Render te dará una URL (ej. `https://sistema-pos-api.onrender.com`).
Puedes probar el estado accediendo a: `https://sistema-pos-api.onrender.com/salud`.

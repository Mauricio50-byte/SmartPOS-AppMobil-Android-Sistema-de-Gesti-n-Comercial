# Guía de Migración a Supabase

Hemos configurado el backend para utilizar Supabase como base de datos PostgreSQL.

## Estado Actual

- **Configuración**: Archivos `.env` y `src/configuracion/entorno.js` actualizados con las credenciales de Supabase.
- **Prisma**: Configurado para conectarse a Supabase (`db.lczrzowgimhtwvpsuagi.supabase.co`).
- **Cliente Supabase**: SDK `@supabase/supabase-js` instalado e inicializado en `src/infraestructura/supabase.js`.

## Problema Pendiente

Durante la configuración automática, detectamos un error de conexión con el servidor de base de datos:
`Error: P1001: Can't reach database server at db.lczrzowgimhtwvpsuagi.supabase.co:5432`

Esto suele ocurrir por una de las siguientes razones:
1. **Proyecto Pausado**: Si el proyecto en Supabase lleva inactivo un tiempo, entra en pausa. Debes reactivarlo desde el dashboard de Supabase.
2. **DNS**: El subdominio `db` a veces tarda en propagarse o requiere configuración específica si usas Connection Pooling (`aws-0-us-east-1.pooler.supabase.com`).
3. **Credenciales**: Verificamos la clave `SmartPOS AppMobil Android`, asegúrate de que sea correcta (si contiene espacios, ya la hemos codificado correctamente en la URL, pero verifica que sea la contraseña de la base de datos y no el nombre del proyecto).

## Pasos para finalizar

1. **Verificar Proyecto**: Entra a [Supabase Dashboard](https://supabase.com/dashboard/project/lczrzowgimhtwvpsuagi) y asegúrate de que el proyecto esté "Active" (verde).
2. **Ejecutar Migración**: Una vez el proyecto esté activo, ejecuta en la terminal del backend:
   ```bash
   npx prisma migrate dev --name init_supabase
   ```
   Esto creará todas las tablas (Usuario, Venta, Producto, etc.) en tu base de datos de Supabase.

3. **Iniciar Servidor**:
   ```bash
   npm run dev
   ```

## Autenticación

El sistema está configurado para seguir usando el login actual (email/password propios) pero guardando los usuarios en Supabase.
Si deseas usar **Supabase Auth** (Social Login, Magic Links, etc.), se requiere una integración adicional en el Frontend para usar `supabase.auth.signIn...` y validar el token en el backend.

## Archivos Clave Modificados

- `backend-api/.env`: Contiene `DATABASE_URL` y keys de Supabase.
- `backend-api/prisma/schema.prisma`: Definición de tablas.
- `backend-api/src/configuracion/entorno.js`: Variables de entorno.
- `backend-api/src/infraestructura/bd.js`: Conexión Prisma -> Supabase.

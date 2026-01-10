# Plan de Implementación Multi-Tenant – SmartPOS

Este documento detalla el plan de trabajo paso a paso para transformar el sistema a una arquitectura Multi-Tenant, basándose en la arquitectura definida.

---

## 📅 Fase 1: Base de Datos y Seguridad (Supabase)

Esta es la fase crítica donde se establecen los cimientos del aislamiento de datos.

### 1.1. Crear Tabla `negocios`
- [ ] Crear tabla `negocios` con:
  - `id` (UUID, Primary Key, default gen_random_uuid())
  - `nombre` (Text, Not Null)
  - `created_at` (Timestamp)
  - `activo` (Boolean, default true)
- [ ] Habilitar RLS en `negocios`.
- [ ] Crear política RLS de lectura: Un usuario solo puede ver su propio negocio.

### 1.2. Crear/Adaptar Tabla `usuarios` (Perfil Público)
- [ ] Asegurar existencia de tabla `public.usuarios` vinculada a `auth.users`.
- [ ] Añadir columnas necesarias:
  - `negocio_id` (UUID, FK -> negocios.id, Not Null)
  - `rol` (Text: 'ADMIN' | 'TRABAJADOR')
  - `nombre`, `email`, `activo`.
- [ ] Habilitar RLS en `usuarios`.
- [ ] Crear políticas RLS:
  - **Lectura**: Ver usuarios del mismo `negocio_id`.
  - **Escritura**: Solo ADMIN puede crear/editar usuarios de su mismo `negocio_id`.

### 1.3. Función Helper para `negocio_id`
- [ ] Crear función Database Function `get_my_negocio_id()` que devuelva el `negocio_id` del usuario autenticado actual. Esto simplificará las políticas RLS futuras.

---

## 🔄 Fase 2: Automatización y Registro (Backend)

Configurar cómo se crean los tenants automáticamente cuando alguien se registra.

### 2.1. Trigger de Registro de Dueño
- [ ] Crear función Trigger que se ejecute **after insert** en `auth.users`.
- [ ] Lógica del Trigger:
  1. Si es el primer usuario (registro público), crear un nuevo registro en `negocios` (usando metadata del registro o un nombre default).
  2. Insertar en `public.usuarios` con el `negocio_id` creado y rol `ADMIN`.

### 2.2. Gestión de Invitación/Creación de Trabajadores
- [ ] Definir flujo para crear trabajadores:
  - Opción A: El ADMIN crea el usuario directamente (requiere función RPC `create_user_worker` con `auth.admin.createUser`).
  - Opción B: El trabajador se registra y necesita un código de invitación (más complejo).
  - *Recomendación*: Usar Opción A (RPC) para control total del ADMIN.

---

## 🗄️ Fase 3: Migración de Tablas Operativas

Adaptar todas las tablas existentes del sistema para que pertenezcan a un negocio.

### 3.1. Añadir `negocio_id`
- [ ] Identificar todas las tablas (Productos, Clientes, Ventas, Inventario, etc.).
- [ ] Ejecutar script para añadir columna `negocio_id` a todas.
- [ ] Establecer Foreign Key hacia `negocios(id)`.

### 3.2. Implementar RLS en Todas las Tablas
- [ ] Habilitar RLS en cada tabla.
- [ ] Crear política "Tenant Isolation" en cada tabla:
  ```sql
  -- Ejemplo conceptual
  USING (negocio_id = (select negocio_id from public.usuarios where auth_user_id = auth.uid()))
  ```
  *(O usar la función helper creada en 1.3)*.

---

## 💻 Fase 4: Frontend - Autenticación y Contexto

Adaptar la aplicación móvil para manejar el contexto del negocio.

### 4.1. Adaptar Registro (Sign Up)
- [ ] Modificar formulario de registro para pedir "Nombre del Negocio".
- [ ] Enviar nombre del negocio en los metadatos del registro de Supabase (`options.data.business_name`).

### 4.2. Servicio de Usuario (State Management)
- [ ] Actualizar `AuthService` o `UsuarioService`.
- [ ] Al hacer login, recuperar no solo el usuario de `auth`, sino también el perfil de `public.usuarios`.
- [ ] Almacenar `negocio_id` y `rol` en el estado global (Signal/BehaviorSubject) para uso en la app.

### 4.3. Protección de Rutas (Guards)
- [ ] Verificar que los Guards actuales comprueben el rol (`ADMIN` vs `TRABAJADOR`) basándose en el campo de la base de datos, no solo en la sesión.

---

## 🛠️ Fase 5: Frontend - Gestión de Usuarios

La pantalla que acabamos de mejorar visualmente necesita lógica real multi-tenant.

### 5.1. Adaptar "Gestión de Usuarios"
- [ ] Asegurar que el listado de usuarios filtra automáticamente por el negocio (gracias a RLS).
- [ ] Modificar la creación de usuario:
  - Al crear un usuario, asignar automáticamente el `negocio_id` del ADMIN actual.
  - Llamar a la Cloud Function / RPC para crear el usuario en `auth` y en `public`.

---

## ✅ Fase 6: Validación Final

### 6.1. Pruebas de Aislamiento
- [ ] Crear Negocio A (Usuario A). Crear Producto A.
- [ ] Crear Negocio B (Usuario B). Verificar que NO ve Producto A.
- [ ] Crear Trabajador para Negocio A. Verificar que ve Producto A pero NO puede borrarlo (si el rol lo impide).

### 6.2. Pruebas de Flujo
- [ ] Registro completo -> Creación de negocio automática.
- [ ] Login -> Carga correcta de datos.
- [ ] CRUD operativo dentro del tenant.

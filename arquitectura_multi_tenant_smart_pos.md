# Arquitectura Multi-Tenant – SmartPOS

## 📌 Objetivo
Evolucionar el sistema **SmartPOS App Móvil Android** de un modelo **single-tenant** (un cliente por base de datos) a un modelo **multi-tenant**, donde **una sola instancia de Supabase y una sola base de datos** soporten **múltiples negocios (clientes)** de forma segura y escalable.

Cada negocio será completamente independiente a nivel de datos, usuarios y operaciones, aunque compartan la misma infraestructura.

---

## 🧠 Concepto Clave: Multi-Tenant por Negocio

- Cada **negocio** representa un *tenant*
- Todos los usuarios pertenecen a **un solo negocio**
- Ningún usuario puede acceder a información de otro negocio
- El aislamiento se garantiza mediante:
  - `negocio_id`
  - Row Level Security (RLS) en Supabase

---

## 🏗️ Modelo de Datos Propuesto

### 1️⃣ Tabla `negocios`
Representa a cada cliente del sistema.

```sql
negocios
- id (uuid, PK)
- nombre
- created_at
- activo
```

Ejemplos:
- Tienda Juan
- Super María

---

### 2️⃣ Tabla `usuarios`
Relaciona los usuarios autenticados con un negocio.

```sql
usuarios
- id (uuid, PK)
- auth_user_id (uuid, FK -> auth.users.id)
- negocio_id (uuid, FK -> negocios.id)
- rol (ADMIN | TRABAJADOR)
- nombre
- email
- activo
- created_at
```

🔑 **Clave del sistema:** `negocio_id`

---

### 3️⃣ Tablas operativas (todas deben incluir `negocio_id`)

Ejemplos:

```sql
productos
- id
- negocio_id
- nombre
- precio
- stock
```

```sql
ventas
- id
- negocio_id
- usuario_id
- total
- fecha
```

📌 **Regla obligatoria:**
> Toda tabla funcional del sistema debe incluir `negocio_id`

---

## 🔐 Seguridad y Aislamiento de Datos

### Row Level Security (RLS)

Todas las tablas deben tener políticas que permitan:

- Leer solo registros del negocio del usuario autenticado
- Insertar datos únicamente asociados a su negocio
- Actualizar y eliminar solo datos de su negocio

Concepto base:

```sql
negocio_id = negocio_del_usuario_autenticado
```

Esto evita completamente el acceso cruzado entre negocios.

---

## 🔄 Flujo del Sistema

### 1️⃣ Registro de Negocio

1. El dueño se registra en Supabase Auth (email y contraseña)
2. Registra su negocio (nombre del negocio)
3. El sistema automáticamente:
   - Crea el negocio
   - Crea el usuario asociado
   - Le asigna el rol **ADMIN**

📌 Este usuario es el **administrador por defecto del negocio**

---

### 2️⃣ Inicio de Sesión

1. Usuario inicia sesión
2. Se obtiene su información en la tabla `usuarios`
3. Se carga:
   - `negocio_id`
   - `rol`
4. Toda la sesión queda ligada a ese negocio

---

### 3️⃣ Gestión de Trabajadores

Solo el **ADMIN** puede:

- Registrar trabajadores
- Asignarlos a su negocio
- Definir su rol

```text
ADMIN (Negocio X)
 ├── Trabajador 1
 ├── Trabajador 2
 └── Trabajador 3
```

Restricciones:
- Un trabajador no puede ver otros negocios
- Un trabajador no puede cambiar de negocio
- Un trabajador solo accede a los módulos permitidos

---

## 👥 Roles del Sistema

### ADMIN
- Acceso total al negocio
- Gestión de usuarios
- Configuración del sistema
- Acceso a reportes

### TRABAJADOR
- Acceso limitado
- Operaciones del día a día
- Sin acceso a configuración ni usuarios

---

## ✅ Ventajas de esta Arquitectura

✔️ Una sola base de datos
✔️ Escalable
✔️ Fácil mantenimiento
✔️ Reducción de costos
✔️ Ideal para modelo SaaS
✔️ Seguridad por diseño

---

## 🚀 Proyección Futura

Este modelo permite:

- Vender el sistema a múltiples clientes
- Agregar planes por negocio
- Limitar usuarios por suscripción
- Activar/desactivar negocios
- Escalar horizontalmente sin rediseño

---

## 📝 Conclusión

La implementación de una arquitectura **multi-tenant por negocio** convierte a SmartPOS en una plataforma robusta, profesional y lista para escalar como un producto comercial.

Este enfoque es el utilizado por sistemas POS, ERP y SaaS modernos.

---

📌 **Nota:**
Este documento define la lógica base del sistema. La implementación concreta (policies RLS, triggers y flujo de frontend) debe alinearse estrictamente a este modelo para garantizar seguridad y consistencia.
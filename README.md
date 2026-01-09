# 🛒 Sistema de Gestión Comercial (POS) — App Móvil Android

Versión: 2.0.0 (Mobile Cloud)
Arquitectura: Cliente-Servidor (Cloud Native)
Licencia: Propietaria (software a la medida)

## Descripción general

POS móvil nativo para Android diseñado para tiendas y pequeños comercios. Gestiona ventas, inventario y caja con sincronización en la nube mediante **Supabase**. Permite la administración del negocio desde cualquier lugar con una interfaz optimizada para dispositivos móviles.

## Características clave

- **App Móvil Android**: Experiencia nativa y portable.
- **Base de Datos en la Nube**: Datos centralizados y seguros en Supabase.
- **Gestión de Inventario**: Control de stock en tiempo real.
- **Punto de Venta (POS)**: Interfaz ágil para ventas rápidas.
- **Autenticación**: Gestión de usuarios (Admin/Cajero) segura.

## Arquitectura

- **Frontend Móvil**: `Ionic + Angular` (Android).
- **Backend as a Service (BaaS)**: `Supabase` (Base de datos, Autenticación, APIs).
- **Despliegue**: APK para Android.

## Tecnologías

| Capa         | Tecnología           | Motivo                                           |
|--------------|----------------------|--------------------------------------------------|
| App Móvil    | Ionic + Angular      | Desarrollo híbrido robusto para Android          |
| Estilos      | Tailwind CSS         | Diseño moderno y adaptable                       |
| Backend/DB   | Supabase             | Base de datos PostgreSQL, Auth y APIs en la nube |
| Build        | Capacitor            | Compilación nativa para Android                  |

## Estructura del proyecto

```
/pos-android-supabase
├── src/
│   ├── app/
│   │   ├── pages/        # Vistas (POS, Inventario, Login)
│   │   ├── components/   # UI reutilizable
│   │   ├── services/     # Servicios y conexión a Supabase
│   │   └── guards/       # Protección de rutas
├── supabase/             # Definiciones y migraciones SQL
├── android/              # Proyecto nativo Android
└── ionic.config.json
```

## Modelo de datos (Supabase)

- **profiles**: Datos de usuarios y roles (`ADMIN`, `CAJERO`).
- **products**: Catálogo con precios y stock.
- **sales**: Registro de ventas (cabecera).
- **sale_details**: Detalle de productos por venta.
- **transactions**: Movimientos de caja (ingresos/egresos).

## Requisitos

- Node.js (LTS)
- Android Studio (para compilar APK)
- Cuenta en Supabase

## Instalación y Configuración

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tu-usuario/pos-android-supabase.git
   cd pos-android-supabase
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Supabase**
   - Crear proyecto en Supabase.
   - Copiar credenciales en `src/environments/environment.ts`:
     ```typescript
     export const environment = {
       production: false,
       supabaseUrl: 'TU_SUPABASE_URL',
       supabaseKey: 'TU_SUPABASE_ANON_KEY'
     };
     ```
   - Ejecutar scripts SQL de la carpeta `supabase/`.

4. **Ejecutar en navegador (Desarrollo)**
   ```bash
   ionic serve
   ```

5. **Ejecutar en Android**
   ```bash
   ionic cap open android
   ```

## Autores

**Mauricio Andrés Vergara Fonseca**
Ingeniero de Sistemas — Desarrollador Full Stack / Mobile
Barranquilla, Colombia

**Jesus David Vega Pernett**
Ingeniero de Sistemas — Full Stack Developer, Especialista en Seguridad Informática
Barranquilla, Colombia

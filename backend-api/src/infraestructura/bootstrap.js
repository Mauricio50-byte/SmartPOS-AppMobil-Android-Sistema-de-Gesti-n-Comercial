const { prisma } = require('./bd')
// const { ADMIN_CORREO, ADMIN_PASSWORD } = require('../configuracion/entorno')
const bcrypt = require('bcryptjs')

async function asegurarPermisosYAdmin() {
  console.log('Iniciando bootstrap de módulos y permisos...')

  // 1. Definir Módulos
  const modulosDefinidos = [
    { id: 'dashboard', nombre: 'Dashboard', descripcion: 'Métricas y resúmenes generales', activo: true },
    { id: 'ventas', nombre: 'Ventas', descripcion: 'Facturación e historial de ventas', activo: true },
    { id: 'productos', nombre: 'Productos', descripcion: 'Gestión de inventario, stock y precios', activo: true },
    { id: 'clientes', nombre: 'Clientes', descripcion: 'Gestión de datos de clientes', activo: true },
    { id: 'finanzas', nombre: 'Finanzas', descripcion: 'Ingresos, gastos, caja y balances', activo: true },
    { id: 'usuarios', nombre: 'Usuarios', descripcion: 'Administración de cuentas y roles', activo: true },
    { id: 'modulos', nombre: 'Módulos', descripcion: 'Control de módulos del sistema', activo: true },
    { id: 'reportes', nombre: 'Reportes', descripcion: 'Visualización y exportación de reportes', activo: true },
    { id: 'configuracion', nombre: 'Configuración', descripcion: 'Datos del negocio y preferencias', activo: true },
  ]

  for (const m of modulosDefinidos) {
    await prisma.modulo.upsert({
      where: { id: m.id },
      update: { nombre: m.nombre, descripcion: m.descripcion },
      create: { id: m.id, nombre: m.nombre, descripcion: m.descripcion, activo: m.activo }
    })
  }

  // 2. Definir Permisos por Módulo
  const permisosPorModulo = {
    ventas: [
      { clave: 'VER_VENTAS', descripcion: 'Ver historial y lista de ventas' },
      { clave: 'CREAR_VENTA', descripcion: 'Registrar nuevas ventas y facturar' },
      { clave: 'EDITAR_VENTA', descripcion: 'Modificar ventas existentes' },
      { clave: 'ANULAR_VENTA', descripcion: 'Anular ventas realizadas' },
      { clave: 'REPORTES_VENTAS', descripcion: 'Ver reportes específicos de ventas' },
      { clave: 'VENDER', descripcion: 'Acceso general al punto de venta (Legacy)' } 
    ],
    productos: [
      { clave: 'VER_INVENTARIO', descripcion: 'Ver lista de productos y stock' },
      { clave: 'CREAR_PRODUCTO', descripcion: 'Crear nuevos productos' },
      { clave: 'EDITAR_PRODUCTO', descripcion: 'Editar información de productos' },
      { clave: 'ELIMINAR_PRODUCTO', descripcion: 'Eliminar productos del sistema' },
      { clave: 'AJUSTAR_STOCK', descripcion: 'Realizar ajustes manuales de inventario' }
    ],
    clientes: [
      { clave: 'VER_CLIENTES', descripcion: 'Ver lista de clientes' },
      { clave: 'CREAR_CLIENTE', descripcion: 'Registrar nuevos clientes' },
      { clave: 'EDITAR_CLIENTE', descripcion: 'Modificar datos de clientes' },
      { clave: 'ELIMINAR_CLIENTE', descripcion: 'Eliminar clientes' }
    ],
    finanzas: [
      { clave: 'VER_FINANZAS', descripcion: 'Ver información financiera general' },
      { clave: 'REGISTRAR_MOVIMIENTO', descripcion: 'Registrar gastos o ingresos manuales' },
      { clave: 'ABRIR_CAJA', descripcion: 'Abrir caja diaria' },
      { clave: 'CERRAR_CAJA', descripcion: 'Realizar cierres de caja' },
      { clave: 'VER_HISTORIAL_CAJA', descripcion: 'Ver historial de aperturas y cierres' },
      { clave: 'VER_ESTADISTICAS_CAJA', descripcion: 'Ver estadísticas de flujo de caja' }
    ],
    usuarios: [
      { clave: 'VER_USUARIOS', descripcion: 'Ver lista de usuarios' },
      { clave: 'CREAR_USUARIO', descripcion: 'Crear nuevos usuarios' },
      { clave: 'EDITAR_USUARIO', descripcion: 'Editar usuarios existentes' },
      { clave: 'ELIMINAR_USUARIO', descripcion: 'Eliminar usuarios' },
      { clave: 'ACTIVAR_USUARIO', descripcion: 'Activar o desactivar usuarios' },
      { clave: 'ASIGNAR_ROLES', descripcion: 'Asignar roles a usuarios' },
      { clave: 'VER_ROLES', descripcion: 'Ver roles disponibles' },
      { clave: 'CREAR_ROL', descripcion: 'Crear nuevos roles' },
      { clave: 'EDITAR_ROL', descripcion: 'Editar roles y permisos' }
    ],
    modulos: [
      { clave: 'GESTION_MODULOS', descripcion: 'Activar/desactivar módulos y asignarlos' }
    ],
    reportes: [
      { clave: 'VER_REPORTES', descripcion: 'Visualizar reportes del sistema' },
      { clave: 'EXPORTAR_REPORTES', descripcion: 'Exportar datos y reportes' }
    ],
    configuracion: [
      { clave: 'VER_CONFIGURACION', descripcion: 'Ver configuración del negocio' },
      { clave: 'EDITAR_CONFIGURACION', descripcion: 'Modificar configuración del negocio' }
    ],
    dashboard: [
      { clave: 'VER_DASHBOARD', descripcion: 'Acceso al dashboard principal' }
    ]
  }

  // Permisos globales o sin módulo específico (Legacy)
  const permisosGlobales = [
    { clave: 'ADMIN', descripcion: 'Acceso total al sistema', moduloId: null }
  ]

  // 3. Upsert Permisos
  for (const [moduloId, permisos] of Object.entries(permisosPorModulo)) {
    for (const p of permisos) {
      await prisma.permiso.upsert({
        where: { clave: p.clave },
        update: { descripcion: p.descripcion, moduloId: moduloId },
        create: { clave: p.clave, descripcion: p.descripcion, moduloId: moduloId }
      })
    }
  }

  for (const p of permisosGlobales) {
    await prisma.permiso.upsert({
      where: { clave: p.clave },
      update: { descripcion: p.descripcion, moduloId: p.moduloId },
      create: { clave: p.clave, descripcion: p.descripcion, moduloId: p.moduloId }
    })
  }

  // 4. Roles
  const adminRol = await prisma.rol.upsert({
    where: { nombre: 'ADMIN' },
    update: { descripcion: 'Acceso total al sistema' },
    create: { nombre: 'ADMIN', descripcion: 'Acceso total al sistema' }
  })

  const trabajadorRol = await prisma.rol.upsert({
    where: { nombre: 'TRABAJADOR' },
    update: { descripcion: 'Acceso limitado para ventas y operaciones básicas' },
    create: { nombre: 'TRABAJADOR', descripcion: 'Acceso limitado para ventas y operaciones básicas' }
  })

  // 5. Asignar todos los permisos al rol ADMIN
  const allPermisos = await prisma.permiso.findMany({})
  
  for (const p of allPermisos) {
     const exists = await prisma.rolPermiso.findUnique({
         where: { rolId_permisoId: { rolId: adminRol.id, permisoId: p.id } }
     })
     if (!exists) {
         await prisma.rolPermiso.create({ data: { rolId: adminRol.id, permisoId: p.id } })
     }
  }

  // 6. Asignar permisos base al rol TRABAJADOR
  const permisosTrabajador = [
    'VER_DASHBOARD'
  ]

  // Limpiar permisos antiguos que no deban estar en TRABAJADOR
  // Obtenemos todos los permisos actuales del rol
  const permisosActualesRol = await prisma.rolPermiso.findMany({
      where: { rolId: trabajadorRol.id },
      include: { permiso: true }
  })

  // Identificar los que ya NO deben estar
  for(const rp of permisosActualesRol) {
      if (!permisosTrabajador.includes(rp.permiso.clave)) {
          console.log(`Eliminando permiso ${rp.permiso.clave} del rol TRABAJADOR`)
          await prisma.rolPermiso.delete({
              where: { rolId_permisoId: { rolId: trabajadorRol.id, permisoId: rp.permisoId } }
          })
      }
  }

  const permisosBaseDb = await prisma.permiso.findMany({
    where: { clave: { in: permisosTrabajador } }
  })

  for (const p of permisosBaseDb) {
     const exists = await prisma.rolPermiso.findUnique({
         where: { rolId_permisoId: { rolId: trabajadorRol.id, permisoId: p.id } }
     })
     if (!exists) {
         await prisma.rolPermiso.create({ data: { rolId: trabajadorRol.id, permisoId: p.id } })
     }
  }

  // 7. (DEPRECATED) Crear/Actualizar Usuario Admin Principal
  // La lógica de admin por defecto se ha eliminado en favor del modelo multi-tenant donde cada negocio tiene su propio admin.
  /*
  if (ADMIN_CORREO) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD || 'admin123', 10)
      
      // Intentar buscar usuario existente
      let usuario = await prisma.usuario.findUnique({ where: { correo: ADMIN_CORREO } })
      
      if (!usuario) {
          usuario = await prisma.usuario.create({
              data: { 
                  nombre: 'Administrador Principal', 
                  correo: ADMIN_CORREO, 
                  passwordHash, 
                  activo: true
              }
          })
      } else {
          // Si ya existe, nos aseguramos que esté activo
          await prisma.usuario.update({
              where: { id: usuario.id },
              data: { activo: true }
          })
      }
      
      // Asignar Rol Admin
      const yaRol = await prisma.usuarioRol.findUnique({ where: { usuarioId_rolId: { usuarioId: usuario.id, rolId: adminRol.id } } })
      if (!yaRol) await prisma.usuarioRol.create({ data: { usuarioId: usuario.id, rolId: adminRol.id } })

      // Asignar Negocio
      if (!usuario.negocioId) {
          const existente = await prisma.negocio.findFirst({ select: { id: true } })
          const negocio = existente
            ? existente
            : await prisma.negocio.create({ data: { nombre: 'Negocio Principal' }, select: { id: true } })
          await prisma.usuario.update({ where: { id: usuario.id }, data: { negocioId: negocio.id } })
          
          // Activar todos los módulos para este negocio
          const modulos = await prisma.modulo.findMany()
          for(const m of modulos) {
              await prisma.negocioModulo.upsert({
                  where: { negocioId_moduloId: { negocioId: negocio.id, moduloId: m.id } },
                  update: { activo: true },
                  create: { negocioId: negocio.id, moduloId: m.id, activo: true }
              })
          }
      }
      
      // Asegurar que el usuario tenga acceso a todos los módulos (UsuarioModulo)
      const modulos = await prisma.modulo.findMany()
      for (const m of modulos) {
          await prisma.usuarioModulo.upsert({
              where: { usuarioId_moduloId: { usuarioId: usuario.id, moduloId: m.id } },
              update: {},
              create: { usuarioId: usuario.id, moduloId: m.id }
          })
      }
  }
  */
}

module.exports = { asegurarPermisosYAdmin }

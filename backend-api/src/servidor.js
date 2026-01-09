const fastify = require('fastify')
const cors = require('@fastify/cors')
const jwtPlugin = require('@fastify/jwt')
const fastifyStatic = require('@fastify/static')
const fs = require('fs')
const path = require('path')
const { PUERTO, JWT_SECRETO } = require('./configuracion/entorno')
const { registrarRutasProducto } = require('./modulos/productos/producto.rutas')
const { registrarRutasCliente } = require('./modulos/clientes/cliente.rutas')
const { registrarRutasVenta } = require('./modulos/ventas/venta.rutas')
const { registrarRutasAuth } = require('./modulos/auth/auth.rutas')
const { registrarRutasUsuario } = require('./modulos/usuarios/usuario.rutas')
const { registrarRutasRol } = require('./modulos/roles/rol.rutas')
const { registrarRutasDeuda } = require('./modulos/deudas/deuda.rutas')
const { registrarRutasGasto } = require('./modulos/gastos/gasto.rutas')
const { registrarRutasCaja } = require('./modulos/caja/caja.rutas')
const { registrarRutasModulos } = require('./modulos/sistema/modulo.rutas')
const { asegurarPermisosYAdmin } = require('./infraestructura/bootstrap')
const { prisma } = require('./infraestructura/bd')

async function iniciar() {
  const app = fastify({ 
    logger: true,
    bodyLimit: 10485760 // 10MB limit for image uploads
  })
  await app.register(cors, { origin: true })
  if (JWT_SECRETO) await app.register(jwtPlugin, { secret: JWT_SECRETO })
  
  const frontendPath = path.join(__dirname, '../../frontend-app/www');
  if (fs.existsSync(frontendPath)) {
    await app.register(fastifyStatic, {
      root: frontendPath,
      prefix: '/'
    })
    app.setNotFoundHandler((req, res) => {
      if (!req.raw.url.startsWith('/auth') && 
          !req.raw.url.startsWith('/clientes') &&
          !req.raw.url.startsWith('/productos') &&
          !req.raw.url.startsWith('/ventas') &&
          !req.raw.url.startsWith('/usuarios') &&
          !req.raw.url.startsWith('/roles') &&
          !req.raw.url.startsWith('/modulos') &&
          !req.raw.url.startsWith('/roles') &&
          !req.raw.url.startsWith('/permisos') &&
          !req.raw.url.startsWith('/caja') &&
          !req.raw.url.startsWith('/gastos')) {
          return res.sendFile('index.html')
      }
      res.code(404).send({ mensaje: 'Ruta no encontrada' })
    })
  }

  app.decorate('requierePermiso', (clave) => async (req, res) => { 
    await req.jwtVerify(); 
    const permisos = req.user?.permisos || []; 
    const roles = req.user?.roles || [];
    const adminPorDefecto = req.user?.adminPorDefecto === true
    // Si el usuario tiene el rol de ADMIN, le damos paso libre (o verificamos si la clave es 'ADMIN' específicamente)
    if ((roles.includes('ADMIN') && adminPorDefecto) || permisos.includes(clave)) {
        return;
    }
    // Caso especial: si se pide permiso 'ADMIN', verificamos si tiene el ROL 'ADMIN'
    if (clave === 'ADMIN' && roles.includes('ADMIN') && adminPorDefecto) {
        return;
    }
    
    res.code(403); 
    throw new Error('No autorizado') 
  })

  app.decorate('requiereModulo', (moduloId) => async (req, res) => {
    await req.jwtVerify();
    const roles = req.user?.roles || [];
    const adminPorDefecto = req.user?.adminPorDefecto === true
    
    // El administrador principal tiene acceso a todos los módulos activos del negocio
    if (roles.includes('ADMIN') && adminPorDefecto) return;

    const modulos = req.user?.modulos || [];
    if (!modulos.includes(moduloId)) {
        res.code(403);
        throw new Error(`Acceso denegado al módulo: ${moduloId}`);
    }
  })

  app.decorate('prisma', prisma)

  app.get('/salud', async () => ({ ok: true }))

  await asegurarPermisosYAdmin()

  await registrarRutasAuth(app)
  await registrarRutasUsuario(app)
  await registrarRutasRol(app)
  await registrarRutasProducto(app)
  await registrarRutasCliente(app)
  await registrarRutasVenta(app)
  await registrarRutasDeuda(app)
  await registrarRutasGasto(app)
  await registrarRutasCaja(app)
  await registrarRutasModulos(app)

  try {
    await app.listen({ port: PUERTO, host: '0.0.0.0' })
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

iniciar()

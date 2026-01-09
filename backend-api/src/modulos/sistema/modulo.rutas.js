const { listarModulos, listarCatalogoModulos, toggleModulo, actualizarConfig } = require('./modulo.servicio')

async function registrarRutasModulos(app) {
  app.get('/modulos/catalogo', { preHandler: [app.autenticar] }, async () => {
    return listarCatalogoModulos()
  })

  app.get('/modulos', { preHandler: [app.requierePermiso('GESTION_MODULOS'), app.requiereModulo('modulos')] }, async (req) => {
    const negocioId = req.user?.negocioId || req.query?.negocioId
    return listarModulos(Number(negocioId))
  })

  app.patch('/modulos/:id/toggle', { preHandler: [app.requierePermiso('GESTION_MODULOS'), app.requiereModulo('modulos')] }, async (req, res) => {
    const { id } = req.params
    const { activo } = req.body
    const negocioId = req.user?.negocioId || req.query?.negocioId
    return toggleModulo(Number(negocioId), id, activo)
  })

  app.put('/modulos/:id/config', { preHandler: [app.requierePermiso('GESTION_MODULOS'), app.requiereModulo('modulos')] }, async (req, res) => {
    const { id } = req.params
    const { config } = req.body
    return actualizarConfig(id, config)
  })
}

module.exports = { registrarRutasModulos }

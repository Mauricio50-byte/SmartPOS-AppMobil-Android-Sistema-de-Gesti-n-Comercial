const { registrar, limpiarUsuarioHuérfano } = require('../src/modulos/auth/auth.servicio');
const { prisma } = require('../src/infraestructura/bd');
const { supabase } = require('../src/infraestructura/supabase');

async function testRegistroNegocio() {
    console.log('--- INICIO TEST: REGISTRO DE NEGOCIO ---');
    
    // 1. Datos de prueba
    const timestamp = Date.now();
    const testEmail = `test_negocio_${timestamp}@test.com`;
    const testPassword = 'Password123!';
    const testBusinessName = `Negocio Test ${timestamp}`;

    console.log(`1. Preparando usuario de prueba: ${testEmail}`);

    try {
        // Limpieza previa por si acaso
        await limpiarUsuarioHuérfano(testEmail);

        // 2. Ejecutar registro
        console.log('2. Ejecutando servicio registrar()...');
        const resultado = await registrar({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    business_name: testBusinessName,
                    full_name: 'Test Admin'
                }
            }
        });

        console.log('3. Resultado de registrar():');
        console.log('   - User ID (Auth):', resultado.user?.id);
        console.log('   - Session exists:', !!resultado.session);
        console.log('   - Usuario Prisma exists:', !!resultado.usuarioPrisma);

        if (!resultado.usuarioPrisma) {
            throw new Error('FALLO: No se devolvió el objeto usuarioPrisma');
        }

        // 3. Validaciones
        const usuarioDb = resultado.usuarioPrisma;
        console.log('4. Validando datos en DB (Prisma):');
        console.log('   - ID:', usuarioDb.id);
        console.log('   - Correo:', usuarioDb.correo);
        console.log('   - NegocioId:', usuarioDb.negocioId);
        
        // Validar Rol ADMIN
        const roles = usuarioDb.roles.map(r => r.rol.nombre);
        console.log('   - Roles:', roles);
        if (!roles.includes('ADMIN')) {
            throw new Error('FALLO: El usuario no tiene rol ADMIN');
        }

        // Validar Módulos del Negocio
        const negocioModulos = await prisma.negocioModulo.findMany({
            where: { negocioId: usuarioDb.negocioId }
        });
        console.log(`   - Módulos activos en Negocio: ${negocioModulos.length}`);
        if (negocioModulos.length === 0) {
            throw new Error('FALLO: No se activaron módulos para el negocio');
        }

        // Validar Asignación de Módulos al Usuario
        const usuarioModulos = usuarioDb.modulos.map(m => m.moduloId);
        console.log(`   - Módulos asignados al Usuario: ${usuarioModulos.length}`);
        if (usuarioModulos.length === 0) {
            throw new Error('FALLO: No se asignaron módulos al usuario administrador');
        }

        // Validar Audit Log
        const logs = await prisma.auditLog.findMany({
            where: { usuarioId: usuarioDb.id },
            orderBy: { creadoEn: 'desc' }
        });
        console.log(`   - Logs de auditoría encontrados: ${logs.length}`);
        logs.forEach(l => console.log(`     * [${l.accion}] ${l.detalle}`));

        console.log('--- TEST EXITOSO: EL FLUJO DE REGISTRO FUNCIONA CORRECTAMENTE ---');

    } catch (error) {
        console.error('--- TEST FALLIDO ---');
        console.error(error);
    } finally {
        // Limpieza (Opcional, comentar para inspeccionar DB)
        // await prisma.usuario.delete({ where: { correo: testEmail } });
        // await supabase.auth.admin.deleteUser(resultado.user.id);
    }
}

testRegistroNegocio()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

import { defineConfig, env } from '@prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { 
    // Para migraciones y CLI se usa la conexión directa (puerto 5432)
    url: env('DIRECT_URL') 
  }
})

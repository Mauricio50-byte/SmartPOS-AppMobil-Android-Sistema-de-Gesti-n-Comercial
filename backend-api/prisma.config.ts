import 'dotenv/config';
import { defineConfig } from '@prisma/config';

const user = process.env.DB_USER || 'postgres'
const password = encodeURIComponent(process.env.DB_PASSWORD || 'root')
const host = process.env.DB_HOST || (process.env.DOCKER === 'true' ? 'sistema-pos' : 'localhost')
const port = process.env.DB_PORT || '5432'
const db = process.env.DB_NAME || 'sistema_pos'
const schema = process.env.DB_SCHEMA || 'public'
const url = process.env.DATABASE_URL || `postgresql://${user}:${password}@${host}:${port}/${db}?schema=${schema}`

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url }
})

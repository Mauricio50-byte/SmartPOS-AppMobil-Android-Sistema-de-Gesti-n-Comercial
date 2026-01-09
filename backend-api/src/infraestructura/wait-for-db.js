const { Client } = require('pg');
const { DATABASE_URL } = require('../configuracion/entorno');

async function waitForDb() {
  let retries = 30;
  while (retries > 0) {
    const client = new Client({ connectionString: DATABASE_URL });
    try {
      await client.connect();
      console.log('Database connected successfully!');
      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`Waiting for database to be ready... (${retries} retries left). Error: ${err.message}`);
      retries--;
      try { await client.end(); } catch (e) {} // Asegurar cierre si quedó abierto
      await new Promise(res => setTimeout(res, 2000));
    }
  }
  console.error('Could not connect to database');
  process.exit(1);
}

waitForDb();

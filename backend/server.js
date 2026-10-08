require('dotenv').config();

const { app } = require('./src/app');
const { validateDatabaseConfig, getJwtSecret } = require('./src/config');
const { pool } = require('./src/db');

async function start() {
  getJwtSecret();
  validateDatabaseConfig();
  await pool.execute('SELECT 1');

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`API Cuidar+ rodando na porta ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Não foi possível iniciar a API:', error);
    process.exitCode = 1;
  });
}

module.exports = { app, pool, start };

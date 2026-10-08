function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.startsWith('SUBSTITUA_') || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 bytes.');
  }
  return secret;
}

function validateDatabaseConfig() {
  if (!process.env.DB_USER || process.env.DB_PASSWORD === undefined) {
    throw new Error('Configure DB_USER e DB_PASSWORD no arquivo backend/.env.');
  }
  if (process.env.DB_PASSWORD.startsWith('COLOQUE_')) {
    throw new Error('Substitua DB_PASSWORD no arquivo backend/.env pela senha do usuário MySQL.');
  }
}

module.exports = { getJwtSecret, validateDatabaseConfig };

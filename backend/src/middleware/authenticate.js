// Responsável por esta implementação: Filipe Alves Sousa Julio.
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config');

function autenticar(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Autenticação necessária.' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (
      !payload ||
      !Number.isInteger(payload.id) ||
      !['paciente', 'fisioterapeuta'].includes(payload.perfil)
    ) {
      return res.status(401).json({ erro: 'Token inválido.' });
    }
    req.usuario = { id: payload.id, perfil: payload.perfil };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
    return next(error);
  }
}

module.exports = { autenticar };

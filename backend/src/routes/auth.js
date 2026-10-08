// Responsável por esta implementação: Filipe Alves Sousa Julio.
const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config');
const { pool } = require('../db');
const { AccountError, createAccount } = require('../services/accounts');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const tokenLifetime = '1h';
function registerAccount(profile) {
  return async (req, res) => {
    try {
      const usuario = await createAccount(profile, req.body);
      return res.status(201).json({ usuario });
    } catch (error) {
      if (error instanceof AccountError) {
        return res.status(error.status).json({ erro: error.message });
      }
      console.error(`Erro ao cadastrar ${profile}:`, error);
      return res.status(500).json({ erro: 'Não foi possível criar a conta.' });
    }
  };
}

router.post('/pacientes/registro', registerAccount('paciente'));
router.post('/fisioterapeutas/registro', registerAccount('fisioterapeuta'));

router.post('/login', async (req, res) => {
  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const senha = typeof body.senha === 'string' ? body.senha : '';
  if (!emailPattern.test(email) || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha válidos.' });
  }

  try {
    const [usuarios] = await pool.execute(
      `SELECT id, nome, email, senha_hash, 'fisioterapeuta' AS perfil
       FROM fisioterapeutas WHERE lower(email) = ?
       UNION ALL
       SELECT id, nome, email, senha_hash, 'paciente' AS perfil
       FROM pacientes WHERE lower(email) = ? AND senha_hash IS NOT NULL
       LIMIT 2`,
      [email, email]
    );

    if (usuarios.length !== 1 || !(await bcrypt.compare(senha, usuarios[0].senha_hash))) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const usuario = usuarios[0];
    const token = jwt.sign(
      { id: usuario.id, perfil: usuario.perfil },
      getJwtSecret(),
      { algorithm: 'HS256', expiresIn: tokenLifetime }
    );
    return res.json({
      token,
      tipo: 'Bearer',
      expiraEm: tokenLifetime,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    });
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return res.status(500).json({ erro: 'Não foi possível realizar o login.' });
  }
});

module.exports = { router };

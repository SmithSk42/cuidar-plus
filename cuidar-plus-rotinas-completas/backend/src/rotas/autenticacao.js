const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const banco = require('../banco/conexao');
const { exigirAutenticacao } = require('../intermediarios/autenticacao');
const rotasAutenticacao = express.Router();
const limiteTentativas = new Map();

rotasAutenticacao.post('/login', async (requisicao, resposta, proximo) => {
  const email = String(requisicao.body?.email || '').trim().toLowerCase();
  const senha = requisicao.body?.senha;
  if (!email || typeof senha !== 'string' || email.length > 150 || senha.length > 256) return resposta.status(400).json({ erro: 'Informe e-mail e senha válidos.' });
  const chave = `${requisicao.ip}:${email}`;
  const agora = Date.now();
  const controle = limiteTentativas.get(chave);
  if (controle && controle.ate > agora && controle.tentativas >= 8) return resposta.status(429).json({ erro: 'Muitas tentativas. Tente novamente em 15 minutos.' });
  try {
    const [registros] = await banco.execute('SELECT id, nome, email, senha_hash, ativo FROM fisioterapeutas WHERE email = ? LIMIT 1', [email]);
    const usuario = registros[0];
    // Compara um hash fictício também quando não há conta, reduzindo diferença de tempo na resposta.
    const hashAlternativo = '$2b$12$C6UzMDM.H6dfI/f/IKcEeOeG0C.BmT9T8xHlYfXLaZ5IrI0jOs5P6';
    const senhaCorreta = await bcrypt.compare(senha, usuario?.senha_hash || hashAlternativo);
    if (!usuario || !usuario.ativo || !senhaCorreta) {
      const anterior = controle && controle.ate > agora ? controle.tentativas : 0;
      limiteTentativas.set(chave, { tentativas: anterior + 1, ate: agora + 15 * 60_000 });
      return resposta.status(401).json({ erro: 'E-mail ou senha inválidos.' });
    }
    limiteTentativas.delete(chave);
    const perfil = 'fisioterapeuta';
    const token = jwt.sign({ id: usuario.id, perfil }, process.env.SEGREDO_JWT, { algorithm: 'HS256', expiresIn: '8h' });
    return resposta.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil } });
  } catch (erro) { return proximo(erro); }
});
rotasAutenticacao.get('/eu', exigirAutenticacao, (requisicao, resposta) => resposta.json({ usuario: requisicao.usuario }));
module.exports = { rotasAutenticacao };

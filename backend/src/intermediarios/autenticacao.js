const jwt = require('jsonwebtoken');
const banco = require('../banco/conexao');

async function exigirAutenticacao(requisicao, resposta, proximo) {
  const cabecalho = requisicao.headers.authorization || '';
  const correspondencia = /^Bearer\s+(\S+)$/i.exec(cabecalho);
  if (!correspondencia) return resposta.status(401).json({ erro: 'Autenticação necessária.' });
  try {
    const token = jwt.verify(correspondencia[1], process.env.SEGREDO_JWT, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(token.id) || token.id < 1 || token.perfil !== 'fisioterapeuta') {
      return resposta.status(401).json({ erro: 'Token inválido ou expirado.' });
    }
    const [registros] = await banco.execute('SELECT id, nome, email, ativo FROM fisioterapeutas WHERE id=? LIMIT 1', [token.id]);
    const usuario = registros[0];
    if (!usuario || !usuario.ativo) return resposta.status(401).json({ erro: 'Conta inexistente ou desativada.' });
    requisicao.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: 'fisioterapeuta' };
    return proximo();
  } catch (erro) {
    if (erro instanceof jwt.JsonWebTokenError || erro instanceof jwt.TokenExpiredError)
      return resposta.status(401).json({ erro: 'Token inválido ou expirado.' });
    return proximo(erro);
  }
}
function filtroProfissional(requisicao, alias='p') {
  return {sql:`${alias}.fisioterapeuta_id = ?`,parametros:[requisicao.usuario.id]};
}
module.exports = { exigirAutenticacao, filtroProfissional };

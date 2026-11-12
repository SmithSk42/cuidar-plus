const jwt = require('jsonwebtoken');
const banco = require('../banco/conexao');
async function exigirAcessoDomiciliar(requisicao, resposta, proximo) {
  const cabecalho = requisicao.headers.authorization || '';
  const correspondencia = /^Bearer\s+(\S+)$/i.exec(cabecalho);
  if (!correspondencia) return resposta.status(401).json({erro:'Entre no Cuidar+ para continuar.'});
  try {
    const token = jwt.verify(correspondencia[1],process.env.SEGREDO_JWT,{algorithms:['HS256']});
    if (!Number.isSafeInteger(token.id) || token.id <= 0 || token.perfil !== 'domiciliar')
      return resposta.status(401).json({erro:'Sessão inválida.'});
    const [linhas] = await banco.execute('SELECT id,nome,email,ativo FROM usuarios_domiciliares WHERE id=? LIMIT 1',[token.id]);
    const usuario = linhas[0];
    if (!usuario?.ativo) return resposta.status(401).json({erro:'Conta desativada.'});
    requisicao.usuarioDomiciliar = usuario;
    proximo();
  } catch(erro) {
    if (erro instanceof jwt.JsonWebTokenError || erro instanceof jwt.TokenExpiredError)
      return resposta.status(401).json({erro:'Sessão inválida ou expirada.'});
    proximo(erro);
  }
}
// Alias legivel para novos controllers, mantendo compatibilidade com as rotas existentes.
module.exports={exigirAcessoDomiciliar, verificarToken: exigirAcessoDomiciliar};

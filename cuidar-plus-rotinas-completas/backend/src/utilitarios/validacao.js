function idPositivo(valor) {
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}
function texto(valor, limite = 100) {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  return limpo && limpo.length <= limite ? limpo : null;
}
function emailValido(valor) {
  const email = texto(valor, 150)?.toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0,10) === valor;
}
function inteiroEntre(valor, minimo, maximo) {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= minimo && valor <= maximo;
}
function requisicaoInvalida(resposta, mensagem = 'Dados inválidos.') {
  return resposta.status(400).json({ erro: mensagem });
}
module.exports = {idPositivo,texto,emailValido,dataValida,inteiroEntre,requisicaoInvalida};

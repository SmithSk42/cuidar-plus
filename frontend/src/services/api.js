
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiRequest(caminho, opcoes = {}) {
  const { token, ...opcoesRequisicao } = opcoes;

  let resposta;

  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      ...opcoesRequisicao,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opcoesRequisicao.headers,
      },
      body:
        opcoesRequisicao.body === undefined
          ? undefined
          : JSON.stringify(opcoesRequisicao.body),
    });
  } catch {
    throw new Error(
      'Não foi possível conectar à API. Confira se o backend está iniciado.'
    );
  }

  let dados;

  try {
    dados = await resposta.json();
  } catch {
    throw new Error('A API respondeu em um formato inesperado.');
  }

  if (!resposta.ok) {
    throw new Error(
      dados.erro || 'Não foi possível concluir a solicitação.'
    );
  }

  return dados;
}

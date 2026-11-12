import { useEffect, useState } from 'react';
import { ContextoSessaoDomiciliar, CHAVE_TOKEN_DOMICILIAR } from './contexto-domiciliar.js';
import { apiRequest } from '../servicos/api.js';

// Somente o token fica persistido; os dados atuais do perfil sao consultados na API.

function lerTokenArmazenado() {
  try {
    return localStorage.getItem(CHAVE_TOKEN_DOMICILIAR) || null;
  } catch {
    return null;
  }
}

export function ProvedorSessaoDomiciliar({ children }) {
  const [sessao, definirSessao] = useState(() => {
    const token = lerTokenArmazenado();
    return token ? { token, usuario: null, vinculos: [] } : null;
  });
  const [erroRestauracao, definirErroRestauracao] = useState('');
  const [tentativa, definirTentativa] = useState(0);

  useEffect(() => {
    if (!sessao?.token || sessao.usuario) return;
    let ativo = true;

    apiRequest('/api/cuidado/sessao', { token: sessao.token })
      .then((dados) => {
        if (!ativo) return;
        definirErroRestauracao('');
        definirSessao(atual => atual?.token === sessao.token
          ? { ...atual, usuario: dados.usuario, vinculos: dados.vinculos || [] }
          : atual);
      })
      .catch((erro) => {
        if (!ativo) return;
        if (erro.status === 401) {
          try { localStorage.removeItem(CHAVE_TOKEN_DOMICILIAR); } catch { /* armazenamento bloqueado */ }
          definirSessao(null);
          definirErroRestauracao('');
        } else {
          definirErroRestauracao(erro.message);
        }
      });

    return () => { ativo = false; };
  }, [sessao?.token, sessao?.usuario, tentativa]);

  function iniciarSessao(dados) {
    if (!dados?.token || dados?.usuario?.perfil !== 'domiciliar') {
      throw new Error('A API nao retornou uma sessao domiciliar valida.');
    }
    // O portal requer armazenamento persistente para reabrir no mesmo navegador.
    try {
      localStorage.setItem(CHAVE_TOKEN_DOMICILIAR, dados.token);
      sessionStorage.removeItem('cuidar-sessao-domiciliar'); // limpa sessao legada
    } catch {
      throw new Error('O navegador bloqueou o armazenamento. Permita dados do site para manter seu login.');
    }
    definirErroRestauracao('');
    definirSessao({ token: dados.token, usuario: dados.usuario, vinculos: dados.vinculos || [] });
  }

  function encerrarSessao() {
    try {
      localStorage.removeItem(CHAVE_TOKEN_DOMICILIAR);
      sessionStorage.removeItem('cuidar-sessao-domiciliar');
    } catch { /* armazenamento bloqueado */ }
    definirSessao(null);
    definirErroRestauracao('');
  }

  const estadoSessao = !sessao ? 'desconectado'
    : sessao.usuario ? 'conectado'
      : erroRestauracao ? 'erro' : 'verificando';

  const valor = ({
    sessao, estadoSessao, erroRestauracao,
    iniciarSessao, encerrarSessao,
    tentarNovamente: () => { definirErroRestauracao(''); definirTentativa(n => n + 1); }
  });

  return <ContextoSessaoDomiciliar.Provider value={valor}>{children}</ContextoSessaoDomiciliar.Provider>;
}


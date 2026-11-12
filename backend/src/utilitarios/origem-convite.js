'use strict';

const { isIP } = require('node:net');

const ORIGEM_PADRAO = 'http://localhost:5173';

function interpretarOrigem(valor, aceitarCaminho = false) {
  if (typeof valor !== 'string' || !valor.trim()) return null;

  try {
    const endereco = new URL(valor.trim());
    if (!['http:', 'https:'].includes(endereco.protocol)) return null;
    if (endereco.username || endereco.password) return null;
    if (!aceitarCaminho && (endereco.pathname !== '/' || endereco.search || endereco.hash)) return null;
    return endereco.origin;
  } catch {
    return null;
  }
}

function origemLocal(endereco) {
  const nome = endereco.hostname.toLowerCase();
  if (nome === 'localhost' || nome === '127.0.0.1' || nome === '[::1]') return true;
  if (isIP(nome) !== 4) return false;

  const partes = nome.split('.').map(Number);
  return partes[0] === 10 ||
    (partes[0] === 172 && partes[1] >= 16 && partes[1] <= 31) ||
    (partes[0] === 192 && partes[1] === 168);
}

function origemCloudflareTemporaria(endereco) {
  return endereco.protocol === 'https:' &&
    !endereco.port &&
    /^[a-z0-9-]+\.trycloudflare\.com$/i.test(endereco.hostname);
}

/**
 * Retorna a origem que deve aparecer no convite.
 * - ORIGEM_PUBLICA_FRONTEND: configuração explícita (inclusive ao criar convite via localhost).
 * - Origin/Referer: detecta o endereço pelo qual o profissional abriu o sistema.
 * - Só aceita origens configuradas, redes locais e subdomínios HTTPS de trycloudflare.com.
 * - Sem origem reconhecida, usa ORIGEM_FRONTEND como fallback.
 */
function obterOrigemConvite(requisicao, ambiente = process.env) {
  const publica = (ambiente.ORIGEM_PUBLICA_FRONTEND || '').trim();
  if (publica) {
    const origem = interpretarOrigem(publica);
    if (!origem) {
      throw new Error('ORIGEM_PUBLICA_FRONTEND inválida. Informe apenas http(s)://dominio[:porta], sem caminho.');
    }
    return origem;
  }

  const configuradas = (ambiente.ORIGEM_FRONTEND || ORIGEM_PADRAO)
    .split(',')
    .map(valor => interpretarOrigem(valor))
    .filter(Boolean);

  const candidatos = [
    interpretarOrigem(requisicao.get('origin')),
    interpretarOrigem(requisicao.get('referer'), true),
  ];

  for (const origem of candidatos) {
    if (!origem) continue;
    const endereco = new URL(origem);
    if (configuradas.includes(origem) || origemLocal(endereco) || origemCloudflareTemporaria(endereco)) {
      return origem;
    }
  }

  return configuradas[0] || ORIGEM_PADRAO;
}

module.exports = { obterOrigemConvite };

// Responsável por esta implementação: Filipe Alves Sousa Julio.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function apiRequest(path, options = {}) {
  const { token, ...fetchOptions } = options;
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers,
      },
      body: fetchOptions.body === undefined ? undefined : JSON.stringify(fetchOptions.body),
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Confira se o backend está iniciado.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('A API respondeu em um formato inesperado.');
  }
  if (!response.ok) {
    throw new Error(data.erro || 'Não foi possível concluir a solicitação.');
  }
  return data;
}

import { useContext } from 'react';
import { ContextoSessaoDomiciliar } from './contexto-domiciliar.js';

export function useSessaoDomiciliar() {
  const contexto = useContext(ContextoSessaoDomiciliar);
  if (!contexto) throw new Error('O portal precisa do provedor de sessao domiciliar.');
  return contexto;
}

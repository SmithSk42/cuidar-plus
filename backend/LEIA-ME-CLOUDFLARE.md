# Cuidar+ — convites com link do Cloudflare Tunnel

## O que mudou

- `src/rotas/convites.js`: a URL do convite passa a ser gerada com a origem detectada ou configurada.
- `src/utilitarios/origem-convite.js`: seleciona a origem segura do link.
- `.env.example`: documenta a configuração opcional `ORIGEM_PUBLICA_FRONTEND`.
- `testes/origem-convite.test.js`: testes da geração da origem.

Nenhuma tabela, rota ou regra de validade dos convites foi alterada. O token continua sendo aleatório, com hash SHA-256 armazenado no banco, e expira em 48 horas.

## Como instalar

1. Faça backup da pasta `backend` do Cuidar+.
2. Extraia os arquivos deste ZIP sobre a pasta `backend` do projeto, preservando a estrutura das pastas.
3. O arquivo `.env` não está incluído neste ZIP: **mantenha o seu atual**.
4. Reinicie o backend (`npm run dev`).
5. Continue executando o frontend e o `cloudflared` normalmente.

## Opção A — automática, sem alterar o .env

Acesse o painel do fisioterapeuta pelo link público do Cloudflare, por exemplo:

`https://reef-request-trails-stood.trycloudflare.com`

Gere um **novo convite**. O backend usará a origem do navegador para retornar:

`https://reef-request-trails-stood.trycloudflare.com/cuidado?convite=<codigo>`

O endereço acima é ilustrativo e só funciona enquanto aquele túnel estiver ativo.

## Opção B — gerar link público mesmo usando o painel em localhost

Acrescente esta linha ao arquivo `backend/.env`:

```env
ORIGEM_PUBLICA_FRONTEND=https://reef-request-trails-stood.trycloudflare.com
```

Substitua o domínio pelo endereço **atual** do túnel, sem barra no final e sem `/cuidado`.
Reinicie o backend. Os próximos convites usarão sempre esse domínio, mesmo que você abra o painel em `http://localhost:5173`.

**Atenção:** se o Cloudflare gerar um novo domínio temporário, atualize a variável e reinicie o backend. Para voltar à detecção automática, remova/comente a variável e reinicie.

Não altere `ORIGEM_FRONTEND` apenas para gerar convites; ela é usada pela configuração CORS existente.

## Testes

Dentro de `backend`, execute:

```powershell
node --test testes/origem-convite.test.js
```

## Cuidados

- Não compartilhe o arquivo `.env` nem credenciais. Ele foi propositalmente excluído do ZIP.
- Gere **novos convites** após a correção. Links já copiados não mudam sozinhos.
- Compartilhe o convite apenas com o cuidador autorizado; ele é um token de acesso temporário.
- O Cloudflare Quick Tunnel é temporário e não é hospedagem de produção.
- Para a demonstração pública, utilize apenas dados fictícios de pacientes.

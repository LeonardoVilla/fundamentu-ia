# fundamentu.ia

Aplicação Next.js para análise fundamentalista, rastreio de Relações com Investidores, DCF, carteira importada e agentes de IA configuráveis.

## Desenvolvimento local

1. Copie `.env.example` para `.env.local` e preencha as credenciais.
2. Execute `npm install`.
3. Prepare o banco com `npm run db:migrate`.
4. Inicie com `npm run dev`.

Valide a configuração em `http://localhost:3000/api/health`.

## Turso e Vercel

No Turso, use a URL do banco e um token de autenticação nas variáveis `DATABASE_URL` e `DATABASE_AUTH_TOKEN`. No Vercel, cadastre as mesmas variáveis para Preview e Production. Execute as migrations contra o banco de produção antes do primeiro uso.

Para o login Google, configure uma URL de callback autorizada no formato `https://SEU-DOMINIO/api/auth/callback/google` e informe `AUTH_SECRET`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no Vercel.

`AI_CREDENTIALS_ENCRYPTION_KEY` é obrigatória para salvar chaves de provedores de IA. Não comite `.env.local` nem tokens no repositório.

`BRAPI_API_KEY` é opcional e permite consultar cotações server-side pelo endpoint `/api/market-data?ticker=PETR4`.

## Validação

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Ou execute todas as verificações com `npm run check`.

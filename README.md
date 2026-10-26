# Fundamentu.ia

Plataforma web de análise fundamentalista e acompanhamento de carteiras para ações, FIIs, Fiagros e ETFs. O projeto combina dados públicos, documentos oficiais de Relações com Investidores (RI), indicadores financeiros e agentes de IA para transformar informações dispersas em uma leitura estruturada do ativo.

Aplicação em produção: [fundamentu-ia.vercel.app](https://fundamentu-ia.vercel.app)

Repositório: [github.com/LeonardoVilla/fundamentu-ia](https://github.com/LeonardoVilla/fundamentu-ia)

> Projeto de portfólio. As análises são informativas e não constituem recomendação de investimento.

## O que o projeto demonstra

- Construção de uma aplicação full-stack moderna com Next.js e React.
- Integração de IA em um fluxo de pesquisa com múltiplos agentes e fallback entre provedores.
- Crawler server-side para páginas públicas de RI e descoberta de documentos oficiais.
- Extração de texto de páginas HTML e PDFs, com identificação de ITR, DFP, fatos relevantes e apresentações.
- Cálculo determinístico de indicadores e pontuação por método de análise.
- Complementação controlada por dados públicos quando o RI não informa determinado indicador.
- Autenticação com Google OAuth e persistência de dados por usuário.
- Importação de carteiras em XLSX, XLS, CSV e PDFs de posição de renda fixa/previdência.
- Preparação de dados para organização do IRPF, incluindo documentos, operações, rendimentos e patrimônio.
- Deploy serverless na Vercel com banco Turso compatível com SQLite.

## Arquitetura da aplicação

O projeto usa o App Router do Next.js. As páginas React cuidam da experiência do usuário, enquanto as Route Handlers em `app/api` concentram autenticação, persistência, coleta de dados e integração com serviços externos.

```text
Interface React / Next.js
          |
          +-- páginas de análise, carteira, configurações e IRPF
          |
          +-- Route Handlers /api
                  |
                  +-- autenticação Google
                  +-- crawler de RI e PDFs
                  +-- orquestração dos agentes de IA
                  +-- indicadores e pontuação
                  +-- importação de carteira
                  +-- Drizzle ORM
                          |
                          +-- Turso / libSQL
```

## React e Next.js

O front-end é construído com React 19 e componentes Client do Next.js. A interface usa estado local para controlar busca de ativos, seleção de método, status de rastreio, importação de arquivos e atualização dos resultados sem recarregar toda a página.

O Next.js é utilizado em diferentes responsabilidades:

- App Router para organizar as áreas da aplicação.
- Server Components e Client Components conforme a necessidade de interatividade.
- Route Handlers para APIs internas autenticadas.
- Metadata e ícones nativos da aplicação.
- Build otimizado e deploy serverless na Vercel.
- `next/font` para carregamento consistente das fontes.

As páginas principais são:

- `/` — análise de um ativo, indicadores, documentos e notícias.
- `/analises` — histórico de análises realizadas.
- `/carteira/importar` — importação e visão consolidada da carteira.
- `/configuracoes/ia` — credenciais e ordem de uso dos provedores de IA.
- `/configuracoes/agentes` — configuração dos agentes especializados.
- `/imposto-renda` — organização de documentos e lançamentos para o IRPF.

## Integração de IA

A IA não é usada apenas para gerar texto. Ela participa de um pipeline de análise com etapas separadas, permitindo rastreabilidade e substituição de provedores:

1. O usuário informa o ticker e o tipo do ativo.
2. O sistema identifica ou recupera a URL oficial do RI.
3. O crawler consulta a página pública e descobre documentos relacionados.
4. PDFs e páginas HTML são convertidos em texto para análise.
5. O extrator identifica métricas como ROE, ROIC, P/L, P/VP, margem, dívida e fluxo de caixa.
6. Dados públicos complementares são buscados somente quando o RI não fornece o indicador.
7. Regras determinísticas calculam a pontuação do método escolhido.
8. Agentes de IA produzem a síntese, os principais achados, riscos e pontos de atenção.
9. A análise, as fontes, os documentos e as execuções dos agentes são persistidos no banco.

### Orquestração e fallback

Os provedores são configuráveis pela interface. A ordem de uso pode ser alterada e o sistema tenta o próximo provedor quando a IA principal falha, está sem credencial, encontra limite de cota ou retorna uma resposta inválida.

O desenho suporta:

- DeepSeek para sínteses econômicas e classificação com baixo custo.
- OpenAI para análises e geração de texto mais robustas.
- Google Gemini para tarefas multimodais e uso de cota gratuita.
- Claude para leitura cuidadosa de documentos extensos.

As chaves não são exibidas novamente após o cadastro. Elas são armazenadas cifradas no servidor usando `AI_CREDENTIALS_ENCRYPTION_KEY`. O código-fonte contém somente a lógica de criptografia/descriptografia e nunca as chaves reais.

## Métodos de análise

O sistema possui métodos selecionáveis conforme a classe do ativo:

- Convergência fundamentalista: valor, qualidade, crescimento e risco.
- Décio Bazin: dividend yield, preço-teto, consistência e endividamento.
- Benjamin Graham: valor, liquidez, dívida e margem de segurança.
- Buffett/Munger: ROIC, fluxo de caixa, margens e vantagem competitiva.
- Piotroski F-Score: nove sinais contábeis de força financeira.
- Magic Formula: earnings yield e retorno sobre capital.
- Fluxo de caixa descontado (DCF): FCF, WACC, crescimento e valor terminal.
- FII/Fiagro: yield, P/VP, vacância, inadimplência e qualidade dos ativos.
- ETF: taxa, liquidez, composição e diferença de acompanhamento.

As regras de pontuação ficam separadas da síntese textual da IA. Isso permite comparar a explicação gerada pelo agente com uma avaliação reproduzível baseada nos indicadores encontrados.

## RI, fontes e transparência dos dados

As URLs de RI podem ser cadastradas por ticker e reutilizadas nas análises seguintes. A aplicação salva:

- URL e título da fonte;
- documentos descobertos;
- tipo de documento;
- trecho textual coletado;
- métricas encontradas;
- data da análise;
- provedor e execuções dos agentes;
- pontuação por regras e pontuação da síntese.

Quando um indicador não está no RI, a aplicação pode usar uma fonte pública complementar. Esse dado é marcado separadamente como fonte pública, preservando a distinção entre informação oficial da empresa e informação externa.

## Carteira e importações

A carteira aceita arquivos gerados por corretoras e pela B3:

- XLSX;
- XLS;
- CSV;
- PDF de posição de renda fixa;
- PDF consolidado de previdência privada.

O importador reconhece diferentes abas e classes, incluindo ações, BDRs, ETFs, FIIs, renda fixa, Tesouro Direto e previdência. O valor importado é preservado como referência da posição, evitando que uma cotação de mercado posterior altere silenciosamente o valor histórico do arquivo.

Quando a planilha B3 e um PDF representam a mesma renda fixa, o resumo evita a dupla contagem. Os documentos continuam armazenados para consulta e para o módulo de IRPF.

## ORM e banco de dados

O acesso ao banco é feito com Drizzle ORM e `@libsql/client`:

- Drizzle fornece tipagem TypeScript para tabelas e consultas.
- O schema central fica em `lib/db/schema.ts`.
- As migrações ficam versionadas na pasta `drizzle/`.
- O dialeto usado é Turso/libSQL, compatível com SQLite.
- Consultas usam filtros, joins, ordenação, upsert e transações suportadas pelo Drizzle.

Principais grupos de dados persistidos:

- usuários e autenticação;
- provedores e ordem dos agentes de IA;
- fontes de RI e análises;
- documentos e execuções dos agentes;
- importações e posições de carteira;
- documentos, operações e rendimentos do IRPF.

Essa abordagem evita SQL espalhado pela aplicação, mantém o schema revisável no Git e permite evoluir a estrutura do banco através de migrações reproduzíveis.

## Segurança

- Segredos são lidos por variáveis de ambiente.
- `.env*`, tokens, credenciais Google, banco local e arquivos `.pem` são ignorados pelo Git.
- As chaves de IA são cifradas antes de serem persistidas.
- As APIs exigem sessão autenticada nas operações de usuário.
- URLs de RI são validadas como HTTPS públicas antes do crawler.
- O crawler possui limites de tempo para evitar requisições presas.
- O repositório público não contém credenciais de produção.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha os valores:

```env
DATABASE_URL=libsql://seu-banco.turso.io
DATABASE_AUTH_TOKEN=seu-token-do-turso
AUTH_SECRET=um-segredo-aleatorio
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-client-secret
AI_CREDENTIALS_ENCRYPTION_KEY=chave-base64url-de-32-bytes
BRAPI_API_KEY=opcional
```

No Vercel, as mesmas variáveis devem ser cadastradas nos ambientes necessários. Nunca publique o conteúdo do `.env.local`.

## Desenvolvimento local

Requisitos: Node.js 20 ou superior e npm.

```bash
npm install
copy .env.example .env.local
npm run db:migrate
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`. O endpoint de saúde pode ser consultado em `http://localhost:3000/api/health`.

## Comandos úteis

```bash
npm run dev          # ambiente de desenvolvimento
npm run test         # testes unitários com Vitest
npm run lint         # análise estática
npm run typecheck    # verificação de tipos TypeScript
npm run build        # build de produção
npm run check        # testes, lint, tipos e build
npm run db:generate  # gera uma nova migração Drizzle
npm run db:migrate   # aplica migrações
npm run db:studio    # abre o Drizzle Studio
```

## Deploy e versionamento

O repositório é público no GitHub e está conectado ao projeto da Vercel. O fluxo de atualização é:

```bash
git add .
git commit -m "Descreve a alteração"
git push
```

O push para a branch `master` dispara o build e o deploy automático na Vercel. Antes de publicar mudanças, execute `npm run check` e confirme que nenhuma credencial foi adicionada ao commit.

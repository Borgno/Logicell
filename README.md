# Logicell

Organizador das operações de transporte da Borgno. A planilha de operações do ERP é importada, cada
operação vai para a pasta do faturista responsável pelas regras de automação, e o time acompanha
status, comentários e prazo de emissão numa grid. A supervisão vê no dashboard quanto cada
faturista tem na mão.

## Estado atual

O app está sendo reconstruído sobre o template da organização (`Borgno/ModuloDefault`). A versão em
produção é a da branch `main`; nesta branch, a regra de negócio volta em etapas, no formato do
template. O banco de produção continua o mesmo. Por enquanto o app roda com os domínios do template
e os dados em memória.

## Stack

- **React 19** e **React Router 8** em framework mode, como SPA (`ssr: false`)
- **Hono** com `@hono/zod-openapi` no backend, no mesmo repositório
- **TanStack Query**, **react-hook-form** e **Zod**
- **Tailwind CSS 4** com componentes **shadcn/Radix** e o design system Chronos Mono Blue
- **Vitest** e **Playwright**
- **bun** como package manager

## Começar

Requisitos: Node.js 22.22 ou superior e bun 1.4.2 (fixado em `packageManager`).

```bash
bun install
cp .env.example .env   # preencha SESSION_SECRET (openssl rand -base64 48) e SEED_PASSWORD
bun run dev            # front em http://localhost:3000, API em :3001
```

Todo start recria dois usuários, com a senha de `SEED_PASSWORD`:

| E-mail             | Role  |
| :----------------- | :---- |
| `admin@local.test` | admin |
| `user@local.test`  | user  |

O `.env` de dev nunca aponta para o banco de produção.

## Comandos

```bash
bun run dev           # front e API juntos
bun run build         # build/client (SPA) e build/api (servidor)
bun run start         # roda o build de produção
bun run lint          # eslint, incluindo as regras de arquitetura
bun run lint:api      # Spectral sobre o contrato OpenAPI, com as regras de API
bun run format        # prettier
bun run typecheck     # tipos do front
bun run typecheck:api # tipos do servidor
bun run test          # vitest (test:run para rodar uma vez)
bun run test:e2e      # playwright contra o build de produção (porta 4173)
```

O CI (`.github/workflows/ci.yml`) roda todos eles em cada PR.

## Estrutura

```text
app/                  # frontend
├── routes.ts         # rotas
├── routes/           # telas; uma pasta quando a tela tem partes privadas (_components, _hooks)
├── components/       # ui (shadcn), layout, patterns, widgets
├── config/           # nome do app e navegação
└── lib/              # api, sessão, query client, tema, formatação
server/               # backend
├── app.ts            # monta o app: /api/health, /api/v1, erros, SPA em produção
├── routes/           # um módulo por recurso (routes, handlers, schemas, index, teste)
├── services/         # regra de negócio e todo acesso a dados
├── middleware/       # sessão e role
└── lib/              # store em memória, Problem Details, router
prisma/               # schema e migrations do sistema antigo
e2e/                  # testes do caminho do usuário
docs/                 # patterns e design system
```

## Como funciona

**Em desenvolvimento**, o Vite serve o front em `PORT` (3000) e faz proxy de `/api` para o Hono em
`API_PORT` (3001).
**Em produção**, um processo só: o Hono serve o SPA e a API na mesma porta, e qualquer URL fora de
`/api` devolve o `index.html`.

A arquitetura em uma frase de cada lado: no servidor, **só `services/` acessa dados**; no front, **só
`app/lib/api.ts` fala com o servidor**. O ESLint barra as duas violações com `ARCHITECTURE_VIOLATION`.

A VPS fica na Europa e o banco no Brasil, a uns 200 ms por ida. Toda rota tem as idas ao banco
contadas, e o que muda pouco fica em cache no processo.

## Documentação

- `CLAUDE.md` (e o symlink `AGENTS.md`): guia para agentes de código, com o vocabulário, as regras de
  banco e o fluxo de trabalho
- [docs/PATTERNS/BACKEND-ARCH.md](docs/PATTERNS/BACKEND-ARCH.md): camadas e módulo de domínio
- [docs/PATTERNS/API-DESIGN.md](docs/PATTERNS/API-DESIGN.md): regras da API e matriz de rotas
- [docs/PATTERNS/FRONTEND-ARCH.md](docs/PATTERNS/FRONTEND-ARCH.md): colocation, dados, sessão, formulários
- [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md): tokens, tipografia, componentes
- `.agents/skills/`: `backend-domain`, `new-screen` e a skill oficial `react-router`

## Deploy

`Dockerfile` multi-stage: build com bun e Node, runtime `node:24-alpine` como usuário `node`, com
`HEALTHCHECK` em `/api/health`. O `docker-compose.yml` é o do Dokploy: sem `ports:` publicadas, o
domínio é cadastrado na aba Domains. Até o fim da reconstrução,
produção segue com `main`.

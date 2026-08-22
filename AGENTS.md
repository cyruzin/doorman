<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## O projeto

**St. Tropez** é um sistema de gestão de portaria/condomínio (App Router,
100% TypeScript, roda local numa única máquina — sem Docker, sem Postgres).
Cadastra moradores (proprietários e inquilinos, com vínculo entre eles),
usuários do sistema (admin/porteiro) e mantém um grid dos 110 apartamentos
do prédio (19 andares, 6 unidades por andar, exceto o 19º com 2 coberturas).

Especificação original em `specs/`.

## Stack

- Next.js 16 (App Router, Turbopack) — **veja o aviso no topo deste arquivo**,
  a API pode ter mudado desde o treinamento do modelo
- Prisma 7 + SQLite via `@prisma/adapter-better-sqlite3` (driver adapter,
  `prisma.config.ts`, cliente gerado em `src/generated/prisma`)
- NextAuth v5 (beta), Credentials provider, sessão JWT com `role`/`id`
- Zod v4 (validação) + React Hook Form
- TanStack React Query v5 + Axios (`baseURL: "/api"`, `withCredentials: true`)
- Vitest + Testing Library
- CSS puro (CSS Modules por componente + `globals.css`/`src/styles` para tokens)

## Documentação para IA

- `.agents/ARCHITECTURE.md` — estrutura de pastas, fluxo de auth/permissões,
  padrões e armadilhas conhecidas do código
- `.agents/GIT_STANDARDS.md` — convenções de commit e branch
- `.agents/skills/` — skills de referência do Prisma (leia antes de mexer em
  CLI/Client do Prisma)

## Comandos essenciais

```bash
npm run dev            # servidor de desenvolvimento
npm run lint           # eslint
npm run test           # vitest
npx tsc --noEmit        # checagem de tipos
npx prisma migrate dev # aplicar/gerar migrações (não roda sozinho, ver ARCHITECTURE.md)
```

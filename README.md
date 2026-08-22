# St. Tropez

Sistema de gestão de portaria/condomínio: cadastro de moradores (proprietários
e inquilinos, com vínculo entre eles), usuários do sistema (admin/porteiro),
grid dos 110 apartamentos do prédio (19 andares) e backup do banco.

Roda localmente numa única máquina — sem Docker, sem Postgres (SQLite).

## Rodando o projeto

Requer um `.env` na raiz com:

```
DATABASE_URL="file:./dev.db"
```

```bash
npm install
npx prisma migrate dev   # aplica as migrações e gera o client
npx tsx scripts/seed-admin.ts [usuario] [senha]  # cria o super admin (padrão: admin/admin123)
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Testes e qualidade

```bash
npm run test           # vitest
npm run test:coverage  # vitest com cobertura
npm run lint           # eslint
npx tsc --noEmit       # checagem de tipos
```

## Documentação

- `AGENTS.md` — visão geral do projeto e stack para agentes de IA
- `.agents/ARCHITECTURE.md` — arquitetura, estrutura de pastas e padrões do código
- `.agents/GIT_STANDARDS.md` — convenções de commit
- `specs/` — especificação funcional original

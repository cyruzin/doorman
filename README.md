# St. Tropez

Sistema de gestão de portaria/condomínio: cadastro de moradores (proprietários
e inquilinos, com vínculo entre eles), usuários do sistema com permissões
editáveis por role (admin/porteiro), grid dos 110 apartamentos do prédio (19
andares), agendamento de salão de festas e mezanino, recados, relatórios e
backup do banco.

Roda localmente numa única máquina — sem Docker, sem Postgres (SQLite).

## Rodando o projeto

Guia completo (passo a passo, `.env`, build de produção, acesso por IP de
rede) em [`INSTALL.md`](./INSTALL.md). Resumo rápido:

```bash
npm install
# criar .env com DATABASE_URL e AUTH_SECRET — veja INSTALL.md, passo 2.1
npx prisma migrate dev && npx prisma generate
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

- `INSTALL.md` — guia de instalação em outra máquina, do zero
- `AGENTS.md` — visão geral do projeto e stack para agentes de IA
- `.agents/ARCHITECTURE.md` — arquitetura, estrutura de pastas e padrões do código
- `.agents/GIT_STANDARDS.md` — convenções de commit
- `specs/` — especificação funcional original

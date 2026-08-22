# Spec do Projeto — Doorman System (Sistema de Portaria)

## Instruções para o Claude (execução)

Este documento é a especificação completa para criar este projeto **do zero** nesta máquina. Percorra as seções na ordem (Backend → Frontend), marcando `[x]` em cada checkbox conforme for completando. Se algum item depender de uma decisão não coberta aqui (ex: campos exatos de um modelo), pare e pergunte antes de assumir.

- Nome sugerido do projeto/pasta raiz: `doorman-system`
- Todo nome de pasta, arquivo e identificador de código deve estar em inglês (US)
- Projeto 100% TypeScript
- Roda localmente, single machine (sem Docker, sem Postgres)

---

## 1. Backend

### 1.1 Setup inicial
- [ ] Inicializar projeto Next.js (App Router) com TypeScript
- [ ] Configurar ESLint + regras TypeScript
- [ ] Estrutura de pastas base (`src/app`, `src/modules`, `src/lib`, `src/types`)

### 1.2 Banco de dados e ORM
- [ ] Instalar Prisma + SQLite (`prisma`, `@prisma/client`, `better-sqlite3`)
- [ ] Definir modelo `User` (id, username, passwordHash, role, createdAt)
- [ ] Enum `Role`: `ADMIN`, `DOORMAN` (extensível para novos perfis)
- [ ] Definir modelo `Tenant` (inquilino) — campos a confirmar com o usuário
- [ ] Definir modelo `Owner` (proprietário) — campos a confirmar com o usuário
- [ ] Rodar migração inicial

### 1.3 Autenticação
- [ ] Instalar Auth.js (NextAuth v5) com Credentials provider
- [ ] Hash de senha com bcrypt
- [ ] Sessão via JWT contendo `role` do usuário
- [ ] `middleware.ts` protegendo rotas que exigem sessão válida

### 1.4 Permissões
- [ ] Criar `lib/permissions.ts` com matriz de permissões baseada em código (não em banco)
- [ ] Função `can(role, resource, action)`
- [ ] Recursos: `tenants`, `owners`, `users`, `backups`
- [ ] Regra: `DOORMAN` pode `create`/`read`/`update` em `tenants` e `owners`, mas **não** `delete`
- [ ] Regra: `ADMIN` tem acesso total a todos os recursos
- [ ] Regra: `backups` só é acessível por `ADMIN` (`create`, `read`, `delete`)

### 1.5 API Routes (REST, consumidas pelo React Query no frontend)
- [ ] `/api/auth/*` (Auth.js)
- [ ] `/api/tenants` (CRUD)
- [ ] `/api/owners` (CRUD)
- [ ] `/api/users` (CRUD — create/delete restrito a `ADMIN`)
- [ ] `/api/backups` (create, list com filtro por data, delete)
- [ ] Cada rota valida sessão + permissão via `can()` antes de executar

### 1.6 Sistema de backup
- [ ] Implementar backup nativo do SQLite via `better-sqlite3` (`.backup()`)
- [ ] Salvar arquivos em `./backups`
- [ ] Endpoint de listagem com filtro por data
- [ ] Retenção automática: manter apenas os últimos N backups (configurável, padrão 10)
- [ ] Acesso restrito a `ADMIN`

### 1.7 Validação
- [ ] Schemas Zod para todos os inputs de API (reaproveitar entre rotas quando possível)

---

## 2. Frontend

### 2.1 Design tokens (CSS puro)
- [ ] `styles/tokens.css` com variáveis CSS (custom properties)
- [ ] Paleta: primária (navy), secundária (dourado), semânticas (success/warning/danger/info), neutros
- [ ] Tipografia: fonte Inter via `next/font/google`
- [ ] Tamanhos fluidos com `clamp()`
- [ ] Modo escuro via atributo `[data-theme="dark"]` na tag `html`

### 2.2 Tema e preferências
- [ ] Toggle de modo noturno visível no menu superior ou lateral
- [ ] Persistir preferência de tema em `localStorage`
- [ ] Módulo/página "Preferences" no dashboard para configurações do usuário

### 2.3 Arquitetura modular
- [ ] `src/modules/` com um módulo por domínio: `auth`, `tenants`, `owners`, `users`, `backups`, `dashboard/preferences`
- [ ] Cada módulo contém: `components/`, `hooks/`, `api.ts`, `types.ts`, `__tests__/`
- [ ] Itens compartilhados entre módulos ficam fora, em `src/components/`, `src/hooks/`, `src/lib/`, `src/types/`
- [ ] `lib/axios.ts` — instância configurada (baseURL, `withCredentials` para cookie de sessão)
- [ ] `lib/query-client.ts` + Provider no layout raiz

### 2.4 Data fetching
- [ ] React Query + Axios para todas as requisições
- [ ] Hooks por módulo (ex: `useTenants`, `useCreateTenant`, `useDeleteTenant`)

### 2.5 Responsividade
- [ ] Layout totalmente responsivo (mobile, tablet, desktop)

### 2.6 Testes
- [ ] Setup Vitest + React Testing Library
- [ ] Testes de cada módulo dentro do `__tests__/` do próprio módulo
- [ ] Testes de componentes/hooks compartilhados dentro de suas respectivas pastas
- [ ] Script `test` no `package.json`
- [ ] Script `test:coverage` no `package.json`
- [ ] Script `lint` no `package.json`

### 2.7 Itens adicionais discutidos
- [ ] Sistema de toast/notificação para feedback de ações CRUD
- [ ] Confirmação antes de ações destrutivas (reaproveitar o padrão já usado pelo usuário de guardar a função no state via `useState` antes de executar)
- [ ] Formulários com React Hook Form + Zod
- [ ] `error.tsx` / `not-found.tsx` para tratamento global de erro
- [ ] Reaproveitar `can()` no client para esconder/desabilitar ações sem permissão (sempre validado no server também)
- [ ] Acessibilidade: contraste adequado no modo escuro, foco visível na navegação por teclado

---

## 3. Notas gerais
- Sem Docker, sem Postgres — decisão tomada por ser single machine na portaria
- Backup é a única funcionalidade de escrita em disco fora do banco — manter isolado em `./backups`
- Perfis (`ADMIN`, `DOORMAN`) devem ser fáceis de estender no futuro sem migração de banco

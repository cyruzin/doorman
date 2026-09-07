# Arquitetura

## Estrutura de pastas

```
src/
  app/              rotas do App Router
    (dashboard)/    páginas autenticadas (layout com nav)
    api/            API routes (REST, consumidas via React Query + Axios)
    login/          página pública de login
  modules/          um módulo por domínio: apartments, auth, backups, home,
                    mezanino, notices, owners, people, permissions, reports,
                    residents, scheduling, users
                    cada módulo: components/, hooks/, api.ts, types.ts, __tests__/
  components/       componentes compartilhados entre módulos (nav, toast,
                    confirm, pagination, search-input, providers)
  lib/              utilitários compartilhados (auth, api-guard, permissions
                    (tipos) + permissions-db (dados), prisma, axios,
                    query-client, building, backup, pagination, reports,
                    scheduling, resident-owner, contact-writes...)
  hooks/            hooks compartilhados
  styles/           tokens CSS (cores, espaçamento, tipografia)
  types/            tipos compartilhados
  generated/prisma/ cliente Prisma gerado (gitignored, `npx prisma generate`)
  proxy.ts          gate de autenticação (substitui middleware.ts no Next 16)
prisma/
  schema.prisma
  migrations/
scripts/
  seed-admin.ts     cria/reseta o usuário super admin de recuperação
```

## Autenticação e permissões

- NextAuth v5 (Credentials provider), sessão JWT carregando `role` e `id`.
  Login tem rate limit em memória por username (`src/lib/auth.ts`).
- `src/proxy.ts` protege as páginas do dashboard, redirecionando para
  `/login` quando não autenticado. As rotas `/api/**` são **excluídas** do
  matcher de propósito — elas validam sessão e permissão sozinhas (via
  `src/lib/api-guard.ts`) e devem responder JSON 401/403, nunca um redirect
  HTML.
- Permissões são **por role, editáveis em banco** (tabela `RolePermission`),
  não mais uma matriz hardcoded. `src/lib/permissions.ts` só tem os tipos
  (`Resource`, `Action`, `RESOURCES`, `ACTIONS`); `src/lib/permissions-db.ts`
  tem `can()`/`getPermissionsMatrix()`/`setPermissionsMatrix()`, usados pelo
  `api-guard.ts` e pela rota `/api/permissions`. Recursos: `residents`,
  `owners`, `users`, `backups`, `mezanino`, `scheduling`, `reports`,
  `notices`. Um admin edita a matriz pela tela **Usuários > Permissões**
  (switches); o `PUT` bloqueia remover `users:read`/`users:update` do ADMIN
  pra evitar lockout do próprio painel.
- No client, `usePermissions()` (`src/modules/permissions/hooks/use-permissions.ts`)
  busca a matriz via React Query e expõe `can(resource, action)` — é o que
  toda página/nav usa hoje, não mais um `can(role, ...)` síncrono.
- O usuário `isSuperAdmin` (criado por `scripts/seed-admin.ts`) não pode se
  auto-deletar nem perder o papel de ADMIN — proteção contra lockdown do
  sistema.
- **Logout automático por troca de turno (6h/18h)**: sessões abertas antes
  da última troca contam como expiradas. `src/lib/shift.ts` tem a lógica de
  horário; a aplicação de verdade é em `src/proxy.ts` (server, a cada
  request — `isAuthed = !!req.auth && !isSessionExpiredByShift(...)`). O
  hook `useShiftAutoLogout` (`src/modules/auth/hooks/`) só dá a experiência
  client (dispara `signOut()` na hora certa e num recheck de segurança de
  60s, sem esperar o usuário navegar); antes do `signOut()` ele registra um
  recado automático no mural via `POST /api/notices/shift-logout`
  (`Notice.isAutomatic`, que a rota de delete já protege contra exclusão).

## Banco de dados

- Prisma 7 com driver adapter (`@prisma/adapter-better-sqlite3`), configurado
  em `prisma.config.ts` (não no `schema.prisma`). SQLite local, sem Docker.
- Depois de rodar uma migração (`npx prisma migrate dev`), o client **não**
  é gerado nem populado automaticamente — rode `npx prisma generate` e, se
  precisar do super admin, `npx tsx scripts/seed-admin.ts` manualmente.
- Backup é feito via `.backup()` nativo do `better-sqlite3`, salvo em
  `./backups`, com retenção configurável dos últimos N arquivos. É a única
  escrita em disco fora do banco.

## Data fetching

- React Query v5 para todo fetching client-side.
- Instância única do Axios (`src/lib/axios.ts`), `baseURL: "/api"`,
  `withCredentials: true` para o cookie de sessão.
- Hooks por módulo (`useTenants`, `useCreateTenant`, etc.) dentro de
  `modules/<domínio>/hooks`.

## Padrões e armadilhas conhecidas

- **Zod + React Hook Form**: não use `.default()`/`.transform()` em schemas
  que também servem de generic para `useForm<Schema>` com `zodResolver` — o
  tipo de entrada esperado por `handleSubmit` precisa bater com o tipo de
  saída do schema, e `.transform()`/`.default()` cria divergência
  input≠output que quebra a tipagem. Se precisar normalizar um campo (ex.
  `ownerId`), faça isso fora do schema (`src/lib/resident-owner.ts`).
- **CSS Modules + classes globais**: classes string simples como `"card"`,
  `"btn"`, `"form-field"` (definidas em `globals.css`) só são reconhecidas
  dentro de um `.module.css` via `:global(.form-field)` — sem isso o nome
  vira um hash e nunca casa.
- **Busca com botão de limpar**: use `<SearchInput>` (`src/components/search-input`)
  em vez de `<input type="search">` cru — o clear button nativo é inconsistente
  entre navegadores e já causou bug de clique/hover.
- **Especificidade CSS**: para sobrescrever uma regra global de outra tela
  (ex. `tbody tr:hover` usado pelas tabelas de dados) dentro de um módulo,
  escreva o seletor com o escopo do módulo (`.grid tbody tr:hover`) — ele
  ganha por especificidade sem precisar de `!important`.
- **ESLint `react-hooks/set-state-in-effect`**: acusa `setState` síncrono
  dentro do corpo de um `useEffect`. `setInterval`/`.then()` dentro do efeito
  são exceções válidas (o `setState` roda num callback assíncrono, não no
  corpo do efeito); copiar dado de uma query para state local via efeito não
  é — prefira estado derivado.
- Escritas um-para-muitos no Prisma (telefones, veículos de um morador) usam
  o padrão `{ deleteMany: {}, create: [...] }` para substituir a lista
  inteira numa única query de update.

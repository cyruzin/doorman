# Guia de instalação — St. Tropez

Este guia explica como colocar o projeto para rodar do zero em outra máquina,
incluindo o login padrão de administrador e como gerar uma build de produção
com mais performance.

O sistema roda localmente em uma única máquina — não precisa de Docker nem de
um servidor de banco de dados separado (usa SQLite).

## 1. O que precisa estar instalado

- **Node.js 20 LTS ou superior** (o projeto foi testado com a versão 22).
  Baixe em https://nodejs.org — o npm já vem incluído.
- **Git**, para clonar o repositório.
- **Ferramentas de build nativo** — só é necessário se o `npm install` falhar
  ao compilar o pacote `better-sqlite3` (ele já vem com binário pronto para
  as plataformas mais comuns, então normalmente não é preciso nada disso):
  - **macOS**: `xcode-select --install` (Command Line Tools).
  - **Linux (Debian/Ubuntu)**: `sudo apt install build-essential python3`.
  - **Windows**: instalar o pacote "Desktop development with C++" do Visual
    Studio Build Tools.

Não é necessário instalar PostgreSQL, MySQL ou qualquer outro banco — o
Prisma usa um arquivo SQLite local (`dev.db`), criado automaticamente.

## 2. Primeira execução (passo a passo)

```bash
# 1. Clonar o repositório
git clone <url-do-repositorio>
cd doorman

# 2. Instalar as dependências
npm install
```

### 2.1 Criar o arquivo `.env`

O `.env` não fica no repositório (é ignorado pelo Git por segurança). Crie um
arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="cole-aqui-o-segredo-gerado-no-passo-abaixo"

# necessário só se outras máquinas vão acessar pelo IP da rede (ex.: Raspberry
# Pi na portaria) em vez de localhost — ver seção 3.1
# AUTH_URL="http://192.168.0.236:3000"

# opcional — quantidade de backups mantidos (padrão: 10)
BACKUP_RETENTION=10
```

Gere um valor aleatório para o `AUTH_SECRET` (usado pelo NextAuth para
assinar a sessão) rodando:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Copie o resultado e cole no lugar de `cole-aqui-o-segredo-gerado-no-passo-abaixo`.
Nunca reutilize o mesmo segredo em mais de um ambiente.

### 2.2 Criar o banco de dados

```bash
# aplica as migrações e cria o arquivo dev.db
npx prisma migrate dev

# gera o cliente do Prisma (não é feito automaticamente pelo comando acima)
npx prisma generate
```

### 2.3 Criar o usuário administrador

O projeto não vem com nenhum usuário cadastrado — é preciso criar o primeiro
admin manualmente rodando o script abaixo:

```bash
npx tsx scripts/seed-admin.ts
```

Isso cria (ou reseta a senha de) um usuário administrador "de recuperação"
com as credenciais padrão:

```
Usuário: admin
Senha:   admin123
```

> **Recomendado**: depois do primeiro login, crie um usuário administrador
> próprio pela tela de **Usuários** e troque a senha deste `admin` de
> recuperação (ou pelo menos anote-a em local seguro). Esse usuário é
> especial — ele nunca pode ser excluído nem perder o papel de ADMIN, então
> ele serve como uma porta de entrada de emergência caso os outros usuários
> sejam perdidos. Se quiser um usuário/senha diferente logo de cara, rode o
> script passando os valores desejados:
> `npx tsx scripts/seed-admin.ts meu_usuario minha_senha`

### 2.4 Rodar o projeto

```bash
npm run dev
```

Acesse http://localhost:3000 e faça login com as credenciais do passo 2.3.

## 3. Build de produção (mais performance)

O `npm run dev` roda em modo desenvolvimento (mais lento, com recompilação a
cada mudança). Para rodar com performance de produção, gere uma build
otimizada:

```bash
# 1. Gerar a build de produção (otimizada e minificada)
npm run build

# 2. Rodar o servidor de produção
npm start
```

Por padrão o servidor de produção também sobe em http://localhost:3000
(ou na porta definida pela variável de ambiente `PORT`, se você quiser outra).

Pontos importantes para produção:

- Os passos 2.1 a 2.3 (criar `.env`, aplicar migrações/gerar o client e criar
  o admin) precisam ter sido feitos antes — o `next build`/`next start` não
  fazem isso automaticamente.
- O arquivo `.env` precisa existir no ambiente onde o `npm start` é
  executado (ele não é copiado para dentro da build).
- Para manter o servidor rodando em segundo plano e reiniciando sozinho caso
  caia (por exemplo, depois de um reboot da máquina), considere usar um
  gerenciador de processos como o [PM2](https://pm2.keymetrics.io/):
  ```bash
  npm install -g pm2
  pm2 start npm --name st-tropez -- start
  pm2 save
  pm2 startup   # configura para iniciar junto com o sistema
  ```

### 3.1 Acessando de outra máquina pelo IP da rede (ex.: Raspberry Pi na portaria)

Se o servidor roda numa máquina (Raspberry Pi, mini PC, etc.) e é acessado de
outros computadores pelo IP dela na rede local (ex.: `http://192.168.0.236:3000`)
em vez de `localhost`, é preciso adicionar mais uma variável ao `.env`:

```bash
AUTH_URL="http://192.168.0.236:3000"
```

Sem isso, o `next start` monta a URL de redirecionamento do logout como
`localhost`, e não como o IP real — funciona normalmente até o usuário clicar
em Sair, quando é jogado para `localhost:3000`, que não existe na máquina dele.
Ajuste o IP/porta no `AUTH_URL` para os valores reais da sua máquina, reinicie
o servidor (não precisa rebuildar, é lido em tempo de execução) e pronto.

Se o IP dessa máquina puder mudar (não tem reserva fixa no roteador), vale
reservar um IP fixo para ela — senão o `AUTH_URL` fica desatualizado.

## 4. Comandos úteis

```bash
npm run test            # roda os testes (vitest)
npm run test:coverage   # testes com relatório de cobertura
npm run lint            # eslint
npx tsc --noEmit         # checagem de tipos do TypeScript
```

## 5. Onde ficam os dados

- **Banco de dados**: `dev.db` na raiz do projeto (SQLite). Fazer backup
  desse arquivo é suficiente para preservar todos os dados do sistema — o
  próprio app também tem uma tela de **Backups** que gera cópias dele.
- **Backups automáticos**: pasta `backups/` na raiz (quantidade controlada
  pela variável `BACKUP_RETENTION` do `.env`).

## 6. Mais documentação

- `README.md` — visão geral rápida do projeto.
- `.agents/ARCHITECTURE.md` — arquitetura, estrutura de pastas e padrões do
  código (útil para quem for mexer no código-fonte).

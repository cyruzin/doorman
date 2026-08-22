---
name: prisma-database-setup
description: Guide for configuring Prisma with SQLite (this project's only database). Use when touching prisma.config.ts, the datasource block, or Prisma Client instantiation. Triggers on "sqlite setup", "prisma client setup", "database connection issues".
license: MIT
metadata:
  author: prisma
  version: "7.6.0"
---

# Prisma Database Setup (SQLite)

This project only uses SQLite via the `@prisma/adapter-better-sqlite3` driver
adapter — the PostgreSQL/MySQL/MongoDB/SQL Server/CockroachDB guides that ship
upstream with this skill were removed as not applicable here.

## When to Apply

Reference this skill when:
- Configuring connection strings and environment variables
- Troubleshooting database connection issues
- Generating and instantiating Prisma Client

## System Prerequisites

- **Node.js 20.19.0+**
- **TypeScript 5.4.0+**

## Configuration Files

1. **`prisma/schema.prisma`** — `datasource db { provider = "sqlite" }`, no `url`.
2. **`prisma.config.ts`** — holds the `DATABASE_URL` (`file:./dev.db`).
3. **`.env`** — `DATABASE_URL="file:./dev.db"`, loaded into `prisma.config.ts` via `dotenv/config`.

## Driver Adapter

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}
```

```typescript
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });
```

This project's singleton lives at `src/lib/prisma.ts`.

## Rule Files

```
references/sqlite.md               - SQLite provider setup details
references/prisma-client-setup.md  - Prisma Client generation and adapter wiring
```

## How to Use

Read `references/sqlite.md` for provider-specific notes, then
`references/prisma-client-setup.md` to complete client generation and adapter
setup. Re-run `prisma generate` after every schema change (not automatic in
Prisma 7).

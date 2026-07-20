# Hockey Planner — Scheduler de torneos FEHOCH

Asigna partidos de un torneo de hockey césped a un recurso escaso
(canchas × horarios) bajo restricciones reales. Caso práctico WhereX.

Arquitectura híbrida: un **motor determinístico** (`src/engine/`, TS puro y
testeable) separado de la capa de datos/UI. El LLM (Día 2) vive solo en
lenguaje natural + explicación, nunca asigna partidos.

## Estado — Día 0 (esqueleto end-to-end)

- ✅ Next.js 16 (App Router, TS) + Tailwind, un repo / un deploy
- ✅ Prisma 6 + Postgres (Supabase), `DATABASE_URL` (pooled 6543) + `DIRECT_URL`
- ✅ Schema: Club, Cancha (acceso por género), Categoría, Equipo, Partido
- ✅ Seed: Primera Varones A (8 equipos)
- ✅ Fixture: una rueda todos-contra-todos → 28 partidos
- ✅ Scheduler **naíf** (solo no-solapamiento de cancha) — el solver real es Día 1
- ✅ `POST /api/schedule` + grilla cancha × horario
- ⏳ Deploy a Vercel (ver abajo)

## Stack

TypeScript · Next.js 16 · Prisma 6 · Postgres (Supabase) · Tailwind 4

## Setup local

```bash
npm install
# crear .env con las dos URLs (ver seccion Variables de entorno)
npm run db:push     # crea las tablas en Supabase
npm run db:seed     # carga Primera Varones A
npm run dev         # http://localhost:3000  -> "Generar calendario"
```

## Variables de entorno (`.env`, NO se commitea)

```
# POOLED (Supavisor transaction, 6543) — runtime/serverless. pgbouncer=true.
DATABASE_URL="postgresql://postgres.<REF>:<PASS>@<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
# DIRECTA/session (5432) — migraciones y seed.
DIRECT_URL="postgresql://postgres.<REF>:<PASS>@<REGION>.pooler.supabase.com:5432/postgres"
```

> La password debe ir **URL-encoded** (`@`→`%40`, `!`→`%21`, etc.).

## Deploy a Vercel

1. Importar el repo en Vercel (framework Next.js autodetectado).
2. Setear `DATABASE_URL` y `DIRECT_URL` en Project → Settings → Environment
   Variables (mismos valores del `.env`).
3. Deploy. `postinstall` corre `prisma generate` automáticamente.
4. Una vez, contra la DB de prod: `npm run db:push && npm run db:seed`
   (o correrlos desde local apuntando al mismo Supabase).

## Motor de scheduling (`src/engine/`)

Módulo TS puro, sin imports de framework. Datos planos entran, datos planos
salen → testeable en aislamiento y portable a otro runtime.

- `generarFixture(equipoIds)` — una rueda (método del círculo).
- `generarSlots(bloqueMin, dias, desde, hasta)` — franjas de la ventana.
- `naiveSchedule(partidos, canchas, slots)` — Día 0: solo evita choques de
  cancha. Deliberadamente tonto (mete todo el sábado). El solver del Día 1
  agrega equipo/árbitro/acceso por género + restricciones blandas.

# Hockey Planner — Scheduler de torneos FEHOCH

Calendariza un semestre completo de hockey cesped (Torneo Clausura 2026)
asignando partidos a un recurso escaso (recintos × fechas × horas) bajo
restricciones reales. Caso practico WhereX.

Arquitectura hibrida: un **motor deterministico** (`src/engine/`, TS puro y
testeado) separado de una **capa LLM** (`src/lib/agente/`, fuera del engine) que
solo interpreta lenguaje natural y explica — nunca asigna partidos.

## Como funciona

- **Calendario** (`src/engine/calendario.ts`): la jornada N de cada categoria se
  juega en el N-esimo fin de semana del semestre. Bloqueos por **fecha concreta**.
- **Descomposicion**: el solver resuelve **cada fin de semana por separado**
  (~40 partidos), en milisegundos. Irrelevante el limite serverless.
- **Localia** (2.b): el recinto de un partido es el del local (o, cediendo, el de
  la visita) — nunca un tercero. El acceso por genero se cumple por construccion.
- **Solver** (`src/engine/solver.ts`): greedy + busqueda local sobre una funcion
  de puntaje (horas lindas, equidad, no ceder localia, sabado, huecos). Garantiza
  el 100% de las restricciones duras; reporta lo que no entra y por que.
- **Alternativas** (`src/engine/alternativas.ts`): dado un partido, propone los
  movimientos legales dentro de su fin de semana, rankeados. Si no hay ninguno,
  lo dice explicito (el problema del "martes por la noche").

## Stack

TypeScript · Next.js 16 · Prisma 6 · Postgres (Supabase) · Tailwind 4 · Vitest

## Setup local

```bash
npm install
# crear .env con DATABASE_URL (pooled 6543, ?pgbouncer=true) y DIRECT_URL (5432)
npm run db:push     # crea el schema en Postgres
npm run db:seed     # carga el torneo (idempotente; ~2-3 min contra Supabase remoto)
npm run dev         # http://localhost:3000
npm test            # 32 tests de invariantes del engine
```

El seed es **idempotente**: limpia (deleteMany en orden de dependencias) y
recarga, dejando siempre el mismo estado.

## Variables de entorno (`.env`, NO se commitea)

```
DATABASE_URL="postgresql://postgres.<REF>:<PASS>@<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<REF>:<PASS>@<REGION>.pooler.supabase.com:5432/postgres"
```
Ambos por el **pooler** (IPv4). El host directo `db.<ref>.supabase.co` es
IPv6-only y no siempre responde. Password **URL-encoded**. Nunca commitear valores.

## Deploy a Vercel

1. Importar el repo `Panchoapc/hockey-planner` (Next.js autodetectado).
2. Environment Variables: `DATABASE_URL` (6543, `?pgbouncer=true`) y `DIRECT_URL`
   (5432). Sin `pgbouncer=true` se agotan las conexiones serverless.
3. Deploy (`postinstall` corre `prisma generate`).
4. Una vez, contra la prod: `npm run db:push && npm run db:seed`.

## Guion de demo (5 pasos)

1. **Abrir la grilla** en un fin de semana concreto: recintos × horas, partidos
   coloreados por genero.
2. **Cambiar de fin de semana** con el selector: se ve que el calendario es real
   (fechas de agosto a diciembre, jornada N -> finde N).
3. **Correr el naif** ("Naif"): la grilla se rompe visiblemente — partidos en
   recintos ajenos, varones en canchas femeninas; el panel marca ~600 violaciones.
4. **Volver al solver** ("Motor real"): 520/520 agendados, **0 violaciones duras**,
   ~1.5 s, con las metricas de calidad al lado (horas lindas, carga por recinto).
5. **Tocar un partido**: aparecen las **alternativas** legales rankeadas y la
   **explicacion** en lenguaje natural. En un partido de un recinto saturado:
   "sin alternativas en este fin de semana" — el problema que motiva el proyecto.

## Metricas (escala real: 520 partidos, 7 categorias)

520/520 agendados, 0 violaciones duras, **0 cesiones de localia**, 100% horas
lindas, ~1.5 s total. **La capacidad alcanza; lo escaso es la calidad de los
horarios.** El recinto mas cargado es **Manquehue (10/14 por finde)** — hosta 13
equipos locales; el eje **Viña (STM)** concentra tres clubes. Ninguno satura al
partir realista, y el solver **nunca necesita ceder localia** — eso confirma el
diseño (la cesion es una excepcion, no una herramienta rutinaria).

## Alcance y limitaciones conocidas

- Sub14 (75 min) y Sub12 (70 min) corren en la **grilla uniforme de 90 min**
  (se desperdicia capacidad). Modelar bloques variables queda fuera de alcance.
- Media cancha de Sub12 (2 partidos en paralelo): no modelada; partido normal.
- Los colegios femeninos de Santiago se modelan como **recintos separados** (uno
  por club en `seed/recintos.seed.json`); la **cantidad y nombres exactos** siguen
  `TODO` por confirmar.
- La capa LLM corre **offline por reglas**; un LLM real es un drop-in opcional.

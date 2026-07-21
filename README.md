# Hockey Planner — Scheduler de torneos FEHOCH

Calendariza un semestre completo de hockey cesped (Torneo Clausura 2026)
asignando partidos a un recurso escaso (recintos × fechas × horas) bajo
restricciones reales. Caso practico WhereX.

Arquitectura hibrida: un **motor deterministico** (`src/engine/`, TS puro y
testeado) separado de una **capa LLM** (`src/lib/agente/`, fuera del engine) que
solo interpreta lenguaje natural y explica — nunca asigna partidos.

## Como funciona

- **Calendario** (`src/engine/calendario.ts`): la jornada N de cada categoria se
  juega en el N-esimo fin de semana del semestre. Los bloqueos son por **fecha
  concreta** (feriado, evento).
- **Descomposicion**: el solver resuelve **cada fin de semana por separado**
  (~12-40 partidos), en milisegundos. Irrelevante el limite serverless.
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
# crear .env con DATABASE_URL (pooled 6543) y DIRECT_URL (5432) — ver abajo
npm run db:push     # crea el schema en Postgres
npm run db:seed     # carga el torneo (idempotente: se puede correr N veces)
npm run dev         # http://localhost:3000
npm test            # 31 tests de invariantes del engine
```

El seed es **idempotente**: limpia (deleteMany en orden de dependencias) y
recarga, dejando siempre el mismo estado. Correrlo dos veces no duplica nada.

## Variables de entorno (`.env`, NO se commitea)

```
DATABASE_URL="postgresql://postgres.<REF>:<PASS>@<REGION>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<REF>:<PASS>@<REGION>.pooler.supabase.com:5432/postgres"
```
Password **URL-encoded**. Nunca commitear valores reales.

## Deploy a Vercel

1. Importar el repo `Panchoapc/hockey-planner` en Vercel (Next.js autodetectado).
2. Project → Settings → Environment Variables: pegar `DATABASE_URL` y
   `DIRECT_URL` (los mismos valores del `.env` local).
3. Deploy. `postinstall` corre `prisma generate`.
4. Una vez, contra la DB de prod: `npm run db:push && npm run db:seed`.

## Guion de demo (5 pasos)

1. **Abrir la URL** (o `npm run dev` local de respaldo). Se ve la grilla del
   primer fin de semana: recintos × horas, partidos coloreados por genero.
2. **Correr el naif** (boton "Naif"): la grilla se rompe — partidos en recintos
   ajenos, varones en canchas femeninas. El panel marca las violaciones duras.
3. **Correr el solver** (boton "Motor real"): 520/520 agendados, **0 violaciones
   duras**, ~1 s. Metricas de calidad (horas lindas, cesiones, carga por recinto).
4. **Cambiar de fin de semana** (selector): la vista cambia a otras fechas reales
   del semestre. Se ve como STM (Vina) se llena — cuello de botella real.
5. **Tocar un partido**: aparecen las **alternativas** legales rankeadas y la
   **explicacion** en lenguaje natural. En un partido saturado: "sin alternativas
   en este fin de semana" — el problema que motiva todo el proyecto.

## Alcance y limitaciones conocidas

- Sub14 (75 min) y Sub12 (70 min) corren en la **grilla uniforme de 90 min**
  (se desperdicia capacidad). Modelar bloques variables queda fuera de alcance.
- Media cancha de Sub12 (2 partidos en paralelo): no modelada; partido normal.
- Los colegios femeninos de Santiago se **colapsan en un recinto** (`colegios-stgo`,
  cantidad `TODO`). Su saturacion es artefacto del colapso, no un hallazgo real;
  el cuello de botella genuino es **STM (Vina)**.
- La capa LLM corre **offline por reglas**; un LLM real es un drop-in opcional.

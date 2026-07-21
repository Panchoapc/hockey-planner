# Prompt de handoff — Día 0

> Copiar y pegar al agente ejecutor. Un prompt por día del roadmap; este es el del Día 0.

---

Estoy construyendo un caso práctico técnico para una entrevista. Tengo 4 días y la entrega es el martes. El plan ya está escrito y decidido: tu trabajo es ejecutarlo, no rediseñarlo.

**Antes de escribir una línea de código, lee en este orden:**

1. `PLAN.md` — el plan completo (problema, arquitectura, restricciones, stack, roadmap)
2. `DATOS-TORNEO.md` — datos reales del torneo FEHOCH
3. `seed/torneo.seed.json` — datos estructurados para el seed

## Objetivo de ESTA sesión: Día 0 del roadmap

Un slice end-to-end, desplegado y funcionando. Nada más. El objetivo es tener el esqueleto completo atravesado hoy, no tener features.

**Definition of done:**

- Proyecto Next.js (App Router) + TypeScript, un solo repo
- Prisma + Postgres en Supabase, con `DATABASE_URL` (pooled, puerto 6543, transaction mode) y `DIRECT_URL` (directa, 5432) configuradas en `schema.prisma` desde el inicio
- Schema mínimo: `Club`, `Cancha` (con regla de acceso por género), `Categoria`, `Equipo`, `Partido`
- Seed que carga **Primera Varones A** (8 equipos) desde `seed/torneo.seed.json`
- Generador de fixture: una rueda todos contra todos → 28 partidos
- Scheduler **naíf**: asigna partidos a (cancha, horario) respetando **solo** no-solapamiento de cancha. Deliberadamente tonto — el solver real es del día 1
- Endpoint `POST /api/schedule` que lo ejecuta
- Una página que renderiza la grilla cancha × horario del resultado
- **Desplegado en Vercel, con la URL funcionando**

## NO hagas en esta sesión

- El solver real (restricciones blandas, búsqueda local, función de puntaje) → día 1
- La capa de agente LLM (parser de lenguaje natural, explicador) → día 2
- Autenticación, suite de tests exhaustiva, diseño visual elaborado
- `supabase-js`, Supabase Auth o RLS. **Prisma es el único camino de acceso a datos.**

## Restricción de arquitectura (no negociable)

El motor de scheduling vive en `src/engine/` como **módulo TypeScript puro**: funciones puras, sin imports de Next, de Prisma ni de ningún framework. Recibe datos planos y devuelve datos planos. La API route lo llama; el engine no sabe que la API existe.

Esto es deliberado: permite testear el motor aislado y moverlo a otro runtime sin tocarlo. No lo acoples "porque es más rápido".

## Cómo quiero que trabajes

- **Antes de empezar, dime tu plan en 5–10 líneas y espera mi OK.**
- Commits pequeños, con mensajes descriptivos.
- Si algo del `PLAN.md` no calza con la realidad al implementar, **para y pregunta**. No improvises cambios de arquitectura ni de stack.
- Los parámetros marcados "por confirmar" en `PLAN.md` §9 (cantidad de canchas, árbitros): usa el supuesto de trabajo y **déjalo marcado con un comentario `TODO:`**, no inventes datos como si fueran reales.
- Al terminar: dime qué quedó funcionando, qué no, y qué asumiste.

# Prompt de handoff — Día 1 (el solver real)

> Copiar y pegar al agente ejecutor. Continúa desde el Día 0 ya entregado.

---

Continuamos el proyecto. El Día 0 ya está hecho y verificado: scaffold Next + Prisma + Supabase, engine puro con round-robin y un scheduler naíf, grilla renderizando. Hoy es el **Día 1: el solver real**.

**Lee primero:** `PLAN.md` (sobre todo §5, el modelo de restricciones), `DATOS-TORNEO.md`, `seed/torneo.seed.json`, y el código existente en `src/engine/`.

## Contexto de QA del Día 0

Se auditó el Día 0. Resultado: el engine es genuinamente puro, el round-robin es correcto (verificado incluyendo el invariante de que cada jornada cubre los 8 equipos una vez), y los slots calculan bien el borde. **Un hallazgo a corregir hoy**, descrito abajo.

## Tarea 0 (primero) — arreglar la restricción mal ubicada

La regla de acceso por género (varones solo canchas CLUB; damas CLUB + COLEGIO) hoy vive como un `where` de Prisma **duplicado literalmente** en `src/app/api/schedule/route.ts` y `src/app/page.tsx`. Problemas: no es testeable como invariante, `CanchaInput.pool` se le pasa al engine y nunca se usa, y dos copias de una restricción dura van a divergir.

**Muévela al engine como única fuente de verdad.** El engine recibe todas las canchas y decide cuáles son elegibles según el género de la categoría. La route y la page dejan de filtrar. Debe quedar cubierta por un test.

## Tarea 1 — ampliar el seed a varias categorías

Hoy el seed carga solo Primera Varones A. **Con una sola categoría la mayoría de las restricciones son vacuas** (no hay contención de árbitros, ni intercalado sábado/domingo, ni agrupación por club). Carga **Primera Varones A + Primera Varones B + una categoría de Damas** (PLAN §9). Sin esto no puedes demostrar que el solver sirve.

## Tarea 2 — el solver

Reemplaza la asignación naíf por: **asignación greedy + búsqueda local** que mejora una **función de puntaje**.

**Restricciones DURAS — obligatorias, el solver las garantiza al 100%:**
- No solapamiento de cancha (ya existe).
- Un equipo no juega dos partidos a la vez, y respeta buffer entre los suyos.
- 2 árbitros por partido; ningún árbitro en dos partidos simultáneos.
- Acceso por género (Tarea 0).
- Ventana sáb/dom 08:00–19:00, con el bloque de duración según categoría.
- Fechas/horas bloqueadas (feriados, eventos masivos) — como input.
- Partidos pre-asignados (TV) — entran fijos y no se reoptimizan.

**Restricciones BLANDAS — vía función de puntaje, en este orden de prioridad:**
1. Horas fáciles de recordar: 13:00/13:30 (mejor) > 13:15/13:45 > otras.
2. Equidad: repartir los slots indeseables (08:00, 18–19h) entre equipos.
3. Preferencia por sábado, pero **intercalando géneros** (no femenino=sáb / masculino=dom).
4. Minimizar huecos muertos de cancha.

Si el tiempo aprieta, las duras y las blandas 1–2 son el núcleo; 3–4 son deseables.

**Infactibilidad:** si algo no cabe, el solver debe reportar **qué** no entró y **por qué** (qué restricción lo bloqueó). No falles en silencio ni tires una excepción genérica.

## Tarea 3 — tests de invariantes

Esto no es opcional: es el paso de verificación y la evidencia de que controlo la correctitud del solver, no que confío en él.

Configura un runner (`npm test`) y cubre como mínimo:
- Nunca dos partidos en la misma cancha/slot.
- Ningún equipo en dos partidos simultáneos.
- Ningún árbitro en dos partidos simultáneos; todo partido con exactamente 2.
- Ningún partido de varones en cancha COLEGIO.
- Ningún partido en fecha/hora bloqueada.
- Todo partido cae dentro de la ventana y respeta el bloque de su categoría.
- El round-robin sigue correcto (28 partidos / 7 jornadas / sin pares repetidos para 8 equipos).

## Tarea 4 — conservar el naíf como "antes"

**No borres `naiveScheduler.ts`.** Es un activo de la demo: en la presentación se corre el naíf (grilla visiblemente rota: equipos citados 3 veces a la vez, todo el sábado, domingo vacío), y después el solver real sobre los mismos datos. El contraste es el argumento.

Expón ambos, por ejemplo `POST /api/schedule` con un parámetro `?motor=naive|solver`, y que la UI permita alternar y mostrar las métricas de cada uno (choques, % en horas lindas, equidad, huecos).

## NO hagas hoy

- La capa de agente LLM (parser de lenguaje natural, explicador) → Día 2.
- Autenticación, diseño visual elaborado, optimizaciones de performance.
- `supabase-js`, Supabase Auth o RLS. Prisma sigue siendo el único acceso a datos.
- Agrupación por club y media cancha de Sub12: **solo si sobra tiempo** después de todo lo anterior.

## Restricción de arquitectura (sigue vigente)

El engine en `src/engine/` es un **módulo TypeScript puro**: funciones puras, sin imports de Next, Prisma ni framework. Toda la lógica de restricciones vive ahí, no en las routes. Si te tienta poner una restricción en un `where` de Prisma "porque es más rápido", ese es exactamente el error que arreglamos en la Tarea 0.

## Cómo quiero que trabajes

- **Antes de empezar, dime tu plan en 5–10 líneas y espera mi OK.**
- Commits pequeños y descriptivos.
- Si algo del `PLAN.md` no calza con la realidad al implementar, **para y pregunta**. No cambies arquitectura ni stack por tu cuenta.
- Parámetros sin confirmar: usa el supuesto y déjalo con `TODO:`. No inventes datos como si fueran reales.
- **No reportes como verificado nada que no hayas ejecutado.** Si dices "0 choques", que sea porque un test lo comprueba.
- Al terminar: qué quedó funcionando, qué no, qué asumiste, y el output de `npm test`.

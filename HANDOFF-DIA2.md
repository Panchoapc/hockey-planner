# Prompt de handoff — Día 2 (localía y recintos reales)

> Copiar y pegar al agente ejecutor. Continúa desde el Día 1 ya entregado y auditado.

---

Continuamos el proyecto. El Día 1 está hecho y **auditado**: el solver funciona (92/92 partidos, 0 violaciones duras verificadas de forma independiente, 20 tests verdes, engine puro). Hoy corregimos un hueco de modelo que descubrimos después de escribir tu handoff anterior.

**Lee primero:** `PLAN.md`, `DATOS-TORNEO.md` (sección 2.b, es nueva y es el centro de hoy), `seed/torneo.seed.json`, y el código en `src/engine/`.

## Resultado del QA del Día 1

Lo verificado y correcto: pureza del engine, regla de género centralizada en `eligibility.ts`, solver con 0 violaciones duras, tests coherentes con lo que declaran. No toques nada de eso salvo lo que se indica abajo.

**El hueco:** `grep` de `localía|recinto|región|sede` en `src/` y `prisma/` da **cero resultados**. La localía no existe en el modelo. Las canchas son placeholders genéricos (`Club 1..7`, `Colegio 1..7`) y el solver puede poner *Sport Francés vs PWCC* en "Club 5" — algo que en la realidad no ocurre jamás. No fue tu error: la regla se definió después. Hoy se arregla.

## Tarea 0 — arreglar la grilla horaria (rápido)

Con bloques de 90 min desde las 08:00 la grilla es 08:00, 09:30, 11:00, 12:30, 14:00, 15:30, 17:00: **nunca cae 13:00 ni 13:30**, que es justamente la preferencia declarada. Detectaste bien el conflicto.

**Fix:** arrancar la ventana a las **08:30** → 08:30, 10:00, 11:30, **13:00**, 14:30, 16:00, 17:30 (cierra 19:00). La preferencia de "horas fáciles de recordar" pasa a ser satisfacible y el scoring empieza a significar algo.

## Tarea 1 — modelar recintos y localía

### Recintos reales (reemplazan a `Club N` / `Colegio N`)

| Ciudad | Recinto | Admite varones |
|---|---|---|
| Santiago | Manquehue | sí |
| Santiago | PWCC | sí |
| Santiago | Sport Francés | sí |
| Santiago | U. Católica | sí |
| Concepción | CCC | sí |
| Concepción | CDA | sí |
| Viña del Mar | STM | sí |
| Santiago | canchas de colegios (damas) | no — `TODO:` confirmar cuáles |

Regla de acceso por género, **derivada**: un recinto admite varones si y solo si su club tiene equipo adulto masculino. Muchos nombres que suenan a club son colegios (COGS = Craighouse, Old Girls = Old Grangonian, Dunners = Dunalastair, STM = St. Margaret's).

### Localía

Cada equipo tiene un **recinto de localía**, que puede no ser de su club ni de su ciudad:
- **Kolbe (Temuco)** no tiene cancha: es local en **CCC (Concepción)**.
- **Viña HC, Sporting y STM** son todos locales en **STM**, el único recinto de Viña. Es el cuello de botella del torneo — que se vea en la demo.
- Manquehue tiene 5 equipos adultos masculinos (0, 1, 3 en A; 2, 4 en B) todos locales en un recinto.

### Regla dura del recinto

> El recinto de un partido debe ser el del **equipo local**. Si el local no puede recibir, **cede localía** y se juega en el recinto de la **visita**. Nunca en el de un tercero.

Modélalo como: `recinto(partido) ∈ {recintoLocal(local), recintoLocal(visita)}`, con **default el del local** y la cesión como **penalización blanda** (es una excepción, no una opción gratis).

**Efecto secundario que debes aprovechar:** con localía modelada, la regla de género se satisface *por construcción* (un equipo masculino tiene su localía en un recinto que admite varones). Deja `eligibility.ts` como **validación/invariante**, no como filtro principal.

## Tarea 2 — semántica correcta de localía en el fixture

Dos casos, según el formato de la categoría:

**Doble rueda** (ej. Primera Varones A: 8 equipos, 14 partidos). La localía es **espejada**: si A recibe a B en la ida, B recibe a A en la vuelta. El balance 7/7 sale **estructuralmente**; no hay nada que optimizar.

**Rueda única** (ej. Sub19/Sub16/Sub14 A: 14 equipos, 13 partidos). Cada par se cruza una sola vez, así que **hay que decidir quién es local**, sujeto a:

> `|partidos_de_local − partidos_de_visita| ≤ 1` para todo equipo (13 partidos → 7/6).

**Bug actual a corregir:** la alternancia por paridad de jornada (`j % 2` en `roundRobin.ts`) **no equilibra**. Lo verifiqué con 8 equipos en rueda única: PWCC2 y U. Católica quedan 2 local / 5 visita — desbalance 3, cuando el máximo es 1. Necesitas una asignación de localía que respete la cota, no una alternancia ingenua.

## Tarea 3 — el solver respeta la localía

Agregar como **restricción dura**: el recinto asignado debe pertenecer a uno de los dos equipos. Y como **blanda**: preferir el recinto del local (penalizar la cesión).

El recurso escaso cambia de naturaleza: ya no son "las canchas" en abstracto, sino **la capacidad de fin de semana de cada recinto**, disputada por todos los equipos locales ahí. Espera que Viña y Manquehue se saturen — eso es correcto y es justamente lo que hay que mostrar.

Si la saturación vuelve infactible el calendario, **repórtalo con la razón**, no lo escondas: es un hallazgo del dominio, no un fallo del solver.

## Tarea 4 — tests de los nuevos invariantes

Agregar a la suite existente:
- Todo partido se juega en el recinto del local o en el de la visita, nunca en un tercero.
- Ningún partido de varones en un recinto que no admite varones.
- En rueda única: `|local − visita| ≤ 1` para todo equipo.
- En doble rueda: para cada par (A,B), A es local exactamente una vez y B exactamente una vez.
- La grilla contiene las 13:00 (regresión de la Tarea 0).

## NO hagas hoy

- La capa de agente LLM (parser de lenguaje natural, explicador) → **Día 3**.
- Replanificación / mover partidos → Día 3.
- Autenticación, diseño elaborado, `supabase-js`, Auth o RLS.
- Agrupación por club y media cancha Sub12: solo si sobra tiempo, y no va a sobrar.

## Restricción de arquitectura (sigue vigente)

El engine en `src/engine/` es un **módulo TypeScript puro**: sin imports de Next, Prisma ni framework. Toda la lógica de restricciones vive ahí. El mapeo equipo→recinto entra como **dato de entrada** al engine, no como consulta a la base desde adentro.

## Cómo quiero que trabajes

- **Antes de empezar, dime tu plan en 5–10 líneas y espera mi OK.**
- Commits pequeños y descriptivos.
- Si algo no calza al implementar, **para y pregunta**. No cambies arquitectura ni stack por tu cuenta.
- Datos sin confirmar: usa el supuesto y márcalo `TODO:`. **No inventes recintos ni equipos como si fueran reales.**
- **No reportes como verificado nada que no hayas ejecutado.**
- Conserva el motor naíf y el toggle: son el contraste de la demo.
- Al terminar: qué funciona, qué no, qué asumiste, y el output de `npm test`.

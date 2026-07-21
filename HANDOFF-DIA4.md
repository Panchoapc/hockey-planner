# Prompt de handoff — Día 4 (end-to-end, escala real y deploy)

> Copiar y pegar al agente ejecutor. Continúa desde el Día 3 ya entregado y auditado.
> **La presentación es el jueves 23 a las 14:00.** Hoy es el último día de trabajo real.

---

Continuamos. El Día 3 está hecho y **auditado**: verifiqué el calendario, el solver y las métricas ejecutando el código con chequeos propios, y todo coincide con tu reporte.

```
184/184 asignados · 0 sin cupo
DURAS → recinto 0 · equipo 0 · árbitro 0 · género 0 · bloqueo 0 · localía-ajena 0
Carga por recinto por finde → pico 6 (Manquehue) vs capacidad 14
Tiempo 181 ms total, peor finde 48 ms
Sensibilidad árbitros: 8/12/20/30 → 0 sin asignar en todos
```

El artefacto del Día 2 quedó resuelto y la corrección de los árbitros fue la correcta. Buen trabajo. **La base de datos ya está arreglada**, así que hoy se puede cerrar el circuito completo.

## Prioridad

Hoy manda el riesgo, no la elegancia. El orden es estricto: **si el tiempo se acaba, se para donde se llegó**, no se empieza lo siguiente a medias.

## Tarea 0 — verificar end-to-end contra Postgres (primero, sin excepción)

Nunca se ejecutó el circuito completo contra la base. Hazlo antes que nada:

`db push` → `db:seed` → levantar la app → confirmar en el navegador que la grilla renderiza, que el **selector de fin de semana** cambia lo que se ve, que el **toggle solver/naíf** cambia las métricas, y que el **panel de alternativas** responde.

Si algo del circuito está roto, arreglarlo es la prioridad absoluta. Todo lo demás es secundario a que la demo funcione.

## Tarea 1 — Primera Damas A pasa a rueda ÚNICA

El seed pone `rueda: "DOBLE"` para las tres categorías. Según el reglamento FEHOCH, **Primera Damas A juega una rueda por semestre** (ida el primero, vuelta el segundo). Está mal modelada.

Además, como las tres son DOBLE, **el camino de rueda única nunca se ejecuta en la demo**: toda la lógica de localía balanceada del Día 2 está testeada pero no se ve correr. Con este cambio la demo ejercita **los dos regímenes**.

Es un valor de configuración. Verifica después que el balance de localía en Damas quede en `|local − visita| ≤ 1`.

## Tarea 2 — cargar el bloque A de damas (escala real)

Con 3 categorías el pico de ocupación es 6 de 14: sobra 57% de capacidad. Por eso el solver saca 100% en horas lindas, spread 0 y 0 huecos — **no porque optimice bien, sino porque no está siendo exigido.** El contraste contra el naíf se ve en las restricciones duras, pero la optimización de calidad parece no tener trabajo.

Carga el **bloque A** (`DATOS-TORNEO.md` §3): los mismos 14 clubes presentan equipo en Sub19 A, Sub16 A, Sub14 A y Sub12 A-B, **rueda única** (91 partidos cada una).

Esto es lo que hace aparecer la contención de verdad, y en el lugar correcto: **Sporting y STM tienen cuatro equipos cada uno y los ocho juegan de local en el único recinto de Viña.** Ese es el cuello de botella real del torneo, y recién con el bloque A se puede ver.

**Simplificaciones que autorizo, decláralas como tales:**
- Sub14 (75 min) y Sub12 (70 min) van en la **misma grilla uniforme de 90 min**. Se desperdicia capacidad y es sabido: modelar bloques de largo variable no cabe en el tiempo que queda. Anótalo como limitación conocida.
- Media cancha de Sub12 (2 partidos en paralelo): **no la modeles**. Trátalos como partido normal.
- Recintos de los clubes de damas: donde no esté confirmado, marca `TODO:` y usa el supuesto más razonable. **No inventes recintos como si fueran dato.**

Después de cargar: vuelve a reportar factibilidad, carga por recinto **por fin de semana**, y las métricas de calidad. Si ahora sí satura algún recinto, **verifícalo antes de llamarlo hallazgo** — el error del Día 2 fue exactamente ese.

## Tarea 3 — deploy a Vercel

Pendiente desde el Día 0. Una sola app Next, un repo, un deploy, con `DATABASE_URL` (pooled, 6543) y `DIRECT_URL` (5432) en las variables de entorno de Vercel. Confirma que la URL en vivo levanta y renderiza la grilla.

## Tarea 4 — endurecer la demo

- El seed tiene que ser **reproducible e idempotente**: correrlo dos veces deja el mismo estado.
- La app debe funcionar **también en local** con la misma base, como respaldo si falla la red el jueves.
- Escribe en el README un **guion de demo** de 5 pasos: qué se abre, qué se toca y qué se muestra en cada uno. Corto y concreto.

## NO hagas hoy

- Nuevas capacidades del LLM (Claude real cableado, más intenciones del parser).
- Agrupación por club, escasez de árbitros regionales, alternativas en otro fin de semana.
- Refactors, mejoras de performance, rediseño visual.
- Cualquier cosa que no esté en las tareas 0 a 4.

## Restricción de arquitectura (sigue vigente)

El engine en `src/engine/` es un **módulo TypeScript puro**: sin imports de Next, Prisma ni framework. La capa LLM sigue fuera, en `src/lib/agente/`.

## Cómo quiero que trabajes

- **Antes de empezar, dime tu plan en 5–10 líneas y espera mi OK.**
- Commits pequeños y descriptivos.
- Si algo no calza, **para y pregunta**.
- Supuestos: márcalos `TODO:` y **repórtalos como incertidumbre**, no los fijes en el valor que confirma lo que esperas.
- **No reportes como verificado nada que no hayas ejecutado**, y no llames "hallazgo" a algo sin descartar antes que sea un artefacto del modelo.
- **Nunca escribas secretos en la salida.**
- Conserva el naíf y el toggle: son el contraste de la demo.
- Al terminar: qué funciona, qué no, qué asumiste, el output de `npm test`, la URL desplegada, y las métricas nuevas con la carga por recinto **por fin de semana**.

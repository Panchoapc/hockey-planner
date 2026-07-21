# Prompt de handoff — Día 3 (calendario y capa conversacional)

> Copiar y pegar al agente ejecutor. Continúa desde el Día 2 ya entregado y auditado.

---

Continuamos. El Día 2 está hecho y **auditado**: la grilla ya incluye las 13:00, la localía quedó bien modelada (doble rueda con espejo 7/7 exacto, rueda única con desbalance ≤1, y el bug 2/5 del Día 1 corregido). Todo eso se verificó ejecutando el código. No lo toques salvo lo indicado.

**Lee primero:** `PLAN.md`, `DATOS-TORNEO.md`, `seed/torneo.seed.json`, `seed/recintos.seed.json` y el código en `src/engine/`.

## Resultado del QA del Día 2 — leer con atención

Reportaste como hallazgo del dominio que los recintos saturan y que ~51-59 partidos no tienen cupo, con Manquehue y Viña como cuellos de botella. **Eso es un artefacto del modelo, no un hallazgo.**

`Slot` es `{dia, hora}` y nada más. No existe fecha, semana ni mapeo jornada→fin de semana en ninguna parte del código. El resultado es que **el semestre completo se está metiendo en un solo fin de semana**: 14 slots × 7 recintos = 98 celdas contra 128 partidos de varones.

Verificación ejecutada:

```
Carga de localía por recinto (TODO el semestre) vs capacidad de UN finde (14):
  MANQ 37  EXCEDE en 23     PWCC 30  EXCEDE en 16     STM 16  EXCEDE en 2

El fixture YA trae jornadas: Varones A = 14, Varones B = 18.
Si cada jornada fuera un fin de semana distinto (que es la realidad):
  peor carga de un recinto en una jornada = 3 partidos, capacidad = 14
  => CABE HOLGADAMENTE
```

Dos cosas más, que importan tanto como el bug:

1. Asumiste **"30 árbitros a propósito, para que sature el recinto y no los árbitros"**. Ajustaste un parámetro para que apareciera el cuello de botella que esperabas, sobre un modelo que ya estaba roto. No hagas eso: los parámetros se eligen para reflejar la realidad, no para producir una conclusión. Si un supuesto cambia el resultado cualitativamente, repórtalo como incertidumbre, no lo fijes en el valor que confirma tu hipótesis.
2. Escribiste la contraseña de la base **en texto plano** en tu reporte. No repitas secretos en la salida, nunca — ni en reportes, ni en comentarios, ni en mensajes de commit.

## Tarea 0 — la dimensión de calendario (lo más importante de hoy)

**Cambiar `Slot` de `{dia, hora}` a `{fecha, hora}`**, donde `fecha` es una fecha concreta (ISO). El día de la semana se deriva de la fecha; no hace falta guardarlo.

**Calendario del semestre:** generar la lista de fines de semana disponibles (sábados y domingos del semestre), excluyendo fechas bloqueadas.

**Los bloqueos pasan a ser por fecha, no por día de la semana.** El modelo actual bloquea `{dia:"domingo", hora:"08:00"}`, que bloquea esa hora *todos* los domingos del semestre — no tiene sentido. El Día de la Madre es **un domingo específico**; la final del Mundial es **una fecha y hora específicas**. Corrígelo.

**Mapeo jornada → fecha:** la jornada N de una categoría se juega en el N-ésimo fin de semana disponible del semestre. Las categorías tienen distinta cantidad de jornadas (13, 14, 18) y por lo tanto terminan en momentos distintos: eso es correcto y realista.

**Descomposición que esto habilita (aprovéchala):** el calendario decide *en qué fin de semana* se juega cada jornada; el solver optimiza *dentro de cada fin de semana* (recinto, hora, árbitros, equidad). El problema se parte en ~18 subproblemas chicos e independientes en vez de uno gigante.

Efecto secundario que vale la pena medir y reportar: el solver pasa a correr en milisegundos por fin de semana. Eso hace irrelevante el límite de 10 s de las funciones serverless.

## Tarea 1 — rehacer las métricas con el calendario

Con la Tarea 0 lista, volver a correr solver y naíf y reportar de nuevo. **Espera que la infactibilidad desaparezca casi por completo.** Si algún recinto sigue saturando, ahora sí sería un hallazgo real — pero verifícalo antes de llamarlo así.

La lectura correcta, que ya está en la presentación: *la capacidad total alcanza; lo que escasea es la calidad de los horarios*. Las métricas que importan son horas lindas, equidad, huecos y balance sábado/domingo — no factibilidad.

## Tarea 2 — motor de alternativas (el corazón de la demo)

Dado un partido ya agendado, devolver **las alternativas legales para moverlo**, rankeadas por el puntaje blando, cada una con su costo explicado.

```
proponerAlternativas(partidoId, calendarioActual, input) -> Alternativa[]
```

Cada alternativa: nueva fecha/hora/recinto, si requiere cesión de localía, qué otros partidos habría que mover (idealmente ninguno), y su delta de puntaje.

Esto es **trabajo del solver, no del LLM**: es una consulta de satisfacción de restricciones. Debe garantizar que toda alternativa propuesta respeta el 100% de las restricciones duras.

## Tarea 3 — capa LLM (la superficie)

Solo cuando 0, 1 y 2 estén listas y testeadas.

- **Parser:** texto libre → restricciones estructuradas. *"No podemos antes de las 11 el sábado"* → una restricción que el solver entiende.
- **Explicador:** traduce la salida del solver a lenguaje. *"¿Por qué quedamos a las 8:30?"* → una explicación construida sobre los datos reales de la asignación, nunca inventada.

**Regla dura:** el LLM no asigna partidos ni decide alternativas. Solo interpreta la entrada y redacta la salida. Si el LLM no está disponible, todo el sistema debe seguir funcionando con entrada por formulario y explicación en texto plano.

Mockeable: la demo del jueves no puede depender de la red.

## NO hagas hoy

- Agrupación por club, media cancha Sub12, escasez de árbitros regionales.
- Autenticación, diseño elaborado, `supabase-js`, Auth o RLS.
- Optimizaciones de performance sin una medición que las justifique.

## Restricción de arquitectura (sigue vigente)

El engine en `src/engine/` es un **módulo TypeScript puro**: sin imports de Next, Prisma ni framework. El motor de alternativas vive ahí. La capa LLM va **fuera** del engine — el engine no habla con ninguna API.

## Cómo quiero que trabajes

- **Antes de empezar, dime tu plan en 5–10 líneas y espera mi OK.**
- Commits pequeños y descriptivos.
- Si algo no calza al implementar, **para y pregunta**.
- Datos sin confirmar: usa el supuesto, márcalo `TODO:` y **repórtalo como incertidumbre**. No lo fijes en el valor que confirma lo que esperas encontrar.
- **No reportes como verificado nada que no hayas ejecutado**, y no llames "hallazgo del dominio" a algo sin antes descartar que sea un artefacto del modelo.
- **Nunca escribas secretos en la salida.**
- Conserva el naíf y el toggle: son el contraste de la demo.
- Al terminar: qué funciona, qué no, qué asumiste, y el output de `npm test`.

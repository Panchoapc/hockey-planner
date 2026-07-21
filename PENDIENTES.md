# Punch list final — antes del jueves 23, 14:00

> Ordenado por riesgo. Lo de arriba es bloqueante; lo de abajo es mejora.

---

## 1. El deploy no funciona (bloqueante, acción de Francisco)

`https://hockey-planner-wherex.vercel.app/` devuelve **404 de Vercel**, no de la app:

```
404: NOT_FOUND · ID: gru1::5jr6q-1784635124460-d7c45cbbe5bb
```

Vercel no tiene ningún deployment sirviendo ese dominio. **No es un problema del código.** Revisar en el dashboard de Vercel:

1. Pestaña **Deployments**: ¿el build falló, o nunca se promovió uno a producción?
2. **Framework Preset**: debe decir Next.js. Si dice "Other", no compila la app.
3. **Root Directory**: debe ser la raíz del repo (ahí está el `package.json`).
4. **Environment Variables**: `DATABASE_URL` (pooled, puerto **6543**, con `?pgbouncer=true`) y `DIRECT_URL` (session pooler, puerto **5432**). Sin `pgbouncer=true` se agotan las conexiones.

Si el build falla, el log dice por qué. Ese log es el que hay que leer, no el código.

---

## 2. Partir `colegios-stgo` en varios recintos (alta prioridad, agente)

Hoy los 46 equipos femeninos de clubes de Santiago comparten **un recinto ficticio**. Eso produce dos números falsos en el reporte:

- **Las 27-31 "cesiones de localía" son 100% artefacto.** Verificado por sensibilidad:

| Configuración | Cesiones | Pico por recinto/finde |
|---|---|---|
| 1 recinto (actual) | 31 | 14/14 en `colegios-stgo` |
| 3 recintos | **0** | 12/14 |
| 6 recintos | **0** | 10/14 (Manquehue) |
| 9 recintos | **0** | 10/14 (Manquehue) |

- Con cualquier cantidad realista, el solver **nunca necesita ceder localía**, y el cuello de botella real pasa a ser **Manquehue** (13 equipos locales) y **STM** (14 equipos de tres clubes). Esos sí son hallazgos.

**Acción:** partir el recinto femenino de Santiago en 4-6 recintos en `seed/recintos.seed.json` y volver a reportar. Marcar `TODO:` porque la cantidad real sigue sin confirmarse.

**Por qué importa:** decir el jueves "el solver tuvo que ceder localía 27 veces" es afirmar algo falso sobre el dominio — y es peor historia que la verdad, porque el deck presenta la cesión como excepción cara. Que nunca haga falta confirma el diseño.

---

## 3. Discrepancia en el panel de métricas (media, agente)

El reporte del agente y mi verificación independiente no coinciden para el naíf sobre los mismos 520 partidos:

| | Agente | Verificación independiente |
|---|---|---|
| choques de equipo | 0 | **100** |
| árbitro duplicado | 0 | 0 |
| género | 18 | 14 |
| recinto ajeno | 410 | 369 |
| **total** | **428** | **483** |

El solver está limpio en ambos conteos (0 violaciones), así que la conclusión no cambia. Pero **`calcularMetricas` parece sub-contar los choques de equipo**, y ese es el panel que se muestra en vivo. Si la grilla muestra un equipo dos veces y el panel dice "0 choques", queda mal.

**Acción:** revisar `metrics.ts`, en particular cómo cuenta choques de equipo, y por qué difiere de un conteo directo sobre las asignaciones.

---

## 4. Guion de demo en el README (media, agente)

Cinco pasos: qué se abre, qué se toca, qué se muestra. Corto y concreto. Sirve para ensayar y como respaldo si el jueves se pone nervioso.

Sugerencia de flujo:
1. Abrir la grilla en un fin de semana concreto.
2. Cambiar de fin de semana con el selector (se ve que el calendario es real).
3. Pasar a naíf: la grilla se rompe visiblemente.
4. Volver a solver: se arregla, con las métricas al lado.
5. Pedir alternativas para un partido: el sistema propone las legales y las explica.

---

## NO hacer

- Rediseñar la UI. Es funcional y alcanza. Una hora de ensayo vale más.
- Cablear el LLM real. El fallback determinístico ya funciona y no depende de red.
- Nuevas categorías, agrupación por club, media cancha Sub12.
- Cualquier refactor.

---

## Recordatorios para el jueves

- Tener el proyecto corriendo **también en local**. La URL es lindo tenerla, pero la demo no puede depender del wifi de la oficina.
- Grabar un **GIF o video corto** del flujo completo como respaldo final.
- Leer el deck completo una vez con la cabeza fresca antes de enviarlo.

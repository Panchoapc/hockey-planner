# Datos del torneo (extraídos del documento oficial FEHOCH 2026)

> Fuente: *"Sistemas de Torneo 2026 — Torneo Nacional / Torneo Clausura"*, Federación Chilena de Hockey sobre Césped (FEHOCH).
> **Alcance de nuestro proyecto:** modelamos **un semestre** = una rueda todos-contra-todos por categoría (la "primera rueda / fase regular"). No modelamos ascensos/descensos, promoción ni Final Four — el problema difícil de calendarización está en la fase regular. Usamos categorías, equipos, formatos y duraciones **reales** de este documento.

---

## 1. Duraciones de partido por categoría (corrige nuestro supuesto de bloque único)

El tiempo de juego **no es uniforme**. Del reglamento:

| Grupo de categorías | Formato de juego | Juego + descansos | Bloque sugerido (con shootout + rotación) |
|---|---|---|---|
| Primera y Intermedia Damas; Sub19; Sub16; **Primera Varones** | 4 × 15 min, descansos 2–10–2 | 60 + 14 = **74 min** | **90 min** |
| Sub14 (A–B–C–D) | 3 × 17 min, descansos de 5 min | 51 + 10 = **61 min** | **75 min** |
| Sub12 (A–B–C–D) | 3 × 17 min, descansos de 4 min | 51 + 8 = **59 min** | **70 min** (ver cancha) |

**Definición de empate (afecta el buffer entre partidos, porque alarga el fin):**
- Primera / Intermedia / Sub19 / Sub16: shoot-out a **5 penales**.
- Sub14: shoot-out a **3 penales**.
- Sub12: **challenge-shootout a muerte súbita** (hasta 3 por equipo; puede terminar empatado en fase regular).

## 2. Cancha y subdivisión (corrige el "÷4")

- Cancha oficial: sintética, **91,4 m × 55 m**, 11 jugadores por lado.
- **Sub12: se juega en MEDIA cancha oficial, 7 jugadores.** → una cancha oficial soporta **2 partidos Sub12 en paralelo**, no 4. (La subdivisión ÷4 aplica a categorías formativas aún menores, fuera de este documento.)
- Consecuencia para el solver: la "capacidad" de una cancha depende de la categoría — 1 partido adulto **o** 2 partidos Sub12 simultáneos en el mismo recinto.

## 2.b Localía y recintos (regla que cambia el modelo)

Un partido **no se asigna a cualquier cancha elegible**: se juega en el **recinto de localía del equipo local**. Y la localía puede estar en otra ciudad.

**Regla de acceso por género (derivada, no supuesta):** una cancha admite varones **si y solo si su club tiene equipo adulto masculino**. Muchos recintos con nombre de club son en realidad colegios (COGS = Craighouse, Old Girls = Old Grangonian, Dunners = Dunalastair, STM = St. Margaret's) y por eso son de uso femenino.

**Recintos que admiten varones:**

| Ciudad | Recintos |
|---|---|
| Santiago | Manquehue, PWCC, Sport Francés, U. Católica — **solo 4** |
| Concepción | CCC, CDA — 2 |
| Viña del Mar | STM — **1 sola** |
| Temuco | ninguno |

**Casos especiales de localía:**
- **Kolbe (Temuco) no tiene cancha**: juega de local en **CCC (Concepción)**.
- **Todos los clubes de Viña** (Sporting, STM, Viña HC) son locales en **la única cancha de Viña**. Es un cuello de botella severo: la localía de tres clubes, en todas sus categorías, pasa por un solo recinto con 14 bloques por fin de semana.

**Regla dura de localía:** el recinto de un partido **debe pertenecer a uno de los dos equipos que juegan** (o a su región si no tienen cancha propia). Nunca a un tercero. *Sport Francés vs PWCC jamás se juega en Manquehue*: uno de los dos pone su cancha, y si el local no puede, cede localía y se juega en la del otro — la regla se sigue cumpliendo.

**Implicancia para el solver:** los candidatos de recinto para un partido son solo `{cancha del local, cancha de la visita}`. El recurso escaso deja de ser "las canchas" y pasa a ser **la capacidad de fin de semana de cada recinto**, disputada por todos los equipos que son locales ahí.

**Localía: dos casos según el formato de la categoría.**

*Doble rueda* (ej. Primera Varones A: 8 equipos, 14 partidos). La localía es **espejada**: si A recibe a B en la ida, B recibe a A en la vuelta. El balance 7/7 sale **estructuralmente** — no hay decisión ni optimización posible, y la carga total de cada recinto queda fija.

*Rueda única* (ej. Sub19/Sub16/Sub14 A: 14 equipos, 13 partidos). Cada par se cruza una sola vez, así que **hay que decidir quién es local**, sujeto a `|local − visita| ≤ 1` (13 partidos → 7/6). Solo aquí la localía es una variable de decisión, y solo aquí se puede redistribuir contención entre recintos.

> **Corrección de una lectura previa:** se asumió que la localía era siempre una palanca libre para descomprimir Viña o Manquehue. Con localía espejada eso es falso: en las categorías a doble rueda la carga por recinto está determinada. Lo único flexible ahí es *cuándo* se juega cada pierna, no quién recibe.

**Árbitros:** modelo mixto con **fuerte centralización en Santiago**. El pool santiaguino es grande; los regionales son delgados. Los partidos en regiones quedan restringidos por árbitros, no por cancha.

**Capacidad por recinto:** sin tope práctico más allá de la ventana 08:00–19:00. El cálculo de ~7 bloques/día se mantiene válido.

**Contenciones concretas que esto produce:**
- **Viña:** un recinto para la localía de 3 clubes, en todas sus categorías.
- **Manquehue:** 5 equipos adultos masculinos (0, 1, 3 en Primera A; 2, 4 en Primera B) más los femeninos, todos locales en un recinto.

**Excepciones (deliberadamente fuera del schedule inicial):**
- Semifinales y finales: a veces se concentra todo en un club o recinto elegido.
- **Estadio Nacional:** canchas sin dueño, usables por cualquiera; principalmente semis y finales.
- Partidos televisados que la FEHOCH manda al Estadio Nacional: rompen la regla de localía a propósito.
- **Decisión de diseño:** no se modelan. Se exponen como **override manual del usuario**. El sistema modela la regla y ofrece una vía de escape explícita, en vez de intentar codificar cada excepción.

*Pendiente de confirmar: recinto de AIS (Antofagasta).*

## 3. Concepto de "BLOQUE" de club (insight de producto importante)

En Damas menores división A, los **mismos 14 clubes** presentan un equipo en **cada** categoría del bloque (Sub12 A, Sub14 A, Sub16 A, Sub19 A). Es decir, un club viaja como bloque completo.

**Implicancia:** conviene **agrupar los partidos de un mismo club (todas sus categorías) en el mismo recinto y día**, para minimizar viajes y logística. Esto se refuerza con una regla explícita del reglamento (§6). Es una restricción blanda fuerte y muy demostrable.

## 4. Reglas operativas del reglamento (§ Aspectos Generales) → restricciones del sistema

- **Cambios de horario:** deben confirmarse por mail de **ambos clubes** a más tardar **15 días antes**; después, el horario **no** se puede cambiar. → El sistema debe congelar horarios a T-15 días y forzar que todo cambio pase por acuerdo mutuo (esto ataca directamente el problema de las "recuperaciones nocturnas" improvisadas).
- **Coordinación intra-club:** *"verificar con otras ramas del club si hay partidos en paralelo, para coordinar horarios o recintos"* → restricción de no solapar partidos del mismo club/recinto y de agrupar por club (ver "bloque").
- **Programación TV/difusión:** la FEHOCH puede fijar día/hora/cancha por necesidades televisivas → algunos partidos vienen **pre-asignados/bloqueados** (input fijo para el solver).
- **Partidos pendientes:** deben recuperarse **antes de la última fecha** de la fase regular → el solver debe reservar holgura para recuperaciones dentro de fines de semana, no en noches de semana.

## 5. Categorías, equipos y formato (fase regular = nuestro semestre)

Partidos de una rueda simple = n(n−1)/2.

### Varones (categoría de Francisco)
| Categoría | Equipos | Formato oficial | Partidos (1 rueda) |
|---|---|---|---|
| Primera Varones A | 8 | 2 ruedas + Final Four | 28 |
| Primera Varones B | 9 | 2 ruedas + Final Four | 36 |

Equipos **Primera Varones A:** CCC 1, Manquehue 0, Manquehue 1, Manquehue 3, PWCC 1, PWCC 2, **S. Francés 1**, U. Católica.
Equipos **Primera Varones B:** CDA, Kolbe, Manquehue 2, Manquehue 4, PWCC 3, PWCC 4, Viña HC, **S. Francés 2**, STM.

### Damas Primera
| Categoría | Equipos | Partidos (1 rueda) |
|---|---|---|
| Primera Damas A | 8 | 28 |
| Primera Damas B | 8 | 28 |
| Primera Damas C | 8 | 28 |
| Primera Damas D | 7 | 21 |
| Intermedia Damas A | 8 | 28 |
| Intermedia Damas B | 8 | 28 |

**Sport Francés** aparece en: Primera Damas B (S. Francés A), Primera Damas C (S. Francés B), Intermedia Damas B (S. Francés).

### Damas menores (mucho más numerosas — confirma el "≈ doble de equipos que en varones")
| Categoría | Equipos | Partidos (1 rueda) |
|---|---|---|
| Sub19 Damas A (bloque) | 14 | 91 |
| Sub16 Damas A (bloque) | 14 | 91 |
| Sub16 Damas B | 19 | 171 |
| Sub14 Damas A (bloque) | 14 | 91 |
| Sub14 Damas B | 17 | 136 |
| Sub14 Damas C | 13 | 78 |
| Sub12 Damas A–B (bloque) | 14 | 91 |
| Sub12 Damas C | 19 | 171 |
| Sub12 Damas D1 | 12 | 66 |
| Sub12 Damas D2 | 10 | 45 |

**Bloque A (mismos 14 clubes en Sub12A/Sub14A/Sub16A/Sub19A):** Alumni, CCC, CDA, COGS, Dunners, Manquehue, Old Gabs, Old Girls, Old Reds, PWCC, **S. Francés**, Sporting, STM, U. Católica.

## 6. Lo que esto cambia en el plan

1. **Duración por categoría** (no un bloque único de 90 min) → el solver usa el bloque según categoría; los Sub12 caben 2-por-cancha.
2. **Escala real es grande** (Damas menores suman >1.000 partidos/semestre) → refuerza el argumento: hacerlo a mano es inviable; el valor está en optimizar calidad + equidad a esa escala.
3. **"Bloque" de club** → nueva restricción blanda de alto valor: agrupar por club/recinto/día.
4. **Regla de los 15 días** → mecanismo concreto contra el anti-patrón de recuperaciones nocturnas.
5. **Partidos pre-asignados por TV** → el solver acepta asignaciones fijas como input (no todo es libre).

## 7. Fuera de alcance (declarado explícito para la presentación)

Ascensos/descensos, promoción, Final Four, Copa de Plata, sistema de traspasos de jugadoras y listas de buena fe. Son reglas de **competencia**, no de **calendarización**; las nombramos como contexto pero no las modelamos.

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

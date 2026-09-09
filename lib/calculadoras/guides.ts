/**
 * Contenido estático de las guías de uso (Fase 5.1, §10-14). Texto corto,
 * orientado a estudiantes de Laboratorio Clínico — no es un manual extenso.
 */

export const DILUTION_GUIDE = `### ¿Para qué sirve?
Permite calcular cuánto volumen de una solución concentrada se necesita para preparar una solución más diluida.

### Fórmula
\`C₁ × V₁ = C₂ × V₂\`

### ¿Qué debo ingresar?
Elige qué variable quieres calcular e ingresa las otras tres: concentración inicial, volumen inicial, concentración final y volumen final.

### Ejemplo
Tengo una solución al 10 % y necesito preparar 100 mL al 2 %.

- C₁ = 10, C₂ = 2, V₂ = 100
- Resultado: V₁ = 20 mL, diluyente = 80 mL

### Consejo
Usa unidades compatibles y mantén los volúmenes en la misma unidad (mL).`;

export const CONCENTRATION_GUIDE = `### ¿Para qué sirve?
Permite calcular la concentración porcentual % m/v de una solución.

### Fórmula
\`% m/v = (gramos de soluto / mL de solución) × 100\`

### Ejemplo
5 g de soluto en 100 mL de solución → 5 % m/v.

### Consejo
No confundas el volumen de solución (soluto + disolvente) con el volumen de disolvente añadido.`;

export const PPM_GUIDE = `### ¿Para qué sirve?
Permite convertir concentraciones entre ppm y porcentaje.

### Conversión
\`1 % = 10 000 ppm\`

### Ejemplos
- 800 ppm = 0.08 %
- 0.1 % = 1000 ppm

### Consejo
La conversión es puramente matemática entre las dos formas de expresar una concentración; no cambia la magnitud física representada.`;

export const MOLARITY_GUIDE = `### ¿Para qué sirve?
Permite calcular la concentración molar de una solución.

### Fórmula
\`M = mol / L\`

Si conoces la masa: \`mol = masa (g) / masa molar (g/mol)\`

### Ejemplo
5.85 g con masa molar 58.5 g/mol en 1 L → 0.1 mol → 0.1 M.

### Consejo
Verifica que la masa molar corresponda realmente a la sustancia que estás usando.`;

export const UNITS_GUIDE = `### ¿Para qué sirve?
Convierte valores entre unidades habituales de masa, volumen o concentración.

### Masa
\`1 kg = 1000 g\`, \`1 g = 1000 mg\`, \`1 mg = 1000 µg\`

### Volumen
\`1 L = 1000 mL\`, \`1 mL = 1000 µL\`

### Concentración
\`1 % = 10 000 ppm\`

### Ejemplo
2.5 g → mg = 2500 mg

### Consejo
Solo se puede convertir dentro de la misma categoría (por ejemplo, no se puede convertir g a mL).`;

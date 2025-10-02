# Actualización de Campos de Entrada - Tamaño Base

## Cambios Realizados

Se han corregido y actualizado los campos de entrada de datos en las páginas de simulación para que reflejen correctamente el concepto de "tamaño base" con información sobre heap y stack.

## Archivos Modificados

### static-fixed.html
**Cambios:**
- ✅ Corregido HTML malformado en las líneas 4-6 del encabezado
- ✅ Actualizado campo de formulario:
  - **Antes:** "Tamaño (KB)"
  - **Después:** "Tamaño base (KiB)"
  - **Añadido:** Límite máximo de 832 KiB
  - **Añadido:** Texto explicativo: "Máximo 832 KiB (se añadirán 192 KiB de heap+stack automáticamente)"

### static-variable.html  
**Cambios:**
- ✅ Actualizado campo de formulario:
  - **Antes:** "Tamaño (KB)"
  - **Después:** "Tamaño base (KiB)"
  - **Añadido:** Límite máximo de 3908 KiB
  - **Añadido:** Texto explicativo: "Máximo 3908 KiB (se añadirán 192 KiB de heap+stack automáticamente)"
- ✅ Añadida sección `<div id="memoryInfo">` para mostrar información de heap/stack

## Formularios Actualizados

### Particiones Estáticas Fijas
```html
<div class="form-group">
    <label for="processSize">Tamaño base (KiB):</label>
    <input type="number" id="processSize" class="control-input" min="1" max="832" placeholder="Ej: 400">
    <small>Máximo 832 KiB (se añadirán 192 KiB de heap+stack automáticamente)</small>
</div>
```

### Particiones Estáticas Variables
```html
<div class="form-group">
    <label for="processSize">Tamaño base (KiB):</label>
    <input type="number" id="processSize" class="control-input" min="1" max="3908" placeholder="Ej: 1000">
    <small>Máximo 3908 KiB (se añadirán 192 KiB de heap+stack automáticamente)</small>
</div>
```

## Límites Establecidos

### Static Fixed (1024 KiB por partición):
- **Tamaño base máximo:** 832 KiB
- **Heap:** 128 KiB (automático)
- **Stack:** 64 KiB (automático)
- **Total máximo:** 1024 KiB

### Static Variable (4096 KiB partición más grande):
- **Tamaño base máximo:** 3908 KiB
- **Heap:** 128 KiB (automático)
- **Stack:** 64 KiB (automático)
- **Total máximo:** 4100 KiB

## Beneficios de los Cambios

### Claridad Conceptual:
- Los usuarios entienden que están ingresando solo el tamaño del programa
- Se explica claramente que heap y stack se añaden automáticamente

### Prevención de Errores:
- Límites máximos previenen la creación de procesos demasiado grandes
- Texto explicativo ayuda a entender las restricciones

### Consistencia:
- Misma terminología en ambas páginas
- Unidades KiB utilizadas consistentemente
- Formato de formulario unificado

## Funcionalidad JavaScript Compatible

Los campos actualizados son compatibles con el código JavaScript existente:
- `processSize` sigue siendo el ID del input
- La validación en JavaScript maneja correctamente el `baseSize`
- Los límites HTML complementan las validaciones JavaScript

## Estado de Implementación

- ✅ static-fixed.html - Completamente actualizado
- ✅ static-variable.html - Completamente actualizado  
- ⏳ dynamic-allocation.html - Pendiente de actualizar

## Próximos Pasos

1. Completar implementación de métodos en static-variable.js
2. Actualizar dynamic-allocation.html con los mismos campos
3. Aplicar cambios a dynamic-allocation.js
4. Probar funcionalidad completa de creación de procesos
5. Documentar comportamiento final del sistema
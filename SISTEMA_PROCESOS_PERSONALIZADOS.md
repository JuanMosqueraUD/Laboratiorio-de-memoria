# Sistema de Creación de Procesos Personalizados

## Descripción
Se ha implementado la funcionalidad de crear procesos personalizados en las simulaciones de memoria estática (tanto fija como variable), replicando el sistema que ya existía en la simulación de asignación dinámica.

## Archivos Modificados

### HTML
- **static-variable.html**: Añadida sección "Crear Proceso Personalizado" con formulario
- **static-fixed.html**: Añadida sección "Crear Proceso Personalizado" con formulario

### JavaScript
- **static-variable.js**:
  - Añadida propiedad `nextProcessId = 9` (después de los 8 procesos predeterminados)
  - Implementado método `createCustomProcess()` para crear nuevos procesos
  - Actualizado método `setupUI()` para manejar los elementos del formulario
  - Modificado método `reset()` para resetear procesos y contador de IDs
  
- **static-fixed.js**:
  - Añadida propiedad `nextProcessId = 7` (después de los 6 procesos predeterminados)
  - Implementado método `createCustomProcess()` para crear nuevos procesos
  - Actualizado método `setupUI()` para manejar los elementos del formulario
  - Modificado método `reset()` para resetear procesos y contador de IDs

### CSS
- **style.css**: Añadidos estilos para `.add-process-section` para mantener consistencia visual

## Funcionalidades Añadidas

### Formulario de Creación
- **Campo de Nombre**: Entrada de texto para el nombre del proceso
- **Campo de Tamaño**: Entrada numérica para el tamaño en KB (mínimo 1)
- **Botón Crear Proceso**: Ejecuta la validación y creación del proceso

### Validaciones
- **Nombre requerido**: El nombre del proceso no puede estar vacío
- **Tamaño válido**: El tamaño debe ser un número entero mayor que 0
- **Alertas informativas**: Mensajes claros para errores de validación

### Comportamiento
- **ID automático**: Los nuevos procesos reciben IDs únicos automáticamente
- **Segmentos por defecto**: Los procesos personalizados tienen un segmento "Tamaño total: XKB"
- **Integración completa**: Los procesos creados se comportan igual que los predeterminados
- **Reset funcional**: Al reiniciar, se vuelve a la lista original de procesos

## Uso
1. Ingresa el nombre del proceso en el campo correspondiente
2. Especifica el tamaño en KB
3. Haz clic en "Crear Proceso"
4. El proceso aparecerá en la lista y podrá ser iniciado/detenido como cualquier otro
5. Usa "Reiniciar Sistema" para volver a los procesos predeterminados

## Consistencia con Dynamic Allocation
El sistema implementado replica exactamente la funcionalidad de `dynamic-allocation.js`:
- Misma estructura de formulario HTML
- Mismas validaciones de entrada
- Mismo comportamiento de reseteo
- Mismos estilos CSS

## Procesos Predeterminados Preservados
- **Static Variable**: 8 procesos (ID 1-8)
- **Static Fixed**: 6 procesos (ID 1-6)
- Los procesos personalizados comienzan con IDs 9 y 7 respectivamente
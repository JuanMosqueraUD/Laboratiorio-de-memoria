# Implementación de Heap y Stack en el Laboratorio de Memoria

## Resumen de Cambios

Se han implementado heap y stack en el sistema de gestión de memoria, añadiendo 192 KiB adicionales a cada proceso (128 KiB de heap + 64 KiB de stack). También se han actualizado todas las unidades de KB/MB a KiB/MiB para mayor precisión.

## Constantes Añadidas

```javascript
const HEAP_SIZE = 128; // 128 KiB
const STACK_SIZE = 64;  // 64 KiB
```

## Cambios en la Clase Process

### Antes:
```javascript
constructor(id, name, size, segments) {
    this.size = size; // KB
}
```

### Después:
```javascript
constructor(id, name, baseSize, segments) {
    this.baseSize = baseSize; // KiB - tamaño base del programa
    this.heapSize = HEAP_SIZE; // KiB
    this.stackSize = STACK_SIZE; // KiB
    this.size = baseSize + HEAP_SIZE + STACK_SIZE; // Tamaño total en KiB
}

getMemoryBreakdown() {
    return {
        base: this.baseSize,
        heap: this.heapSize,
        stack: this.stackSize,
        total: this.size
    };
}
```

## Procesos Predeterminados Actualizados

Los tamaños base se han ajustado para que con heap+stack no excedan los límites de las particiones:

### Static Fixed (máximo 1024 KiB):
- Editor de Texto: 320 KiB base → 512 KiB total
- Navegador Web: 608 KiB base → 800 KiB total  
- Base de Datos: 408 KiB base → 600 KiB total
- Compilador: 208 KiB base → 400 KiB total
- Sistema Gráfico: 708 KiB base → 900 KiB total
- Servidor Grande: 708 KiB base → 900 KiB total

### Static Variable (particiones variables):
- Editor de Texto: 320 KiB base → 512 KiB total
- Navegador Web: 608 KiB base → 800 KiB total
- Base de Datos: 408 KiB base → 600 KiB total
- Compilador: 208 KiB base → 400 KiB total
- Sistema Gráfico: 708 KiB base → 900 KiB total
- Servidor Grande: 1308 KiB base → 1500 KiB total
- Sistema Masivo: 3508 KiB base → 3700 KiB total
- Aplicación Enorme: 3908 KiB base → 4100 KiB total

## Cambios en la Interfaz de Usuario

### Información Mostrada:
- **Configuración de Memoria** visible en cada página
- **Heap por proceso**: 128 KiB
- **Stack por proceso**: 64 KiB  
- **Overhead total por proceso**: 192 KiB

### Detalles de Procesos:
- **Tamaño base**: Tamaño original del programa
- **Heap**: 128 KiB (fijo)
- **Stack**: 64 KiB (fijo)
- **Tamaño total**: Base + Heap + Stack

### Formulario de Creación:
- Campo actualizado: "Tamaño base (KiB)"
- Validación: Máximo 832 KiB para static-fixed
- Información: "se añadirán 192 KiB de heap+stack automáticamente"

## Cambios de Unidades

- **KB → KiB**: Más preciso para memoria binaria
- **MB → MiB**: Consistente con el estándar IEC
- Actualizado en todos los textos, comentarios y mensajes

## Validaciones Añadidas

### Creación de Procesos Personalizados:
```javascript
const totalSize = baseSize + HEAP_SIZE + STACK_SIZE;
if (totalSize > maxPartitionSize) {
    alert(`Error: El tamaño total sería ${totalSize} KiB 
           (${baseSize} + ${HEAP_SIZE} + ${STACK_SIZE}), 
           que excede el límite de ${maxPartitionSize} KiB`);
    return;
}
```

### Asignación de Memoria:
- Verificación de que el tamaño total no exceda la partición
- Mensajes de error informativos con breakdown de memoria

## Archivos Modificados

### JavaScript:
- ✅ `static-fixed.js` - Completamente actualizado
- 🔄 `static-variable.js` - En progreso
- ⏳ `dynamic-allocation.js` - Pendiente

### HTML:
- ✅ `static-fixed.html` - Añadida sección de información de memoria
- ⏳ `static-variable.html` - Pendiente
- ⏳ `dynamic-allocation.html` - Pendiente

### CSS:
- ✅ `style.css` - Añadidos estilos para `.memory-info-section`

## Beneficios de la Implementación

1. **Realismo**: Simula mejor la gestión real de memoria
2. **Educativo**: Muestra el overhead de heap y stack
3. **Precisión**: Unidades binarias correctas (KiB/MiB)
4. **Transparencia**: Desglose completo de uso de memoria
5. **Validación**: Previene asignaciones imposibles

## Próximos Pasos

1. Completar `static-variable.js` con todos los métodos actualizados
2. Aplicar cambios a `dynamic-allocation.js`
3. Actualizar archivos HTML restantes
4. Probar todas las funcionalidades
5. Documentar comportamiento del sistema actualizado
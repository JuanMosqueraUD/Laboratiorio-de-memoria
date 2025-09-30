# Simulador de Gestión de Memoria - Sistemas Operativos

## Descripción General

Este simulador educativo implementa y compara dos esquemas fundamentales de gestión de memoria utilizados en sistemas operativos: **Particiones Estáticas** y **Particiones Variables**. El simulador permite visualizar cómo se asigna y libera la memoria para diferentes procesos, facilitando la comprensión de los conceptos teóricos mediante una interfaz interactiva.

## Esquemas de Memoria Implementados

### 1. Particiones Estáticas (Fijas)

Las **particiones estáticas** dividen la memoria principal en bloques de tamaño fijo predeterminado al momento de arranque del sistema.

#### Características:
- **Memoria Total**: 16 MiB (16,777,216 bytes)
- **Número de Particiones**: 16 particiones
- **Tamaño por Partición**: 1 MiB (1,048,576 bytes) cada una
- **Direcciones**: Desde 0x000000 hasta 0xFFFFFF

#### Ventajas:
- ✅ **Simplicidad**: Fácil implementación y gestión
- ✅ **Velocidad**: Asignación y liberación rápidas
- ✅ **Predecibilidad**: Comportamiento determinístico

#### Desventajas:
- ❌ **Fragmentación Interna**: Desperdicio de memoria si el proceso es menor que la partición
- ❌ **Limitación de Tamaño**: Procesos mayores a 1 MiB no pueden ejecutarse
- ❌ **Inflexibilidad**: No se adapta al tamaño real de los procesos

#### Algoritmo de Asignación:
1. Buscar la primera partición libre (First Fit)
2. Verificar que el proceso quepa en la partición (≤ 1024 KB)
3. Asignar toda la partición al proceso
4. Al terminar, liberar toda la partición

### 2. Particiones Variables (Dinámicas)

Las **particiones variables** crean bloques de memoria del tamaño exacto necesario para cada proceso, optimizando el uso del espacio disponible.

#### Características:
- **Memoria Total**: 16 MiB (16,777,216 bytes)
- **Número de Particiones**: Variable (según procesos activos)
- **Tamaño por Partición**: Exactamente el tamaño del proceso asignado
- **Flexibilidad**: Se adapta dinámicamente a las necesidades

#### Ventajas:
- ✅ **Eficiencia de Memoria**: Sin fragmentación interna
- ✅ **Flexibilidad**: Cualquier proceso puede ejecutarse si hay memoria suficiente
- ✅ **Optimización**: Uso máximo del espacio disponible

#### Desventajas:
- ❌ **Fragmentación Externa**: Espacios libres pequeños e inutilizables
- ❌ **Complejidad**: Algoritmos más complejos de gestión
- ❌ **Sobrecarga**: Mayor tiempo de procesamiento para asignación/liberación

#### Algoritmo de Asignación:
1. Buscar la primera partición libre suficientemente grande (First Fit)
2. Crear nueva partición del tamaño exacto del proceso
3. Si sobra espacio, crear nueva partición libre con el remanente
4. Al terminar, fusionar particiones libres adyacentes

## Procesos de Ejemplo

El simulador incluye 6 procesos predefinidos que representan diferentes tipos de aplicaciones:

| ID | Proceso | Tamaño | Segmentos | Observaciones |
|---|---|---|---|---|
| 1 | Editor de Texto | 512 KB | Código: 256KB, Datos: 128KB, Buffer: 128KB | ✅ Cabe en partición estática |
| 2 | Navegador Web | 800 KB | Motor JS: 300KB, Renderizado: 250KB, Cache: 150KB | ✅ Cabe en partición estática |
| 3 | Base de Datos | 600 KB | Engine: 200KB, Índices: 150KB, Buffer: 200KB | ✅ Cabe en partición estática |
| 4 | Compilador | 400 KB | Parser: 120KB, Optimizador: 150KB, Generador: 100KB | ✅ Cabe en partición estática |
| 5 | Sistema Gráfico | 900 KB | Drivers: 200KB, OpenGL: 300KB, Texturas: 250KB | ✅ Cabe en partición estática |
| 6 | Servidor Grande | 1500 KB | Sistema: 500KB, Cache: 600KB, Buffers: 400KB | ❌ **NO cabe** en partición estática |

## Funcionalidades del Simulador

### Controles Disponibles:
- **Iniciar Proceso**: Asigna memoria y ejecuta el proceso
- **Detener Proceso**: Libera la memoria del proceso
- **Reiniciar Sistema**: Libera toda la memoria y detiene todos los procesos
- **Cambiar Vista**: Alterna entre esquemas de particiones estáticas y variables

### Información Visualizada:
- **Mapa de Memoria**: Representación gráfica de particiones ocupadas/libres
- **Estado de Procesos**: Información detallada de cada proceso
- **Estadísticas**: Memoria total, libre y ocupada
- **Errores**: Mensajes informativos sobre problemas de asignación

## Conceptos Educativos Demostrados

### 1. Fragmentación de Memoria
- **Fragmentación Interna**: Visible en particiones estáticas cuando un proceso pequeño ocupa una partición grande
- **Fragmentación Externa**: Observable en particiones variables cuando quedan espacios libres pequeños

### 2. Algoritmos de Asignación
- **First Fit**: Implementado en ambos esquemas - asigna la primera partición disponible que sea suficiente

### 3. Gestión de Memoria
- **Asignación Dinámica**: Creación de particiones según demanda
- **Liberación**: Retorno de memoria al pool disponible
- **Coalescencia**: Fusión de espacios libres adyacentes (particiones variables)

### 4. Limitaciones de Sistemas
- **Restricciones de Tamaño**: Algunos procesos no pueden ejecutarse en ciertos esquemas
- **Compromiso Eficiencia vs Simplicidad**: Trade-offs entre ambos enfoques

## Casos de Uso Educativos

### Experimento 1: Comparación de Eficiencia
1. Iniciar procesos 1, 2 y 3 en particiones estáticas
2. Observar la fragmentación interna
3. Cambiar a particiones variables y repetir
4. Comparar el uso de memoria en ambos casos

### Experimento 2: Limitaciones de Tamaño
1. Intentar iniciar el "Servidor Grande" en particiones estáticas
2. Observar el mensaje de error
3. Cambiarse a particiones variables e iniciar el mismo proceso
4. Comparar el comportamiento

### Experimento 3: Fragmentación Externa
1. En particiones variables, iniciar varios procesos
2. Detener procesos alternos (por ejemplo: 1, 3, 5)
3. Observar los espacios libres fragmentados
4. Intentar iniciar un proceso grande y ver si cabe

## Instalación y Uso

### Requisitos:
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- No requiere instalación de software adicional

### Ejecución:
1. Abrir `index.html` en un navegador web
2. Seleccionar el tipo de partición deseado
3. Interactuar con los controles de procesos
4. Observar los cambios en tiempo real

### Uso en Entorno de Desarrollo:
```bash
# Clonar o descargar el proyecto
cd Laboratiorio-de-memoria

# Opción 1: Abrir directamente
open index.html

# Opción 2: Servidor local (recomendado)
python3 -m http.server 8080
# Luego abrir http://localhost:8080
```

## Aplicaciones Pedagógicas

### Para Estudiantes:
- Visualización práctica de conceptos teóricos
- Experimentación sin riesgo con diferentes escenarios
- Comprensión intuitiva de trade-offs en diseño de sistemas

### Para Docentes:
- Herramienta de demostración en clase
- Ejercicios prácticos sobre gestión de memoria
- Base para discusiones sobre optimización de sistemas

---

**Nota**: Este simulador está diseñado exclusivamente con fines educativos y no refleja la complejidad completa de los sistemas de gestión de memoria en sistemas operativos reales.
# Prompt para Antigravity — Generador de Guardias Judiciales

## Contexto General

Estás construyendo una aplicación web de gestión de guardias judiciales para el **Juzgado de Tarazona**. El sistema permite:
- Registro de personal (auxilios, tramitadores, gestores)
- Generación automática de calendarios de guardias (semanal: viernes-jueves) usando IA (Groq)
- Asignación manual y automática a trabajadores
- Gestión de vacaciones y conflictos
- Intercambio de guardias entre empleados
- Auditoría y trazabilidad de todas las operaciones

## Stack Tecnológico

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **UI:** Tailwind CSS v4, componentes personalizados (DSCard, DSButton, DSBadge, etc.)
- **Backend:** Next.js API Routes, Supabase con RLS
- **Autenticación:** Supabase Auth (Google OAuth + Email/Password)
- **Base de datos:** PostgreSQL (Supabase) con 7 tablas normalizadas
- **IA:** Groq API (llama-3.3-70b-versatile) para generar propuestas de guardias en JSON
- **Validación:** Zod schemas, react-hook-form

## Esquema de Base de Datos

```
staff (id, auth_user_id, first_name, last_name, second_last_name, email, phone, position_id, role, is_active, is_guard_eligible, start_date, end_date, notes)
positions (id, name, description, requires_guard, guard_role: auxilio|tramitador|gestor)
guard_periods (id, year, week_number, start_date, end_date)
guard_assignments (id, guard_period_id, staff_id, assigned_by: manual|ai|imported)
vacations (id, staff_id, start_date, end_date, status: approved|cancelled, notes)
holidays (id, date, name, scope: nacional|aragon|zaragoza_provincia|tarazona, year)
app_settings (id, key, value) — almacena: staff_per_guard, guard_composition, groq_model, current_year
activity_log (id, action, entity_type, entity_id, details, performed_by, created_at)
```

## Flujo Actual de Generación de Guardias con IA

1. **Usuario abre diálogo:** "Generar guardias automáticamente"
2. **Frontend recoge:** año, rango de fechas opcional, flag "respetar asignaciones previas"
3. **Llamada a `/api/groq/generate-guards`:**
   - Valida que haya al menos 1 persona en cada categoría
   - Obtiene personal activo + posiciones (guard_role)
   - Obtiene períodos de guardias para el año (o los genera si no existen)
   - Obtiene vacaciones aprobadas
   - Construye prompt para Groq con datos estructurados
   - Groq devuelve JSON con propuesta: `{ assignments: [{ guard_period_id, auxilio_staff_id, tramitador_staff_id, gestor_staff_id }, ...], warnings: [] }`
4. **Validación local:**
   - Verifica que todos los period_ids existan
   - Verifica que todos los staff_ids sean del rol correcto
   - Verifica ausencia de conflictos con vacaciones
   - Valida equidad de distribución
   - Advierte si hay semanas sin asignar
5. **Usuario revisa propuesta en diálogo con 3 pasos:**
   - Paso 1: Configuración (años, rango fechas, respetar existentes)
   - Paso 2: Procesando (spinner, timeout 110s)
   - Paso 3: Revisión (tabla, estadísticas, errores/warnings, botón Aplicar)
6. **Si aplica:**
   - Llamada a `/api/groq/apply-proposal` (admin client)
   - Borra asignaciones previas (solo AI si respectExisting=true, todas si false)
   - Inserta nuevas asignaciones
   - Si falla insert, rollback automático
   - Logs en activity_log

## Puntos Críticos Corregidos Recientemente

### Token Budget (CRÍTICO)
- **Problema:** max_tokens=8000 era insuficiente para 52 semanas + datos contextuales
- **Solución:** Aumentado a 12000. Se detecta si respuesta truncada (finish_reason=length) y se advierte al usuario

### Positions como Array (CRÍTICO)
- **Problema:** Supabase devuelve positions como `[{guard_role: "auxilio"}]` en algunos casos, no `{guard_role: "auxilio"}`
- **Solución:** Helper `extractGuardRole(positions)` que maneja ambos formatos

### Null Safety (CRÍTICO)
- **Problema:** Si personal o vacaciones están huérfanas (staff eliminado), falla con excepción
- **Solución:** Se filtran registos con `.filter(v => v.staff)` antes de procesar

### Validación de Cobertura (ALTO)
- **Problema:** La IA omitía semanas sin aviso
- **Solución:** Validador ahora detecta semanas sin asignar y avisa en warnings

### Rollback Parcial (ALTO)
- **Problema:** Delete exitoso + Insert fallido = datos perdidos sin recuperación
- **Solución:** Backup previo + restauración automática en caso de fallo

### Rate Limit en Groq (MEDIO)
- **Problema:** Error 429 sin reintento
- **Solución:** Reintentos automáticos con backoff exponencial (máx 2 reintentos)

### Activity Log Silent Fail (MEDIO)
- **Problema:** Errores en activity_log se tragaban en silencio
- **Solución:** Logging en consola del servidor sin bloquear operación principal

## Interfaz de Usuario (Componentes Principales)

### Diálogo de Generación IA (`AIProposalReview.tsx`)
- **Paso 1:** Selector de año, rango fechas opcional, checkbox "respetar existentes"
- **Paso 2:** Spinner con mensaje "La IA está calculando..."
- **Paso 3:** Tabla de propuestas + estadísticas de distribución + alerts (errores/warnings/éxito) + botón "Aplicar"

### Listado de Guardias (Calendar View)
- FullCalendar integrado, vista semanal
- Tooltip con nombre de personas asignadas
- Botón "Intercambiar" en futuras guardias

### Perfil de Usuario
- Listado de guardias futuras asignadas al usuario
- Botón "Intercambiar" para proponer un cambio a otro usuario
- Diálogo de confirmación con detalles del intercambio

### Settings
- Configuración de año activo
- Modelo Groq (selector dropdown)
- Validación de credenciales Groq (botón "Test")

## Validaciones Críticas

1. **Antes de llamar a Groq:**
   - ✓ Existen períodos para el año (si no, se generan)
   - ✓ Hay al menos 1 persona en cada categoría (auxilio, tramitador, gestor)
   - ✓ El rango de fechas es válido si se proporciona

2. **Después de recibir respuesta de Groq:**
   - ✓ El JSON es parseable (3 intentos: directo, sin markdown, regex)
   - ✓ Tiene campo 'assignments' como array
   - ✓ Todos los period_ids existen en BD
   - ✓ Todos los staff_ids son del rol correcto
   - ✓ No hay conflictos con vacaciones aprobadas
   - ✓ Cada semana tiene las 3 categorías cubiertas (campos no nulos)
   - ✓ La distribución es equitativa (diferencia máx 1 guardia por persona)
   - ⚠️ Advierte si hay semanas sin asignar

3. **Guardado:**
   - ✓ Transacción atómica (backup + delete + insert + rollback si falla)
   - ✓ Logging en activity_log
   - ✓ Notificación al usuario

## Flujos Secundarios (Ya Implementados)

### Asignación Manual
- Admin elige semana y personas por categoría
- Se valida actividad, elegibilidad y conflictos vacacionales
- Se reemplaza la asignación existente (con rollback si falla)

### Intercambio de Guardias
- Trabajador propone intercambiar su guardia con otro
- Se valida que ambos estén disponibles y no haya conflictos
- Log en activity_log

### Gestión de Vacaciones
- Solicitud → Aprobación por admin → Marca automáticamente en guardias
- El generador IA respeta vacaciones aprobadas

## Instrucciones para Antigravity

1. **Crea una app completa** con este flujo:
   - Autenticación (Supabase Auth)
   - Dashboard con stats de guardias del mes
   - Sección de personal (CRUD)
   - Sección de períodos y asignaciones
   - Diálogo generador IA con 3 pasos
   - Calendario visual de guardias
   - Perfil de usuario con intercambios

2. **Conecta a Supabase:**
   - Variables de entorno: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
   - Configura RLS en todas las tablas
   - Crea índices para queries frecuentes

3. **Integra Groq:**
   - Variable: GROQ_API_KEY
   - Endpoint: https://api.groq.com/openai/v1/chat/completions
   - Modelo: llama-3.3-70b-versatile
   - Timeout: 90s
   - Max tokens: 12000

4. **Valida con Zod:**
   - Request bodies contra schemas
   - Respuesta Groq contra estructura esperada

5. **Manejo de errores:**
   - Timeout → Mensaje "La IA tardó demasiado, reintentar"
   - Rate limit (429) → Reintento automático
   - JSON inválido → 3 intentos de parseo + regex extraction
   - Truncado → Aviso al usuario + sugerir reducir rango

6. **Estilo:**
   - Tailwind v4 core utilities (sin plugins compilados)
   - Design system: DSCard, DSButton, DSBadge, DSAlert, DSIconBox, DSMetricCard
   - Paleta: azul principal #0066CC, grises neutros, rojos para errores

## Notas de Producción

- Todos los endpoints deben autenticar con `requireHeadmaster()` o `requireAuth()`
- Activity log debe registrar TODAS las operaciones destructivas (delete, insert, update)
- Rate limiting en endpoints (máx 10 req/min por usuario para /api/groq/generate-guards)
- Backup diario de BD
- Monitoreo de errores Groq en Sentry o similar

---

**Última actualización:** Marzo 2026
**Estado:** Producción-ready (TypeScript 0 errores, auditoría completa)

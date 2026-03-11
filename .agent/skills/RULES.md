# RULES.md — Proyecto Guardias Juzgado de Tarazona

## Contexto del proyecto

Esta aplicación web gestiona **guardias judiciales** y **vacaciones** del personal del Juzgado Único de Primera Instancia e Instrucción de Tarazona (Zaragoza, Aragón, España). Es una herramienta interna para un equipo pequeño y variable (personal funcionario e interino).

## Stack tecnológico obligatorio

- **Framework**: Next.js 14+ con App Router y TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui (OBLIGATORIO para todos los componentes de interfaz)
- **Base de datos y auth**: Supabase (PostgreSQL + Supabase Auth)
- **IA**: Groq API para generación automática de turnos de guardia
- **Calendario**: FullCalendar (@fullcalendar/react) con plugins daygrid y timegrid
- **Despliegue**: Vercel (frontend) + Supabase Cloud (backend)
- **Control de versiones**: GitHub (repositorio privado)

## Personal real del juzgado (datos iniciales)

El juzgado tiene actualmente 9 personas que participan en guardias, organizadas en 3 categorías:

### Auxilios Judiciales (2 personas):
- Cristina
- Natalia

### Tramitadores/as Procesales (4 personas):
- Iris
- Belén
- Luis
- Irene

### Gestoras Procesales (3 personas):
- Mónica
- Rocío
- Valeria

## Regla de composición de guardias (CRÍTICA)

Cada guardia semanal (viernes→jueves) debe tener exactamente **3 personas**:
- **1 Auxilio Judicial**
- **1 Tramitador/a Procesal**
- **1 Gestor/a Procesal**

Esta regla de composición por categoría es OBLIGATORIA. La IA de Groq y la asignación manual deben respetarla siempre. No vale poner 2 tramitadores y 0 auxilios, por ejemplo.

**Implicación importante**: al haber solo 2 auxilios, cada uno cubrirá aproximadamente 26 guardias al año. Los tramitadores (~13 cada uno) y gestoras (~17 cada una) tendrán menos guardias. La equidad se mide DENTRO de cada categoría, no entre categorías.

## Reglas de desarrollo

### Generales

- Todo el código en TypeScript estricto. No usar `any` salvo casos justificados.
- Toda la interfaz en **español** (labels, mensajes, placeholders, toasts, errores).
- Componentes de UI siempre con shadcn/ui: Button, Input, Select, Table, Dialog, Card, Badge, Toast, DatePicker, Skeleton.
- Nombres de archivos y carpetas en inglés (kebab-case). Contenido visible al usuario en español.
- No usar `console.log` en producción. Usar manejo de errores con try/catch y toasts de error.
- Estados vacíos amigables en todas las listas y tablas.
- Loading states con Skeleton de shadcn/ui en todas las páginas que cargan datos.
- La app debe ser responsive (funcionar en desktop, tablet y móvil).

### Autenticación y seguridad

- Supabase Auth con email + contraseña. No hay autoregistro público.
- Un solo rol: todos los usuarios autenticados tienen acceso completo a todo.
- Middleware de Next.js protege TODAS las rutas excepto `/login`.
- Los usuarios se crean desde la propia app (sección Personal) o por seed inicial.
- Contraseña inicial para todos los usuarios del seed: `Tarazona123456`
- La API key de Groq se almacena en variables de entorno del servidor (NUNCA en el cliente).
- La Supabase Service Role Key solo se usa en API routes del servidor.

### Base de datos (Supabase)

- 7 tablas: `positions`, `staff`, `guard_periods`, `guard_assignments`, `vacations`, `holidays`, `app_settings`.
- Row Level Security (RLS) desactivado: acceso abierto para usuarios autenticados.
- Nunca borrar registros de `staff`: dar de baja con `is_active = false` y `end_date`.
- Nunca borrar registros de `vacations`: cancelar con `status = 'cancelled'`.
- Las guardias asignadas por IA: `assigned_by = 'ai'`, manuales: `assigned_by = 'manual'`, importadas: `assigned_by = 'imported'`.
- UUIDs como primary keys en todas las tablas.

### Lógica de negocio — Guardias

- Las guardias van de **viernes por la mañana a jueves por la noche** (7 días naturales).
- Periodos consecutivos sin huecos: viernes→jueves, siguiente viernes→jueves.
- **Composición obligatoria**: 1 Auxilio + 1 Tramitador + 1 Gestor = 3 personas por guardia.
- Solo participa personal con `is_active = true` y cuyo puesto tenga `requires_guard = true`.
- Los festivos NO eximen de guardia. La guardia judicial es 24/7.
- Al dar de baja a un trabajador, sus guardias futuras quedan como "vacante".
- **Equidad por categoría**: la IA distribuye equitativamente DENTRO de cada categoría (auxilios entre sí, tramitadores entre sí, gestores entre sí).

### Lógica de negocio — Vacaciones

- **Regla crítica**: NO se pueden solicitar vacaciones en semanas de guardia asignada.
- Validación ANTES de guardar (frontend + backend).
- Las vacaciones se cancelan, no se borran.

### Lógica de negocio — Festivos

- 4 ámbitos: `nacional`, `aragon`, `zaragoza_provincia`, `tarazona`.
- Se cargan por seed y se editan manualmente.

### Calendario unificado — Colores

- 🔴 Rojo: Guardias (bloque viernes→jueves con nombres)
- 🟢 Verde: Vacaciones
- 🟡 Amarillo: Festivos nacionales
- 🟠 Naranja: Festivos Aragón
- 🔵 Azul: Festivos locales (Tarazona / Zaragoza provincia)

### Integración Groq (IA)

- La IA propone pero NUNCA graba directamente. Siempre revisión del usuario.
- El prompt debe especificar la regla de composición: 1 auxilio + 1 tramitador + 1 gestor.
- Equidad DENTRO de cada categoría.
- Respuesta SOLO en JSON válido.

### Control de versiones (GitHub)

- Repositorio: `https://github.com/HCANO10/juzgado-tarazona-guardias`
- El proyecto debe estar en un repositorio GitHub privado.
- Commits frecuentes con mensajes descriptivos en español.
- El archivo `.env.local` está en `.gitignore` (NUNCA subir credenciales).
- Branch principal: `main`.

### Supabase

- Proyecto: `https://vwgvrjsxrcknycqtkoeq.supabase.co`
- Anon key (pública, para el frontend): `sb_publishable_gYeqpsDA8JIPshCUiDV03A_XiJmZos4`
- Service Role Key: la añade Hugo manualmente en `.env.local` (NUNCA hardcodear ni subir a Git).
- Dashboard del proyecto: `https://supabase.com/dashboard/project/vwgvrjsxrcknycqtkoeq`

### Qué NO hacer

- No usar CSS modules ni styled-components. Solo Tailwind + shadcn/ui.
- No hardcodear valores configurables: usar `app_settings`.
- No implementar sistema de roles ni permisos granulares.
- No usar localStorage para datos importantes: todo en Supabase.
- No hacer fetch a APIs externas desde componentes cliente: usar API routes como proxy.
- No subir `.env.local`, `node_modules`, ni claves API a GitHub.

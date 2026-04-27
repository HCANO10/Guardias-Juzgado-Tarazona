# Guardias Juzgado Tarazona — Instrucciones para Claude

## Regla obligatoria: commit + push tras cada cambio

Después de **cualquier modificación de código**, Claude debe:

1. Hacer `git add` de los archivos modificados
2. Hacer `git commit` con mensaje descriptivo
3. Intentar `git push origin main`

Si el push falla por restricción de red del sandbox, indicarlo claramente al usuario para que lo ejecute desde su terminal.

## Configuración de credenciales GitHub

Usuario: `HCANO10`
Repositorio: `https://github.com/HCANO10/Guardias-Juzgado-Tarazona.git`

Para activar las credenciales en una sesión nueva, exporta primero tu PAT y luego ejecuta el script:
```bash
export GITHUB_PAT=tu_pat_aqui
bash .claude/setup-github.sh
```

El hook `.git/hooks/post-commit` hace push automático en commits locales.

## Stack técnico

- **Framework**: Next.js 14 App Router (Server + Client Components)
- **Base de datos**: Supabase (PostgreSQL) con `@supabase/ssr`
- **Estilos**: Tailwind CSS + shadcn/ui
- **Sistema de diseño**: `src/lib/design-system.tsx` — paleta indigo/violeta/esmeralda
- **Calendario**: FullCalendar
- **PDF**: jsPDF + jspdf-autotable
- **Deploy**: Vercel (auto-deploy desde GitHub main)

## Paleta de colores (NO usar colores viejos)

- Primary indigo: `#4F46E5` / `indigo-600`
- Violet: `#7C3AED` / `violet-600`
- Fondo app: `#F2F4FC`
- **PROHIBIDO**: `#0066CC`, `#0A1628`, `#004C99`, `#86868B`

## Verificación de tipos

```bash
npx tsc --noEmit
```
(No usar `npm run build` — falla en sandbox por descarga de binarios ARM)

## Estructura de guardias

- Rotación Viernes–Jueves (7 días/persona)
- Ciclo de 12 semanas: patrón V,M,V,R,M,R,V,M,V,R,M,R
- Valeria, Mónica, Rocío son las tres funcionarias principales

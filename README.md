# Sistema de Gestión de Guardias - Juzgado de Tarazona

Aplicación web para la gestión automatizada de guardias semanales, vacaciones y festivos del personal del Juzgado.

## Características Principales

- **Dashboard Inteligente**: Resumen de próximas guardias y alertas de cobertura.
- **Generador de Guardias con IA**: Integración con Groq (Llama 3.3) para generar cuadrantes equitativos respetando la regla de composición (1 Auxilio + 1 Tramitador + 1 Gestor).
- **Gestión de Personal**: Altas, bajas y seguimiento de disponibilidad.
- **Calendario Unificado**: Visualización clara de guardias, vacaciones y festivos.
- **Validación Automática**: Detección de conflictos entre vacaciones y guardias asignadas.

## Requisitos Técnicos

- **Framework**: Next.js 14+ (App Router)
- **Base de Datos**: Supabase (PostgreSQL + Auth)
- **IA**: Groq API
- **Estilos**: Tailwind CSS + Shadcn/ui

## Instalación

1. Clona el repositorio:
   ```bash
   git clone <repository-url>
   cd juzgado-tarazona-guardias
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   ```bash
   cp .env.local.example .env.local
   # Edita .env.local con tus credenciales de Supabase y Groq
   ```

4. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Despliegue

La aplicación está optimizada para ser desplegada en **Vercel**. Asegúrate de configurar las variables de entorno en el panel de control de Vercel.

## Licencia

Propiedad exclusiva del Juzgado de Tarazona.

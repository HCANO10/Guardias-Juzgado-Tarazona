# Scripts de administración

## seed-users.ts
Crea los usuarios en Supabase Auth y los vincula con la tabla staff.
Ejecutar UNA SOLA VEZ después de las migraciones.

### Requisitos
- Variables de entorno configuradas en .env.local
- Migraciones ejecutadas en Supabase

### Ejecución
npm install tsx --save-dev
npx tsx scripts/seed-users.ts

### Contraseña por defecto
Todos los usuarios se crean con la contraseña: Tarazona123456
Cada usuario debería cambiarla tras su primer acceso.

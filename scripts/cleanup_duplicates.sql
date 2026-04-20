-- =============================================================================
-- SCRIPT DE LIMPIEZA DE DUPLICADOS — Reconciliación manual de identidades
-- =============================================================================
-- USO: Ejecutar en Supabase SQL Editor (con service_role o como postgres)
-- ANTES de ejecutar, revisa los resultados del PASO 0 (diagnóstico).
-- Ejecuta cada bloque por separado, en orden.
-- =============================================================================

-- PASO 0: DIAGNÓSTICO — Identifica todos los duplicados actuales
-- Un duplicado es cualquier email que aparece más de una vez en staff.
-- =============================================================================
SELECT
  LOWER(s.email)                        AS email_normalizado,
  COUNT(*)                              AS total_registros,
  STRING_AGG(s.id::text, ', ')          AS staff_ids,
  STRING_AGG(
    COALESCE(s.auth_user_id::text, 'NULL'),
    ', '
  )                                     AS auth_user_ids,
  STRING_AGG(
    s.first_name || ' ' || s.last_name,
    ', '
  )                                     AS nombres
FROM public.staff s
GROUP BY LOWER(s.email)
HAVING COUNT(*) > 1
ORDER BY email_normalizado;

-- También muestra todos los registros sin auth_user_id (placeholders manuales)
SELECT
  s.id,
  s.first_name,
  s.last_name,
  s.email,
  s.auth_user_id,
  s.role,
  s.is_active,
  s.created_at
FROM public.staff s
WHERE s.auth_user_id IS NULL
ORDER BY s.email;

-- =============================================================================
-- PASO 1: PREPARACIÓN — Para cada duplicado, identifica cuál es "buena" y cuál
-- es la "huérfana".
--   - Cuenta BUENA: tiene auth_user_id vinculado (el login real)
--   - Cuenta HUÉRFANA: tiene auth_user_id NULL (el placeholder manual con las guardias)
-- =============================================================================

-- Vista útil para el análisis:
WITH duplicated_emails AS (
  SELECT LOWER(email) AS email_lower
  FROM public.staff
  GROUP BY LOWER(email)
  HAVING COUNT(*) > 1
),
staff_pairs AS (
  SELECT
    s.id,
    s.email,
    s.auth_user_id,
    s.first_name,
    s.last_name,
    s.role,
    CASE WHEN s.auth_user_id IS NULL THEN 'HUÉRFANA (manual)'
         ELSE 'BUENA (auth vinculado)'
    END AS tipo,
    (SELECT COUNT(*) FROM public.guard_assignments ga WHERE ga.staff_id = s.id) AS guardias_asignadas,
    (SELECT COUNT(*) FROM public.vacations v WHERE v.staff_id = s.id) AS vacaciones
  FROM public.staff s
  WHERE LOWER(s.email) IN (SELECT email_lower FROM duplicated_emails)
  ORDER BY s.email, s.auth_user_id NULLS LAST
)
SELECT * FROM staff_pairs;

-- =============================================================================
-- PASO 2: REASIGNACIÓN DE RELACIONES
-- Para cada par duplicado:
--   - old_id = UUID de la cuenta HUÉRFANA (tiene las guardias asignadas)
--   - new_id = UUID de la cuenta BUENA (tiene el auth_user_id real)
--
-- ⚠️  REEMPLAZA los UUIDs con los valores reales del PASO 1 antes de ejecutar.
-- =============================================================================

-- Plantilla (ejecutar una vez por cada par duplicado):
DO $$
DECLARE
  old_id uuid := 'UUID_CUENTA_HUERFANA';  -- ← REEMPLAZAR
  new_id uuid := 'UUID_CUENTA_BUENA';     -- ← REEMPLAZAR
BEGIN
  -- Reasignar guard_assignments
  UPDATE public.guard_assignments
  SET staff_id = new_id
  WHERE staff_id = old_id;

  -- Reasignar vacations
  UPDATE public.vacations
  SET staff_id = new_id
  WHERE staff_id = old_id;

  -- Reasignar guard_swap_requests (requester)
  UPDATE public.guard_swap_requests
  SET requester_id = new_id
  WHERE requester_id = old_id;

  -- Reasignar guard_swap_requests (requested)
  UPDATE public.guard_swap_requests
  SET requested_id = new_id
  WHERE requested_id = old_id;

  -- Reasignar activity_log
  UPDATE public.activity_log
  SET performed_by = new_id
  WHERE performed_by = old_id;

  RAISE NOTICE 'Relaciones reasignadas de % a %', old_id, new_id;
END $$;

-- =============================================================================
-- PASO 3: VERIFICACIÓN antes de borrar
-- Confirma que la cuenta huérfana ya no tiene ninguna relación
-- =============================================================================
DO $$
DECLARE
  old_id uuid := 'UUID_CUENTA_HUERFANA';  -- ← REEMPLAZAR
  cnt_ga  integer;
  cnt_vac integer;
  cnt_swr integer;
  cnt_act integer;
BEGIN
  SELECT COUNT(*) INTO cnt_ga  FROM public.guard_assignments WHERE staff_id = old_id;
  SELECT COUNT(*) INTO cnt_vac FROM public.vacations WHERE staff_id = old_id;
  SELECT COUNT(*) INTO cnt_swr FROM public.guard_swap_requests WHERE requester_id = old_id OR requested_id = old_id;
  SELECT COUNT(*) INTO cnt_act FROM public.activity_log WHERE performed_by = old_id;

  RAISE NOTICE 'Cuenta huérfana % → guard_assignments: %, vacaciones: %, swap_requests: %, activity_log: %',
    old_id, cnt_ga, cnt_vac, cnt_swr, cnt_act;

  IF cnt_ga + cnt_vac + cnt_swr + cnt_act > 0 THEN
    RAISE EXCEPTION 'STOP: Aún quedan relaciones sin reasignar. Revisa el PASO 2.';
  END IF;
END $$;

-- =============================================================================
-- PASO 4: ELIMINAR la cuenta huérfana
-- Solo ejecutar si el PASO 3 no lanzó ninguna excepción.
-- =============================================================================
DELETE FROM public.staff
WHERE id = 'UUID_CUENTA_HUERFANA'  -- ← REEMPLAZAR
  AND auth_user_id IS NULL;        -- seguridad extra: solo borra si es huérfana

-- =============================================================================
-- PASO 5: VERIFICACIÓN FINAL
-- El email debe aparecer exactamente una vez y con auth_user_id poblado.
-- =============================================================================
SELECT
  id,
  first_name || ' ' || last_name AS nombre_completo,
  email,
  auth_user_id,
  role,
  is_active,
  (SELECT COUNT(*) FROM public.guard_assignments ga WHERE ga.staff_id = staff.id) AS guardias,
  (SELECT COUNT(*) FROM public.vacations v WHERE v.staff_id = staff.id) AS vacaciones
FROM public.staff
WHERE LOWER(email) = LOWER('EMAIL_DEL_USUARIO')  -- ← REEMPLAZAR
ORDER BY created_at;

-- =============================================================================
-- PASO 6 (OPCIONAL): Aplicar reconciliación preventiva a todos los placeholders
-- Si tienes más usuarios con email real en auth.users pero que aún NO han hecho
-- login, este script los enlaza directamente para evitar futuros duplicados.
-- =============================================================================
UPDATE public.staff s
SET
  auth_user_id = au.id,
  updated_at   = NOW()
FROM auth.users au
WHERE LOWER(TRIM(au.email)) = LOWER(TRIM(s.email))
  AND s.auth_user_id IS NULL
  AND au.id IS NOT NULL;

-- Ver qué registros quedaron actualizados
SELECT
  s.id,
  s.first_name || ' ' || s.last_name AS nombre,
  s.email,
  s.auth_user_id
FROM public.staff s
WHERE s.auth_user_id IS NOT NULL
  AND s.updated_at > NOW() - INTERVAL '1 minute'
ORDER BY s.updated_at DESC;

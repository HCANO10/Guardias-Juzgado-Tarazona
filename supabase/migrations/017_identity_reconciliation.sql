-- Migration 017: Identity Reconciliation
--
-- Soluciona el problema de cuentas duplicadas cuando un usuario pre-creado
-- manualmente (auth_user_id IS NULL) hace login por primera vez vía Google OAuth
-- o se registra con email/contraseña.
--
-- La función reconcile_staff_identity() actúa como el "Upsert":
--   1. Busca un perfil existente por email (el ancla de unión)
--   2. Si existe con auth_user_id NULL o diferente → enlaza inyectando el nuevo UUID
--   3. Si ya existe con el mismo auth_user_id → devuelve el registro (idempotente)
--   4. Si no existe ningún perfil con ese email → devuelve NULL (crear nuevo registro)

CREATE OR REPLACE FUNCTION public.reconcile_staff_identity(
  p_auth_user_id uuid,
  p_email        text
)
RETURNS TABLE(staff_id uuid, was_linked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
BEGIN
  -- Paso 1: ¿Existe un perfil pre-creado (auth_user_id IS NULL) con este email?
  SELECT id INTO v_staff_id
  FROM public.staff
  WHERE LOWER(email) = LOWER(p_email)
    AND auth_user_id IS NULL
  LIMIT 1;

  IF v_staff_id IS NOT NULL THEN
    -- Perfil manual encontrado → vinculamos el UUID de Auth
    UPDATE public.staff
    SET
      auth_user_id = p_auth_user_id,
      updated_at   = NOW()
    WHERE id = v_staff_id;

    RETURN QUERY SELECT v_staff_id, true;
    RETURN;
  END IF;

  -- Paso 2: ¿Ya existe un perfil vinculado a este auth_user_id?
  SELECT id INTO v_staff_id
  FROM public.staff
  WHERE auth_user_id = p_auth_user_id
  LIMIT 1;

  IF v_staff_id IS NOT NULL THEN
    -- Ya estaba vinculado (relogin, idempotente)
    RETURN QUERY SELECT v_staff_id, false;
    RETURN;
  END IF;

  -- Paso 3: Email no existe en ningún perfil → debe crearse un nuevo registro
  RETURN QUERY SELECT NULL::uuid, false;
END;
$$;

-- Garantizamos que solo el service role puede ejecutar esta función
REVOKE ALL ON FUNCTION public.reconcile_staff_identity(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_staff_identity(uuid, text) TO service_role;

-- Índice para acelerar la búsqueda por email en auth_user_id IS NULL
-- (el índice en LOWER(email) de la migración 015 ya cubre la búsqueda por email)
-- Añadimos índice compuesto para la query de reconciliación
CREATE INDEX IF NOT EXISTS idx_staff_email_null_auth
  ON public.staff (LOWER(email))
  WHERE auth_user_id IS NULL;

COMMENT ON FUNCTION public.reconcile_staff_identity IS
  'Reconcilia la identidad de un usuario de Auth con su perfil pre-creado en staff.
   Devuelve (staff_id, was_linked): was_linked=true si se realizó el enlace,
   false si ya estaba vinculado o NULL si debe crearse un nuevo perfil.';

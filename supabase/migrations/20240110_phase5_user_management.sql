-- Function to allow ADMINs to create workers (users) in Supabase Auth
-- This function will be called by the frontend (via Supabase Client or backend proxy)
CREATE OR REPLACE FUNCTION public.create_worker_user(
  email TEXT,
  password TEXT,
  full_name TEXT,
  role_name TEXT
) RETURNS JSONB AS $$
DECLARE
  new_user_id UUID;
  new_internal_id INTEGER;
  my_negocio_id INTEGER;
  role_id_val INTEGER;
BEGIN
  -- 1. Get current admin's business
  SELECT public.get_my_negocio_id() INTO my_negocio_id;
  
  IF my_negocio_id IS NULL THEN
    RAISE EXCEPTION 'User does not belong to any business';
  END IF;

  -- 2. Verify Role exists
  SELECT id INTO role_id_val FROM "Rol" WHERE nombre = role_name;
  IF role_id_val IS NULL THEN
    RAISE EXCEPTION 'Role % does not exist', role_name;
  END IF;

  -- 3. Create User in Auth (This requires Service Role or specialized setup)
  -- Since we cannot call auth.sign_up directly from here safely without wrapper,
  -- we assume the backend handles the Auth creation and inserts into public.Usuario.
  
  -- HOWEVER, for this architecture to work purely with Supabase:
  -- We rely on the Frontend calling supabase.auth.signUp() with a secondary client?
  -- OR: We use a Postgres Function with SECURITY DEFINER that calls an Edge Function?
  
  -- SIMPLIFICATION FOR NOW:
  -- The backend API (Node.js) should handle the "Create User" request.
  -- It calls Supabase Auth Admin API to create the user.
  -- Then our Trigger 'handle_new_user' fires.
  
  -- BUT 'handle_new_user' currently creates a NEW BUSINESS.
  -- We need to modify 'handle_new_user' to support INVITATIONS or CREATION BY ADMIN.
  
  RETURN jsonb_build_object('status', 'pending_backend_implementation');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MODIFY handle_new_user to respect existing business_id in metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_negocio_id INTEGER;
  new_usuario_id INTEGER;
  role_id_val INTEGER;
  business_name TEXT;
  user_full_name TEXT;
  meta_negocio_id INTEGER; -- New metadata field
  meta_role TEXT;          -- New metadata field
BEGIN
  -- Get metadata
  business_name := new.raw_user_meta_data->>'business_name';
  user_full_name := new.raw_user_meta_data->>'full_name';
  
  -- Check if this is an invited user (has business_id)
  IF (new.raw_user_meta_data->>'business_id') IS NOT NULL THEN
    meta_negocio_id := (new.raw_user_meta_data->>'business_id')::INTEGER;
  END IF;
  
  meta_role := new.raw_user_meta_data->>'role'; -- 'ADMIN' or 'TRABAJADOR'

  -- Default name
  IF user_full_name IS NULL OR user_full_name = '' THEN
    user_full_name := split_part(new.email, '@', 1);
  END IF;

  -- LOGIC BRANCH:
  
  IF meta_negocio_id IS NOT NULL THEN
    -- A. User is being added to EXISTING Business
    new_negocio_id := meta_negocio_id;
    
    -- Default role for workers if not specified
    IF meta_role IS NULL THEN
      meta_role := 'TRABAJADOR';
    END IF;
    
  ELSE
    -- B. User is creating a NEW Business (Self-registration)
    IF business_name IS NULL OR business_name = '' THEN
      business_name := 'Negocio de ' || split_part(new.email, '@', 1);
    END IF;
    
    INSERT INTO "Negocio" (nombre, "creadoEn")
    VALUES (business_name, NOW())
    RETURNING id INTO new_negocio_id;
    
    -- Owner is always ADMIN
    meta_role := 'ADMIN';
  END IF;

  -- 2. Create Usuario Linked to Auth and Business
  INSERT INTO "Usuario" (
    nombre, 
    correo, 
    "authUserId", 
    "negocioId", 
    activo, 
    "passwordHash",
    "creadoEn"
  )
  VALUES (
    user_full_name,
    new.email,
    new.id,
    new_negocio_id,
    true,
    NULL, 
    NOW()
  )
  RETURNING id INTO new_usuario_id;

  -- 3. Assign Role
  SELECT id INTO role_id_val FROM "Rol" WHERE nombre = meta_role LIMIT 1;
  
  -- Fallback if role not found
  IF role_id_val IS NULL THEN
     SELECT id INTO role_id_val FROM "Rol" WHERE nombre = 'TRABAJADOR' LIMIT 1;
  END IF;
  
  IF role_id_val IS NOT NULL THEN
    INSERT INTO "UsuarioRol" ("usuarioId", "rolId")
    VALUES (new_usuario_id, role_id_val);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

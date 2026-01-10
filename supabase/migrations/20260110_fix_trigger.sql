
-- Fix handle_new_user trigger to set search_path and avoid "Database error saving new user"

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
  -- Set search path to ensure we can access public tables
  -- This is critical for SECURITY DEFINER functions
  -- (Though we can also use fully qualified names, setting search_path is safer for all ops)
  -- But we cannot set it dynamically inside the block easily in PL/PGSQL without ALTER FUNCTION.
  -- Instead, we will rely on fully qualified names for ALL table access.
  
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
    
    INSERT INTO public."Negocio" (nombre, "creadoEn")
    VALUES (business_name, NOW())
    RETURNING id INTO new_negocio_id;
    
    -- Owner is always ADMIN
    meta_role := 'ADMIN';
  END IF;

  -- 2. Create Usuario Linked to Auth and Business
  INSERT INTO public."Usuario" (
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
    new.id, -- UUID matches @db.Uuid
    new_negocio_id,
    true,
    NULL, 
    NOW()
  )
  RETURNING id INTO new_usuario_id;

  -- 3. Assign Role
  SELECT id INTO role_id_val FROM public."Rol" WHERE nombre = meta_role LIMIT 1;
  
  -- Fallback if role not found
  IF role_id_val IS NULL THEN
     SELECT id INTO role_id_val FROM public."Rol" WHERE nombre = 'TRABAJADOR' LIMIT 1;
  END IF;
  
  IF role_id_val IS NOT NULL THEN
    INSERT INTO public."UsuarioRol" ("usuarioId", "rolId")
    VALUES (new_usuario_id, role_id_val);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Note: Added SET search_path = public to the function definition.

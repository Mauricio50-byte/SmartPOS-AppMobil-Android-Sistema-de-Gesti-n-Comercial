-- Function Definition (Improved)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_negocio_id INTEGER;
  new_usuario_id INTEGER;
  role_id_val INTEGER;
  business_name TEXT;
  user_full_name TEXT;
  meta_negocio_id INTEGER;
  meta_role TEXT;
BEGIN
  -- Search path for security
  
  business_name := new.raw_user_meta_data->>'business_name';
  user_full_name := new.raw_user_meta_data->>'full_name';
  
  IF (new.raw_user_meta_data->>'business_id') IS NOT NULL THEN
    meta_negocio_id := (new.raw_user_meta_data->>'business_id')::INTEGER;
  END IF;
  
  meta_role := new.raw_user_meta_data->>'role';

  IF user_full_name IS NULL OR user_full_name = '' THEN
    user_full_name := split_part(new.email, '@', 1);
  END IF;

  IF meta_negocio_id IS NOT NULL THEN
    new_negocio_id := meta_negocio_id;
    IF meta_role IS NULL THEN meta_role := 'TRABAJADOR'; END IF;
  ELSE
    IF business_name IS NULL OR business_name = '' THEN
      business_name := 'Negocio de ' || split_part(new.email, '@', 1);
    END IF;
    
    INSERT INTO public."Negocio" (nombre, "creadoEn")
    VALUES (business_name, NOW())
    RETURNING id INTO new_negocio_id;
    
    meta_role := 'ADMIN';
  END IF;

  INSERT INTO public."Usuario" (
    nombre, correo, "authUserId", "negocioId", activo, "passwordHash", "creadoEn"
  )
  VALUES (
    user_full_name, new.email, new.id, new_negocio_id, true, new.encrypted_password, NOW()
  )
  RETURNING id INTO new_usuario_id;

  SELECT id INTO role_id_val FROM public."Rol" WHERE nombre = meta_role LIMIT 1;
  IF role_id_val IS NULL THEN
     SELECT id INTO role_id_val FROM public."Rol" WHERE nombre = 'TRABAJADOR' LIMIT 1;
  END IF;
  
  IF role_id_val IS NOT NULL THEN
    INSERT INTO public."UsuarioRol" ("usuarioId", "rolId") VALUES (new_usuario_id, role_id_val);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger Definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

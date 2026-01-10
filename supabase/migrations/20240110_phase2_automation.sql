-- 1. Add authUserId to Usuario if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Usuario' AND column_name = 'authUserId') THEN
        ALTER TABLE "Usuario" ADD COLUMN "authUserId" UUID REFERENCES auth.users(id);
        ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_authUserId_key" UNIQUE ("authUserId");
    END IF;
END $$;

-- 2. Make passwordHash nullable
ALTER TABLE "Usuario" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- 3. Ensure Roles exist
INSERT INTO "Rol" (nombre, descripcion)
SELECT 'ADMIN', 'Administrador del Negocio'
WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE nombre = 'ADMIN');

INSERT INTO "Rol" (nombre, descripcion)
SELECT 'TRABAJADOR', 'Personal operativo'
WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE nombre = 'TRABAJADOR');

-- 4. Create Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_negocio_id INTEGER;
  new_usuario_id INTEGER;
  admin_role_id INTEGER;
  business_name TEXT;
  user_full_name TEXT;
BEGIN
  -- Get metadata
  business_name := new.raw_user_meta_data->>'business_name';
  user_full_name := new.raw_user_meta_data->>'full_name';

  -- Default values if missing
  IF business_name IS NULL OR business_name = '' THEN
    business_name := 'Negocio de ' || split_part(new.email, '@', 1);
  END IF;
  
  IF user_full_name IS NULL OR user_full_name = '' THEN
    user_full_name := split_part(new.email, '@', 1);
  END IF;

  -- 1. Create Negocio
  INSERT INTO "Negocio" (nombre, "creadoEn")
  VALUES (business_name, NOW())
  RETURNING id INTO new_negocio_id;

  -- 2. Create Usuario
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
    NULL, -- Managed by Supabase Auth
    NOW()
  )
  RETURNING id INTO new_usuario_id;

  -- 3. Assign ADMIN Role
  SELECT id INTO admin_role_id FROM "Rol" WHERE nombre = 'ADMIN' LIMIT 1;
  
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO "UsuarioRol" ("usuarioId", "rolId")
    VALUES (new_usuario_id, admin_role_id);
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

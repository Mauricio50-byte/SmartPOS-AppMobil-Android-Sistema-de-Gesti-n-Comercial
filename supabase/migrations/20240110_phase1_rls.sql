-- 1. Helper Function to get current user's business ID
-- Defined as SECURITY DEFINER to bypass RLS when fetching the ID
CREATE OR REPLACE FUNCTION public.get_my_negocio_id()
RETURNS INTEGER AS $$
DECLARE
  v_negocio_id INTEGER;
BEGIN
  SELECT "negocioId" INTO v_negocio_id
  FROM public."Usuario"
  WHERE "authUserId" = auth.uid();
  
  RETURN v_negocio_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Enable RLS on Key Tables
ALTER TABLE "Negocio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;

-- 3. Policies for Negocio Table

-- Policy: Users can view their own business
DROP POLICY IF EXISTS "Users can view own business" ON "Negocio";
CREATE POLICY "Users can view own business" ON "Negocio"
FOR SELECT
USING (id = public.get_my_negocio_id());

-- Policy: Users can update their own business
DROP POLICY IF EXISTS "Users can update own business" ON "Negocio";
CREATE POLICY "Users can update own business" ON "Negocio"
FOR UPDATE
USING (id = public.get_my_negocio_id());

-- 4. Policies for Usuario Table

-- Policy: Users can view members of their own business
DROP POLICY IF EXISTS "Users can view members of own business" ON "Usuario";
CREATE POLICY "Users can view members of own business" ON "Usuario"
FOR SELECT
USING ("negocioId" = public.get_my_negocio_id());

-- Policy: Users can insert members to own business (e.g. Admin creating workers)
DROP POLICY IF EXISTS "Users can insert members to own business" ON "Usuario";
CREATE POLICY "Users can insert members to own business" ON "Usuario"
FOR INSERT
WITH CHECK ("negocioId" = public.get_my_negocio_id());

-- Policy: Users can update members of own business
DROP POLICY IF EXISTS "Users can update members of own business" ON "Usuario";
CREATE POLICY "Users can update members of own business" ON "Usuario"
FOR UPDATE
USING ("negocioId" = public.get_my_negocio_id());

-- Policy: Users can delete members of own business
DROP POLICY IF EXISTS "Users can delete members of own business" ON "Usuario";
CREATE POLICY "Users can delete members of own business" ON "Usuario"
FOR DELETE
USING ("negocioId" = public.get_my_negocio_id());

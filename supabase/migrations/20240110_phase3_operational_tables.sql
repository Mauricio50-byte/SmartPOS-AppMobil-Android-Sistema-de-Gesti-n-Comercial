-- 1. Helper Trigger to auto-fill negocioId
CREATE OR REPLACE FUNCTION public.auto_set_negocio_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if not already provided
  IF NEW."negocioId" IS NULL THEN
    NEW."negocioId" := public.get_my_negocio_id();
  END IF;
  
  -- Safety check: ensure the user isn't inserting for another business (unless they are superadmin, but for now strict)
  -- Optional: You could validate here that NEW."negocioId" == public.get_my_negocio_id()
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Define the list of tables to migrate
-- We will apply the same logic to all operational tables
DO $$
DECLARE
  tables text[] := ARRAY[
    'Producto', 
    'Cliente', 
    'Venta', 
    'DetalleVenta', 
    'Caja', 
    'MovimientoCaja', 
    'Gasto', 
    'PagoGasto', 
    'Deuda', 
    'Abono', 
    'AuditLog'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- A. Add negocioId column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = t 
        AND column_name = 'negocioId'
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN "negocioId" INTEGER REFERENCES "Negocio"(id)', t);
    END IF;

    -- B. Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- C. Drop existing policies to avoid duplicates/conflicts
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation ALL" ON %I', t);

    -- D. Create Unified Tenant Isolation Policy
    -- This handles SELECT, INSERT, UPDATE, DELETE
    -- The user must belong to the same business as the record.
    EXECUTE format('
      CREATE POLICY "Tenant Isolation ALL" ON %I
      FOR ALL
      USING ("negocioId" = public.get_my_negocio_id())
      WITH CHECK ("negocioId" = public.get_my_negocio_id())
    ', t);

    -- E. Create Trigger for Auto-fill
    EXECUTE format('DROP TRIGGER IF EXISTS set_negocio_id ON %I', t);
    EXECUTE format('
      CREATE TRIGGER set_negocio_id
      BEFORE INSERT ON %I
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_set_negocio_id()
    ', t);
    
  END LOOP;
END $$;

-- 3. Handle Sub-tables (Extensions of Producto)
-- These don't need negocioId column, they rely on the parent Producto
DO $$
DECLARE
  subtables text[] := ARRAY[
    'ProductoRopa',
    'ProductoAlimento',
    'ProductoServicio',
    'ProductoFarmacia',
    'ProductoPapeleria',
    'ProductoRestaurante'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY subtables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Extension" ON %I', t);
    
    -- Policy: Allow access if the parent Product belongs to the user's business
    EXECUTE format('
      CREATE POLICY "Tenant Isolation Extension" ON %I
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM "Producto" p 
          WHERE p.id = %I."productoId" 
          AND p."negocioId" = public.get_my_negocio_id()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM "Producto" p 
          WHERE p.id = %I."productoId" 
          AND p."negocioId" = public.get_my_negocio_id()
        )
      )
    ', t, t, t);
  END LOOP;
END $$;

-- Add unique constraint on policy_areas.name for upsert operations
-- The code column is auto-generated from the name when null

-- First, add unique constraint on name
ALTER TABLE public.policy_areas
ADD CONSTRAINT policy_areas_name_unique UNIQUE (name);

-- Make code nullable (auto-generate from name if not provided)
ALTER TABLE public.policy_areas
ALTER COLUMN code DROP NOT NULL;

-- Add trigger to auto-generate code from name if not provided
CREATE OR REPLACE FUNCTION public.generate_policy_area_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL THEN
        NEW.code := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_policy_areas_generate_code
BEFORE INSERT ON public.policy_areas
FOR EACH ROW EXECUTE FUNCTION public.generate_policy_area_code();

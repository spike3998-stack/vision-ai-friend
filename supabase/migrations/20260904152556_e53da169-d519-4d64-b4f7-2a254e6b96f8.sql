CREATE TABLE public.gm_ordens (
  id text PRIMARY KEY,
  dados jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.gm_ordens TO service_role;

ALTER TABLE public.gm_ordens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gm_ordens_updated_at
BEFORE UPDATE ON public.gm_ordens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
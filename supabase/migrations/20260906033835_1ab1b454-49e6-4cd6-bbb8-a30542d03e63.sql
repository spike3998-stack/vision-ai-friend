CREATE TABLE public.gm_device_tokens (
  id text PRIMARY KEY,
  matricula text NOT NULL,
  token text NOT NULL UNIQUE,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.gm_device_tokens TO service_role;

ALTER TABLE public.gm_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_gm_device_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gm_device_tokens_updated_at
BEFORE UPDATE ON public.gm_device_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_gm_device_tokens_updated_at();
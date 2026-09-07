CREATE TABLE public.gm_grupamentos (
  sigla text PRIMARY KEY,
  nome text NOT NULL,
  imagem text,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.gm_grupamentos TO service_role;

ALTER TABLE public.gm_grupamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bloqueia acesso direto anonimo" ON public.gm_grupamentos AS PERMISSIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Bloqueia acesso direto de usuarios" ON public.gm_grupamentos AS PERMISSIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TRIGGER update_gm_grupamentos_updated_at
BEFORE UPDATE ON public.gm_grupamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.gm_grupamentos (sigla, nome, ordem) VALUES
  ('GTRAN', 'Grupamento de Trânsito', 1),
  ('ROMU', 'Rondas Ostensivas Municipais', 2),
  ('GRES', 'Grupamento de Resgate e Salvamento', 3),
  ('GOC', 'Grupamento de Operações com Cães', 4),
  ('GID', 'Grupamento de Inteligência e Defesa', 5),
  ('CENTRAL', 'Central de Operações (CIOSP)', 6),
  ('INSPETORIA', 'Inspetoria Geral', 7);
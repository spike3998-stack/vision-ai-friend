CREATE TABLE public.gm_login_codigos (
  matricula text PRIMARY KEY,
  codigo text NOT NULL,
  celular text NOT NULL,
  expira_em timestamptz NOT NULL,
  tentativas integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.gm_login_codigos TO service_role;

ALTER TABLE public.gm_login_codigos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bloqueia acesso direto anonimo" ON public.gm_login_codigos FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Bloqueia acesso direto de usuarios" ON public.gm_login_codigos FOR ALL TO authenticated USING (false) WITH CHECK (false);
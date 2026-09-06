CREATE TABLE IF NOT EXISTS public.gm_chat_mensagens (
  id TEXT PRIMARY KEY,
  canal TEXT NOT NULL,
  autor_matricula TEXT NOT NULL,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gm_chat_mensagens_canal_idx ON public.gm_chat_mensagens (canal, criado_em);

GRANT ALL ON public.gm_chat_mensagens TO service_role;

ALTER TABLE public.gm_chat_mensagens ENABLE ROW LEVEL SECURITY;
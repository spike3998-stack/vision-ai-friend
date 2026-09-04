CREATE TABLE public.gm_usuarios (
  id text PRIMARY KEY,
  matricula text NOT NULL UNIQUE,
  dados jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gm_usuarios TO service_role;
ALTER TABLE public.gm_usuarios ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.gm_viaturas (
  id text PRIMARY KEY,
  dados jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gm_viaturas TO service_role;
ALTER TABLE public.gm_viaturas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.gm_checklists (
  id text PRIMARY KEY,
  dados jsonb NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gm_checklists TO service_role;
ALTER TABLE public.gm_checklists ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.gm_postos (
  posto text PRIMARY KEY,
  ocupantes jsonb NOT NULL DEFAULT '[]'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.gm_postos TO service_role;
ALTER TABLE public.gm_postos ENABLE ROW LEVEL SECURITY;

INSERT INTO public.gm_usuarios (id, matricula, dados) VALUES
('dev-67549', '67549', '{"id":"dev-67549","nomeCompleto":"Joao pedro de souza","nomeDeGuerra":"TEIXEIRA","matricula":"67549","tipoSanguineo":"B+","grupamento":"ROMU","senha":"Joao123","status":"autorizado","isDesenvolvedor":true,"dataCadastro":"03/09/2026 10:00"}'::jsonb);

INSERT INTO public.gm_viaturas (id, dados) VALUES
('vtr-romu-01', '{"id":"vtr-romu-01","prefixo":"ROMU 01","modelo":"Renault Duster 4x4","placa":"RIO-1A23","grupamento":"ROMU","status":"disponivel","kmAtual":"42.150 km","observacoes":"Equipada com giroflex estroboscópico e rádio digital","dataCadastro":"01/09/2026"}'::jsonb),
('vtr-gtran-02', '{"id":"vtr-gtran-02","prefixo":"GTRAN 02","modelo":"Chevrolet Spin","placa":"RIO-4B56","grupamento":"GTRAN","status":"disponivel","kmAtual":"38.800 km","observacoes":"Viatura de apoio para fiscalização de trânsito e orla","dataCadastro":"01/09/2026"}'::jsonb),
('vtr-gres-03', '{"id":"vtr-gres-03","prefixo":"GRES 03","modelo":"Toyota Hilux 4x4","placa":"RIO-7C89","grupamento":"GRES","status":"disponivel","kmAtual":"29.400 km","observacoes":"Equipamentos de salvamento e resgate embarcados","dataCadastro":"02/09/2026"}'::jsonb),
('vtr-op-04', '{"id":"vtr-op-04","prefixo":"GM 04","modelo":"Volkswagen Gol","placa":"RIO-9D01","grupamento":"GID","status":"disponivel","kmAtual":"51.200 km","observacoes":"Ronda ostensiva Centro e bairros","dataCadastro":"02/09/2026"}'::jsonb),
('vtr-goc-05', '{"id":"vtr-goc-05","prefixo":"GOC 05","modelo":"Mitsubishi L200","placa":"RIO-3E45","grupamento":"GOC","status":"disponivel","kmAtual":"34.600 km","observacoes":"Viatura adaptada para canil da Guarda","dataCadastro":"02/09/2026"}'::jsonb);

INSERT INTO public.gm_checklists (id, dados) VALUES
('chk-init-01', '{"id":"chk-init-01","viaturaId":"vtr-romu-01","prefixoViatura":"ROMU 01","placaViatura":"RIO-1A23","modeloViatura":"Renault Duster 4x4","motoristaNome":"SILVA","motoristaMatricula":"10234","motoristaGrupamento":"ROMU","dataHora":"03/09/2026 07:45","kmAtual":"42.150 km","nivelCombustivel":"cheio","pneusEstepe":"conforme","iluminacaoSirene":"conforme","freiosDirecao":"conforme","oleoFluidos":"conforme","limpeza":"limpo","avariasLataria":false,"detalhesAvarias":"","radioComunicador":true,"documentosViatura":true,"kitSeguranca":true,"observacoesGerais":"Viatura inspecionada no início do plantão diurno. Tudo operante.","statusGeral":"aprovada"}'::jsonb),
('chk-init-02', '{"id":"chk-init-02","viaturaId":"vtr-gtran-02","prefixoViatura":"GTRAN 02","placaViatura":"RIO-4B56","modeloViatura":"Chevrolet Spin","motoristaNome":"COSTA","motoristaMatricula":"20456","motoristaGrupamento":"GTRAN","dataHora":"02/09/2026 19:15","kmAtual":"38.800 km","nivelCombustivel":"3_4","pneusEstepe":"conforme","iluminacaoSirene":"conforme","freiosDirecao":"conforme","oleoFluidos":"conforme","limpeza":"regular","avariasLataria":true,"detalhesAvarias":"Pequeno arranhão pré-existente no para-choque traseiro lado direito.","radioComunicador":true,"documentosViatura":true,"kitSeguranca":true,"observacoesGerais":"Cones e fita zebrada presentes no porta-malas.","statusGeral":"aprovada_com_restricoes"}'::jsonb);

INSERT INTO public.gm_postos (posto) VALUES
('CIOSP'),('COORDENADOR DE EQUIPE'),('MOTORISTA'),('OPERACIONAL'),('TAC PONTAL CIMA'),('TAC PONTAL BAIXO'),('PREFEITURA'),('PROCURADORIA'),('FÓRUM'),('CREAS');
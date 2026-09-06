export type Screen =
  | 'login'
  | 'cadastrar'
  | 'menu'
  | 'posto-servico'
  | 'opcao-funcao'
  | 'motorista-mapa'
  | 'ciosp'
  | 'equipe-ordens'
  | 'ras'
  | 'abono'
  | 'livro-ata'
  | 'dev-menu'
  | 'dev-autorizar'
  | 'dev-consultar'
  | 'dev-viaturas';

export type StatusOrdemServico = 'aguardando' | 'aceita' | 'recusada' | 'espera';

export interface MembroEquipe {
  nomeDeGuerra: string;
  matricula: string;
  posto: string;
  grupamento?: string | undefined;
}

export interface OrdemServico {
  id: string;
  grupamento: string;
  endereco: string;
  descricao: string;
  observacoes?: string | undefined;
  status: StatusOrdemServico;
  criadoPor: string;
  criadoPorMatricula: string;
  dataHora: string;
  respondidoPor?: string | undefined;
  respondidoPorMatricula?: string | undefined;
  esperaMinutos?: number | undefined;
  esperaAte?: number | undefined;
  // Boletim de ocorrência no local
  equipe?: MembroEquipe[] | undefined;
  viaturaPrefixo?: string | undefined;
  ocorrenciaStatus?: 'iniciada' | 'recusada_no_local' | 'finalizada' | undefined;
  ocorrenciaIniciadaEm?: string | undefined;
  ocorrenciaFinalizadaEm?: string | undefined;
  relato?: string | undefined;
  fotos?: string[] | undefined;
  reboqueAcionado?: boolean | undefined;
  reboqueEm?: string | undefined;
  apoioGrupamento?: string | undefined;
  origemOrdemId?: string | undefined;
  ehApoio?: boolean | undefined;
}



export type FuncaoPosto =
  | 'CIOSP'
  | 'COORDENADOR DE EQUIPE'
  | 'MOTORISTA'
  | 'OPERACIONAL'
  | 'TAC PONTAL CIMA'
  | 'TAC PONTAL BAIXO'
  | 'PREFEITURA'
  | 'PROCURADORIA'
  | 'FÓRUM'
  | 'CREAS';

export type SiglaGrupamento = 'GTRAN' | 'ROMU' | 'GRES' | 'GOC' | 'GID';

export type StatusCadastro = 'pendente' | 'autorizado' | 'negado';

export interface Viatura {
  id: string;
  prefixo: string;
  modelo: string;
  placa: string;
  grupamento: string;
  status: 'disponivel' | 'em_operacao' | 'manutencao';
  kmAtual?: string | undefined;
  observacoes?: string | undefined;
  dataCadastro?: string | undefined;
}

export interface GrupamentoItem {
  sigla: SiglaGrupamento;
  nome: string;
  imagem: string;
}

export interface UsuarioCadastrado {
  id: string;
  nomeCompleto: string;
  nomeDeGuerra: string;
  matricula: string;
  tipoSanguineo: string;
  grupamento: SiglaGrupamento;
  foto?: string | undefined;
  senha?: string | undefined;
  status: StatusCadastro;
  isDesenvolvedor?: boolean | undefined;
  dataCadastro: string;
}

export interface OcupantePosto {
  matricula: string;
  nomeDeGuerra: string;
  grupamento?: SiglaGrupamento | 'Desenvolvedor' | undefined;
  dataHora: string;
}

export type MapaOcupacaoPostos = Record<string, OcupantePosto[]>;

export interface ChecklistViatura {
  id: string;
  viaturaId: string;
  prefixoViatura: string;
  placaViatura: string;
  modeloViatura?: string | undefined;
  motoristaNome: string;
  motoristaMatricula: string;
  motoristaGrupamento: string;
  dataHora: string;
  kmAtual: string;
  nivelCombustivel: 'cheio' | '3_4' | '1_2' | '1_4' | 'reserva';
  pneusEstepe: 'conforme' | 'atencao' | 'irregular';
  iluminacaoSirene: 'conforme' | 'defeito';
  freiosDirecao: 'conforme' | 'anomalia';
  oleoFluidos: 'conforme' | 'baixo';
  limpeza: 'limpo' | 'regular' | 'sujo';
  avariasLataria: boolean;
  detalhesAvarias?: string | undefined;
  radioComunicador: boolean;
  documentosViatura: boolean;
  kitSeguranca: boolean;
  observacoesGerais?: string | undefined;
  statusGeral: 'aprovada' | 'aprovada_com_restricoes' | 'inapta';
}

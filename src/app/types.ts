export type Screen =
  | 'login'
  | 'cadastrar'
  | 'menu'
  | 'posto-servico'
  | 'opcao-funcao'
  | 'motorista-mapa'
  | 'ras'
  | 'abono'
  | 'livro-ata'
  | 'dev-menu'
  | 'dev-autorizar'
  | 'dev-consultar'
  | 'dev-viaturas';

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
  kmAtual?: string;
  observacoes?: string;
  dataCadastro?: string;
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
  foto?: string;
  senha?: string;
  status: StatusCadastro;
  isDesenvolvedor?: boolean;
  dataCadastro: string;
}

export interface OcupantePosto {
  matricula: string;
  nomeDeGuerra: string;
  grupamento?: SiglaGrupamento | 'Desenvolvedor';
  dataHora: string;
}

export type MapaOcupacaoPostos = Record<string, OcupantePosto[]>;

export interface ChecklistViatura {
  id: string;
  viaturaId: string;
  prefixoViatura: string;
  placaViatura: string;
  modeloViatura?: string;
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
  detalhesAvarias?: string;
  radioComunicador: boolean;
  documentosViatura: boolean;
  kitSeguranca: boolean;
  observacoesGerais?: string;
  statusGeral: 'aprovada' | 'aprovada_com_restricoes' | 'inapta';
}

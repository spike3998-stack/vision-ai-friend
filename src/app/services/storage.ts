import { UsuarioCadastrado, Viatura, MapaOcupacaoPostos, ChecklistViatura } from '../types';
import { MATRICULA_DESENVOLVEDOR } from '../data/grupamentos';

const STORAGE_KEY = 'gm_arraial_usuarios_v4';

export const USUARIOS_INICIAIS: UsuarioCadastrado[] = [
  {
    id: 'dev-67549',
    nomeCompleto: 'Joao pedro de souza',
    nomeDeGuerra: 'TEIXEIRA',
    matricula: MATRICULA_DESENVOLVEDOR,
    tipoSanguineo: 'B+',
    grupamento: 'ROMU',
    senha: 'Joao123',
    status: 'autorizado',
    isDesenvolvedor: true,
    dataCadastro: '03/09/2026 10:00',
  },
];

export function getUsuariosArmazenados(): UsuarioCadastrado[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler localStorage', e);
  }

  // Inicializa com dados padrão
  salvarUsuarios(USUARIOS_INICIAIS);
  return USUARIOS_INICIAIS;
}

export function salvarUsuarios(usuarios: UsuarioCadastrado[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios));
  } catch (e) {
    console.error('Erro ao salvar no localStorage', e);
  }
}

// Limites estritos definidos por regra operacional
export const LIMITES_POSTOS: Record<string, number> = {
  'TAC PONTAL CIMA': 2,
  'TAC PONTAL BAIXO': 2,
  'PROCURADORIA': 1,
  'FÓRUM': 1,
  'FORUM': 1,
  'CIOSP': 1,
  'CREAS': 1,
  'PREFEITURA': 1,
};

const STORAGE_KEY_POSTOS = 'gm_arraial_postos_ocupacao_v3';

export const OCUPACAO_INICIAL_POSTOS: MapaOcupacaoPostos = {
  'CIOSP': [],
  'COORDENADOR DE EQUIPE': [],
  'MOTORISTA': [],
  'OPERACIONAL': [],
  'TAC PONTAL CIMA': [],
  'TAC PONTAL BAIXO': [],
  'PREFEITURA': [],
  'PROCURADORIA': [],
  'FÓRUM': [],
  'CREAS': [],
};

export function getOcupacaoPostos(): MapaOcupacaoPostos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POSTOS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler postos do localStorage', e);
  }

  salvarOcupacaoPostos(OCUPACAO_INICIAL_POSTOS);
  return OCUPACAO_INICIAL_POSTOS;
}

export function salvarOcupacaoPostos(mapa: MapaOcupacaoPostos): void {
  try {
    localStorage.setItem(STORAGE_KEY_POSTOS, JSON.stringify(mapa));
  } catch (e) {
    console.error('Erro ao salvar postos no localStorage', e);
  }
}

// ==========================================
// CONTROLE DE VIATURAS OPERACIONAIS
// ==========================================
const STORAGE_KEY_VIATURAS = 'gm_arraial_viaturas_v1';

/** Sem viaturas de exemplo: o cadastro é feito pelo próprio app. */
export const VIATURAS_INICIAIS: Viatura[] = [];

export function getViaturasArmazenadas(): Viatura[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIATURAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler viaturas do localStorage', e);
  }

  salvarViaturas(VIATURAS_INICIAIS);
  return VIATURAS_INICIAIS;
}

export function salvarViaturas(viaturas: Viatura[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_VIATURAS, JSON.stringify(viaturas));
  } catch (e) {
    console.error('Erro ao salvar viaturas no localStorage', e);
  }
}

// ==========================================
// CONTROLE DE CHECK-LISTS DE VIATURAS
// ==========================================
const STORAGE_KEY_CHECKLISTS = 'gm_arraial_checklists_viaturas_v1';

/** Sem check-lists de exemplo: os registros são criados pelos motoristas. */
export const CHECKLISTS_INICIAIS: ChecklistViatura[] = [];

export function getChecklistsArmazenados(): ChecklistViatura[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKLISTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler checklists do localStorage', e);
  }

  salvarChecklists(CHECKLISTS_INICIAIS);
  return CHECKLISTS_INICIAIS;
}

export function salvarChecklists(checklists: ChecklistViatura[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHECKLISTS, JSON.stringify(checklists));
  } catch (e) {
    console.error('Erro ao salvar checklists no localStorage', e);
  }
}

export function salvarNovoChecklist(novo: ChecklistViatura): ChecklistViatura[] {
  const atuais = getChecklistsArmazenados();
  const atualizados = [novo, ...atuais];
  salvarChecklists(atualizados);
  return atualizados;
}


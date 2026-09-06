import { UsuarioCadastrado, Viatura, MapaOcupacaoPostos, ChecklistViatura, OcupantePosto, OrdemServico } from '../types';
import {
  getUsuariosArmazenados,
  salvarUsuarios,
  getViaturasArmazenadas,
  salvarViaturas,
  getOcupacaoPostos,
  salvarOcupacaoPostos,
  getChecklistsArmazenados,
  salvarChecklists,
} from './storage';

const API_URL = '/api/public/gm/api';

async function chamar<T = any>(payload: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn('[API] Resposta com erro:', data);
      return null;
    }
    return data as T;
  } catch (err) {
    console.warn('[API] Servidor indisponível:', err);
    return null;
  }
}

/** Busca todos os usuários cadastrados no servidor central. */
export async function fetchUsuariosServidor(): Promise<UsuarioCadastrado[]> {
  const data = await chamar<UsuarioCadastrado[]>({ acao: 'usuarios.listar' });
  if (Array.isArray(data) && data.length > 0) {
    salvarUsuarios(data);
    return data;
  }
  return getUsuariosArmazenados();
}

/** Registra novo cadastro ou atualiza no servidor central. */
export async function cadastrarUsuarioServidor(
  usuario: Partial<UsuarioCadastrado>
): Promise<{ success: boolean; usuario?: UsuarioCadastrado; mensagem?: string; error?: string }> {
  const data = await chamar<any>({ acao: 'usuarios.cadastro', usuario });
  if (data?.usuario) {
    const atuais = getUsuariosArmazenados();
    const filtrados = atuais.filter((u) => u.matricula !== data.usuario.matricula);
    salvarUsuarios([...filtrados, data.usuario]);
    return { success: true, usuario: data.usuario, mensagem: data.mensagem };
  }
  return { success: false, error: data?.error || 'Falha de conexão com o servidor central.' };
}

/** Altera status do usuário (autorizado / negado) - Apenas Desenvolvedor. */
export async function alterarStatusUsuarioServidor(
  usuarioId: string,
  novoStatus: 'autorizado' | 'negado'
): Promise<boolean> {
  const data = await chamar<any>({ acao: 'usuarios.status', usuarioId, status: novoStatus });
  if (data?.success) {
    const atuais = getUsuariosArmazenados();
    salvarUsuarios(
      atuais.map((u) =>
        u.id === usuarioId || u.matricula === usuarioId ? { ...u, status: novoStatus } : u
      )
    );
    return true;
  }
  return false;
}

/** Atualiza dados completos de um usuário no servidor. */
export async function atualizarUsuarioServidor(
  usuarioId: string,
  dados: Partial<UsuarioCadastrado>
): Promise<boolean> {
  const data = await chamar<any>({ acao: 'usuarios.atualizar', usuarioId, dados });
  if (data?.success) {
    const atuais = getUsuariosArmazenados();
    salvarUsuarios(
      atuais.map((u) => (u.id === usuarioId || u.matricula === usuarioId ? data.usuario : u))
    );
    return true;
  }
  return false;
}

/** Exclui usuário no servidor. */
export async function excluirUsuarioServidor(usuarioId: string): Promise<boolean> {
  const data = await chamar<any>({ acao: 'usuarios.excluir', usuarioId });
  if (data?.success) {
    const atuais = getUsuariosArmazenados();
    salvarUsuarios(atuais.filter((u) => u.id !== usuarioId && u.matricula !== usuarioId));
    return true;
  }
  return false;
}

/** Zera todos os cadastros, mantendo exclusivamente o Desenvolvedor. */
export async function zerarCadastrosServidor(): Promise<UsuarioCadastrado[] | null> {
  const data = await chamar<any>({ acao: 'usuarios.zerar' });
  if (Array.isArray(data?.usuarios)) {
    salvarUsuarios(data.usuarios);
    return data.usuarios;
  }
  return null;
}

/** POSTOS DE SERVIÇO: busca ocupação atual. */
export async function fetchPostosServidor(): Promise<MapaOcupacaoPostos> {
  const data = await chamar<MapaOcupacaoPostos>({ acao: 'postos.listar' });
  if (data) {
    salvarOcupacaoPostos(data);
    return data;
  }
  return getOcupacaoPostos();
}

export async function ocuparPostoServidor(
  posto: string,
  ocupante: OcupantePosto
): Promise<MapaOcupacaoPostos | null> {
  const data = await chamar<any>({ acao: 'postos.ocupar', posto, ocupante });
  if (data?.postos) {
    salvarOcupacaoPostos(data.postos);
    return data.postos;
  }
  return null;
}

export async function desocuparPostoServidor(
  posto?: string,
  matricula?: string
): Promise<MapaOcupacaoPostos | null> {
  const data = await chamar<any>({ acao: 'postos.desocupar', posto, matricula });
  if (data?.postos) {
    salvarOcupacaoPostos(data.postos);
    return data.postos;
  }
  return null;
}

/** VIATURAS */
export async function fetchViaturasServidor(): Promise<Viatura[]> {
  const data = await chamar<Viatura[]>({ acao: 'viaturas.listar' });
  if (Array.isArray(data)) {
    salvarViaturas(data);
    return data;
  }
  return getViaturasArmazenadas();
}

export async function salvarViaturaServidor(viatura: Partial<Viatura>): Promise<boolean> {
  const data = await chamar<any>({ acao: 'viaturas.salvar', viatura });
  return Boolean(data?.success);
}

export async function excluirViaturaServidor(id: string): Promise<boolean> {
  const data = await chamar<any>({ acao: 'viaturas.excluir', id });
  return Boolean(data?.success);
}

/** CHECK-LISTS */
export async function fetchChecklistsServidor(): Promise<ChecklistViatura[]> {
  const data = await chamar<ChecklistViatura[]>({ acao: 'checklists.listar' });
  if (Array.isArray(data)) {
    salvarChecklists(data);
    return data;
  }
  return getChecklistsArmazenados();
}

export async function enviarChecklistServidor(chk: ChecklistViatura): Promise<boolean> {
  const data = await chamar<any>({ acao: 'checklists.criar', checklist: chk });
  return Boolean(data?.success);
}

/** ORDENS DE SERVIÇO (CIOSP) */
export async function fetchOrdensServidor(): Promise<OrdemServico[]> {
  const data = await chamar<OrdemServico[]>({ acao: 'ordens.listar' });
  return Array.isArray(data) ? data : [];
}

export async function criarOrdemServidor(
  ordem: Partial<OrdemServico>
): Promise<OrdemServico | null> {
  const data = await chamar<any>({ acao: 'ordens.criar', ordem });
  return data?.ordem ?? null;
}

export async function atualizarOrdemServidor(
  id: string,
  dados: Partial<OrdemServico>
): Promise<OrdemServico | null> {
  const data = await chamar<any>({ acao: 'ordens.atualizar', id, dados });
  return data?.ordem ?? null;
}

export async function excluirOrdemServidor(id: string): Promise<boolean> {
  const data = await chamar<any>({ acao: 'ordens.excluir', id });
  return Boolean(data?.success ?? data);
}

/** NOTIFICAÇÕES PUSH */
export async function enviarNotificacaoServidor(
  matriculas: string[],
  titulo: string,
  corpo: string,
  dados?: Record<string, string>
): Promise<boolean> {
  const data = await chamar<any>({
    acao: 'notificacoes.enviar',
    matriculas,
    titulo,
    corpo,
    dados,
  });
  return Boolean(data?.success);
}

/** RÁDIO / CHAT */
export interface MensagemChat {
  id: string;
  canal: string;
  autorMatricula: string;
  autorNome: string;
  autorGrupamento?: string | undefined;
  texto?: string | undefined;
  audio?: string | undefined;
  duracao?: number | undefined;
  dataHora: string;
  criadoEm?: string | undefined;
}

export async function fetchMensagensChat(canal: string): Promise<MensagemChat[]> {
  const data = await chamar<MensagemChat[]>({ acao: 'chat.listar', canal });
  return Array.isArray(data) ? data : [];
}

export async function enviarMensagemChat(
  canal: string,
  mensagem: Partial<MensagemChat>
): Promise<MensagemChat | null> {
  const data = await chamar<any>({ acao: 'chat.enviar', canal, mensagem });
  return data?.mensagem ?? null;
}

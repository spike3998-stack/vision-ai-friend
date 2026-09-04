import { UsuarioCadastrado, Viatura, MapaOcupacaoPostos, ChecklistViatura, OcupantePosto } from '../types';
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

const API_BASE = '/api';

/**
 * Busca todos os usuários cadastrados diretamente do servidor central.
 * Atualiza o cache local para contingência offline.
 */
export async function fetchUsuariosServidor(): Promise<UsuarioCadastrado[]> {
  try {
    const res = await fetch(`${API_BASE}/usuarios`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        salvarUsuarios(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[API] Servidor offline ou indisponível, usando cache local:', err);
  }
  return getUsuariosArmazenados();
}

/**
 * Registra novo cadastro ou atualiza no servidor central.
 */
export async function cadastrarUsuarioServidor(
  usuario: Partial<UsuarioCadastrado>
): Promise<{ success: boolean; usuario?: UsuarioCadastrado; mensagem?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/usuarios/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuario),
    });

    const data = await res.json();
    if (res.ok && data.usuario) {
      // Atualiza lista local com o retornado
      const atuais = getUsuariosArmazenados();
      const filtrados = atuais.filter((u) => u.matricula !== data.usuario.matricula);
      salvarUsuarios([...filtrados, data.usuario]);
      return { success: true, usuario: data.usuario, mensagem: data.mensagem };
    }
    return { success: false, error: data.error || 'Erro ao registrar cadastro no servidor.' };
  } catch (err) {
    console.error('[API] Erro ao cadastrar no servidor:', err);
    return { success: false, error: 'Falha de conexão com o servidor central.' };
  }
}

/**
 * Altera status do usuário (autorizado / negado) - Apenas Desenvolvedor.
 */
export async function alterarStatusUsuarioServidor(
  usuarioId: string,
  novoStatus: 'autorizado' | 'negado'
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/usuarios/${usuarioId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novoStatus }),
    });

    if (res.ok) {
      const atuais = getUsuariosArmazenados();
      const atualizados = atuais.map((u) =>
        u.id === usuarioId || u.matricula === usuarioId ? { ...u, status: novoStatus } : u
      );
      salvarUsuarios(atualizados);
      return true;
    }
  } catch (err) {
    console.error('[API] Erro ao alterar status no servidor:', err);
  }
  return false;
}

/**
 * Atualiza dados completos de um usuário no servidor.
 */
export async function atualizarUsuarioServidor(
  usuarioId: string,
  dados: Partial<UsuarioCadastrado>
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/usuarios/${usuarioId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.usuario) {
        const atuais = getUsuariosArmazenados();
        const atualizados = atuais.map((u) =>
          u.id === usuarioId || u.matricula === usuarioId ? data.usuario : u
        );
        salvarUsuarios(atualizados);
      }
      return true;
    }
  } catch (err) {
    console.error('[API] Erro ao atualizar usuário no servidor:', err);
  }
  return false;
}

/**
 * Exclui usuário no servidor.
 */
export async function excluirUsuarioServidor(usuarioId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/usuarios/${usuarioId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      const atuais = getUsuariosArmazenados();
      const atualizados = atuais.filter((u) => u.id !== usuarioId && u.matricula !== usuarioId);
      salvarUsuarios(atualizados);
      return true;
    }
  } catch (err) {
    console.error('[API] Erro ao excluir usuário no servidor:', err);
  }
  return false;
}

/**
 * Zera todos os cadastros no servidor, mantendo exclusivamente o Desenvolvedor.
 */
export async function zerarCadastrosServidor(): Promise<UsuarioCadastrado[] | null> {
  try {
    const res = await fetch(`${API_BASE}/usuarios/zerar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.usuarios)) {
        salvarUsuarios(data.usuarios);
        return data.usuarios;
      }
    }
  } catch (err) {
    console.error('[API] Erro ao zerar cadastros no servidor:', err);
  }
  return null;
}

/**
 * POSTOS DE SERVIÇO: Busca ocupação atual do servidor.
 */
export async function fetchPostosServidor(): Promise<MapaOcupacaoPostos> {
  try {
    const res = await fetch(`${API_BASE}/postos`);
    if (res.ok) {
      const data = await res.json();
      salvarOcupacaoPostos(data);
      return data;
    }
  } catch (err) {
    console.warn('[API] Erro ao buscar postos do servidor:', err);
  }
  return getOcupacaoPostos();
}

/**
 * Ocupa posto no servidor.
 */
export async function ocuparPostoServidor(
  posto: string,
  ocupante: OcupantePosto
): Promise<MapaOcupacaoPostos | null> {
  try {
    const res = await fetch(`${API_BASE}/postos/ocupar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posto, ocupante }),
    });

    if (res.ok) {
      const data = await res.json();
      salvarOcupacaoPostos(data.postos);
      return data.postos;
    }
  } catch (err) {
    console.error('[API] Erro ao ocupar posto no servidor:', err);
  }
  return null;
}

/**
 * Desocupa posto no servidor.
 */
export async function desocuparPostoServidor(
  posto?: string,
  matricula?: string
): Promise<MapaOcupacaoPostos | null> {
  try {
    const res = await fetch(`${API_BASE}/postos/desocupar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posto, matricula }),
    });

    if (res.ok) {
      const data = await res.json();
      salvarOcupacaoPostos(data.postos);
      return data.postos;
    }
  } catch (err) {
    console.error('[API] Erro ao desocupar posto no servidor:', err);
  }
  return null;
}

/**
 * VIATURAS: Busca do servidor.
 */
export async function fetchViaturasServidor(): Promise<Viatura[]> {
  try {
    const res = await fetch(`${API_BASE}/viaturas`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        salvarViaturas(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[API] Erro ao buscar viaturas do servidor:', err);
  }
  return getViaturasArmazenadas();
}

export async function salvarViaturaServidor(viatura: Partial<Viatura>): Promise<boolean> {
  try {
    const url = viatura.id ? `${API_BASE}/viaturas/${viatura.id}` : `${API_BASE}/viaturas`;
    const method = viatura.id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(viatura),
    });
    return res.ok;
  } catch (err) {
    console.error('[API] Erro ao salvar viatura no servidor:', err);
    return false;
  }
}

export async function excluirViaturaServidor(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/viaturas/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.error('[API] Erro ao excluir viatura no servidor:', err);
    return false;
  }
}

/**
 * CHECK-LISTS: Busca e envio ao servidor.
 */
export async function fetchChecklistsServidor(): Promise<ChecklistViatura[]> {
  try {
    const res = await fetch(`${API_BASE}/checklists`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        salvarChecklists(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[API] Erro ao buscar checklists do servidor:', err);
  }
  return getChecklistsArmazenados();
}

export async function enviarChecklistServidor(chk: ChecklistViatura): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chk),
    });
    return res.ok;
  } catch (err) {
    console.error('[API] Erro ao enviar checklist ao servidor:', err);
    return false;
  }
}

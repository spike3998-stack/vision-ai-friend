import { useEffect, useState } from 'react';
import imgGtran from '../assets/images/brasao_gtran_1788480487910.jpg';
import imgRomu from '../assets/images/brasao_romu_1788480497594.jpg';
import imgGres from '../assets/images/brasao_gres_1788480507599.jpg';
import imgGoc from '../assets/images/brasao_goc_1788480517411.jpg';
import imgGid from '../assets/images/brasao_gid_1788480527526.jpg';
import imgCentral from '../assets/images/brasao_central.jpg';
import imgInspetoria from '../assets/images/brasao_inspetoria.jpg';
import { GrupamentoItem } from '../types';

export const MATRICULA_DESENVOLVEDOR = '67549';

/** Brasões que já vêm embutidos no aplicativo (usados quando não há imagem cadastrada). */
export const BRASOES_PADRAO: Record<string, string> = {
  GTRAN: imgGtran,
  ROMU: imgRomu,
  GRES: imgGres,
  GOC: imgGoc,
  GID: imgGid,
  CENTRAL: imgCentral,
  INSPETORIA: imgInspetoria,
};

const GRUPAMENTOS_PADRAO: GrupamentoItem[] = [
  { sigla: 'GTRAN', nome: 'Grupamento de Trânsito', imagem: imgGtran },
  { sigla: 'ROMU', nome: 'Rondas Ostensivas Municipais', imagem: imgRomu },
  { sigla: 'GRES', nome: 'Grupamento de Resgate e Salvamento', imagem: imgGres },
  { sigla: 'GOC', nome: 'Grupamento de Operações com Cães', imagem: imgGoc },
  { sigla: 'GID', nome: 'Grupamento de Inteligência e Defesa', imagem: imgGid },
  { sigla: 'CENTRAL', nome: 'Central de Operações (CIOSP)', imagem: imgCentral },
  { sigla: 'INSPETORIA', nome: 'Inspetoria Geral', imagem: imgInspetoria },
];

/**
 * Lista viva de grupamentos. É a MESMA referência de array para todo o app:
 * atualizamos o conteúdo no lugar para que todas as telas leiam a lista atual.
 */
export const GRUPAMENTOS: GrupamentoItem[] = [...GRUPAMENTOS_PADRAO];

const CHAVE_LOCAL = 'gm_arraial_grupamentos_v1';
const ouvintes = new Set<() => void>();

function normalizar(lista: GrupamentoItem[]): GrupamentoItem[] {
  return lista
    .filter((g) => g && String(g.sigla || '').trim())
    .map((g) => ({
      sigla: String(g.sigla).trim().toUpperCase(),
      nome: String(g.nome || g.sigla).trim(),
      imagem: g.imagem || BRASOES_PADRAO[String(g.sigla).trim().toUpperCase()] || '',
    }));
}

/** Substitui a lista de grupamentos e avisa as telas abertas. */
export function setGrupamentos(lista: GrupamentoItem[]): void {
  const novos = normalizar(lista);
  if (novos.length === 0) return;
  GRUPAMENTOS.splice(0, GRUPAMENTOS.length, ...novos);
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(novos));
  } catch {
    /* sem armazenamento local disponível */
  }
  ouvintes.forEach((fn) => fn());
}

/** Recupera a última lista salva no aparelho (usada antes da resposta do servidor). */
export function carregarGrupamentosLocais(): void {
  try {
    const raw = localStorage.getItem(CHAVE_LOCAL);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      GRUPAMENTOS.splice(0, GRUPAMENTOS.length, ...normalizar(parsed));
      ouvintes.forEach((fn) => fn());
    }
  } catch {
    /* ignora leitura inválida */
  }
}

/** Hook que devolve a lista atual e atualiza a tela quando ela muda. */
export function useGrupamentos(): GrupamentoItem[] {
  const [lista, setLista] = useState<GrupamentoItem[]>(() => [...GRUPAMENTOS]);
  useEffect(() => {
    const atualizar = () => setLista([...GRUPAMENTOS]);
    ouvintes.add(atualizar);
    atualizar();
    return () => {
      ouvintes.delete(atualizar);
    };
  }, []);
  return lista;
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Lock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Truck,
  CalendarDays,
  RefreshCw,
  Radio,
  Download,
  X,
  FileText,
} from 'lucide-react';

import { ChecklistViatura, OrdemServico, UsuarioCadastrado } from '../types';
import { GRUPAMENTOS, MATRICULA_DESENVOLVEDOR } from '../data/grupamentos';
import { fetchOrdensServidor, fetchChecklistsServidor } from '../services/api';
import { gerarLivroAtaPdf } from '../services/livroAtaPdf';

interface LivroAtaProps {
  usuarioAtivo: UsuarioCadastrado | null;
  onVoltar: () => void;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

/** Extrai "dd/mm/aaaa" do início de uma string de data/hora. */
function apenasData(valor?: string): string {
  if (!valor) return '';
  const m = valor.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : '';
}

function chaveDia(d: Date): string {
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()}`;
}

export function LivroAta({ usuarioAtivo, onVoltar }: LivroAtaProps) {
  const ehDesenvolvedor =
    usuarioAtivo?.isDesenvolvedor || usuarioAtivo?.matricula === MATRICULA_DESENVOLVEDOR;

  const [livroAberto, setLivroAberto] = useState<string | null>(null);
  const [avisoBloqueio, setAvisoBloqueio] = useState<string | null>(null);
  const [mesAtual, setMesAtual] = useState(() => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  });
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);

  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [checklists, setChecklists] = useState<ChecklistViatura[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [modalDownload, setModalDownload] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    try {
      const [o, c] = await Promise.all([fetchOrdensServidor(), fetchChecklistsServidor()]);
      setOrdens(Array.isArray(o) ? o : []);
      setChecklists(Array.isArray(c) ? c : []);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (livroAberto) void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [livroAberto]);

  const podeAbrir = (sigla: string) =>
    sigla === 'CIOSP' || ehDesenvolvedor || usuarioAtivo?.grupamento === sigla;

  const ehLivroCiosp = livroAberto === 'CIOSP';

  const ordensDoLivro = useMemo(
    () =>
      ehLivroCiosp
        ? ordens.filter((o) => o.origemCiosp === true || (!o.ehPatrulhamento && !o.ehApoio && !o.origemCiosp))
        : ordens.filter((o) => o.grupamento === livroAberto),
    [ordens, livroAberto, ehLivroCiosp],
  );
  const checklistsDoLivro = useMemo(
    () =>
      ehLivroCiosp ? [] : checklists.filter((c) => c.motoristaGrupamento === livroAberto),
    [checklists, livroAberto, ehLivroCiosp],
  );

  const diasComRegistro = useMemo(() => {
    const set = new Set<string>();
    for (const o of ordensDoLivro) if (apenasData(o.dataHora)) set.add(apenasData(o.dataHora));
    for (const c of checklistsDoLivro) if (apenasData(c.dataHora)) set.add(apenasData(c.dataHora));
    return set;
  }, [ordensDoLivro, checklistsDoLivro]);

  const ordensDoDia = ordensDoLivro.filter((o) => apenasData(o.dataHora) === diaSelecionado);
  const checklistsDoDia = checklistsDoLivro.filter(
    (c) => apenasData(c.dataHora) === diaSelecionado,
  );

  const selecionarDia = (chave: string) => {
    setDiaSelecionado(chave);
    setModalDownload(true);
  };

  const baixarLivroAta = async () => {
    if (!livroAberto || !diaSelecionado || gerandoPdf) return;
    setGerandoPdf(true);
    try {
      const brasao = GRUPAMENTOS.find((g) => g.sigla === livroAberto)?.imagem;
      await gerarLivroAtaPdf({
        sigla: livroAberto,
        data: diaSelecionado,
        ordens: ordensDoDia,
        checklists: checklistsDoDia,
        usuario: usuarioAtivo,
        brasaoUrl: brasao,
      });
      setModalDownload(false);
    } finally {
      setGerandoPdf(false);
    }
  };

  /* ---------------- TELA 1: ESCOLHA DO LIVRO ---------------- */
  if (!livroAberto) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-5 shadow-xs">
        <div className="text-center space-y-1">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase">Consultar Livro Ata</h3>
          <p className="text-xs text-slate-500">
            Selecione o livro de registro do seu grupamento.
          </p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => {
              setAvisoBloqueio(null);
              setDiaSelecionado(null);
              setLivroAberto('CIOSP');
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-50 text-left transition cursor-pointer"
          >
            <span className="w-11 h-11 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-blue-400" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900 uppercase">Livro Ata CIOSP</p>
              <p className="text-[11px] text-slate-500 truncate">
                Posto de serviço CIOSP — apenas ordens emitidas pela CIOSP
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {GRUPAMENTOS.map((g) => {
            const liberado = podeAbrir(g.sigla);
            return (
              <button
                key={g.sigla}
                type="button"
                onClick={() => {
                  if (!liberado) {
                    setAvisoBloqueio(g.sigla);
                    return;
                  }
                  setAvisoBloqueio(null);
                  setDiaSelecionado(null);
                  setLivroAberto(g.sigla);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                  liberado
                    ? 'border-slate-200 bg-white hover:border-slate-900 hover:bg-slate-50'
                    : 'border-slate-200 bg-slate-50 opacity-70'
                }`}
              >
                <img
                  src={g.imagem}
                  alt={`Brasão ${g.sigla}`}
                  className="w-11 h-11 rounded-lg object-cover border border-slate-200"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-900 uppercase">
                    Livro Ata {g.sigla}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{g.nome}</p>
                </div>
                {liberado ? (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-400" />
                )}
              </button>
            );
          })}
        </div>

        {avisoBloqueio && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
            <p className="text-xs font-bold text-rose-700 uppercase">Acesso restrito</p>
            <p className="text-[11px] text-rose-600 mt-1">
              O Livro Ata {avisoBloqueio} só pode ser consultado por agentes do grupamento{' '}
              {avisoBloqueio}.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onVoltar}
          className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
      </div>
    );
  }

  /* ---------------- TELA 2: CALENDÁRIO ---------------- */
  const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
  const totalDias = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0).getDate();
  const celulas: (Date | null)[] = [];
  for (let i = 0; i < primeiroDia.getDay(); i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) {
    celulas.push(new Date(mesAtual.getFullYear(), mesAtual.getMonth(), d));
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase">
              Livro Ata {livroAberto}
            </h3>
            <p className="text-[11px] text-slate-500">
              Registros de ordens de serviço e checklists por data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void carregar()}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
            aria-label="Atualizar registros"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Calendário */}
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() =>
                setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))
              }
              className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <p className="text-sm font-black text-slate-800 uppercase">
              {MESES[mesAtual.getMonth()]} {mesAtual.getFullYear()}
            </p>
            <button
              type="button"
              onClick={() =>
                setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))
              }
              className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map((d, i) => (
              <span
                key={`${d}-${i}`}
                className="text-center text-[10px] font-bold text-slate-400 uppercase"
              >
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {celulas.map((data, i) => {
              if (!data) return <span key={`v-${i}`} />;
              const chave = chaveDia(data);
              const temRegistro = diasComRegistro.has(chave);
              const ativo = diaSelecionado === chave;
              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => selecionarDia(chave)}
                  className={`relative aspect-square rounded-lg text-xs font-bold cursor-pointer transition ${
                    ativo
                      ? 'bg-slate-900 text-white'
                      : temRegistro
                        ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {data.getDate()}
                  {temRegistro && !ativo && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setLivroAberto(null);
              setDiaSelecionado(null);
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Livros</span>
          </button>
          <button
            type="button"
            onClick={onVoltar}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase cursor-pointer"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Registros do dia */}
      {diaSelecionado && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <h4 className="text-sm font-black text-slate-900 uppercase">
              Registros de {diaSelecionado}
            </h4>
          </div>

          {ordensDoDia.length === 0 && checklistsDoDia.length === 0 && (
            <p className="text-xs text-slate-500 text-center py-6">
              Nenhum registro lançado nesta data.
            </p>
          )}

          {ordensDoDia.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" /> Ordens de serviço (
                {ordensDoDia.length})
              </p>
              {ordensDoDia.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-200 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-800 uppercase truncate">
                      {o.descricao}
                    </p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                      {o.ocorrenciaStatus === 'finalizada' ? 'encerrada' : o.status}
                    </span>
                  </div>
                  {o.ocorrenciaStatus === 'finalizada' && (
                    <p className="text-[10px] font-black uppercase text-emerald-700">
                      Ocorrência encerrada
                      {o.ocorrenciaFinalizadaEm ? ` • ${o.ocorrenciaFinalizadaEm}` : ''}
                    </p>
                  )}
                  {ehLivroCiosp && (
                    <span className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900 text-white">
                      {o.grupamento}
                    </span>
                  )}
                  <p className="text-[11px] text-slate-600">{o.endereco}</p>
                  <p className="text-[10px] text-slate-400">
                    {o.dataHora} • Emitida por {o.criadoPor}
                    {o.respondidoPor ? ` • Atendida por ${o.respondidoPor}` : ''}
                    {o.viaturaPrefixo ? ` • VTR ${o.viaturaPrefixo}` : ''}
                  </p>
                  {o.equipe && o.equipe.length > 0 && (
                    <p className="text-[10px] text-slate-500">
                      Equipe: {o.equipe.map((m) => m.nomeDeGuerra).join(', ')}
                    </p>
                  )}
                  {o.relato && (
                    <p className="text-[11px] text-slate-700 bg-slate-50 rounded-lg p-2 whitespace-pre-wrap">
                      {o.relato}
                    </p>
                  )}
                  {o.reboqueAcionado && (
                    <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      Reboque acionado
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {checklistsDoDia.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Checklists de viatura (
                {checklistsDoDia.length})
              </p>
              {checklistsDoDia.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-black text-slate-800 uppercase">
                      {c.prefixoViatura} • {c.placaViatura}
                    </p>
                    <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                      {c.statusGeral.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {c.kmAtual} • Combustível {c.nivelCombustivel.replace('_', '/')}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {c.dataHora} • {c.motoristaNome} ({c.motoristaMatricula})
                  </p>
                  {c.observacoesGerais && (
                    <p className="text-[11px] text-slate-700 bg-slate-50 rounded-lg p-2 whitespace-pre-wrap">
                      {c.observacoesGerais}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JANELA DE DOWNLOAD DO LIVRO ATA DO DIA */}
      {modalDownload && diaSelecionado && livroAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-slate-900">
                Download Livro Ata ({diaSelecionado})
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Documento do livro diário {livroAberto} com as ocorrências
                {checklistsDoDia.length > 0 ? ', checklists' : ''} e fotos do dia.
              </p>
            </div>
            {ordensDoDia.length === 0 && checklistsDoDia.length === 0 ? (
              <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                Nenhum registro lançado nesta data.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => void baixarLivroAta()}
                disabled={gerandoPdf}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-sm uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className={`w-5 h-5 ${gerandoPdf ? 'animate-bounce' : ''}`} />
                <span>{gerandoPdf ? 'Gerando documento...' : 'Baixar documento'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalDownload(false)}
              className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

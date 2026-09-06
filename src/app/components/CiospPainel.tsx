import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Send,
  X,
  MapPin,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Repeat,
  Truck,
  Siren,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import { UsuarioCadastrado, OrdemServico } from '../types';
import { GRUPAMENTOS } from '../data/grupamentos';
import {
  fetchOrdensServidor,
  criarOrdemServidor,
  atualizarOrdemServidor,
  excluirOrdemServidor,
} from '../services/api';

interface CiospPainelProps {
  usuarioAtivo: UsuarioCadastrado | null;
  onTrocarPosto: () => void;
  onDesocuparPosto: () => void;
  onVoltarMenu: () => void;
}

const CORES_STATUS: Record<string, string> = {
  aguardando: 'bg-amber-100 text-amber-800 border-amber-300',
  aceita: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  recusada: 'bg-rose-100 text-rose-800 border-rose-300',
  espera: 'bg-blue-100 text-blue-800 border-blue-300',
};

const ROTULOS_STATUS: Record<string, string> = {
  aguardando: 'AGUARDANDO',
  aceita: 'ACEITA',
  recusada: 'RECUSADA',
  espera: 'EM ESPERA',
};

export const CiospPainel: React.FC<CiospPainelProps> = ({
  usuarioAtivo,
  onTrocarPosto,
  onDesocuparPosto,
  onVoltarMenu,
}) => {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [reenviandoId, setReenviandoId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const [grupamento, setGrupamento] = useState<string>('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Sugestões de endereço enquanto o CIOSP digita (mapa aberto — ruas, números, comércios e pontos turísticos)
  interface SugestaoEndereco {
    titulo: string;
    detalhe: string;
    completo: string;
    lat: number;
    lon: number;
  }
  const [sugestoesEndereco, setSugestoesEndereco] = useState<SugestaoEndereco[]>([]);
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lon: number } | null>(null);
  const debounceEndereco = React.useRef<number | null>(null);

  const buscarSugestoesEndereco = (texto: string) => {
    setEndereco(texto);
    setCoordenadas(null);
    if (debounceEndereco.current) window.clearTimeout(debounceEndereco.current);
    const consulta = texto.trim();
    if (consulta.length < 3) {
      setSugestoesEndereco([]);
      setBuscandoEndereco(false);
      return;
    }
    setBuscandoEndereco(true);
    debounceEndereco.current = window.setTimeout(async () => {
      try {
        // Prioriza a região de Arraial do Cabo, mas não descarta resultados de fora
        const viewbox = '-42.20,-22.75,-41.80,-23.10';
        const url =
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8` +
          `&countrycodes=br&viewbox=${viewbox}&q=${encodeURIComponent(consulta)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        const achados = (await res.json()) as Array<{
          display_name: string;
          name?: string;
          lat: string;
          lon: string;
        }>;
        const lista: SugestaoEndereco[] = achados
          .map((a) => {
            const partes = a.display_name.split(',').map((p) => p.trim());
            const titulo = a.name?.trim() || partes.slice(0, 2).join(', ');
            return {
              titulo,
              detalhe: partes.slice(1).join(', '),
              completo: a.display_name,
              lat: parseFloat(a.lat),
              lon: parseFloat(a.lon),
            };
          })
          .filter((s, i, arr) => arr.findIndex((x) => x.completo === s.completo) === i)
          .slice(0, 6);
        setSugestoesEndereco(lista);
      } catch {
        setSugestoesEndereco([]);
      } finally {
        setBuscandoEndereco(false);
      }
    }, 350);
  };

  const escolherSugestao = (s: SugestaoEndereco) => {
    setEndereco(s.completo);
    setCoordenadas({ lat: s.lat, lon: s.lon });
    setSugestoesEndereco([]);
  };

  const carregar = useCallback(async () => {
    const lista = await fetchOrdensServidor();
    setOrdens(lista);
  }, []);

  useEffect(() => {
    carregar();
    const t = window.setInterval(carregar, 6000);
    return () => window.clearInterval(t);
  }, [carregar]);

  const formularioValido = Boolean(grupamento && endereco.trim() && descricao.trim());

  const limparFormulario = () => {
    setGrupamento('');
    setEndereco('');
    setDescricao('');
    setObservacoes('');
    setErro(null);
    setEditandoId(null);
  };

  const abrirEdicao = (ordem: OrdemServico) => {
    setEditandoId(ordem.id);
    setGrupamento(ordem.grupamento);
    setEndereco(ordem.endereco);
    setDescricao(ordem.descricao);
    setObservacoes(ordem.observacoes || '');
    setErro(null);
    setModalAberto(true);
  };

  const handleExcluir = async (id: string) => {
    const ok = await excluirOrdemServidor(id);
    setExcluindoId(null);
    if (ok) setOrdens((prev) => prev.filter((o) => o.id !== id));
  };

  const handleEnviar = async () => {
    if (!formularioValido) return;
    setEnviando(true);
    setErro(null);

    if (editandoId) {
      const atualizada = await atualizarOrdemServidor(editandoId, {
        grupamento,
        endereco: endereco.trim(),
        latitude: coordenadas?.lat,
        longitude: coordenadas?.lon,
        descricao: descricao.trim(),
        observacoes: observacoes.trim(),
      });
      setEnviando(false);
      if (!atualizada) {
        setErro('Não foi possível salvar as alterações. Tente novamente.');
        return;
      }
      setOrdens((prev) => prev.map((o) => (o.id === atualizada.id ? atualizada : o)));
      limparFormulario();
      setModalAberto(false);
      return;
    }

    const nova = await criarOrdemServidor({
      grupamento,
      endereco: endereco.trim(),
      latitude: coordenadas?.lat,
      longitude: coordenadas?.lon,
      descricao: descricao.trim(),
      observacoes: observacoes.trim(),
      criadoPor: usuarioAtivo?.nomeDeGuerra || 'CIOSP',
      criadoPorMatricula: usuarioAtivo?.matricula || '---',
      origemCiosp: true,
    });
    setEnviando(false);
    if (!nova) {
      setErro('Não foi possível enviar a ordem de serviço. Tente novamente.');
      return;
    }
    setOrdens((prev) => [nova, ...prev]);
    limparFormulario();
    setModalAberto(false);
  };

  const handleReenviar = async (ordem: OrdemServico, novoGrupamento: string) => {
    const atualizada = await atualizarOrdemServidor(ordem.id, {
      grupamento: novoGrupamento,
      status: 'aguardando',
      respondidoPor: undefined,
      respondidoPorMatricula: undefined,
      esperaMinutos: undefined,
      esperaAte: undefined,
      dataHora: new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
    setReenviandoId(null);
    if (atualizada) {
      setOrdens((prev) => prev.map((o) => (o.id === atualizada.id ? atualizada : o)));
    }
  };

  return (
    <div id="screen-ciosp" className="space-y-4">
      {/* CABEÇALHO DO CIOSP */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2 py-0.5 rounded-md">
                POSTO CIOSP
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1">
                {usuarioAtivo?.nomeDeGuerra || 'OPERADOR'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Matrícula: {usuarioAtivo?.matricula || '---'}
              </p>
            </div>
          </div>

          {/* BOTÃO NO CANTO SUPERIOR DIREITO */}
          <button
            id="btn-enviar-ordem-servico"
            type="button"
            onClick={() => {
              limparFormulario();
              setModalAberto(true);
            }}
            className="self-start sm:self-center px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 cursor-pointer transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
            <span>Enviar Ordem de Serviço para Grupamento</span>
          </button>
        </div>
      </div>

      {/* FEED DE ORDENS DE SERVIÇO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600" />
            <span>Feed de Ordens de Serviço</span>
          </h3>
          <button
            type="button"
            onClick={carregar}
            className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar</span>
          </button>
        </div>

        {ordens.length === 0 && (
          <p className="text-xs text-slate-500 py-6 text-center">
            Nenhuma ordem de serviço enviada até o momento.
          </p>
        )}

        <div className="space-y-2.5">
          {ordens.map((ordem) => (
            <div
              key={ordem.id}
              className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900 text-white">
                    {ordem.grupamento}
                  </span>
                  <span
                    className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      CORES_STATUS[ordem.status] || CORES_STATUS['aguardando']
                    }`}
                  >
                    {ROTULOS_STATUS[ordem.status] || ordem.status}
                    {ordem.status === 'espera' && ordem.esperaMinutos
                      ? ` • ${ordem.esperaMinutos} MIN`
                      : ''}
                  </span>
                  {ordem.status === 'recusada' && (
                    <button
                      type="button"
                      onClick={() => setReenviandoId(reenviandoId === ordem.id ? null : ordem.id)}
                      className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Repeat className="w-3 h-3" />
                      <span>Enviar novamente</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">{ordem.dataHora}</span>
                  <button
                    type="button"
                    onClick={() => abrirEdicao(ordem)}
                    aria-label="Editar ordem de serviço"
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExcluindoId(excluindoId === ordem.id ? null : ordem.id)}
                    aria-label="Apagar ordem de serviço"
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:border-rose-500 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  </button>
                </div>
              </div>

              {excluindoId === ordem.id && (
                <div className="bg-white border border-rose-200 rounded-lg p-2.5 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] font-bold uppercase text-rose-700">
                    Apagar esta ordem de serviço?
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExcluindoId(null)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExcluir(ordem.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase cursor-pointer"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              )}


              {reenviandoId === ordem.id && (
                <div className="bg-white border border-blue-200 rounded-lg p-2.5 space-y-2">
                  <p className="text-[11px] font-bold uppercase text-slate-600">
                    Escolha outro grupamento:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {GRUPAMENTOS.map((g) => (
                      <button
                        key={g.sigla}
                        type="button"
                        onClick={() => handleReenviar(ordem, g.sigla)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-[11px] font-bold text-slate-700 cursor-pointer"
                      >
                        {g.sigla}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm font-bold text-slate-900">{ordem.descricao}</p>
              <p className="text-xs text-slate-600 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{ordem.endereco}</span>
              </p>
              {ordem.observacoes && (
                <p className="text-xs text-slate-500">Obs.: {ordem.observacoes}</p>
              )}
              {ordem.reboqueAcionado && (
                <p className="text-xs font-black uppercase text-amber-900 bg-amber-100 border-2 border-amber-400 rounded-lg p-2.5 flex items-center gap-2 animate-pulse">
                  <Truck className="w-4 h-4 shrink-0" />
                  <span>
                    Reboque acionado pela equipe{ordem.reboqueEm ? ` às ${ordem.reboqueEm}` : ''}
                  </span>
                </p>
              )}

              {ordem.apoioGrupamento && (
                <p className="text-xs font-black uppercase text-rose-900 bg-rose-100 border border-rose-300 rounded-lg p-2.5 flex items-center gap-2">
                  <Siren className="w-4 h-4 shrink-0" />
                  <span>Apoio acionado: {ordem.apoioGrupamento}</span>
                </p>
              )}

              {ordem.ocorrenciaStatus === 'iniciada' && (
                <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-2.5 space-y-1">
                  <p className="font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Ocorrência iniciada no local {ordem.ocorrenciaIniciadaEm ? `• ${ordem.ocorrenciaIniciadaEm}` : ''}
                  </p>
                  {ordem.equipe && ordem.equipe.length > 0 && (
                    <p className="text-[11px] text-slate-600">
                      Equipe: {ordem.equipe.map((m) => `${m.nomeDeGuerra} (${m.posto})`).join(' • ')}
                      {ordem.viaturaPrefixo ? ` • VTR ${ordem.viaturaPrefixo}` : ''}
                    </p>
                  )}
                  {ordem.relato && (
                    <p className="text-[11px] text-slate-600 italic whitespace-pre-wrap">{ordem.relato}</p>
                  )}
                </div>
              )}

              {ordem.ocorrenciaStatus === 'finalizada' && (
                <div className="text-xs text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg p-2.5 space-y-1">
                  <p className="font-black uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Ocorrência encerrada{' '}
                    {ordem.ocorrenciaFinalizadaEm ? `• ${ordem.ocorrenciaFinalizadaEm}` : ''}
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Registro enviado ao Livro Ata do {ordem.grupamento}.
                  </p>
                  {ordem.relato && (
                    <p className="text-[11px] text-emerald-900 italic whitespace-pre-wrap">
                      {ordem.relato}
                    </p>
                  )}
                </div>
              )}



              {ordem.respondidoPor && (
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  {ordem.status === 'aceita' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  {ordem.status === 'recusada' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                  {ordem.status === 'espera' && <Clock className="w-3.5 h-3.5 text-blue-600" />}
                  <span>
                    Resposta da equipe: {ordem.respondidoPor} (
                    {ordem.respondidoPorMatricula})
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AÇÕES DO POSTO */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onTrocarPosto}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>TROCAR DE POSTO</span>
        </button>
        <button
          type="button"
          onClick={onDesocuparPosto}
          className="w-full py-3 px-4 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-sm uppercase tracking-wider cursor-pointer"
        >
          DESOCUPAR / LIBERAR ESTE POSTO
        </button>
        <button
          type="button"
          onClick={onVoltarMenu}
          className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase tracking-wider cursor-pointer"
        >
          MENU PRINCIPAL
        </button>
      </div>

      {/* MODAL DE NOVA ORDEM DE SERVIÇO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <span>{editandoId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalAberto(false);
                  limparFormulario();
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600">
                  Selecionar grupamento *
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {GRUPAMENTOS.map((g) => (
                    <button
                      key={g.sigla}
                      type="button"
                      onClick={() => setGrupamento(g.sigla)}
                      className={`px-3 py-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                        grupamento === g.sigla
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-sm font-black text-slate-900">{g.sigla}</span>
                      <span className="block text-[10px] text-slate-500 leading-tight">
                        {g.nome}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <label className="text-xs font-bold uppercase text-slate-600">Endereço *</label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => buscarSugestoesEndereco(e.target.value)}
                  placeholder="Rua, número, bairro"
                  autoComplete="off"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
                />
                {buscandoEndereco && (
                  <span className="absolute right-3 top-9 text-[10px] font-bold text-slate-400 uppercase">
                    buscando...
                  </span>
                )}
                {sugestoesEndereco.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                    {sugestoesEndereco.map((s) => (
                      <li key={s.completo}>
                        <button
                          type="button"
                          onClick={() => escolherSugestao(s)}
                          className="w-full text-left px-3 py-2.5 text-xs text-slate-800 hover:bg-blue-50 flex items-start gap-1.5 cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <span className="min-w-0">
                            <span className="block font-bold text-slate-900">{s.titulo}</span>
                            <span className="block text-[10px] text-slate-500 leading-tight">
                              {s.detalhe}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {coordenadas && (
                  <p className="mt-1 text-[10px] font-bold text-emerald-600 uppercase">
                    Local confirmado no mapa — rota exata para o motorista
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Descrição *</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Descreva a ocorrência"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600">Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Informações complementares (opcional)"
                  className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {erro && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                  {erro}
                </p>
              )}

              <button
                type="button"
                disabled={!formularioValido || enviando}
                onClick={handleEnviar}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
              >
                <Send className="w-4 h-4" />
                <span>
                  {enviando
                    ? 'SALVANDO...'
                    : editandoId
                      ? 'SALVAR ALTERAÇÕES'
                      : 'ENVIAR PARA O GRUPAMENTO'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

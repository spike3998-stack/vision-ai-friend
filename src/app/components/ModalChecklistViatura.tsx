import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  PlusCircle,
  History,
  Car,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  X,
  Gauge,
  Fuel,
  Radio,
  FileCheck,
  Shield,
  Clock,
  User,
  Eye,
  Filter,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Info,
} from 'lucide-react';
import { UsuarioCadastrado, Viatura, ChecklistViatura } from '../types';
import { getChecklistsArmazenados, salvarNovoChecklist } from '../services/storage';
import { fetchChecklistsServidor, enviarChecklistServidor } from '../services/api';

interface ModalChecklistViaturaProps {
  aberto: boolean;
  onClose: () => void;
  usuarioAtivo: UsuarioCadastrado | null;
  viaturas: Viatura[];
  viaturaSelecionadaPadrao?: Viatura | null;
  onChecklistSalvo?: (checklist: ChecklistViatura) => void;
}

export const ModalChecklistViatura: React.FC<ModalChecklistViaturaProps> = ({
  aberto,
  onClose,
  usuarioAtivo,
  viaturas,
  viaturaSelecionadaPadrao,
  onChecklistSalvo,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<'novo' | 'historico'>('novo');
  const [checklists, setChecklists] = useState<ChecklistViatura[]>([]);
  const [checklistDetalhado, setChecklistDetalhado] = useState<ChecklistViatura | null>(null);

  // Filtros do histórico
  const [buscaHistorico, setBuscaHistorico] = useState<string>('');
  const [filtroPrefixo, setFiltroPrefixo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');

  // Estado do formulário
  const [viaturaId, setViaturaId] = useState<string>('');
  const [kmAtual, setKmAtual] = useState<string>('');
  const [nivelCombustivel, setNivelCombustivel] = useState<'cheio' | '3_4' | '1_2' | '1_4' | 'reserva'>('cheio');
  const [pneusEstepe, setPneusEstepe] = useState<'conforme' | 'atencao' | 'irregular'>('conforme');
  const [iluminacaoSirene, setIluminacaoSirene] = useState<'conforme' | 'defeito'>('conforme');
  const [freiosDirecao, setFreiosDirecao] = useState<'conforme' | 'anomalia'>('conforme');
  const [oleoFluidos, setOleoFluidos] = useState<'conforme' | 'baixo'>('conforme');
  const [limpeza, setLimpeza] = useState<'limpo' | 'regular' | 'sujo'>('limpo');
  const [radioComunicador, setRadioComunicador] = useState<boolean>(true);
  const [documentosViatura, setDocumentosViatura] = useState<boolean>(true);
  const [kitSeguranca, setKitSeguranca] = useState<boolean>(true);
  const [avariasLataria, setAvariasLataria] = useState<boolean>(false);
  const [detalhesAvarias, setDetalhesAvarias] = useState<string>('');
  const [observacoesGerais, setObservacoesGerais] = useState<string>('');
  const [statusGeral, setStatusGeral] = useState<'aprovada' | 'aprovada_com_restricoes' | 'inapta'>('aprovada');

  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  // Carrega checklists salvos (primeiro do local, depois atualiza do servidor)
  useEffect(() => {
    if (aberto) {
      setChecklists(getChecklistsArmazenados());
      fetchChecklistsServidor().then((dados) => {
        if (dados && dados.length > 0) setChecklists(dados);
      });
      setSucessoMsg(null);
      setErroMsg(null);
      if (viaturaSelecionadaPadrao) {
        setViaturaId(viaturaSelecionadaPadrao.id);
        if (viaturaSelecionadaPadrao.kmAtual) {
          setKmAtual(viaturaSelecionadaPadrao.kmAtual.replace(/[^\d]/g, ''));
        }
      } else if (viaturas.length > 0 && !viaturaId) {
        setViaturaId(viaturas[0]!.id);
      }
    }
  }, [aberto, viaturaSelecionadaPadrao, viaturas]);

  if (!aberto) return null;

  const viaturaEscolhida = viaturas.find((v) => v.id === viaturaId) || viaturas[0];

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);

    if (!viaturaEscolhida) {
      setErroMsg('Selecione a viatura a ser inspecionada.');
      return;
    }

    if (!kmAtual.trim()) {
      setErroMsg('Informe a quilometragem (KM) atual da viatura.');
      return;
    }

    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaFormatada = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const novoChecklist: ChecklistViatura = {
      id: `chk-${Date.now()}`,
      viaturaId: viaturaEscolhida.id,
      prefixoViatura: viaturaEscolhida.prefixo,
      placaViatura: viaturaEscolhida.placa,
      modeloViatura: viaturaEscolhida.modelo,
      motoristaNome: usuarioAtivo?.nomeDeGuerra || 'MOTORISTA',
      motoristaMatricula: usuarioAtivo?.matricula || '---',
      motoristaGrupamento: usuarioAtivo?.grupamento || 'GTRAN',
      dataHora: `${dataFormatada} ${horaFormatada}`,
      kmAtual: `${kmAtual.replace(/[^\d]/g, '')} km`,
      nivelCombustivel,
      pneusEstepe,
      iluminacaoSirene,
      freiosDirecao,
      oleoFluidos,
      limpeza,
      avariasLataria,
      detalhesAvarias: avariasLataria ? detalhesAvarias.trim() : '',
      radioComunicador,
      documentosViatura,
      kitSeguranca,
      observacoesGerais: observacoesGerais.trim(),
      statusGeral,
    };

    const atualizados = salvarNovoChecklist(novoChecklist);
    setChecklists(atualizados);
    await enviarChecklistServidor(novoChecklist);

    if (onChecklistSalvo) {
      onChecklistSalvo(novoChecklist);
    }

    setSucessoMsg(`Check-list da viatura ${novoChecklist.prefixoViatura} registrado com sucesso!`);
    setTimeout(() => {
      setAbaAtiva('historico');
      setSucessoMsg(null);
    }, 1200);
  };

  // Filtragem do histórico
  const checklistsFiltrados = checklists.filter((chk) => {
    const q = buscaHistorico.toLowerCase();
    const matchBusca =
      chk.prefixoViatura.toLowerCase().includes(q) ||
      chk.placaViatura.toLowerCase().includes(q) ||
      chk.motoristaNome.toLowerCase().includes(q) ||
      chk.motoristaMatricula.toLowerCase().includes(q) ||
      (chk.observacoesGerais && chk.observacoesGerais.toLowerCase().includes(q));

    const matchPrefixo = filtroPrefixo === 'todos' || chk.viaturaId === filtroPrefixo;
    const matchStatus = filtroStatus === 'todos' || chk.statusGeral === filtroStatus;

    return matchBusca && matchPrefixo && matchStatus;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 animate-scale-up text-slate-900 max-h-[92vh] flex flex-col my-auto">
        {/* CABEÇALHO DO MODAL */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 text-blue-400 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  Check-list de Viaturas
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Condutor Operacional
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Inspeção veicular diária da Guarda Municipal de Arraial do Cabo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NAVEGAÇÃO ENTRE ABAS */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setAbaAtiva('novo');
                setChecklistDetalhado(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-all cursor-pointer ${
                abaAtiva === 'novo'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Realizar Check-list</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAbaAtiva('historico');
                setChecklistDetalhado(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-all cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/60'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Consultas & Histórico</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  abaAtiva === 'historico' ? 'bg-blue-800 text-white' : 'bg-slate-300 text-slate-700'
                }`}
              >
                {checklists.length}
              </span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
            Condutor: <strong>{usuarioAtivo?.nomeDeGuerra || 'MOTORISTA'}</strong> (Mat: {usuarioAtivo?.matricula || '---'})
          </span>
        </div>

        {/* CORPO DO MODAL */}
        <div className="overflow-y-auto flex-1 p-5 text-slate-800">
          {/* MENSAGEM DE SUCESSO OU ERRO */}
          {sucessoMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center gap-2 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucessoMsg}</span>
            </div>
          )}
          {erroMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 flex items-center gap-2 text-xs font-bold animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* ABA 1: NOVO CHECK-LIST                                   */}
          {/* ======================================================== */}
          {abaAtiva === 'novo' && (
            <form onSubmit={handleSalvar} className="space-y-4">
              {/* BLOCO 1: VIATURA E CONDUTOR */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                    Viatura a Inspecionar *
                  </label>
                  <select
                    value={viaturaId}
                    onChange={(e) => {
                      setViaturaId(e.target.value);
                      const sel = viaturas.find((v) => v.id === e.target.value);
                      if (sel?.kmAtual) {
                        setKmAtual(sel.kmAtual.replace(/[^\d]/g, ''));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold text-slate-800 outline-none"
                  >
                    {viaturas.map((vtr) => (
                      <option key={vtr.id} value={vtr.id}>
                        {vtr.prefixo} - {vtr.modelo} ({vtr.placa}) - {vtr.grupamento}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                    Quilometragem (KM Atual) *
                  </label>
                  <div className="relative">
                    <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={kmAtual}
                      onChange={(e) => setKmAtual(e.target.value)}
                      placeholder="Ex: 42350"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-bold text-slate-800 outline-none placeholder:text-slate-400"
                      required
                    />
                  </div>
                </div>

                {/* DADOS RESUMIDOS DA VIATURA ESCOLHIDA */}
                {viaturaEscolhida && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        Prefixo: <strong>{viaturaEscolhida.prefixo}</strong> • Placa: <strong>{viaturaEscolhida.placa}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Condutor: <strong>{usuarioAtivo?.nomeDeGuerra || 'MOTORISTA'}</strong> (Matrícula: {usuarioAtivo?.matricula || '---'})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* BLOCO 2: NÍVEL DE COMBUSTÍVEL */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-amber-500" />
                    <span>Nível de Combustível</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {nivelCombustivel === 'cheio'
                      ? 'Tanque Cheio'
                      : nivelCombustivel === '3_4'
                      ? '3/4 do Tanque'
                      : nivelCombustivel === '1_2'
                      ? '1/2 (Meio Tanque)'
                      : nivelCombustivel === '1_4'
                      ? '1/4 do Tanque'
                      : 'Reserva'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {(
                    [
                      { id: 'reserva', label: 'Reserva', cor: 'hover:border-rose-400' },
                      { id: '1_4', label: '1/4', cor: 'hover:border-amber-400' },
                      { id: '1_2', label: '1/2', cor: 'hover:border-blue-400' },
                      { id: '3_4', label: '3/4', cor: 'hover:border-blue-400' },
                      { id: 'cheio', label: 'Cheio', cor: 'hover:border-emerald-400' },
                    ] as const
                  ).map((nv) => (
                    <button
                      key={nv.id}
                      type="button"
                      onClick={() => setNivelCombustivel(nv.id)}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-black transition-all cursor-pointer border ${
                        nivelCombustivel === nv.id
                          ? nv.id === 'reserva'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : `bg-white text-slate-700 border-slate-200 ${nv.cor}`
                      }`}
                    >
                      {nv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* BLOCO 3: ITENS DE INSPEÇÃO OPERACIONAL */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 pb-1 border-b border-slate-200">
                  Itens de Verificação Mecânica e Sinalização
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PNEUS E ESTEPE */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="block text-xs font-bold text-slate-800 mb-1.5">
                      Pneus e Estepe
                    </span>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPneusEstepe('conforme')}
                        className={`py-1 rounded cursor-pointer ${
                          pneusEstepe === 'conforme' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setPneusEstepe('atencao')}
                        className={`py-1 rounded cursor-pointer ${
                          pneusEstepe === 'atencao' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Atenção
                      </button>
                      <button
                        type="button"
                        onClick={() => setPneusEstepe('irregular')}
                        className={`py-1 rounded cursor-pointer ${
                          pneusEstepe === 'irregular' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Irregular
                      </button>
                    </div>
                  </div>

                  {/* ILUMINAÇÃO E SIRENE */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="block text-xs font-bold text-slate-800 mb-1.5">
                      Giroflex, Strobes e Sirene
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setIluminacaoSirene('conforme')}
                        className={`py-1 rounded cursor-pointer ${
                          iluminacaoSirene === 'conforme' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        100% Operante
                      </button>
                      <button
                        type="button"
                        onClick={() => setIluminacaoSirene('defeito')}
                        className={`py-1 rounded cursor-pointer ${
                          iluminacaoSirene === 'defeito' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Com Defeito
                      </button>
                    </div>
                  </div>

                  {/* FREIOS E DIREÇÃO */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="block text-xs font-bold text-slate-800 mb-1.5">
                      Freios e Sistema de Direção
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setFreiosDirecao('conforme')}
                        className={`py-1 rounded cursor-pointer ${
                          freiosDirecao === 'conforme' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => setFreiosDirecao('anomalia')}
                        className={`py-1 rounded cursor-pointer ${
                          freiosDirecao === 'anomalia' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Anomalia
                      </button>
                    </div>
                  </div>

                  {/* ÓLEO E FLUIDOS */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="block text-xs font-bold text-slate-800 mb-1.5">
                      Nível de Óleo e Arrefecimento
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setOleoFluidos('conforme')}
                        className={`py-1 rounded cursor-pointer ${
                          oleoFluidos === 'conforme' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Nível Correto
                      </button>
                      <button
                        type="button"
                        onClick={() => setOleoFluidos('baixo')}
                        className={`py-1 rounded cursor-pointer ${
                          oleoFluidos === 'baixo' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Nível Baixo
                      </button>
                    </div>
                  </div>

                  {/* LIMPEZA GERAL */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="block text-xs font-bold text-slate-800 mb-1.5">
                      Higiene e Limpeza da Cabine
                    </span>
                    <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setLimpeza('limpo')}
                        className={`py-1 rounded cursor-pointer ${
                          limpeza === 'limpo' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Limpo
                      </button>
                      <button
                        type="button"
                        onClick={() => setLimpeza('regular')}
                        className={`py-1 rounded cursor-pointer ${
                          limpeza === 'regular' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Regular
                      </button>
                      <button
                        type="button"
                        onClick={() => setLimpeza('sujo')}
                        className={`py-1 rounded cursor-pointer ${
                          limpeza === 'sujo' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Sujo
                      </button>
                    </div>
                  </div>

                  {/* ITENS COMPLEMENTARES */}
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex flex-col justify-center gap-2">
                    <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                      <span>Rádio HT / Móvel Operante</span>
                      <input
                        type="checkbox"
                        checked={radioComunicador}
                        onChange={(e) => setRadioComunicador(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                      <span>Documento (CRLV) e Chave Reserva</span>
                      <input
                        type="checkbox"
                        checked={documentosViatura}
                        onChange={(e) => setDocumentosViatura(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                      <span>Kit Segurança (Triângulo/Macaco)</span>
                      <input
                        type="checkbox"
                        checked={kitSeguranca}
                        onChange={(e) => setKitSeguranca(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* BLOCO 4: AVARIAS NA LATARIA */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase text-slate-600">
                    Avarias / Danos na Lataria ou Vidros?
                  </label>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAvariasLataria(false)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        !avariasLataria ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Não há avarias
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvariasLataria(true)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        avariasLataria ? 'bg-rose-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Constatada Avaria
                    </button>
                  </div>
                </div>

                {avariasLataria && (
                  <div className="mt-2.5">
                    <textarea
                      value={detalhesAvarias}
                      onChange={(e) => setDetalhesAvarias(e.target.value)}
                      rows={2}
                      placeholder="Descreva as avarias encontradas (ex: arranhão na porta direita, lanterna trincada, etc.)..."
                      className="w-full p-2.5 text-xs rounded-xl bg-white border border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-slate-800 placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              {/* BLOCO 5: PARECER GERAL DO MOTORISTA */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="block text-[11px] font-black uppercase text-slate-600">
                  Parecer Geral da Viatura para Serviço *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusGeral('aprovada')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      statusGeral === 'aprovada'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aprovada (Apta)</span>
                    </div>
                    <p className={`text-[11px] mt-1 ${statusGeral === 'aprovada' ? 'text-emerald-100' : 'text-slate-500'}`}>
                      Sem anomalias que impeçam a condução.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusGeral('aprovada_com_restricoes')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      statusGeral === 'aprovada_com_restricoes'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Com Restrições</span>
                    </div>
                    <p className={`text-[11px] mt-1 ${statusGeral === 'aprovada_com_restricoes' ? 'text-amber-100' : 'text-slate-500'}`}>
                      Apta para ronda com ressalvas anotadas.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusGeral('inapta')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      statusGeral === 'inapta'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase">
                      <XCircle className="w-4 h-4" />
                      <span>Inapta (Oficina)</span>
                    </div>
                    <p className={`text-[11px] mt-1 ${statusGeral === 'inapta' ? 'text-rose-100' : 'text-slate-500'}`}>
                      Necessita manutenção imediata antes de rodar.
                    </p>
                  </button>
                </div>
              </div>

              {/* BLOCO 6: OBSERVAÇÕES GERAIS */}
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-600 mb-1">
                  Observações Complementares do Plantão
                </label>
                <textarea
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  rows={2}
                  placeholder="Informações adicionais, materiais transportados, histórico do turno..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Salvar e Registrar Check-list</span>
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* ABA 2: CONSULTAS & HISTÓRICO                            */}
          {/* ======================================================== */}
          {abaAtiva === 'historico' && !checklistDetalhado && (
            <div className="space-y-3.5">
              {/* FILTROS E BUSCA */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaHistorico}
                    onChange={(e) => setBuscaHistorico(e.target.value)}
                    placeholder="Filtrar por condutor, prefixo, placa ou observação..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">
                      Filtrar por Viatura
                    </label>
                    <select
                      value={filtroPrefixo}
                      onChange={(e) => setFiltroPrefixo(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 outline-none"
                    >
                      <option value="todos">Todas as Viaturas</option>
                      {viaturas.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.prefixo} ({v.placa})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-0.5">
                      Filtrar por Parecer Geral
                    </label>
                    <select
                      value={filtroStatus}
                      onChange={(e) => setFiltroStatus(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-700 outline-none"
                    >
                      <option value="todos">Todos os Pareceres</option>
                      <option value="aprovada">Aprovada (Apta)</option>
                      <option value="aprovada_com_restricoes">Aprovada com Restrições</option>
                      <option value="inapta">Inapta / Manutenção</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* LISTA DE CHECKLISTS */}
              <div className="space-y-2.5">
                {checklistsFiltrados.length === 0 ? (
                  <div className="text-center py-10">
                    <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700 uppercase">
                      Nenhum check-list encontrado
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Realize uma nova inspeção na aba anterior para registrar o primeiro check-list.
                    </p>
                  </div>
                ) : (
                  checklistsFiltrados.map((chk) => (
                    <div
                      key={chk.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                            chk.statusGeral === 'aprovada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : chk.statusGeral === 'aprovada_com_restricoes'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {chk.statusGeral === 'aprovada' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : chk.statusGeral === 'aprovada_com_restricoes' ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : (
                            <XCircle className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black uppercase text-slate-900 tracking-tight">
                              {chk.prefixoViatura}
                            </span>
                            <span className="text-xs font-bold text-slate-600">({chk.placaViatura})</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                chk.statusGeral === 'aprovada'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : chk.statusGeral === 'aprovada_com_restricoes'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {chk.statusGeral === 'aprovada'
                                ? 'Apta'
                                : chk.statusGeral === 'aprovada_com_restricoes'
                                ? 'Com Restrições'
                                : 'Inapta'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              Condutor: <strong>{chk.motoristaNome}</strong> ({chk.motoristaMatricula})
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {chk.dataHora}
                            </span>
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-slate-400" />
                              KM: {chk.kmAtual}
                            </span>
                          </div>
                          {chk.detalhesAvarias && (
                            <p className="text-[11px] text-rose-600 font-semibold mt-1 italic">
                              Avaria anotada: {chk.detalhesAvarias}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => setChecklistDetalhado(chk)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ver Ficha</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO DETALHADA DE UM CHECKLIST (FICHA COMPLETA) */}
          {checklistDetalhado && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setChecklistDetalhado(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase cursor-pointer flex items-center gap-1"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Voltar à Lista</span>
                </button>
                <span className="text-xs font-bold text-slate-500">
                  ID: {checklistDetalhado.id}
                </span>
              </div>

              {/* CARD PRINCIPAL DA FICHA */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-black uppercase tracking-tight text-white">
                      {checklistDetalhado.prefixoViatura}
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 text-xs font-bold border border-blue-400/40">
                      {checklistDetalhado.placaViatura}
                    </span>
                    {checklistDetalhado.modeloViatura && (
                      <span className="text-xs text-slate-400 font-medium">
                        {checklistDetalhado.modeloViatura}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Inspeção realizada em <strong>{checklistDetalhado.dataHora}</strong> por{' '}
                    <strong>{checklistDetalhado.motoristaNome}</strong> (Mat: {checklistDetalhado.motoristaMatricula})
                  </p>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                    checklistDetalhado.statusGeral === 'aprovada'
                      ? 'bg-emerald-500 text-white'
                      : checklistDetalhado.statusGeral === 'aprovada_com_restricoes'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-500 text-white'
                  }`}
                >
                  {checklistDetalhado.statusGeral === 'aprovada'
                    ? 'Apta para Serviço'
                    : checklistDetalhado.statusGeral === 'aprovada_com_restricoes'
                    ? 'Apta com Restrições'
                    : 'Inapta / Manutenção'}
                </span>
              </div>

              {/* ITENS INSPECIONADOS EM GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Quilometragem</span>
                  <span className="font-black text-slate-900 text-sm">{checklistDetalhado.kmAtual}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Combustível</span>
                  <span className="font-black text-slate-900 uppercase text-xs">
                    {checklistDetalhado.nivelCombustivel === 'cheio'
                      ? 'Tanque Cheio'
                      : checklistDetalhado.nivelCombustivel === '3_4'
                      ? '3/4 do Tanque'
                      : checklistDetalhado.nivelCombustivel === '1_2'
                      ? '1/2 Meio Tanque'
                      : checklistDetalhado.nivelCombustivel === '1_4'
                      ? '1/4 do Tanque'
                      : 'Reserva'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Pneus e Estepe</span>
                  <span className={`font-black uppercase text-xs ${checklistDetalhado.pneusEstepe === 'conforme' ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {checklistDetalhado.pneusEstepe === 'conforme' ? 'Conforme / OK' : checklistDetalhado.pneusEstepe === 'atencao' ? 'Atenção' : 'Irregular'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Giroflex & Sirene</span>
                  <span className={`font-black uppercase text-xs ${checklistDetalhado.iluminacaoSirene === 'conforme' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {checklistDetalhado.iluminacaoSirene === 'conforme' ? '100% Operante' : 'Com Defeito'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Freios & Direção</span>
                  <span className={`font-black uppercase text-xs ${checklistDetalhado.freiosDirecao === 'conforme' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {checklistDetalhado.freiosDirecao === 'conforme' ? 'Normal' : 'Anomalia'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Óleo & Fluídos</span>
                  <span className={`font-black uppercase text-xs ${checklistDetalhado.oleoFluidos === 'conforme' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {checklistDetalhado.oleoFluidos === 'conforme' ? 'Nível Correto' : 'Nível Baixo'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Limpeza da Cabine</span>
                  <span className="font-black text-slate-900 uppercase text-xs">{checklistDetalhado.limpeza}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Rádio HT / Móvel</span>
                  <span className={`font-black uppercase text-xs ${checklistDetalhado.radioComunicador ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {checklistDetalhado.radioComunicador ? 'Presente e Operante' : 'Inoperante / Ausente'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Documento CRLV & Kit</span>
                  <span className="font-black text-emerald-700 uppercase text-xs">
                    {checklistDetalhado.documentosViatura && checklistDetalhado.kitSeguranca ? 'Completos' : 'Incompletos'}
                  </span>
                </div>
              </div>

              {/* DETALHES DE AVARIAS SE HOUVER */}
              {checklistDetalhado.avariasLataria && checklistDetalhado.detalhesAvarias && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                  <span className="font-black uppercase text-rose-800 block mb-1">
                    Avarias Pré-existentes na Lataria / Vidros:
                  </span>
                  <p className="text-slate-800 font-medium">{checklistDetalhado.detalhesAvarias}</p>
                </div>
              )}

              {/* OBSERVAÇÕES GERAIS */}
              {checklistDetalhado.observacoesGerais && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-black uppercase text-slate-700 block mb-1">
                    Observações Gerais do Condutor:
                  </span>
                  <p className="text-slate-700 font-medium">{checklistDetalhado.observacoesGerais}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 rounded-b-2xl">
          <span className="text-[11px] text-slate-500 font-medium">
            {checklists.length} check-list(s) gravado(s) no sistema
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

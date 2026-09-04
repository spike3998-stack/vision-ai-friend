import React, { useState } from 'react';
import {
  ArrowLeft,
  Car,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Wrench,
  Activity,
  Shield,
  Gauge,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { Viatura } from '../types';
import { ModalChecklistViatura } from './ModalChecklistViatura';

interface DevViaturasProps {
  viaturas: Viatura[];
  onSalvarViatura: (viatura: Viatura) => void;
  onExcluirViatura: (viaturaId: string) => void;
  onVoltar: () => void;
}

const GRUPAMENTOS_OPCOES = [
  'ROMU',
  'GTRAN',
  'GRES',
  'GOC',
  'GID',
  'OPERACIONAL',
  'GERAL',
];

export const DevViaturas: React.FC<DevViaturasProps> = ({
  viaturas,
  onSalvarViatura,
  onExcluirViatura,
  onVoltar,
}) => {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalChecklistAberto, setModalChecklistAberto] = useState(false);
  const [viaturaEmEdicao, setViaturaEmEdicao] = useState<Viatura | null>(null);
  const [viaturaParaExcluir, setViaturaParaExcluir] = useState<Viatura | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Estados do formulário
  const [prefixo, setPrefixo] = useState('');
  const [modelo, setModelo] = useState('');
  const [placa, setPlaca] = useState('');
  const [grupamento, setGrupamento] = useState('ROMU');
  const [status, setStatus] = useState<'disponivel' | 'em_operacao' | 'manutencao'>('disponivel');
  const [kmAtual, setKmAtual] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const abrirNovoCadastro = () => {
    setViaturaEmEdicao(null);
    setPrefixo('');
    setModelo('');
    setPlaca('');
    setGrupamento('ROMU');
    setStatus('disponivel');
    setKmAtual('');
    setObservacoes('');
    setModalAberto(true);
  };

  const abrirEdicao = (vtr: Viatura) => {
    setViaturaEmEdicao(vtr);
    setPrefixo(vtr.prefixo);
    setModelo(vtr.modelo);
    setPlaca(vtr.placa);
    setGrupamento(vtr.grupamento);
    setStatus(vtr.status);
    setKmAtual(vtr.kmAtual || '');
    setObservacoes(vtr.observacoes || '');
    setModalAberto(true);
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefixo.trim() || !modelo.trim() || !placa.trim()) {
      setFeedback('Por favor, preencha o prefixo, modelo e a placa da viatura.');
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    const novaOuAtualizada: Viatura = {
      id: viaturaEmEdicao?.id || `vtr-${Date.now()}`,
      prefixo: prefixo.trim().toUpperCase(),
      modelo: modelo.trim(),
      placa: placa.trim().toUpperCase(),
      grupamento,
      status,
      kmAtual: kmAtual.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
      dataCadastro: viaturaEmEdicao?.dataCadastro || new Date().toLocaleDateString('pt-BR'),
    };

    onSalvarViatura(novaOuAtualizada);
    setModalAberto(false);
    setFeedback(viaturaEmEdicao ? `Viatura ${novaOuAtualizada.prefixo} atualizada com sucesso!` : `Viatura ${novaOuAtualizada.prefixo} cadastrada com sucesso!`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const confirmarExclusao = () => {
    if (viaturaParaExcluir) {
      onExcluirViatura(viaturaParaExcluir.id);
      setFeedback(`Viatura ${viaturaParaExcluir.prefixo} removida com sucesso.`);
      setViaturaParaExcluir(null);
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const viaturasFiltradas = viaturas.filter((vtr) => {
    const matchBusca =
      vtr.prefixo.toLowerCase().includes(busca.toLowerCase()) ||
      vtr.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      vtr.placa.toLowerCase().includes(busca.toLowerCase()) ||
      vtr.grupamento.toLowerCase().includes(busca.toLowerCase());

    if (!matchBusca) return false;
    if (filtroStatus === 'todos') return true;
    return vtr.status === filtroStatus;
  });

  const getStatusBadge = (st: Viatura['status']) => {
    switch (st) {
      case 'disponivel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Disponível
          </span>
        );
      case 'em_operacao':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Activity className="w-3 h-3 text-blue-600" />
            Em Operação
          </span>
        );
      case 'manutencao':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Wrench className="w-3 h-3 text-amber-600" />
            Manutenção
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="screen-dev-viaturas" className="space-y-4">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            id="btn-voltar-dev-menu-viaturas"
            type="button"
            onClick={onVoltar}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Voltar ao Painel do Desenvolvedor"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
              Controle de Frota • Desenvolvedor
            </span>
            <h2 className="text-xl font-black uppercase text-slate-900 mt-0.5">
              Cadastrar e Gerenciar Viaturas
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-dev-consultar-checklists"
            type="button"
            onClick={() => setModalChecklistAberto(true)}
            className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
            title="Ver Histórico de Check-lists Realizados pelos Motoristas"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Check-lists</span>
          </button>

          <button
            id="btn-cadastrar-nova-viatura"
            type="button"
            onClick={abrirNovoCadastro}
            className="py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs uppercase tracking-wide flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova Viatura</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK TEMPORÁRIO */}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* BARRA DE PESQUISA E FILTROS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-busca-viaturas"
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por prefixo, modelo, placa..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 shrink-0">Status:</span>
          {(['todos', 'disponivel', 'em_operacao', 'manutencao'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltroStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer shrink-0 ${
                filtroStatus === st
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'todos'
                ? 'Todos'
                : st === 'disponivel'
                ? 'Disponível'
                : st === 'em_operacao'
                ? 'Em Operação'
                : 'Manutenção'}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE VIATURAS */}
      {viaturasFiltradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700 uppercase">
            Nenhuma viatura encontrada
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Clique no botão acima para cadastrar uma nova viatura no sistema.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {viaturasFiltradas.map((vtr) => (
            <div
              key={vtr.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-xs transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                      <Car className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-slate-900 uppercase tracking-tight">
                          {vtr.prefixo}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {vtr.grupamento}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {vtr.modelo} • <strong className="text-slate-800">{vtr.placa}</strong>
                      </p>
                    </div>
                  </div>

                  <div>{getStatusBadge(vtr.status)}</div>
                </div>

                {/* DETALHES DA VIATURA */}
                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>KM: {vtr.kmAtual || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Grupo: {vtr.grupamento}</span>
                  </div>
                </div>

                {vtr.observacoes && (
                  <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <p className="italic line-clamp-2">{vtr.observacoes}</p>
                  </div>
                )}
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-400 font-medium">
                  {vtr.dataCadastro ? `Cadastrada em ${vtr.dataCadastro}` : ''}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(vtr)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors cursor-pointer"
                    title="Editar viatura"
                    aria-label={`Editar viatura ${vtr.prefixo}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViaturaParaExcluir(vtr)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer"
                    title="Excluir viatura"
                    aria-label={`Excluir viatura ${vtr.prefixo}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black uppercase text-slate-900">
                  {viaturaEmEdicao ? 'Editar Viatura' : 'Cadastrar Nova Viatura'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Prefixo da Viatura *
                </label>
                <input
                  type="text"
                  value={prefixo}
                  onChange={(e) => setPrefixo(e.target.value)}
                  placeholder="Ex: ROMU 01, GTRAN 02, VTR 03"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-slate-900 font-bold uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Modelo do Veículo *
                  </label>
                  <input
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    placeholder="Ex: Renault Duster"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-slate-900 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Placa *
                  </label>
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    placeholder="Ex: RIO-1A23"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-slate-900 font-bold uppercase"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Grupamento Destinado
                  </label>
                  <select
                    value={grupamento}
                    onChange={(e) => setGrupamento(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 outline-none text-slate-900 font-bold"
                  >
                    {GRUPAMENTOS_OPCOES.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Status Operacional
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as 'disponivel' | 'em_operacao' | 'manutencao')
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 outline-none text-slate-900 font-bold"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="em_operacao">Em Operação</option>
                    <option value="manutencao">Em Manutenção</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Quilometragem Atual (KM)
                </label>
                <input
                  type="text"
                  value={kmAtual}
                  onChange={(e) => setKmAtual(e.target.value)}
                  placeholder="Ex: 42.500 km"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Observações / Equipamentos
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Giroflex, sirene, comunicador rádio, cones de trânsito..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-slate-900 font-medium resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-xs uppercase cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Viatura</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {viaturaParaExcluir && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl border border-slate-200 animate-scale-up text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black uppercase text-slate-900">
              Excluir Viatura?
            </h3>
            <p className="text-xs text-slate-600 mt-2">
              Deseja remover a viatura{' '}
              <strong className="text-slate-900">{viaturaParaExcluir.prefixo}</strong> (
              {viaturaParaExcluir.modelo} - {viaturaParaExcluir.placa}) da frota?
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setViaturaParaExcluir(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase cursor-pointer transition-colors shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE HISTÓRICO E CONSULTA DE CHECKLISTS */}
      <ModalChecklistViatura
        aberto={modalChecklistAberto}
        onClose={() => setModalChecklistAberto(false)}
        usuarioAtivo={null}
        viaturas={viaturas}
      />
    </div>
  );
};

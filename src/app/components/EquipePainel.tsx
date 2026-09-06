import React, { useEffect, useState } from 'react';
import { Shield, Users, ArrowLeft, Radio, Car, CheckCircle2, X, Search, Footprints } from 'lucide-react';
import { UsuarioCadastrado, OcupantePosto, MembroEquipe, Viatura } from '../types';
import { getViaturasArmazenadas } from '../services/storage';
import { GRUPAMENTOS } from '../data/grupamentos';
import { OrdensRecebidas } from './OrdensRecebidas';
import { ModalPatrulhamento } from './ModalPatrulhamento';


interface EquipePainelProps {
  usuarioAtivo: UsuarioCadastrado | null;
  posto: string;
  ocupantesPosto: OcupantePosto[];
  equipe: MembroEquipe[];
  viaturaPrefixo?: string | undefined;
  viaturas?: Viatura[] | undefined;
  onViaturaSelecionada?: ((prefixo: string | null) => void) | undefined;
  onTrocarPosto: () => void;
  onDesocuparPosto: () => void;
  onVoltarMenu: () => void;
}

export const EquipePainel: React.FC<EquipePainelProps> = ({
  usuarioAtivo,
  posto,
  ocupantesPosto,
  equipe,
  viaturaPrefixo,
  viaturas,
  onViaturaSelecionada,
  onTrocarPosto,
  onDesocuparPosto,
  onVoltarMenu,
}) => {
  const grupamento = GRUPAMENTOS.find((g) => g.sigla === usuarioAtivo?.grupamento);
  const listaViaturas = viaturas && viaturas.length > 0 ? viaturas : getViaturasArmazenadas();
  const [modalViaturas, setModalViaturas] = useState(false);
  const [busca, setBusca] = useState('');
  const [prefixoAtivo, setPrefixoAtivo] = useState<string | null>(() => {
    if (viaturaPrefixo) return viaturaPrefixo;
    try {
      const salvo = localStorage.getItem('gm_arraial_viatura_equipe');
      return salvo || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (prefixoAtivo) onViaturaSelecionada?.(prefixoAtivo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const escolherViatura = (vtr: Viatura) => {
    const novo = prefixoAtivo === vtr.prefixo ? null : vtr.prefixo;
    setPrefixoAtivo(novo);
    try {
      if (novo) localStorage.setItem('gm_arraial_viatura_equipe', novo);
      else localStorage.removeItem('gm_arraial_viatura_equipe');
    } catch {
      /* ignore */
    }
    onViaturaSelecionada?.(novo);
    if (novo) setModalViaturas(false);
  };

  const viaturasFiltradas = listaViaturas.filter((v) => {
    const q = busca.toLowerCase();
    return (
      v.prefixo.toLowerCase().includes(q) ||
      v.modelo.toLowerCase().includes(q) ||
      v.placa.toLowerCase().includes(q) ||
      v.grupamento.toLowerCase().includes(q)
    );
  });

  return (
    <div id="screen-equipe-ordens" className="space-y-4">
      {/* CABEÇALHO DO POSTO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-13 h-13 rounded-xl bg-slate-800/90 border border-slate-700 p-1 flex items-center justify-center shrink-0 overflow-hidden">
            {grupamento?.imagem ? (
              <img
                src={grupamento.imagem}
                alt={`Brasão ${grupamento.sigla}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <Shield className="w-7 h-7 text-blue-400" />
            )}
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2 py-0.5 rounded-md">
              POSTO {posto}
            </span>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1">
              {usuarioAtivo?.nomeDeGuerra || 'AGENTE'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Matrícula: {usuarioAtivo?.matricula || '---'}
              {prefixoAtivo && (
                <span className="ml-1.5 text-blue-400 font-bold">• VTR: {prefixoAtivo}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* SELEÇÃO DE VIATURA */}
      <button
        type="button"
        onClick={() => setModalViaturas(true)}
        className="w-full py-3 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
      >
        <Car className="w-4 h-4 text-blue-600" />
        <span>{prefixoAtivo ? `Viatura: ${prefixoAtivo}` : 'Escolher viatura'}</span>
      </button>

      {/* PATRULHAMENTO */}
      <button
        type="button"
        onClick={() => setModalPatrulhamento(true)}
        className="w-full py-3 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
      >
        <Footprints className="w-4 h-4 text-emerald-600" />
        <span>Patrulhamento</span>
      </button>

      {modalPatrulhamento && (
        <ModalPatrulhamento
          usuarioAtivo={usuarioAtivo}
          posto={posto}
          equipe={equipe}
          viaturaPrefixo={prefixoAtivo || undefined}
          onFechar={() => setModalPatrulhamento(false)}
        />
      )}


      {modalViaturas && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h4 className="font-black text-sm uppercase text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-600" />
                Viaturas da Guarda
              </h4>
              <button
                type="button"
                onClick={() => setModalViaturas(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>
            </div>
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar prefixo, placa, modelo..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              {viaturasFiltradas.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">
                  Nenhuma viatura encontrada.
                </p>
              ) : (
                viaturasFiltradas.map((vtr) => {
                  const ativa = prefixoAtivo === vtr.prefixo;
                  return (
                    <button
                      key={vtr.id}
                      type="button"
                      onClick={() => escolherViatura(vtr)}
                      className={`w-full text-left rounded-xl border p-3 flex items-center justify-between gap-3 cursor-pointer ${
                        ativa ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="block text-sm font-black uppercase text-slate-900">
                          {vtr.prefixo}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {vtr.modelo} • {vtr.placa} • {vtr.grupamento}
                        </span>
                      </div>
                      {ativa ? (
                        <span className="text-[10px] font-black uppercase text-white bg-blue-600 px-2 py-1 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Em uso
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                          Assumir
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ORDENS DE SERVIÇO DO GRUPAMENTO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
          <Radio className="w-4 h-4 text-blue-600" />
          <span>Ordens de serviço do {usuarioAtivo?.grupamento || 'grupamento'}</span>
        </h3>
        <OrdensRecebidas
          usuarioAtivo={usuarioAtivo}
          posto={posto}
          equipe={equipe}
          viaturaPrefixo={prefixoAtivo || undefined}
        />
        <p className="text-xs text-slate-500">
          As ordens enviadas pelo CIOSP ao seu grupamento aparecem aqui em tempo real.
        </p>
      </div>

      {/* EQUIPE NO POSTO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Escala no posto {posto}
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            {ocupantesPosto.length} alocado(s)
          </span>
        </div>
        <div className="space-y-2">
          {ocupantesPosto.map((oc, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200"
            >
              <div>
                <span className="font-bold text-slate-900 uppercase">{oc.nomeDeGuerra}</span>
                <span className="block text-[10px] text-slate-500">
                  Matrícula: {oc.matricula} • Entrada: {oc.dataHora}
                </span>
              </div>
              <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {oc.grupamento || 'Operacional'}
              </span>
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
    </div>
  );
};

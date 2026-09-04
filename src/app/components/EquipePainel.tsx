import React from 'react';
import { Shield, Users, ArrowLeft, Radio } from 'lucide-react';
import { UsuarioCadastrado, OcupantePosto, MembroEquipe } from '../types';
import { GRUPAMENTOS } from '../data/grupamentos';
import { OrdensRecebidas } from './OrdensRecebidas';

interface EquipePainelProps {
  usuarioAtivo: UsuarioCadastrado | null;
  posto: string;
  ocupantesPosto: OcupantePosto[];
  equipe: MembroEquipe[];
  viaturaPrefixo?: string | undefined;
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
  onTrocarPosto,
  onDesocuparPosto,
  onVoltarMenu,
}) => {
  const grupamento = GRUPAMENTOS.find((g) => g.sigla === usuarioAtivo?.grupamento);

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
              {viaturaPrefixo && (
                <span className="ml-1.5 text-blue-400 font-bold">• VTR: {viaturaPrefixo}</span>
              )}
            </p>
          </div>
        </div>
      </div>

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
          viaturaPrefixo={viaturaPrefixo}
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

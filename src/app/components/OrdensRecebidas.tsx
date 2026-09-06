import React, { useCallback, useEffect, useState } from 'react';
import {
  Radio,
  MapPin,
  Clock,
  ThumbsUp,
  Ban,
  CheckCircle2,
  Flag,
  Truck,
  Siren,
  FileText,
} from 'lucide-react';
import { OrdemServico, UsuarioCadastrado, MembroEquipe } from '../types';
import { fetchOrdensServidor, atualizarOrdemServidor } from '../services/api';
import { BoletimOcorrencia } from './BoletimOcorrencia';

interface OrdensRecebidasProps {
  usuarioAtivo: UsuarioCadastrado | null;
  posto: string;
  equipe: MembroEquipe[];
  viaturaPrefixo?: string | undefined;
  /** Chamado quando a ordem é aceita (usado pelo motorista para traçar a rota). */
  onAceitar?: ((ordem: OrdemServico) => void) | undefined;
  /** Chamado ao encerrar a rota / boletim. */
  onEncerrarRota?: (() => void) | undefined;
  /** Avisa a tela que o boletim está aberto (para esconder o restante). */
  onBoletimAberto?: ((aberto: boolean) => void) | undefined;
}

export const OrdensRecebidas: React.FC<OrdensRecebidasProps> = ({
  usuarioAtivo,
  posto,
  equipe,
  viaturaPrefixo,
  onAceitar,
  onEncerrarRota,
  onBoletimAberto,
}) => {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [escolhendoEspera, setEscolhendoEspera] = useState<string | null>(null);
  const [ordemChegada, setOrdemChegada] = useState<OrdemServico | null>(null);
  const [ordemBoletim, setOrdemBoletim] = useState<OrdemServico | null>(null);
  const [, forcarRelogio] = useState(0);

  const carregar = useCallback(async () => {
    const lista = await fetchOrdensServidor();
    const grupo = usuarioAtivo?.grupamento;
    setOrdens(
      lista.filter((o) => {
        if (grupo && o.grupamento !== grupo) return false;
        if (o.status === 'recusada') return false;
        if (o.ocorrenciaStatus === 'recusada_no_local') return false;
        if (o.ocorrenciaStatus === 'finalizada') return false;
        return true;
      })
    );
  }, [usuarioAtivo?.grupamento]);

  useEffect(() => {
    carregar();
    const t = window.setInterval(carregar, 6000);
    return () => window.clearInterval(t);
  }, [carregar]);

  useEffect(() => {
    const t = window.setInterval(() => forcarRelogio((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    onBoletimAberto?.(Boolean(ordemBoletim));
  }, [ordemBoletim, onBoletimAberto]);

  const atualizarLocal = (ordem: OrdemServico) =>
    setOrdens((prev) => prev.map((o) => (o.id === ordem.id ? ordem : o)));

  const responderOrdem = async (
    ordem: OrdemServico,
    status: 'aceita' | 'recusada' | 'espera',
    minutos?: number
  ) => {
    const dados: Partial<OrdemServico> = {
      status,
      respondidoPor: usuarioAtivo?.nomeDeGuerra || posto,
      respondidoPorMatricula: usuarioAtivo?.matricula || '---',
    };
    if (status === 'espera' && minutos) {
      dados.esperaMinutos = minutos;
      dados.esperaAte = Date.now() + minutos * 60_000;
    }
    if (status === 'aceita') {
      dados.equipe = equipe;
      if (viaturaPrefixo) dados.viaturaPrefixo = viaturaPrefixo;
    }
    const atualizada = await atualizarOrdemServidor(ordem.id, dados);
    setEscolhendoEspera(null);
    const final = (atualizada ?? { ...ordem, ...dados }) as OrdemServico;
    if (status === 'recusada') {
      setOrdens((prev) => prev.filter((o) => o.id !== ordem.id));
      return;
    }
    atualizarLocal(final);
    if (status === 'aceita') onAceitar?.(final);
  };

  const iniciarOcorrencia = async (ordem: OrdemServico) => {
    const dados: Partial<OrdemServico> = {
      ocorrenciaStatus: 'iniciada',
      ocorrenciaIniciadaEm: new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      equipe: ordem.equipe && ordem.equipe.length > 0 ? ordem.equipe : equipe,
    };
    if (viaturaPrefixo && !ordem.viaturaPrefixo) dados.viaturaPrefixo = viaturaPrefixo;
    const atualizada = await atualizarOrdemServidor(ordem.id, dados);
    const final = (atualizada ?? { ...ordem, ...dados }) as OrdemServico;
    atualizarLocal(final);
    setOrdemChegada(null);
    setOrdemBoletim(final);
  };

  const recusarNoLocal = async (ordem: OrdemServico) => {
    await atualizarOrdemServidor(ordem.id, {
      status: 'recusada',
      ocorrenciaStatus: 'recusada_no_local',
      respondidoPor: usuarioAtivo?.nomeDeGuerra || posto,
      respondidoPorMatricula: usuarioAtivo?.matricula || '---',
    });
    setOrdemChegada(null);
    setOrdens((prev) => prev.filter((o) => o.id !== ordem.id));
    onEncerrarRota?.();
  };

  if (ordemBoletim) {
    return (
      <BoletimOcorrencia
        ordem={ordemBoletim}
        usuarioAtivo={usuarioAtivo}
        equipe={equipe}
        viaturaPrefixo={viaturaPrefixo}
        onVoltar={() => setOrdemBoletim(null)}
        onOrdemAtualizada={(o) => {
          setOrdemBoletim(o);
          atualizarLocal(o);
        }}
      />
    );
  }

  const visiveis = ordens.filter(
    (o) => o.status === 'aguardando' || o.status === 'espera' || o.status === 'aceita'
  );

  if (visiveis.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {visiveis.map((ordem) => {
        const emEspera =
          ordem.status === 'espera' && !!ordem.esperaAte && ordem.esperaAte > Date.now();
        const restanteSeg = emEspera
          ? Math.max(0, Math.ceil(((ordem.esperaAte as number) - Date.now()) / 1000))
          : 0;
        return (
          <div
            key={ordem.id}
            className="bg-white border-2 border-blue-500 rounded-2xl p-4 shadow-md space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className={`text-[11px] font-black uppercase tracking-wider text-white px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                  ordem.ehApoio ? 'bg-rose-600' : 'bg-blue-600'
                }`}
              >
                {ordem.ehApoio ? <Siren className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5" />}
                <span>
                  {ordem.ehApoio ? 'Pedido de apoio' : 'Nova ordem de serviço • CIOSP'}
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">{ordem.dataHora}</span>
            </div>

            <p className="text-sm font-black text-slate-900 uppercase">{ordem.descricao}</p>
            <p className="text-xs text-slate-700 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
              <span>{ordem.endereco}</span>
            </p>
            {ordem.observacoes && <p className="text-xs text-slate-500">Obs.: {ordem.observacoes}</p>}

            {ordem.reboqueAcionado && (
              <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                Reboque acionado {ordem.reboqueEm ? `às ${ordem.reboqueEm}` : ''}
              </p>
            )}

            {ordem.status === 'aceita' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 space-y-2">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Ordem aceita por {ordem.respondidoPor} • deslocamento em andamento
                  </span>
                </span>
                <div className="flex gap-2 flex-wrap">
                  {ordem.ocorrenciaStatus === 'iniciada' ? (
                    <button
                      type="button"
                      onClick={() => setOrdemBoletim(ordem)}
                      className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Abrir boletim
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setOrdemChegada(ordem)}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase cursor-pointer flex items-center gap-1.5"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Cheguei ao destino
                    </button>
                  )}
                  {onEncerrarRota && (
                    <button
                      type="button"
                      onClick={onEncerrarRota}
                      className="px-3 py-2 rounded-lg bg-white border border-emerald-300 text-[11px] font-black uppercase text-emerald-700 cursor-pointer hover:bg-emerald-100"
                    >
                      Encerrar rota
                    </button>
                  )}
                </div>
              </div>
            )}

            {emEspera && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>
                    Em espera • restam {Math.floor(restanteSeg / 60)}:
                    {String(restanteSeg % 60).padStart(2, '0')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => responderOrdem(ordem, 'aceita')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase cursor-pointer"
                >
                  Aceitar agora
                </button>
              </div>
            )}

            {escolhendoEspera === ordem.id && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <p className="text-[11px] font-black uppercase text-slate-600">
                  Selecione o tempo de espera:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 15].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => responderOrdem(ordem, 'espera', min)}
                      className="py-2.5 rounded-xl border border-slate-300 hover:border-blue-500 hover:bg-blue-50 text-xs font-black text-slate-800 cursor-pointer"
                    >
                      {min} MIN
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEscolhendoEspera(null)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}

            {(ordem.status === 'aguardando' || (ordem.status === 'espera' && !emEspera)) &&
              escolhendoEspera !== ordem.id && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => responderOrdem(ordem, 'recusada')}
                    className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Recusar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEscolhendoEspera(ordem.id)}
                    className="py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Espera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => responderOrdem(ordem, 'aceita')}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Aceitar</span>
                  </button>
                </div>
              )}
          </div>
        );
      })}

      {/* POP-UP DE CHEGADA AO LOCAL */}
      {ordemChegada && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-slate-900">
                Equipe no local da ocorrência
              </h3>
              <p className="text-xs text-slate-500 mt-1">{ordemChegada.endereco}</p>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => iniciarOcorrencia(ordemChegada)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase cursor-pointer"
              >
                Iniciar ocorrência
              </button>
              <button
                type="button"
                onClick={() => recusarNoLocal(ordemChegada)}
                className="w-full py-3 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-black text-sm uppercase cursor-pointer"
              >
                Recusar ocorrência
              </button>
              <button
                type="button"
                onClick={() => setOrdemChegada(null)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

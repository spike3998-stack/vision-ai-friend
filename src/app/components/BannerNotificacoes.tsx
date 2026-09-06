import React, { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCircle2, ExternalLink } from 'lucide-react';
import { enablePush, isPushConfigured, registrarTokenNoServidor } from '../services/notifications';

interface Props {
  matricula: string;
}

type Estado = 'verificando' | 'ativo' | 'pedir' | 'negado' | 'nova-aba' | 'indisponivel' | 'erro';

export const BannerNotificacoes: React.FC<Props> = ({ matricula }) => {
  const [estado, setEstado] = useState<Estado>('verificando');
  const [mensagem, setMensagem] = useState<string>('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isPushConfigured() || !('Notification' in window)) {
      setEstado('indisponivel');
      return;
    }
    if (window.top !== window.self) {
      setEstado('nova-aba');
      return;
    }
    if (Notification.permission === 'granted') {
      // Já autorizado: apenas renova o token silenciosamente
      void ativar(true);
      return;
    }
    setEstado(Notification.permission === 'denied' ? 'negado' : 'pedir');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matricula]);

  const ativar = async (silencioso = false) => {
    setCarregando(true);
    try {
      const resultado = await enablePush();
      if (resultado.status === 'registered') {
        await registrarTokenNoServidor(matricula, resultado.token);
        setEstado('ativo');
      } else if (resultado.status === 'open-in-new-tab') {
        setEstado('nova-aba');
      } else if (resultado.status === 'denied') {
        setEstado('negado');
      } else if (resultado.status === 'unsupported' || resultado.status === 'not-configured') {
        setEstado('indisponivel');
      } else {
        setEstado('erro');
        setMensagem(resultado.message ?? '');
      }
    } catch (err) {
      if (!silencioso) {
        setEstado('erro');
        setMensagem(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setCarregando(false);
    }
  };

  if (estado === 'verificando' || estado === 'indisponivel') return null;

  if (estado === 'ativo') {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span className="text-[11px] font-bold uppercase">Notificações ativas neste aparelho</span>
      </div>
    );
  }

  if (estado === 'nova-aba') {
    return (
      <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900">
        <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold leading-snug">
          Para receber alertas com som, abra o aplicativo em uma aba própria do navegador (fora do
          editor) e toque em "Ativar notificações".
        </p>
      </div>
    );
  }

  if (estado === 'negado') {
    return (
      <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-red-800">
        <BellOff className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold leading-snug">
          As notificações estão bloqueadas. Abra as configurações do site no navegador (cadeado ao
          lado do endereço) e libere "Notificações", depois recarregue a página.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
      <div className="flex items-start gap-2 text-blue-900">
        <Bell className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-[11px] font-semibold leading-snug">
          Autorize as notificações para receber os acionamentos com o som do seu aparelho, mesmo com
          o aplicativo fechado.
          {estado === 'erro' && mensagem ? ` (${mensagem})` : ''}
        </p>
      </div>
      <button
        type="button"
        disabled={carregando}
        onClick={() => void ativar()}
        className="mt-2 w-full rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white py-2 text-[11px] font-black uppercase cursor-pointer transition-colors"
      >
        {carregando ? 'Aguardando permissão...' : 'Ativar notificações'}
      </button>
    </div>
  );
};

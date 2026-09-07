import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Radio, X, Send, Mic, Square, Users, User, Shield, Search, LifeBuoy, Lightbulb } from 'lucide-react';
import { UsuarioCadastrado } from '../types';
import { GRUPAMENTOS, MATRICULA_DESENVOLVEDOR } from '../data/grupamentos';
import { fetchMensagensChat, enviarMensagemChat, MensagemChat } from '../services/api';

export type ModoChat = 'radio' | 'ajuda' | 'sugestoes';

interface ChatRadioProps {
  usuarioAtivo: UsuarioCadastrado;
  usuarios: UsuarioCadastrado[];
  onFechar: () => void;
  modo?: ModoChat;
}

type Aba = 'geral' | 'individual' | 'grupamento';

/** Canal particular sempre com as duas matrículas em ordem, para os dois lados verem o mesmo. */
function canalParticular(a: string, b: string) {
  return `dm:${[a, b].sort().join('|')}`;
}


function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Falha ao ler o áudio.'));
    leitor.readAsDataURL(blob);
  });
}

export const ChatRadio: React.FC<ChatRadioProps> = ({ usuarioAtivo, usuarios, onFechar }) => {
  const [aba, setAba] = useState<Aba>('geral');
  const [contato, setContato] = useState<UsuarioCadastrado | null>(null);
  const [busca, setBusca] = useState('');
  const [mensagens, setMensagens] = useState<MensagemChat[]>([]);
  const [texto, setTexto] = useState('');
  const [gravando, setGravando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const inicioRef = useRef<number>(0);
  const fimListaRef = useRef<HTMLDivElement | null>(null);

  const canal = useMemo(() => {
    if (aba === 'geral') return 'geral';
    if (aba === 'grupamento') return `grupamento:${usuarioAtivo.grupamento}`;
    return contato ? canalParticular(usuarioAtivo.matricula, contato.matricula) : null;
  }, [aba, contato, usuarioAtivo]);

  const carregar = async (c: string) => {
    const lista = await fetchMensagensChat(c);
    setMensagens(lista);
  };

  useEffect(() => {
    if (!canal) {
      setMensagens([]);
      return;
    }
    void carregar(canal);
    const timer = window.setInterval(() => void carregar(canal), 4000);
    return () => window.clearInterval(timer);
  }, [canal]);

  useEffect(() => {
    fimListaRef.current?.scrollIntoView({ block: 'end' });
  }, [mensagens.length]);

  const enviar = async (extra: Partial<MensagemChat>) => {
    if (!canal) return;
    setEnviando(true);
    setErro(null);
    const nova = await enviarMensagemChat(canal, {
      autorMatricula: usuarioAtivo.matricula,
      autorNome: usuarioAtivo.nomeDeGuerra,
      autorGrupamento: usuarioAtivo.grupamento,
      ...extra,
    });
    setEnviando(false);
    if (nova) {
      setMensagens((atual) => [...atual, nova]);
      setTexto('');
    } else {
      setErro('Não foi possível enviar. Verifique sua conexão.');
    }
  };

  const iniciarGravacao = async () => {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const gravador = new MediaRecorder(stream);
      pedacosRef.current = [];
      inicioRef.current = Date.now();
      gravador.ondataavailable = (e) => {
        if (e.data.size > 0) pedacosRef.current.push(e.data);
      };
      gravador.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(pedacosRef.current, { type: 'audio/webm' });
        const duracao = Math.round((Date.now() - inicioRef.current) / 1000);
        if (blob.size > 0) {
          const dataUrl = await blobParaDataUrl(blob);
          await enviar({ audio: dataUrl, duracao });
        }
      };
      gravador.start();
      gravadorRef.current = gravador;
      setGravando(true);
    } catch {
      setErro('Permita o uso do microfone no aparelho para enviar áudios.');
    }
  };

  const pararGravacao = () => {
    gravadorRef.current?.stop();
    gravadorRef.current = null;
    setGravando(false);
  };

  const contatos = usuarios
    .filter((u) => u.matricula !== usuarioAtivo.matricula && u.status === 'autorizado')
    .filter((u) => {
      const q = busca.trim().toLowerCase();
      if (!q) return true;
      return (
        u.nomeDeGuerra.toLowerCase().includes(q) ||
        u.matricula.includes(q) ||
        String(u.grupamento).toLowerCase().includes(q)
      );
    });

  const brasao = GRUPAMENTOS.find((g) => g.sigla === usuarioAtivo.grupamento)?.imagem;

  const abas: { id: Aba; rotulo: string; icone: React.ReactNode }[] = [
    { id: 'geral', rotulo: 'Geral', icone: <Users className="w-3.5 h-3.5" /> },
    { id: 'individual', rotulo: 'Individual', icone: <User className="w-3.5 h-3.5" /> },
    { id: 'grupamento', rotulo: 'Grupamento', icone: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg h-[92vh] sm:h-[80vh] bg-white sm:rounded-2xl rounded-t-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        {/* CABEÇALHO */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400">
                Rádio de comunicação
              </span>
              <p className="text-sm font-black uppercase truncate">
                {aba === 'geral'
                  ? 'Chat geral'
                  : aba === 'grupamento'
                    ? `Chat ${usuarioAtivo.grupamento}`
                    : contato
                      ? contato.nomeDeGuerra
                      : 'Selecione um agente'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
            aria-label="Fechar rádio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ABAS */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-slate-100 border-b border-slate-200">
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setAba(a.id);
                if (a.id !== 'individual') setContato(null);
              }}
              className={`py-2 px-2 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                aba === a.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {a.icone}
              <span>{a.rotulo}</span>
            </button>
          ))}
        </div>

        {/* LISTA DE CONTATOS (CHAT INDIVIDUAL) */}
        {aba === 'individual' && !contato ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar agente por nome, matrícula ou grupamento"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            {contatos.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhum agente encontrado.
              </p>
            ) : (
              contatos.map((u) => (
                <button
                  key={u.matricula}
                  type="button"
                  onClick={() => setContato(u)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-400 cursor-pointer text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                    {u.foto ? (
                      <img src={u.foto} alt={u.nomeDeGuerra} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-black uppercase text-slate-900 truncate">
                      {u.nomeDeGuerra}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {u.matricula} • {u.grupamento}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            {/* MENSAGENS */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
              {aba === 'individual' && contato && (
                <button
                  type="button"
                  onClick={() => setContato(null)}
                  className="text-[11px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  Trocar agente
                </button>
              )}
              {mensagens.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  {brasao && (
                    <img
                      src={brasao}
                      alt="Brasão do grupamento"
                      loading="lazy"
                      className="w-14 h-14 object-contain mx-auto opacity-40"
                    />
                  )}
                  <p className="text-xs text-slate-500">
                    Nenhuma mensagem ainda. Envie um texto ou grave um áudio.
                  </p>
                </div>
              ) : (
                mensagens.map((m) => {
                  const meu = m.autorMatricula === usuarioAtivo.matricula;
                  return (
                    <div key={m.id} className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 border ${
                          meu
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-white text-slate-900 border-slate-200'
                        }`}
                      >
                        {!meu && (
                          <span className="block text-[10px] font-black uppercase text-blue-700">
                            {m.autorNome} • {m.autorGrupamento}
                          </span>
                        )}
                        {m.texto && <p className="text-sm whitespace-pre-wrap">{m.texto}</p>}
                        {m.audio && (
                          <audio
                            controls
                            src={m.audio}
                            className="mt-1 w-56 max-w-full"
                            preload="none"
                          />
                        )}
                        <span
                          className={`block text-[10px] mt-0.5 ${meu ? 'text-blue-100' : 'text-slate-400'}`}
                        >
                          {m.dataHora}
                          {m.duracao ? ` • ${m.duracao}s` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={fimListaRef} />
            </div>

            {/* ENVIO */}
            <div className="p-3 border-t border-slate-200 bg-white space-y-2">
              {erro && (
                <p className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                  {erro}
                </p>
              )}
              <div className="flex items-center gap-2">
                <input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && texto.trim()) void enviar({ texto: texto.trim() });
                  }}
                  placeholder={gravando ? 'Gravando áudio...' : 'Escreva sua mensagem'}
                  disabled={gravando || !canal}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={gravando ? pararGravacao : iniciarGravacao}
                  disabled={!canal || enviando}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-white cursor-pointer shrink-0 disabled:opacity-50 ${
                    gravando ? 'bg-rose-600 hover:bg-rose-700 animate-pulse' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                  title={gravando ? 'Parar e enviar áudio' : 'Gravar áudio'}
                >
                  {gravando ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => texto.trim() && enviar({ texto: texto.trim() })}
                  disabled={!canal || !texto.trim() || enviando || gravando}
                  className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
                  title="Enviar mensagem"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

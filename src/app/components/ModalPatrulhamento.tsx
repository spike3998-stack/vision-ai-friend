import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Footprints,
  X,
  Camera,
  Share2,
  Save,
  Loader2,
  Trash2,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { MembroEquipe, OrdemServico, UsuarioCadastrado } from '../types';
import { criarOrdemServidor } from '../services/api';

interface ModalPatrulhamentoProps {
  usuarioAtivo: UsuarioCadastrado | null;
  posto: string;
  equipe: MembroEquipe[];
  viaturaPrefixo?: string | undefined;
  onFechar: () => void;
  onSalvo?: ((ordem: OrdemServico) => void) | undefined;
}

const NATUREZAS = [
  'VIA PRÓ-ATIVA',
  'PATRULHAMENTO PREVENTIVO',
  'RONDA ESCOLAR',
  'APOIO AO TRÂNSITO',
  'FISCALIZAÇÃO DE POSTURA',
  'PONTO BASE',
  'ORIENTAÇÃO AO PÚBLICO',
];

/** Reduz a foto para um tamanho seguro de armazenamento. */
async function comprimirFoto(arquivo: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    leitor.readAsDataURL(arquivo);
  });
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 900;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Valor inicial no formato aceito por <input type="datetime-local">. */
function agoraLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Converte "aaaa-mm-ddThh:mm" para "dd/mm/aaaa, hh:mm:ss". */
function paraBr(valor: string): string {
  if (!valor) return '';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('pt-BR');
}

/** Obtém o endereço aproximado da posição atual do aparelho. */
async function obterLocalizacaoAtual(): Promise<string> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('sem geolocalizacao'));
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });
  });
  const { latitude, longitude } = pos.coords;
  const coords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      { headers: { Accept: 'application/json' } },
    );
    if (resp.ok) {
      const dados = (await resp.json()) as { display_name?: string };
      if (dados.display_name) return dados.display_name;
    }
  } catch {
    /* mantém as coordenadas */
  }
  return coords;
}

/** Desenha a foto com as informações do patrulhamento sobrepostas. */
async function montarImagemCompartilhavel(foto: string, linhas: string[]): Promise<Blob | null> {
  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = foto;
  });
  if (!img) return null;

  const largura = 1080;
  const escala = largura / img.width;
  const alturaFoto = Math.round(img.height * escala);
  const canvas = document.createElement('canvas');
  const padding = 36;
  const alturaLinha = 40;
  const alturaTexto = padding * 2 + linhas.length * alturaLinha;
  canvas.width = largura;
  canvas.height = alturaFoto + alturaTexto;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, largura, alturaFoto);

  const grad = ctx.createLinearGradient(0, alturaFoto - 160, 0, alturaFoto);
  grad.addColorStop(0, 'rgba(15,23,42,0)');
  grad.addColorStop(1, 'rgba(15,23,42,0.9)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, alturaFoto - 160, largura, 160);

  ctx.textBaseline = 'top';
  let y = alturaFoto + padding;
  for (const linha of linhas) {
    ctx.font = linha.startsWith('PATRULHAMENTO') ? 'bold 34px sans-serif' : '28px sans-serif';
    ctx.fillStyle = linha.startsWith('PATRULHAMENTO') ? '#34d399' : '#f8fafc';
    ctx.fillText(linha, padding, y, largura - padding * 2);
    y += alturaLinha;
  }

  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
  );
}

export const ModalPatrulhamento: React.FC<ModalPatrulhamentoProps> = ({
  usuarioAtivo,
  posto,
  equipe,
  viaturaPrefixo,
  onFechar,
  onSalvo,
}) => {
  const [naturezas, setNaturezas] = useState<string[]>([]);
  const [naturezaExtra, setNaturezaExtra] = useState('');
  const [local, setLocal] = useState('');
  const [inicio, setInicio] = useState(agoraLocal());
  const [fim, setFim] = useState(agoraLocal());
  const [observacoes, setObservacoes] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const inputFoto = useRef<HTMLInputElement | null>(null);

  const grupo = usuarioAtivo?.grupamento || 'GCM';

  const naturezaFinal = useMemo(() => {
    const lista = [...naturezas];
    if (naturezaExtra.trim()) lista.push(naturezaExtra.trim().toUpperCase());
    return lista.join(', ');
  }, [naturezas, naturezaExtra]);

  const textoCompartilhar = useMemo(() => {
    const membros =
      equipe.length > 0
        ? equipe.map((m) => `${m.nomeDeGuerra.toUpperCase()} (${m.matricula})`).join(', ')
        : `${usuarioAtivo?.nomeDeGuerra?.toUpperCase() || 'AGENTE'} (${usuarioAtivo?.matricula || '---'})`;
    return [
      '*PATRULHAMENTO FINALIZADO*',
      `*Grupo:* ${grupo}`,
      `*Natureza:* ${naturezaFinal || '---'}`,
      `*Local:* ${local || '---'}`,
      `*Data/Hora inicial:* ${paraBr(inicio)}`,
      `*Data/Hora final:* ${paraBr(fim)}`,
      viaturaPrefixo ? `*VTR:* ${viaturaPrefixo}` : '',
      `*Equipe:* ${membros}`,
      observacoes ? `*Observações:* ${observacoes}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }, [grupo, naturezaFinal, local, inicio, fim, viaturaPrefixo, equipe, observacoes, usuarioAtivo]);

  const marcarLocalizacao = async (silencioso = false) => {
    setLocalizando(true);
    try {
      const endereco = await obterLocalizacaoAtual();
      setLocal(endereco.toUpperCase());
      setErro(null);
    } catch {
      if (!silencioso) setErro('Não foi possível obter a localização. Ative o GPS e tente de novo.');
    } finally {
      setLocalizando(false);
    }
  };

  // Preenche o local automaticamente ao abrir o patrulhamento.
  useEffect(() => {
    void marcarLocalizacao(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alternarNatureza = (n: string) =>
    setNaturezas((atual) => (atual.includes(n) ? atual.filter((x) => x !== n) : [...atual, n]));

  const adicionarFotos = async (arquivos: FileList | null) => {
    if (!arquivos || arquivos.length === 0) return;
    const novas: string[] = [];
    for (const arquivo of Array.from(arquivos)) novas.push(await comprimirFoto(arquivo));
    setFotos((atual) => [...atual, ...novas]);
  };

  const compartilharWhatsApp = async () => {
    const linhas = textoCompartilhar.split('\n').map((l) => l.replace(/\*/g, ''));
    const primeiraFoto = fotos[0];
    if (primeiraFoto) {
      try {
        const blob = await montarImagemCompartilhavel(primeiraFoto, linhas);
        if (blob) {
          const arquivo = new File([blob], 'patrulhamento.jpg', { type: 'image/jpeg' });
          const nav = navigator as Navigator & {
            canShare?: (data: ShareData) => boolean;
            share?: (data: ShareData) => Promise<void>;
          };
          if (nav.share && nav.canShare?.({ files: [arquivo] })) {
            await nav.share({ files: [arquivo], text: textoCompartilhar });
            return;
          }
          // Sem compartilhamento nativo: baixa a imagem e abre o WhatsApp com o texto.
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'patrulhamento.jpg';
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      } catch {
        /* segue para o compartilhamento apenas em texto */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(textoCompartilhar)}`, '_blank');
  };

  const salvar = async () => {
    if (!naturezaFinal || !local.trim()) {
      setErro('Informe a natureza e o local do patrulhamento.');
      return;
    }
    setErro(null);
    setSalvando(true);
    try {
      const equipeFinal: MembroEquipe[] =
        equipe.length > 0
          ? equipe
          : [
              {
                nomeDeGuerra: usuarioAtivo?.nomeDeGuerra || 'AGENTE',
                matricula: usuarioAtivo?.matricula || '---',
                posto,
                grupamento: usuarioAtivo?.grupamento,
                assinatura: usuarioAtivo?.assinatura,
                viaturaPrefixo,
              },
            ];
      const coordenador = equipeFinal.find((m) => m.posto === 'COORDENADOR DE EQUIPE');

      const ordem: Partial<OrdemServico> = {
        id: `PAT-${Date.now()}`,
        grupamento: grupo,
        endereco: local.trim().toUpperCase(),
        descricao: `PATRULHAMENTO: ${naturezaFinal}`,
        observacoes: observacoes || undefined,
        status: 'aceita',
        criadoPor: usuarioAtivo?.nomeDeGuerra || 'AGENTE',
        criadoPorMatricula: usuarioAtivo?.matricula || '---',
        dataHora: paraBr(inicio),
        respondidoPor: usuarioAtivo?.nomeDeGuerra,
        respondidoPorMatricula: usuarioAtivo?.matricula,
        equipe: equipeFinal,
        viaturaPrefixo,
        ehPatrulhamento: true,
        ocorrenciaStatus: 'finalizada',
        ocorrenciaIniciadaEm: paraBr(inicio),
        ocorrenciaFinalizadaEm: paraBr(fim),
        relato: observacoes || undefined,
        fotos,
        finalizadoPor: usuarioAtivo?.nomeDeGuerra,
        finalizadoPorMatricula: usuarioAtivo?.matricula,
        assinaturaFinalizacao: usuarioAtivo?.assinatura,
        coordenadorNome: coordenador?.nomeDeGuerra,
        coordenadorMatricula: coordenador?.matricula,
        assinaturaCoordenador: coordenador?.assinatura,
      };

      const criada = await criarOrdemServidor(ordem);
      setSalvo(true);
      if (criada) onSalvo?.(criada);
    } catch {
      setErro('Não foi possível salvar o patrulhamento. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 flex items-end sm:items-center justify-center p-3">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h4 className="font-black text-sm uppercase text-slate-900 flex items-center gap-2">
            <Footprints className="w-4 h-4 text-emerald-600" />
            Patrulhamento
          </h4>
          <button
            type="button"
            onClick={onFechar}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-700" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* GRUPO */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
              Grupo
            </label>
            <div className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-black uppercase text-slate-800">
              {grupo}
              {viaturaPrefixo && (
                <span className="ml-2 text-blue-700 text-xs">• VTR {viaturaPrefixo}</span>
              )}
            </div>
          </div>

          {/* NATUREZA */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
              Natureza
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {NATUREZAS.map((n) => {
                const ativo = naturezas.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => alternarNatureza(n)}
                    className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                      ativo
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <input
              value={naturezaExtra}
              onChange={(e) => setNaturezaExtra(e.target.value)}
              placeholder="Outra natureza (opcional)"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* LOCAL */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
              Local
            </label>
            <div className="flex gap-2">
              <input
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder={localizando ? 'Obtendo localização...' : 'Rua, bairro, cidade'}
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => void marcarLocalizacao()}
                disabled={localizando}
                title="Marcar minha localização"
                className="shrink-0 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white flex items-center gap-1.5 text-[10px] font-black uppercase cursor-pointer"
              >
                {localizando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                GPS
              </button>
            </div>
          </div>

          {/* DATAS */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                Data/Hora inicial
              </label>
              <input
                type="datetime-local"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
                Data/Hora final
              </label>
              <input
                type="datetime-local"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* OBSERVAÇÕES */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
              Observações
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
              placeholder="Resumo do patrulhamento realizado"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* FOTOS */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 mb-1">
              Fotos
            </label>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => void adicionarFotos(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputFoto.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              Adicionar foto
            </button>
            {fotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {fotos.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={f} alt={`Foto ${i + 1}`} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setFotos((atual) => atual.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 w-6 h-6 rounded-md bg-rose-600 text-white flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {erro && (
            <p className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
              {erro}
            </p>
          )}
          {salvo && (
            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Patrulhamento registrado no Livro Ata do {grupo}.
            </p>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={() => void salvar()}
            disabled={salvando}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {salvo ? 'Salvo no Livro Ata' : 'Salvar no Livro Ata'}
          </button>
          <button
            type="button"
            onClick={() => void compartilharWhatsApp()}
            className="w-full py-3 px-4 rounded-xl border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar no WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import {
  FileText,
  MapPin,
  Clock,
  Users,
  Camera,
  Truck,
  Siren,
  ArrowLeft,
  Save,
  Check,
  X,
  Car,
} from 'lucide-react';
import { OrdemServico, UsuarioCadastrado, MembroEquipe } from '../types';
import { GRUPAMENTOS } from '../data/grupamentos';
import { atualizarOrdemServidor, criarOrdemServidor } from '../services/api';

interface BoletimOcorrenciaProps {
  ordem: OrdemServico;
  usuarioAtivo: UsuarioCadastrado | null;
  equipe: MembroEquipe[];
  viaturaPrefixo?: string | undefined;
  onVoltar: () => void;
  onOrdemAtualizada: (ordem: OrdemServico) => void;
}

/** Reduz a foto tirada pela câmera para um tamanho seguro de armazenamento. */
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

export const BoletimOcorrencia: React.FC<BoletimOcorrenciaProps> = ({
  ordem,
  usuarioAtivo,
  equipe,
  viaturaPrefixo,
  onVoltar,
  onOrdemAtualizada,
}) => {
  const [relato, setRelato] = useState<string>(ordem.relato || '');
  const [fotos, setFotos] = useState<string[]>(ordem.fotos || []);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [reboque, setReboque] = useState<boolean>(Boolean(ordem.reboqueAcionado));
  const [escolhendoApoio, setEscolhendoApoio] = useState(false);
  const [apoioEnviado, setApoioEnviado] = useState<string | null>(ordem.apoioGrupamento || null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  const equipeFinal = ordem.equipe && ordem.equipe.length > 0 ? ordem.equipe : equipe;
  const prefixo = ordem.viaturaPrefixo || viaturaPrefixo;

  const persistir = async (dados: Partial<OrdemServico>) => {
    const atualizada = await atualizarOrdemServidor(ordem.id, dados);
    if (atualizada) onOrdemAtualizada(atualizada);
    else onOrdemAtualizada({ ...ordem, ...dados } as OrdemServico);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    await persistir({ relato, fotos });
    setSalvando(false);
    setAviso('Boletim salvo com sucesso.');
    window.setTimeout(() => setAviso(null), 3000);
  };

  const handleFotos = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return;
    const novas: string[] = [];
    for (const arquivo of Array.from(lista)) {
      novas.push(await comprimirFoto(arquivo));
    }
    const todas = [...fotos, ...novas];
    setFotos(todas);
    await persistir({ fotos: todas, relato });
  };

  const handleReboque = async () => {
    if (reboque) return;
    setReboque(true);
    await persistir({
      reboqueAcionado: true,
      reboqueEm: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      relato,
    });
    setAviso('Reboque acionado. O CIOSP foi notificado.');
  };

  const handleApoio = async (sigla: string) => {
    setEscolhendoApoio(false);
    const nova = await criarOrdemServidor({
      grupamento: sigla,
      endereco: ordem.endereco,
      descricao: `APOIO SOLICITADO • ${ordem.descricao}`,
      observacoes: `Apoio pedido pela equipe ${equipeFinal
        .map((m) => m.nomeDeGuerra)
        .join(', ')}${prefixo ? ` (VTR ${prefixo})` : ''}.`,
      criadoPor: usuarioAtivo?.nomeDeGuerra || 'EQUIPE',
      criadoPorMatricula: usuarioAtivo?.matricula || '---',
      ehApoio: true,
      origemOrdemId: ordem.id,
    });
    if (nova) {
      setApoioEnviado(sigla);
      await persistir({ apoioGrupamento: sigla, relato });
      setAviso(`Apoio do ${sigla} acionado e enviado à equipe do grupamento.`);
    } else {
      setAviso('Não foi possível acionar o apoio. Tente novamente.');
    }
  };

  return (
    <div id="screen-boletim-ocorrencia" className="space-y-4">
      {/* CABEÇALHO DO BOLETIM */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2 py-0.5 rounded-md">
                Boletim de Ocorrência
              </span>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-1">
                {ordem.descricao}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onVoltar}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar</span>
          </button>
        </div>
      </div>

      {/* EQUIPE QUE ACEITOU A OCORRÊNCIA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span>Equipe empenhada</span>
          {prefixo && (
            <span className="ml-auto text-[11px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Car className="w-3 h-3" /> VTR {prefixo}
            </span>
          )}
        </h3>

        {equipeFinal.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nenhum agente identificado na viatura no momento do aceite.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {equipeFinal.map((m, i) => (
              <div
                key={`${m.matricula}-${i}`}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <div>
                  <span className="block text-xs font-black uppercase text-slate-900">
                    {m.nomeDeGuerra}
                  </span>
                  <span className="block text-[11px] text-slate-500">Matrícula: {m.matricula}</span>
                </div>
                <span className="text-[10px] font-black uppercase text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                  {m.posto}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-2 pt-1">
          <p className="text-xs text-slate-700 flex items-start gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
            <span>
              <strong className="uppercase text-[10px] block text-slate-500">Local</strong>
              {ordem.endereco}
            </span>
          </p>
          <p className="text-xs text-slate-700 flex items-start gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong className="uppercase text-[10px] block text-slate-500">
                Início da ocorrência
              </strong>
              {ordem.ocorrenciaIniciadaEm || '---'}
            </span>
          </p>
        </div>
      </div>

      {/* RELATO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <label className="text-xs font-black uppercase tracking-wider text-slate-800">
          Descrição da ocorrência
        </label>
        <textarea
          value={relato}
          onChange={(e) => setRelato(e.target.value)}
          rows={8}
          placeholder="Descreva os fatos, envolvidos, providências adotadas e encaminhamentos."
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500 resize-y"
        />

        {/* BOTÕES DE AÇÃO NO LOCAL */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Câmera</span>
          </button>
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFotos(e.target.files);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={handleReboque}
            disabled={reboque}
            className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Truck className="w-4 h-4" />
            <span>{reboque ? 'Reboque acionado' : 'Acionar reboque'}</span>
          </button>

          <button
            type="button"
            onClick={() => setEscolhendoApoio((v) => !v)}
            className="py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Siren className="w-4 h-4" />
            <span>{apoioEnviado ? `Apoio: ${apoioEnviado}` : 'Acionar apoio'}</span>
          </button>
        </div>

        {escolhendoApoio && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 space-y-2">
            <p className="text-[11px] font-black uppercase text-rose-800">
              Selecione o grupamento que prestará apoio:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GRUPAMENTOS.map((g) => (
                <button
                  key={g.sigla}
                  type="button"
                  onClick={() => handleApoio(g.sigla)}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 bg-white hover:bg-rose-100 text-[11px] font-black text-rose-800 cursor-pointer"
                >
                  {g.sigla}
                </button>
              ))}
            </div>
          </div>
        )}

        {fotos.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
            {fotos.map((f, i) => (
              <div key={i} className="relative group">
                <img
                  src={f}
                  alt={`Foto ${i + 1} da ocorrência`}
                  className="w-full h-20 object-cover rounded-lg border border-slate-200"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const restantes = fotos.filter((_, idx) => idx !== i);
                    setFotos(restantes);
                    await persistir({ fotos: restantes, relato });
                  }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center cursor-pointer"
                  title="Remover foto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {aviso && (
          <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            {aviso}
          </p>
        )}

        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{salvando ? 'Salvando...' : 'Salvar boletim'}</span>
        </button>
      </div>
    </div>
  );
};

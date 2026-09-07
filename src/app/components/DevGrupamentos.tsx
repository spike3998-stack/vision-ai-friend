import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { GrupamentoItem, UsuarioCadastrado } from '../types';
import { useGrupamentos, setGrupamentos } from '../data/grupamentos';
import { processarFotoPerfil, lerArquivoParaEdicao } from '../services/imageUtils';
import { salvarGrupamentoServidor, excluirGrupamentoServidor } from '../services/api';

interface DevGrupamentosProps {
  usuarios: UsuarioCadastrado[];
  onVoltar: () => void;
}

export const DevGrupamentos: React.FC<DevGrupamentosProps> = ({ usuarios, onVoltar }) => {
  const grupamentos = useGrupamentos();
  const [editando, setEditando] = useState<{ original: string | null; item: GrupamentoItem } | null>(
    null
  );
  const [paraApagar, setParaApagar] = useState<GrupamentoItem | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const avisar = (texto: string) => {
    setFeedback(texto);
    setTimeout(() => setFeedback(null), 3500);
  };

  const contarAgentes = (sigla: string) =>
    usuarios.filter((u) => u.grupamento === sigla).length;

  const abrirNovo = () =>
    setEditando({ original: null, item: { sigla: '', nome: '', imagem: '' } });

  const abrirEdicao = (g: GrupamentoItem) => setEditando({ original: g.sigla, item: { ...g } });

  const trocarImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !editando) return;
    try {
      const bruta = await lerArquivoParaEdicao(arquivo);
      const tratada = await processarFotoPerfil(bruta);
      setEditando({ ...editando, item: { ...editando.item, imagem: tratada } });
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível carregar a imagem do brasão.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    const sigla = editando.item.sigla.trim().toUpperCase();
    const nome = editando.item.nome.trim();
    if (!sigla || !nome) {
      setErro('Preencha a sigla e o nome do grupamento.');
      return;
    }
    if (
      editando.original !== sigla &&
      grupamentos.some((g) => g.sigla === sigla)
    ) {
      setErro('Já existe um grupamento com essa sigla.');
      return;
    }

    setErro(null);
    setSalvando(true);
    const lista = await salvarGrupamentoServidor(
      { sigla, nome, imagem: editando.item.imagem },
      editando.original ?? undefined
    );
    setSalvando(false);

    if (!lista) {
      setErro('Não foi possível salvar agora. Verifique a conexão e tente novamente.');
      return;
    }
    setGrupamentos(lista);
    setEditando(null);
    avisar(`Grupamento ${sigla} salvo com sucesso.`);
  };

  const excluir = async () => {
    if (!paraApagar) return;
    setSalvando(true);
    const lista = await excluirGrupamentoServidor(paraApagar.sigla);
    setSalvando(false);
    if (!lista) {
      setErro('Não foi possível remover o grupamento agora.');
      return;
    }
    setGrupamentos(lista);
    avisar(`Grupamento ${paraApagar.sigla} removido.`);
    setParaApagar(null);
  };

  return (
    <div id="screen-dev-grupamentos" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <span className="text-[11px] font-bold text-slate-500">
          {grupamentos.length} grupamento(s)
        </span>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
          Consultar Grupamentos
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Edite nomes, brasões, adicione ou remova grupamentos
        </p>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {feedback}
        </div>
      )}
      {erro && (
        <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs font-bold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {erro}
        </div>
      )}

      <button
        type="button"
        onClick={abrirNovo}
        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Adicionar grupamento
      </button>

      <div className="space-y-2.5">
        {grupamentos.map((g) => (
          <div
            key={g.sigla}
            className="bg-white border-2 border-slate-200 rounded-2xl p-3 flex items-center gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
              {g.imagem ? (
                <img
                  src={g.imagem}
                  alt={`Brasão ${g.sigla}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Shield className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-black uppercase text-slate-900 truncate">
                {g.sigla}
              </span>
              <span className="block text-xs text-slate-500 truncate">{g.nome}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {contarAgentes(g.sigla)} agente(s)
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => abrirEdicao(g)}
                className="w-9 h-9 rounded-xl border border-slate-300 hover:border-blue-600 hover:text-blue-600 text-slate-600 flex items-center justify-center cursor-pointer"
                title="Editar grupamento"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setParaApagar(g)}
                className="w-9 h-9 rounded-xl border border-slate-300 hover:border-rose-600 hover:text-rose-600 text-slate-600 flex items-center justify-center cursor-pointer"
                title="Remover grupamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DE EDIÇÃO / CADASTRO */}
      {editando && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={salvar}
            className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black uppercase text-slate-900">
                {editando.original ? 'Editar grupamento' : 'Novo grupamento'}
              </h3>
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 p-1 flex items-center justify-center shrink-0">
                {editando.item.imagem ? (
                  <img
                    src={editando.item.imagem}
                    alt="Brasão"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Shield className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={trocarImagem}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  Trocar brasão
                </button>
                {editando.item.imagem && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditando({ ...editando, item: { ...editando.item, imagem: '' } })
                    }
                    className="py-1.5 px-3 rounded-xl text-rose-700 hover:bg-rose-50 font-bold text-[11px] uppercase cursor-pointer"
                  >
                    Remover imagem
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                Sigla:
              </label>
              <input
                type="text"
                value={editando.item.sigla}
                onChange={(e) =>
                  setEditando({
                    ...editando,
                    item: { ...editando.item, sigla: e.target.value.toUpperCase() },
                  })
                }
                placeholder="Ex.: GTRAN"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-black uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                Nome completo:
              </label>
              <input
                type="text"
                value={editando.item.nome}
                onChange={(e) =>
                  setEditando({ ...editando, item: { ...editando.item, nome: e.target.value } })
                }
                placeholder="Ex.: Grupamento de Trânsito"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {editando.original && editando.original !== editando.item.sigla.trim().toUpperCase() && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2 font-bold">
                Ao trocar a sigla, mova os agentes desse grupamento em Consultar Cadastros.
              </p>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar grupamento'}
            </button>
          </form>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {paraApagar && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-black uppercase text-slate-900">Remover grupamento</h3>
            <p className="text-sm text-slate-600">
              Deseja remover <strong>{paraApagar.sigla}</strong>?{' '}
              {contarAgentes(paraApagar.sigla) > 0 && (
                <span className="text-rose-700 font-bold">
                  {contarAgentes(paraApagar.sigla)} agente(s) estão neste grupamento e precisarão ser
                  movidos.
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParaApagar(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluir}
                disabled={salvando}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-black text-xs uppercase cursor-pointer"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

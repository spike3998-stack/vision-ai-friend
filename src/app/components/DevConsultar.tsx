import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  Edit3,
  Pencil,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Shield,
  Droplets,
  Lock,
  Save,
  Clock,
  ShieldAlert,
  User,
  Camera,
  Crop,
} from 'lucide-react';
import { UsuarioCadastrado, SiglaGrupamento, StatusCadastro } from '../types';
import { GRUPAMENTOS } from '../data/grupamentos';
import { processarFotoPerfil, lerArquivoParaEdicao } from '../services/imageUtils';
import { ModalCortarFoto } from './ModalCortarFoto';

interface DevConsultarProps {
  usuarios: UsuarioCadastrado[];
  onSalvarEdicao: (usuarioAtualizado: UsuarioCadastrado) => void;
  onExcluirUsuario: (usuarioId: string) => void;
  onVoltar: () => void;
}

export const DevConsultar: React.FC<DevConsultarProps> = ({
  usuarios,
  onSalvarEdicao,
  onExcluirUsuario,
  onVoltar,
}) => {
  const [busca, setBusca] = useState('');
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<UsuarioCadastrado | null>(null);
  const [usuarioParaApagar, setUsuarioParaApagar] = useState<UsuarioCadastrado | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form states for editing
  const [editNomeCompleto, setEditNomeCompleto] = useState('');
  const [editNomeDeGuerra, setEditNomeDeGuerra] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [editTipoSanguineo, setEditTipoSanguineo] = useState('');
  const [editGrupamento, setEditGrupamento] = useState<SiglaGrupamento>('ROMU');
  const [editStatus, setEditStatus] = useState<StatusCadastro>('autorizado');
  const [editSenha, setEditSenha] = useState('');
  const [editFoto, setEditFoto] = useState<string | undefined>(undefined);
  const [imagemParaCortar, setImagemParaCortar] = useState<string | null>(null);
  const [editCarregandoFoto, setEditCarregandoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAbrirEdicao = (usuario: UsuarioCadastrado) => {
    setUsuarioEmEdicao(usuario);
    setEditNomeCompleto(usuario.nomeCompleto);
    setEditNomeDeGuerra(usuario.nomeDeGuerra);
    setEditMatricula(usuario.matricula);
    setEditTipoSanguineo(usuario.tipoSanguineo);
    setEditGrupamento(usuario.grupamento);
    setEditStatus(usuario.status);
    setEditFoto(usuario.foto);
    setEditSenha(usuario.senha || '');
    setEditCarregandoFoto(false);
  };

  const handleFecharEdicao = () => {
    setUsuarioEmEdicao(null);
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        setEditCarregandoFoto(true);
        const rawUrl = await lerArquivoParaEdicao(files[0]);
        setImagemParaCortar(rawUrl);
      } catch (err: any) {
        setFeedback(err?.message || 'Erro ao carregar foto.');
      } finally {
        setEditCarregandoFoto(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEmEdicao) return;

    const atualizado: UsuarioCadastrado = {
      ...usuarioEmEdicao,
      nomeCompleto: editNomeCompleto.trim(),
      nomeDeGuerra: editNomeDeGuerra.trim().toUpperCase(),
      matricula: editMatricula.trim(),
      tipoSanguineo: editTipoSanguineo.trim().toUpperCase(),
      grupamento: editGrupamento,
      status: editStatus,
      foto: editFoto,
      senha: editSenha.trim() || usuarioEmEdicao.senha,
    };

    onSalvarEdicao(atualizado);
    setUsuarioEmEdicao(null);
    setFeedback(`Cadastro de ${atualizado.nomeDeGuerra} atualizado com sucesso!`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleSolicitarExcluir = (usuario: UsuarioCadastrado) => {
    if (usuario.isDesenvolvedor) {
      return;
    }
    setUsuarioParaApagar(usuario);
  };

  const handleConfirmarExcluir = () => {
    if (!usuarioParaApagar) return;

    const nome = usuarioParaApagar.nomeDeGuerra;
    onExcluirUsuario(usuarioParaApagar.id);
    if (usuarioEmEdicao?.id === usuarioParaApagar.id) {
      setUsuarioEmEdicao(null);
    }
    setUsuarioParaApagar(null);
    setFeedback(`Usuário ${nome} foi apagado com sucesso do sistema.`);
    setTimeout(() => setFeedback(null), 4000);
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.toLowerCase();
    return (
      u.nomeCompleto.toLowerCase().includes(termo) ||
      u.nomeDeGuerra.toLowerCase().includes(termo) ||
      u.matricula.toLowerCase().includes(termo) ||
      u.grupamento.toLowerCase().includes(termo)
    );
  });

  return (
    <div id="screen-dev-consultar" className="space-y-4">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          id="btn-voltar-dev-menu-2"
          type="button"
          onClick={onVoltar}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>PAINEL DEV</span>
        </button>
        <span className="text-xs font-black uppercase text-blue-700 tracking-wider">
          CONSULTAR CADASTROS
        </span>
      </div>

      <div className="text-center pt-1">
        <h2 className="text-xl font-black text-slate-900 uppercase">
          Consulta de Cadastros
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Clique em qualquer usuário para editar suas informações funcionais
        </p>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="input-busca-usuarios"
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, nome de guerra, matrícula ou grupamento..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* LISTAGEM DE USUÁRIOS */}
      <div className="space-y-3 pt-1">
        {usuariosFiltrados.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
            <p className="font-bold text-slate-800 text-sm">
              Nenhum usuário encontrado
            </p>
            <p className="text-xs text-slate-500">
              Tente buscar com outro termo ou limpe o campo de busca.
            </p>
          </div>
        ) : (
          usuariosFiltrados.map((usuario) => {
            const grupamento =
              GRUPAMENTOS.find((g) => g.sigla === usuario.grupamento) || GRUPAMENTOS[0];

            return (
              <div
                key={usuario.id}
                id={`card-usuario-${usuario.matricula}`}
                onClick={() => handleAbrirEdicao(usuario)}
                className="bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 active:bg-blue-50/40 rounded-2xl p-4 shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Foto do Usuário ou Ícone */}
                  <div className="w-13 h-13 rounded-xl bg-slate-50 border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                    {usuario.foto ? (
                      <img
                        src={usuario.foto}
                        alt={`Foto ${usuario.nomeDeGuerra}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        <User className="w-7 h-7 text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-black text-slate-900 uppercase truncate">
                        {usuario.nomeDeGuerra}
                      </span>

                      {usuario.isDesenvolvedor ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                          DESENVOLVEDOR
                        </span>
                      ) : (
                        <>
                          {/* IMAGEM COM O BRASÃO DO GRUPAMENTO AO LADO DO NOME DE GUERRA */}
                          <div
                            className="w-5 h-5 rounded-md bg-slate-50 border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-2xs"
                            title={`Brasão ${usuario.grupamento}`}
                          >
                            <img
                              src={grupamento.imagem}
                              alt={`Brasão ${usuario.grupamento}`}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* NOME DO GRUPAMENTO AO LADO DO BRASÃO */}
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black uppercase shrink-0">
                            {usuario.grupamento}
                          </span>
                        </>
                      )}
                      {usuario.status === 'autorizado' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> AUTORIZADO
                        </span>
                      )}
                      {usuario.status === 'pendente' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3" /> PENDENTE
                        </span>
                      )}
                      {usuario.status === 'negado' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black uppercase flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> NEGADO
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium truncate mt-0.5">
                      {usuario.nomeCompleto}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1">
                      <span>
                        Matrícula: <strong className="text-slate-800">{usuario.matricula}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-rose-500" />
                        <strong className="text-rose-600">{usuario.tipoSanguineo}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO: CÍRCULOS PEQUENOS COM ÍCONE DE CANETA E LIXEIRA */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    id={`btn-editar-${usuario.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAbrirEdicao(usuario);
                    }}
                    className="w-8 h-8 rounded-full border border-slate-300 hover:border-blue-600 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                    title="Editar usuário"
                    aria-label="Editar usuário"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {!usuario.isDesenvolvedor ? (
                    <button
                      id={`btn-apagar-${usuario.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSolicitarExcluir(usuario);
                      }}
                      className="w-8 h-8 rounded-full border border-slate-300 hover:border-rose-500 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                      title="Apagar usuário"
                      aria-label="Apagar usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span
                      className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center cursor-default"
                      title="Conta principal do desenvolvedor protegida"
                    >
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL / TELA DE EDIÇÃO DO USUÁRIO SELECIONADO */}
      {usuarioEmEdicao && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg p-5 sm:p-6 my-8 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Editar Cadastro do Usuário
                </h3>
              </div>
              <button
                type="button"
                onClick={handleFecharEdicao}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvar} className="space-y-3.5">
              {/* FOTO DE PERFIL */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center gap-3.5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      try {
                        setEditCarregandoFoto(true);
                        const rawUrl = await lerArquivoParaEdicao(e.dataTransfer.files[0]);
                        setImagemParaCortar(rawUrl);
                      } catch (err: any) {
                        setFeedback(err?.message || 'Erro ao carregar foto.');
                      } finally {
                        setEditCarregandoFoto(false);
                      }
                    }
                  }}
                  className="relative w-14 h-14 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-500 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group transition-all shadow-xs"
                  title="Clique ou arraste uma foto para o usuário"
                >
                  {editFoto ? (
                    <img
                      src={editFoto}
                      alt="Foto do usuário"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-7 h-7 text-slate-300 group-hover:text-blue-500 transition-colors" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-4 h-4 drop-shadow" />
                  </div>
                  {editCarregandoFoto && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <span className="text-xs font-black uppercase text-slate-900 block">
                    Foto do Perfil
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{editFoto ? 'Alterar' : 'Adicionar'}</span>
                    </button>
                    {editFoto && (
                      <button
                        type="button"
                        onClick={() => setImagemParaCortar(editFoto)}
                        className="px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                        title="Ajustar enquadramento e corte da foto"
                      >
                        <Crop className="w-3 h-3" />
                        <span>Ajustar / Cortar</span>
                      </button>
                    )}
                    {editFoto && (
                      <button
                        type="button"
                        onClick={() => setEditFoto(undefined)}
                        className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* NOME COMPLETO */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  NOME COMPLETO:
                </label>
                <input
                  type="text"
                  value={editNomeCompleto}
                  onChange={(e) => setEditNomeCompleto(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              {/* NOME DE GUERRA */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  NOME DE GUERRA:
                </label>
                <input
                  type="text"
                  value={editNomeDeGuerra}
                  onChange={(e) => setEditNomeDeGuerra(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase"
                  required
                />
              </div>

              {/* MATRÍCULA E TIPO SANGUÍNEO */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                    MATRÍCULA:
                  </label>
                  <input
                    type="text"
                    value={editMatricula}
                    onChange={(e) => setEditMatricula(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                    TIPO SANGUÍNEO:
                  </label>
                  <input
                    type="text"
                    value={editTipoSanguineo}
                    onChange={(e) => setEditTipoSanguineo(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 uppercase"
                    required
                  />
                </div>
              </div>

              {/* STATUS DE ACESSO */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  STATUS DE ACESSO:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus('autorizado')}
                    className={`py-2 px-2 rounded-xl text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                      editStatus === 'autorizado'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    AUTORIZADO
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus('pendente')}
                    className={`py-2 px-2 rounded-xl text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                      editStatus === 'pendente'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    PENDENTE
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus('negado')}
                    className={`py-2 px-2 rounded-xl text-xs font-black uppercase border-2 transition-all cursor-pointer ${
                      editStatus === 'negado'
                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    NEGADO
                  </button>
                </div>
              </div>

              {/* GRUPAMENTO / PERFIL */}
              {usuarioEmEdicao.isDesenvolvedor ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 block">Perfil Operacional</span>
                    <span className="text-xs font-black text-amber-950 uppercase">Desenvolvedor (Usuário Único / Acesso Total)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                    SEM BRASÃO
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 mb-1.5">
                    GRUPAMENTO (SELECIONAR):
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {GRUPAMENTOS.map((grup) => {
                      const isSelected = editGrupamento === grup.sigla;
                      return (
                        <button
                          key={grup.sigla}
                          type="button"
                          onClick={() => setEditGrupamento(grup.sigla)}
                          className={`flex items-center gap-2 p-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-md bg-white border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                            <img
                              src={grup.imagem}
                              alt={`Brasão ${grup.sigla}`}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <span className="text-xs font-black uppercase text-slate-900">
                            {grup.sigla}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* REDEFINIR SENHA */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  SENHA DE ACESSO:
                </label>
                <input
                  type="text"
                  value={editSenha}
                  onChange={(e) => setEditSenha(e.target.value)}
                  placeholder="Deixar em branco para manter a senha atual"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>SALVAR ALTERAÇÕES</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFecharEdicao}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer"
                  >
                    CANCELAR
                  </button>

                  {!usuarioEmEdicao.isDesenvolvedor && (
                    <button
                      type="button"
                      onClick={() => handleSolicitarExcluir(usuarioEmEdicao)}
                      className="py-2.5 px-3 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>APAGAR</span>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO PARA APAGAR USUÁRIO */}
      {usuarioParaApagar && (
        <div
          id="modal-confirmar-apagar"
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setUsuarioParaApagar(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Apagar Usuário
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Confirmação de exclusão permanente
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-700">
              <p>
                Agente: <strong className="text-slate-900 uppercase">{usuarioParaApagar.nomeDeGuerra}</strong> ({usuarioParaApagar.nomeCompleto})
              </p>
              <p>
                Matrícula: <strong className="text-slate-900">{usuarioParaApagar.matricula}</strong> • Grupamento: <strong className="text-blue-700">{usuarioParaApagar.grupamento}</strong>
              </p>
            </div>

            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl leading-relaxed">
              <strong>Atenção:</strong> Ao apagar este usuário, o registro será removido do sistema e o agente perderá o acesso ao aplicativo. Esta ação não poderá ser desfeita.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                id="btn-cancelar-apagar"
                type="button"
                onClick={() => setUsuarioParaApagar(null)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                id="btn-confirmar-apagar"
                type="button"
                onClick={handleConfirmarExcluir}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Apagar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CORTAR E AJUSTAR TAMANHO DA FOTO DO USUÁRIO */}
      <ModalCortarFoto
        isOpen={!!imagemParaCortar}
        imagemOriginal={imagemParaCortar}
        titulo={`Ajustar Foto • ${editNomeDeGuerra || 'Usuário'}`}
        onConfirmar={(fotoCortada) => {
          setEditFoto(fotoCortada);
          setImagemParaCortar(null);
        }}
        onCancelar={() => setImagemParaCortar(null)}
      />
    </div>
  );
};

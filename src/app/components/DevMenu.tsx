import React from 'react';
import { Shield, UserCheck, Users, Eye, ArrowRight, Lock, Pencil, User, Camera, Car } from 'lucide-react';
import { UsuarioCadastrado } from '../types';

interface DevMenuProps {
  usuarioAtivo: UsuarioCadastrado | null;
  usuarios: UsuarioCadastrado[];
  viaturasCount?: number;
  onNavigate: (screen: 'dev-autorizar' | 'dev-consultar' | 'dev-viaturas' | 'menu') => void;
  onEditarPerfil?: () => void;
}

export const DevMenu: React.FC<DevMenuProps> = ({
  usuarioAtivo,
  usuarios,
  viaturasCount,
  onNavigate,
  onEditarPerfil,
}) => {
  const pendentesCount = usuarios.filter((u) => u.status === 'pendente').length;
  const autorizadosCount = usuarios.filter((u) => u.status === 'autorizado').length;
  const totalCount = usuarios.length;

  return (
    <div id="screen-dev-menu" className="space-y-5">
      {/* CARD DO DESENVOLVEDOR */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* FOTO DE PERFIL DO DESENVOLVEDOR */}
            <div
              onClick={onEditarPerfil}
              className="relative w-14 h-14 rounded-2xl bg-slate-800 border-2 border-slate-700 p-0.5 flex items-center justify-center shrink-0 shadow-inner overflow-hidden cursor-pointer group hover:border-blue-500 transition-all"
              title="Clique para editar seu perfil ou trocar a foto"
            >
              {usuarioAtivo?.foto ? (
                <img
                  src={usuarioAtivo.foto}
                  alt={`Foto de ${usuarioAtivo.nomeDeGuerra}`}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                  <User className="w-8 h-8 text-slate-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-xl">
                <Camera className="w-4 h-4 drop-shadow" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* NOME DE GUERRA */}
                <span className="text-base font-black uppercase tracking-tight text-white truncate">
                  {usuarioAtivo?.nomeDeGuerra || 'DESENVOLVEDOR'}
                </span>

                {/* IDENTIFICAÇÃO ÚNICA: DESENVOLVEDOR (SEM O BRASÃO DA ROMU) */}
                <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                  DESENVOLVEDOR
                </span>

                {onEditarPerfil && (
                  <button
                    id="btn-dev-editar-perfil"
                    type="button"
                    onClick={onEditarPerfil}
                    className="w-8 h-8 rounded-full border border-slate-300 hover:border-blue-600 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                    title="Editar perfil"
                    aria-label="Editar perfil"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1 truncate">
                Matrícula: <strong className="text-white">{usuarioAtivo?.matricula || '67549'}</strong> • Sangue: <strong className="text-rose-400">{usuarioAtivo?.tipoSanguineo || 'O+'}</strong>
              </p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SISTEMA ONLINE
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Controle Restrito
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Área de Acesso Restrito Exclusivo (Matrícula 67549)</span>
          </div>
          <span className="text-slate-300 font-medium">
            {totalCount} usuário(s) no sistema
          </span>
        </div>
      </div>

      {/* TÍTULO DA INTERFACE */}
      <div className="text-center pt-1">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
          Painel do Desenvolvedor
        </h2>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Selecione a ação desejada abaixo:
        </p>
      </div>

      {/* BOTÕES DE ACESSO DO DESENVOLVEDOR */}
      <div className="space-y-3.5">
        {/* BOTÃO 1: AUTORIZAR CADASTROS */}
        <button
          id="btn-dev-autorizar-cadastros"
          type="button"
          onClick={() => onNavigate('dev-autorizar')}
          className="w-full py-4 px-5 rounded-2xl bg-white border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50/40 active:bg-blue-100 text-slate-900 transition-all shadow-xs flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-11 h-11 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
                  AUTORIZAR CADASTROS
                </span>
                {pendentesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-black animate-bounce">
                    {pendentesCount} {pendentesCount === 1 ? 'novo' : 'novos'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Permitir ou negar acesso a novos cadastros de usuários
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </button>

        {/* BOTÃO 2: CONSULTAR CADASTROS */}
        <button
          id="btn-dev-consultar-cadastros"
          type="button"
          onClick={() => onNavigate('dev-consultar')}
          className="w-full py-4 px-5 rounded-2xl bg-white border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50/40 active:bg-blue-100 text-slate-900 transition-all shadow-xs flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
                  CONSULTAR CADASTROS
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                  {autorizadosCount} ativos
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Listagem geral de usuários e edição de perfis cadastrados
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </button>

        {/* BOTÃO 3: CADASTRAR VIATURA */}
        <button
          id="btn-dev-cadastrar-viatura"
          type="button"
          onClick={() => onNavigate('dev-viaturas')}
          className="w-full py-4 px-5 rounded-2xl bg-white border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50/40 active:bg-blue-100 text-slate-900 transition-all shadow-xs flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 uppercase tracking-wide group-hover:text-blue-700 transition-colors">
                  CADASTRAR VIATURA
                </span>
                {viaturasCount !== undefined && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
                    {viaturasCount} cadastradas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastro de veículos, prefixos, placas e controle de frota
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
        </button>
      </div>

      {/* ATALHO OPCIONAL PARA VISUALIZAR A INTERFACE OPERACIONAL DA GUARDA */}
      <div className="pt-3 border-t border-slate-200">
        <button
          id="btn-dev-ver-operacional"
          type="button"
          onClick={() => onNavigate('menu')}
          className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4 text-slate-600" />
          <span>VISUALIZAR APLICATIVO OPERACIONAL (MODO GUARDA)</span>
        </button>
      </div>
    </div>
  );
};

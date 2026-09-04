import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, ShieldAlert, Shield, User, Droplets, Calendar } from 'lucide-react';
import { UsuarioCadastrado } from '../types';
import { GRUPAMENTOS } from '../data/grupamentos';

interface DevAutorizarProps {
  usuarios: UsuarioCadastrado[];
  onAtualizarStatus: (usuarioId: string, novoStatus: 'autorizado' | 'negado') => void;
  onVoltar: () => void;
}

export const DevAutorizar: React.FC<DevAutorizarProps> = ({
  usuarios,
  onAtualizarStatus,
  onVoltar,
}) => {
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [abaFiltro, setAbaFiltro] = useState<'pendentes' | 'negados' | 'todos'>('pendentes');

  const pendentes = usuarios.filter((u) => u.status === 'pendente');
  const negados = usuarios.filter((u) => u.status === 'negado');

  const listaFiltrada = usuarios.filter((u) => {
    if (u.isDesenvolvedor) return false;
    if (abaFiltro === 'pendentes') return u.status === 'pendente';
    if (abaFiltro === 'negados') return u.status === 'negado';
    return true; // todos
  });

  const handleAcao = (usuario: UsuarioCadastrado, novoStatus: 'autorizado' | 'negado') => {
    onAtualizarStatus(usuario.id, novoStatus);

    if (novoStatus === 'autorizado') {
      setFeedback({
        tipo: 'sucesso',
        texto: `Acesso PERMITIDO com sucesso para ${usuario.nomeDeGuerra} (Matrícula: ${usuario.matricula})!`,
      });
    } else {
      setFeedback({
        tipo: 'erro',
        texto: `Acesso NEGADO para ${usuario.nomeDeGuerra} (Matrícula: ${usuario.matricula}).`,
      });
    }

    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  return (
    <div id="screen-dev-autorizar" className="space-y-4">
      {/* CABEÇALHO COM BOTÃO VOLTAR */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          id="btn-voltar-dev-menu"
          type="button"
          onClick={onVoltar}
          className="flex items-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>PAINEL DEV</span>
        </button>
        <span className="text-xs font-black uppercase text-blue-700 tracking-wider">
          AUTORIZAR CADASTROS
        </span>
      </div>

      <div className="text-center pt-1">
        <h2 className="text-xl font-black text-slate-900 uppercase">
          Autorização de Novos Cadastros
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Painel central do Administrador: aprove ou recuse o acesso de novos cadastros
        </p>
      </div>

      {/* BANNER DO SERVIDOR CENTRAL E LINK PÚBLICO */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-black text-blue-800 uppercase text-[11px]">
            Servidor Central Conectado (Link Público)
          </p>
          <p className="text-blue-700 text-[11px] mt-0.5">
            Qualquer agente que utilizar o link público para criar um cadastro ficará bloqueado com status <strong>PENDENTE</strong>. Apenas você, no controle deste painel, tem permissão para <strong>ACEITAR</strong> ou <strong>RECUSAR</strong> a entrada dele no sistema.
          </p>
        </div>
      </div>

      {/* TABS DE FILTRO */}
      <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setAbaFiltro('pendentes')}
          className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            abaFiltro === 'pendentes'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>PENDENTES</span>
          {pendentes.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
              {pendentes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAbaFiltro('negados')}
          className={`flex-1 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            abaFiltro === 'negados'
              ? 'bg-white text-rose-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>NEGADOS</span>
          {negados.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {negados.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setAbaFiltro('todos')}
          className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
            abaFiltro === 'todos'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TODOS
        </button>
      </div>

      {/* FEEDBACK MENSAGEM */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 transition-all ${
            feedback.tipo === 'sucesso'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* LISTA DE NOVOS CADASTROS */}
      <div className="space-y-3.5 pt-1">
        {listaFiltrada.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm uppercase">
                {abaFiltro === 'pendentes'
                  ? 'Nenhum cadastro pendente'
                  : 'Nenhum registro encontrado'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {abaFiltro === 'pendentes'
                  ? 'Todos os novos cadastros já foram avaliados e autorizados ou negados.'
                  : 'Não há registros nesta categoria no momento.'}
              </p>
            </div>
          </div>
        ) : (
          listaFiltrada.map((usuario) => {
            const grupamento =
              GRUPAMENTOS.find((g) => g.sigla === usuario.grupamento) || GRUPAMENTOS[0];

            return (
              <div
                key={usuario.id}
                id={`card-autorizar-${usuario.matricula}`}
                className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-4"
              >
                {/* DADOS DO USUÁRIO */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {/* Foto do Agente ou Ícone */}
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
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* NOME DE GUERRA */}
                        <span className="text-base font-black text-slate-900 uppercase">
                          {usuario.nomeDeGuerra}
                        </span>

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
                        {usuario.status === 'autorizado' && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> AUTORIZADO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-0.5">
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
                        <span>•</span>
                        <span className="text-[11px] text-slate-400">
                          {usuario.dataCadastro}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTÕES: PERMITIR ACESSO OU NEGAR ACESSO */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    id={`btn-permitir-${usuario.matricula}`}
                    type="button"
                    onClick={() => handleAcao(usuario, 'autorizado')}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PERMITIR ACESSO</span>
                  </button>

                  <button
                    id={`btn-negar-${usuario.matricula}`}
                    type="button"
                    onClick={() => handleAcao(usuario, 'negado')}
                    className="w-full py-3 px-4 rounded-xl bg-white border-2 border-rose-300 hover:bg-rose-50 hover:border-rose-400 active:bg-rose-100 text-rose-700 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>NEGAR ACESSO</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

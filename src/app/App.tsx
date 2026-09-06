import React, { useState, useRef, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, LogOut, CheckCircle2, AlertCircle, Shield, Droplets, Users, X, Pencil, Camera, Trash2, Upload, Crop, Navigation, Radio } from 'lucide-react';

import { Screen, FuncaoPosto, SiglaGrupamento, UsuarioCadastrado, MapaOcupacaoPostos, OcupantePosto, Viatura, MembroEquipe } from './types';
import { GRUPAMENTOS, MATRICULA_DESENVOLVEDOR } from './data/grupamentos';
import { getUsuariosArmazenados, salvarUsuarios, getOcupacaoPostos, salvarOcupacaoPostos, LIMITES_POSTOS, OCUPACAO_INICIAL_POSTOS, getViaturasArmazenadas, salvarViaturas } from './services/storage';
import {
  fetchUsuariosServidor,
  cadastrarUsuarioServidor,
  alterarStatusUsuarioServidor,
  atualizarUsuarioServidor,
  excluirUsuarioServidor,
  fetchPostosServidor,
  ocuparPostoServidor,
  desocuparPostoServidor,
  fetchViaturasServidor,
  salvarViaturaServidor,
  excluirViaturaServidor,
  fetchOrdensServidor,
  fetchChecklistsServidor,
} from './services/api';
import { gerarLivroAtaPdf } from './services/livroAtaPdf';
import { processarFotoPerfil, lerArquivoParaEdicao } from './services/imageUtils';
import { enablePush, registrarTokenNoServidor } from './services/notifications';
import { DevMenu } from './components/DevMenu';
import { DevAutorizar } from './components/DevAutorizar';
import { DevConsultar } from './components/DevConsultar';
import { DevViaturas } from './components/DevViaturas';
import { ModalCortarFoto } from './components/ModalCortarFoto';
import { MotoristaLocalizacao } from './components/MotoristaLocalizacao';
import { CiospPainel } from './components/CiospPainel';
import { EquipePainel } from './components/EquipePainel';
import { LivroAta } from './components/LivroAta';
import { PadAssinatura } from './components/PadAssinatura';
import { BannerNotificacoes } from './components/BannerNotificacoes';
import { ChatRadio } from './components/ChatRadio';



export default function App() {
  // Navigation
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');

  // Selected role under Posto de Serviço
  const [funcaoSelecionada, setFuncaoSelecionada] = useState<FuncaoPosto | null>(null);

  // Registra token push no servidor vinculado à matrícula
  const registrarPush = async (matricula: string) => {
    try {
      const resultado = await enablePush();
      if (resultado.status === 'registered') {
        await registrarTokenNoServidor(matricula, resultado.token);
      } else if (resultado.status !== 'unsupported' && resultado.status !== 'not-configured') {
        console.warn('[Push]', resultado.status, resultado.message);
      }
    } catch (err) {
      console.warn('[Push] Erro ao registrar push:', err);
    }
  };

  // Lista de todos os usuários cadastrados
  const [usuarios, setUsuarios] = useState<UsuarioCadastrado[]>(getUsuariosArmazenados);

  // Rádio de comunicação (chat geral, individual e do grupamento)
  const [chatAberto, setChatAberto] = useState(false);

  // Lista de viaturas cadastradas pelo desenvolvedor
  const [viaturas, setViaturas] = useState<Viatura[]>(getViaturasArmazenadas);

  // Active logged-in user profile
  const [usuarioAtivo, setUsuarioAtivo] = useState<UsuarioCadastrado | null>(null);

  // Mapa de ocupação dos postos de serviço
  const [ocupacaoPostos, setOcupacaoPostos] = useState<MapaOcupacaoPostos>(getOcupacaoPostos);

  // Sincronização centralizada com o servidor único (API Node.js)
  useEffect(() => {
    let montado = true;

    const sincronizarInicial = async () => {
      try {
        const [u, p, v] = await Promise.all([
          fetchUsuariosServidor(),
          fetchPostosServidor(),
          fetchViaturasServidor(),
        ]);
        if (montado) {
          if (u && u.length > 0) setUsuarios(u);
          if (p) setOcupacaoPostos(p);
          if (v && v.length > 0) setViaturas(v);
        }
      } catch (err) {
        console.warn('Erro ao sincronizar com servidor central:', err);
      }
    };

    sincronizarInicial();

    // Polling a cada 3.5 segundos para detectar novos cadastros do link público em tempo real
    const timer = setInterval(async () => {
      try {
        const u = await fetchUsuariosServidor();
        if (montado && u && u.length > 0) {
          setUsuarios(u);
          setUsuarioAtivo((prev) => {
            if (!prev) return null;
            const atualizado = u.find((item) => item.matricula === prev.matricula);
            return atualizado || prev;
          });
        }
        const p = await fetchPostosServidor();
        if (montado && p) setOcupacaoPostos(p);
        const v = await fetchViaturasServidor();
        if (montado && v && v.length > 0) setViaturas(v);
      } catch (err) {
        // silencioso para não poluir console
      }
    }, 3500);

    return () => {
      montado = false;
      clearInterval(timer);
    };
  }, []);
  
  // Alerta modal quando um posto está totalmente coberto
  const [alertaPostoCoberto, setAlertaPostoCoberto] = useState<{
    posto: string;
    limite: number;
    ocupantes: OcupantePosto[];
  } | null>(null);
  const [postoCobertoBanner, setPostoCobertoBanner] = useState<string | null>(null);

  // Login form state
  const [loginIdentificador, setLoginIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Cadastro form state - exact fields requested:
  // NOME COMPLETO, NOME DE GUERRA, GRUPAMENTO, TIPO SANGUÍNEO, MATRÍCULA
  const [cadNomeCompleto, setCadNomeCompleto] = useState('');
  const [cadNomeDeGuerra, setCadNomeDeGuerra] = useState('');
  const [cadMatricula, setCadMatricula] = useState('');
  const [cadTipoSanguineo, setCadTipoSanguineo] = useState('');
  const [cadGrupamento, setCadGrupamento] = useState<SiglaGrupamento>('ROMU');
  const [cadFoto, setCadFoto] = useState<string | undefined>(undefined);
  const [cadCarregandoFoto, setCadCarregandoFoto] = useState(false);
  const [imagemParaCortarCadastro, setImagemParaCortarCadastro] = useState<string | null>(null);
  const cadFileInputRef = useRef<HTMLInputElement | null>(null);
  const [cadSenha, setCadSenha] = useState('');
  const [cadSuccessMsg, setCadSuccessMsg] = useState<string | null>(null);
  const [cadAssinatura, setCadAssinatura] = useState<string | null>(null);
  const [viaturaAtivaPrefixo, setViaturaAtivaPrefixo] = useState<string | null>(null);

  // Encerramento de plantão (fechamento do livro) e limite de 24h no posto
  const [modalEncerrarPlantao, setModalEncerrarPlantao] = useState(false);
  const [gerandoLivroPlantao, setGerandoLivroPlantao] = useState(false);
  const [avisoPlantao24h, setAvisoPlantao24h] = useState(false);

  // Estado para Edição do Próprio Perfil
  const [modalEditarPerfilAberto, setModalEditarPerfilAberto] = useState(false);
  const [editPerfilNomeDeGuerra, setEditPerfilNomeDeGuerra] = useState('');
  const [editPerfilNomeCompleto, setEditPerfilNomeCompleto] = useState('');
  const [editPerfilTipoSanguineo, setEditPerfilTipoSanguineo] = useState('');
  const [editPerfilGrupamento, setEditPerfilGrupamento] = useState<SiglaGrupamento>('ROMU');
  const [editPerfilFoto, setEditPerfilFoto] = useState<string | undefined>(undefined);
  const [imagemParaCortarPerfil, setImagemParaCortarPerfil] = useState<string | null>(null);
  const [editPerfilSenha, setEditPerfilSenha] = useState('');
  const [editPerfilShowSenha, setEditPerfilShowSenha] = useState(false);
  const [editPerfilError, setEditPerfilError] = useState<string | null>(null);
  const [editPerfilCarregandoFoto, setEditPerfilCarregandoFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setCadSuccessMsg(null);

    const idDigitado = loginIdentificador.trim();

    if (!idDigitado) {
      setAuthError('Por favor, informe a sua MATRÍCULA.');
      return;
    }
    if (!password) {
      setAuthError('Por favor, informe a sua SENHA.');
      return;
    }

    // Busca versão mais recente no servidor antes de validar o login
    let listaAtual = usuarios;
    try {
      const doServidor = await fetchUsuariosServidor();
      if (doServidor && doServidor.length > 0) {
        listaAtual = doServidor;
        setUsuarios(doServidor);
      }
    } catch (err) {
      console.warn('Usando lista local para login');
    }

    // Busca o usuário pela matrícula ou pelo nome de guerra
    const usuarioEncontrado = listaAtual.find(
      (u) =>
        u.matricula === idDigitado ||
        u.nomeDeGuerra.toUpperCase() === idDigitado.toUpperCase()
    );

    if (!usuarioEncontrado) {
      setAuthError(`Usuário com a matrícula "${idDigitado}" não encontrado. Clique em "NOVO CADASTRO" para registrar seus dados.`);
      return;
    }

    // Validação da senha
    if (usuarioEncontrado.senha && password !== usuarioEncontrado.senha) {
      setAuthError('Senha incorreta. Verifique os dados digitados e tente novamente.');
      return;
    }

    // Se for o DESENVOLVEDOR (Matrícula 67549)
    if (usuarioEncontrado.matricula === MATRICULA_DESENVOLVEDOR || usuarioEncontrado.isDesenvolvedor) {
      setUsuarioAtivo(usuarioEncontrado);
      setCurrentScreen('dev-menu');
      registrarPush(usuarioEncontrado.matricula);
      return;
    }

    // Se for outro agente da Guarda Municipal, verifica autorização prévia no servidor
    if (usuarioEncontrado.status === 'pendente') {
      setAuthError('Acesso Pendente: Seu cadastro está gravado no Servidor Central e aguarda autorização do Administrador. Por favor, aguarde a liberação.');
      return;
    }

    if (usuarioEncontrado.status === 'negado') {
      setAuthError('Acesso Negado: O seu cadastro não foi autorizado pelo Administrador para acessar o aplicativo.');
      return;
    }

    // Acesso liberado para usuário regular autorizado
    setUsuarioAtivo(usuarioEncontrado);
    setCurrentScreen('menu');
    registrarPush(usuarioEncontrado.matricula);
  };

  const matriculaDuplicada =
    cadMatricula.trim() !== '' &&
    usuarios.some((u) => u.matricula.trim() === cadMatricula.trim());

  const cadastroValido =
    cadNomeCompleto.trim() !== '' &&
    cadNomeDeGuerra.trim() !== '' &&
    cadMatricula.trim() !== '' &&
    !matriculaDuplicada &&
    cadTipoSanguineo.trim() !== '' &&
    Boolean(cadGrupamento) &&
    cadSenha.trim() !== '';

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!cadNomeCompleto.trim()) {
      setAuthError('Por favor, preencha o NOME COMPLETO.');
      return;
    }
    if (!cadNomeDeGuerra.trim()) {
      setAuthError('Por favor, preencha o NOME DE GUERRA.');
      return;
    }
    if (!cadMatricula.trim()) {
      setAuthError('Por favor, preencha a MATRÍCULA.');
      return;
    }
    if (matriculaDuplicada) {
      setAuthError('Esta MATRÍCULA já está cadastrada por outro agente. Cada matrícula é exclusiva.');
      return;
    }

    if (!cadTipoSanguineo.trim()) {
      setAuthError('Por favor, preencha o TIPO SANGUÍNEO (ex: O+, A+, B+, AB-).');
      return;
    }
    if (!cadGrupamento) {
      setAuthError('Por favor, selecione seu GRUPAMENTO.');
      return;
    }
    if (!cadSenha.trim()) {
      setAuthError('Por favor, crie uma SENHA de acesso.');
      return;
    }

    // Última etapa do cadastro: coleta da assinatura do agente
    setCurrentScreen('assinatura');
  };

  const finalizarCadastroComAssinatura = async (assinatura: string) => {
    const mat = cadMatricula.trim();
    const isDev = mat === MATRICULA_DESENVOLVEDOR;

    const novoUsuario: UsuarioCadastrado = {
      id: `user-${Date.now()}`,
      nomeCompleto: cadNomeCompleto.trim(),
      nomeDeGuerra: cadNomeDeGuerra.trim().toUpperCase(),
      matricula: mat,
      tipoSanguineo: cadTipoSanguineo.trim().toUpperCase(),
      grupamento: cadGrupamento,
      foto: cadFoto,
      assinatura,
      senha: cadSenha,
      status: isDev ? 'autorizado' : 'pendente',
      isDesenvolvedor: isDev,
      dataCadastro:
        new Date().toLocaleDateString('pt-BR') +
        ' ' +
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    // Atualiza estado local imediatamente
    const novosUsuarios = usuarios.filter((u) => u.matricula !== mat).concat(novoUsuario);
    setUsuarios(novosUsuarios);
    salvarUsuarios(novosUsuarios);

    // Envia ao servidor centralizado (assim aparece imediatamente para o desenvolvedor)
    await cadastrarUsuarioServidor(novoUsuario);
    registrarPush(novoUsuario.matricula);

    if (isDev) {
      setUsuarioAtivo(novoUsuario);
      setCadSuccessMsg('Cadastro do Desenvolvedor (67549) atualizado no Servidor! Digite sua senha para acessar o painel exclusivo.');
    } else {
      setCadSuccessMsg(`Cadastro de ${novoUsuario.nomeDeGuerra} enviado ao Servidor Central! Aguarde a autorização exclusiva do Administrador para acessar.`);
    }

    setLoginIdentificador(mat);
    setPassword('');
    setCadAssinatura(null);
    setCurrentScreen('login');
  };

  // Funções exclusivas do Desenvolvedor para gerenciar cadastros no servidor
  const handleAtualizarStatusUsuario = async (usuarioId: string, novoStatus: 'autorizado' | 'negado') => {
    const atualizados = usuarios.map((u) => (u.id === usuarioId ? { ...u, status: novoStatus } : u));
    setUsuarios(atualizados);
    salvarUsuarios(atualizados);
    await alterarStatusUsuarioServidor(usuarioId, novoStatus);
  };

  const handleSalvarEdicaoUsuario = async (usuarioAtualizado: UsuarioCadastrado) => {
    const atualizados = usuarios.map((u) => (u.id === usuarioAtualizado.id ? usuarioAtualizado : u));
    setUsuarios(atualizados);
    salvarUsuarios(atualizados);
    await atualizarUsuarioServidor(usuarioAtualizado.id, usuarioAtualizado);
  };

  const handleExcluirUsuario = async (usuarioId: string) => {
    const atualizados = usuarios.filter((u) => u.id !== usuarioId);
    setUsuarios(atualizados);
    salvarUsuarios(atualizados);
    await excluirUsuarioServidor(usuarioId);
  };

  const handleSelectFuncao = (funcao: FuncaoPosto) => {
    const limite = LIMITES_POSTOS[funcao];
    const ocupantesAtuais = ocupacaoPostos[funcao] || [];

    // Se o usuário ativo já está registrado nesse posto, permite acesso
    const jaEstaNoPosto = usuarioAtivo && ocupantesAtuais.some((o) => o.matricula === usuarioAtivo.matricula);

    // A Inspetoria entra em qualquer posto, mesmo cheio, para consultar quem está ali
    const ehInspetoria = usuarioAtivo?.grupamento === 'INSPETORIA';

    if (limite !== undefined && ocupantesAtuais.length >= limite && !jaEstaNoPosto && !ehInspetoria) {
      setAlertaPostoCoberto({
        posto: funcao,
        limite,
        ocupantes: ocupantesAtuais,
      });
      setPostoCobertoBanner(`POSTO TOTALMENTE COBERTO: O posto "${funcao}" já atingiu o limite de ${limite} ${limite === 1 ? 'usuário' : 'usuários'}.`);
      return;
    }

    // Se tem vaga disponível ou o usuário já é um dos ocupantes:
    const novoMapa: MapaOcupacaoPostos = { ...ocupacaoPostos };

    if (usuarioAtivo) {
      // Remove o usuário de outros postos para evitar duplicidade de alocação
      Object.keys(novoMapa).forEach((key) => {
        novoMapa[key] = (novoMapa[key] || []).filter((o) => o.matricula !== usuarioAtivo.matricula);
      });

      const novoOcupante: OcupantePosto = {
        matricula: usuarioAtivo.matricula,
        nomeDeGuerra: usuarioAtivo.nomeDeGuerra,
        grupamento: usuarioAtivo.isDesenvolvedor || usuarioAtivo.matricula === MATRICULA_DESENVOLVEDOR ? 'Desenvolvedor' : usuarioAtivo.grupamento,
        dataHora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        inicioEm: Date.now(),
      };

      // Se ainda não estava na lista deste posto, adiciona
      if (!jaEstaNoPosto) {
        novoMapa[funcao] = [
          ...(novoMapa[funcao] || []),
          novoOcupante,
        ];
      }

      // Sincroniza ocupação no servidor
      ocuparPostoServidor(funcao, novoOcupante);
    }

    setOcupacaoPostos(novoMapa);
    salvarOcupacaoPostos(novoMapa);
    setFuncaoSelecionada(funcao);

    // Se o usuário escolher o posto de serviço "MOTORISTA", abre a interface com mapa e rastreamento em tempo real
    if (funcao === 'MOTORISTA') {
      setCurrentScreen('motorista-mapa');
    } else if (funcao === 'CIOSP') {
      setCurrentScreen('ciosp');
    } else if (funcao === 'OPERACIONAL' || funcao === 'COORDENADOR DE EQUIPE') {
      setCurrentScreen('equipe-ordens');
    } else {
      setCurrentScreen('opcao-funcao');
    }
  };

  // Agentes do mesmo grupamento que estão nos postos embarcados (equipe da viatura)
  const POSTOS_EMBARCADOS: FuncaoPosto[] = ['MOTORISTA', 'COORDENADOR DE EQUIPE', 'OPERACIONAL'];
  const equipeDaViatura: MembroEquipe[] = POSTOS_EMBARCADOS.flatMap((posto) =>
    (ocupacaoPostos[posto] || [])
      .filter((oc) => !usuarioAtivo?.grupamento || !oc.grupamento || oc.grupamento === usuarioAtivo.grupamento || oc.grupamento === 'Desenvolvedor')
      // Reconhecimento da VTR: só entra na equipe quem está na MESMA viatura
      .filter((oc) => !viaturaAtivaPrefixo || oc.viaturaPrefixo === viaturaAtivaPrefixo)
      .map((oc) => {
        const cadastro = usuarios.find((u) => u.matricula === oc.matricula);
        const membro: MembroEquipe = {
          nomeDeGuerra: oc.nomeDeGuerra,
          matricula: oc.matricula,
          posto,
          grupamento: oc.grupamento,
        };
        if (cadastro?.assinatura) membro.assinatura = cadastro.assinatura;
        if (oc.viaturaPrefixo) membro.viaturaPrefixo = oc.viaturaPrefixo;
        return membro;
      })
  );

  /** Registra no posto de serviço qual viatura o agente assumiu (reconhecimento de VTR). */
  const handleDefinirViatura = (prefixo: string | null) => {
    setViaturaAtivaPrefixo(prefixo);
    if (!usuarioAtivo || !funcaoSelecionada) return;
    const novoMapa: MapaOcupacaoPostos = { ...ocupacaoPostos };
    let ocupanteAtualizado: OcupantePosto | null = null;
    novoMapa[funcaoSelecionada] = (novoMapa[funcaoSelecionada] || []).map((o) => {
      if (o.matricula !== usuarioAtivo.matricula) return o;
      const atualizado: OcupantePosto = { ...o };
      if (prefixo) atualizado.viaturaPrefixo = prefixo;
      else delete atualizado.viaturaPrefixo;
      ocupanteAtualizado = atualizado;
      return atualizado;
    });
    setOcupacaoPostos(novoMapa);
    salvarOcupacaoPostos(novoMapa);
    if (ocupanteAtualizado) ocuparPostoServidor(funcaoSelecionada, ocupanteAtualizado);
  };

  /** Momento em que o agente assumiu o posto atual (limite de plantão: 24 horas). */
  const inicioPlantao = React.useMemo(() => {
    if (!usuarioAtivo || !funcaoSelecionada) return null;
    const oc = (ocupacaoPostos[funcaoSelecionada] || []).find(
      (o) => o.matricula === usuarioAtivo.matricula
    );
    return oc?.inicioEm ?? null;
  }, [ocupacaoPostos, funcaoSelecionada, usuarioAtivo]);

  const liberarPostoAtual = () => {
    if (!usuarioAtivo) return;
    const funcao = funcaoSelecionada || 'MOTORISTA';
    const novoMapa: MapaOcupacaoPostos = { ...ocupacaoPostos };
    novoMapa[funcao] = (novoMapa[funcao] || []).filter(
      (o) => o.matricula !== usuarioAtivo.matricula
    );
    setOcupacaoPostos(novoMapa);
    salvarOcupacaoPostos(novoMapa);
    desocuparPostoServidor(funcao, usuarioAtivo.matricula);
    setFuncaoSelecionada(null);
    setViaturaAtivaPrefixo(null);
    setCurrentScreen('posto-servico');
  };

  const handleDesocuparPosto = () => {
    if (!usuarioAtivo) return;
    setModalEncerrarPlantao(true);
  };

  // Limite de 24 horas no posto de serviço: passou disso, o posto é liberado automaticamente.
  useEffect(() => {
    if (!inicioPlantao || !funcaoSelecionada) return;
    const LIMITE = 24 * 60 * 60 * 1000;
    const verificar = () => {
      if (Date.now() - inicioPlantao >= LIMITE) {
        setAvisoPlantao24h(true);
        setModalEncerrarPlantao(false);
        liberarPostoAtual();
      }
    };
    verificar();
    const t = window.setInterval(verificar, 60000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicioPlantao, funcaoSelecionada]);

  /** Fecha o livro do plantão: gera o PDF do dia com a assinatura do coordenador no final. */
  const fecharLivroDoPlantao = async () => {
    if (!usuarioAtivo || gerandoLivroPlantao) return;
    setGerandoLivroPlantao(true);
    try {
      const sigla =
        funcaoSelecionada === 'CIOSP' ? 'CIOSP' : String(usuarioAtivo.grupamento || 'CENTRAL');
      const hoje = new Date().toLocaleDateString('pt-BR');
      const [todasOrdens, todosChecklists] = await Promise.all([
        fetchOrdensServidor(),
        fetchChecklistsServidor(),
      ]);
      const daData = (valor?: string) => (valor || '').includes(hoje);
      const ordensDoDia = todasOrdens.filter(
        (o) =>
          daData(o.dataHora) &&
          (sigla === 'CIOSP' ? o.origemCiosp === true : o.grupamento === sigla)
      );
      const checklistsDoDia = todosChecklists.filter(
        (c) => daData(c.dataHora) && c.motoristaGrupamento === sigla
      );
      const brasao = GRUPAMENTOS.find((g) => g.sigla === sigla)?.imagem;
      await gerarLivroAtaPdf({
        sigla,
        data: hoje,
        ordens: ordensDoDia,
        checklists: checklistsDoDia,
        usuario: usuarioAtivo,
        brasaoUrl: brasao,
      });
    } finally {
      setGerandoLivroPlantao(false);
      setModalEncerrarPlantao(false);
      liberarPostoAtual();
    }
  };

  const handleLiberarPostoPorNome = (postoNome: string) => {
    const novoMapa: MapaOcupacaoPostos = { ...ocupacaoPostos, [postoNome]: [] };
    setOcupacaoPostos(novoMapa);
    salvarOcupacaoPostos(novoMapa);
    setAlertaPostoCoberto(null);
    setPostoCobertoBanner(null);
  };

  const handleResetarOcupacoes = () => {
    setOcupacaoPostos(OCUPACAO_INICIAL_POSTOS);
    salvarOcupacaoPostos(OCUPACAO_INICIAL_POSTOS);
    setAlertaPostoCoberto(null);
    setPostoCobertoBanner(null);
  };

  const handleAbrirEdicaoPerfil = () => {
    if (!usuarioAtivo) return;
    setEditPerfilNomeDeGuerra(usuarioAtivo.nomeDeGuerra);
    setEditPerfilNomeCompleto(usuarioAtivo.nomeCompleto);
    setEditPerfilTipoSanguineo(usuarioAtivo.tipoSanguineo);
    setEditPerfilGrupamento(usuarioAtivo.grupamento);
    setEditPerfilFoto(usuarioAtivo.foto);
    setEditPerfilSenha(usuarioAtivo.senha || '');
    setEditPerfilShowSenha(false);
    setEditPerfilError(null);
    setEditPerfilCarregandoFoto(false);
    setModalEditarPerfilAberto(true);
  };

  const handleArquivoFotoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      try {
        setEditPerfilCarregandoFoto(true);
        setEditPerfilError(null);
        const rawUrl = await lerArquivoParaEdicao(file!);
        setImagemParaCortarPerfil(rawUrl);
      } catch (err: any) {
        setEditPerfilError(err?.message || 'Falha ao processar a foto.');
      } finally {
        setEditPerfilCarregandoFoto(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleRemoverFotoPerfil = () => {
    setEditPerfilFoto(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSalvarMeuPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioAtivo) return;

    const ng = editPerfilNomeDeGuerra.trim().toUpperCase();
    if (!ng) {
      setEditPerfilError('O Nome de Guerra é obrigatório.');
      return;
    }

    const usuarioAtualizado: UsuarioCadastrado = {
      ...usuarioAtivo,
      nomeDeGuerra: ng,
      nomeCompleto: editPerfilNomeCompleto.trim() || usuarioAtivo.nomeCompleto,
      tipoSanguineo: editPerfilTipoSanguineo.trim().toUpperCase() || usuarioAtivo.tipoSanguineo,
      grupamento: editPerfilGrupamento,
      foto: editPerfilFoto,
      senha: editPerfilSenha.trim() || usuarioAtivo.senha,
    };

    // Atualiza a lista geral de usuários
    const atualizados = usuarios.map((u) =>
      u.id === usuarioAtualizado.id || u.matricula === usuarioAtualizado.matricula
        ? usuarioAtualizado
        : u
    );
    setUsuarios(atualizados);
    salvarUsuarios(atualizados);
    await atualizarUsuarioServidor(usuarioAtualizado.id, usuarioAtualizado);

    // Atualiza o usuário ativo em sessão
    setUsuarioAtivo(usuarioAtualizado);

    // Atualiza nome/grupamento em qualquer posto onde ele esteja alocado
    const mapaAtual: MapaOcupacaoPostos = { ...ocupacaoPostos };
    let mudouMapa = false;
    Object.keys(mapaAtual).forEach((posto) => {
      mapaAtual[posto] = (mapaAtual[posto] || []).map((oc) => {
        if (oc.matricula === usuarioAtualizado.matricula) {
          mudouMapa = true;
          return {
            ...oc,
            nomeDeGuerra: usuarioAtualizado.nomeDeGuerra,
            grupamento: usuarioAtualizado.isDesenvolvedor || usuarioAtualizado.matricula === MATRICULA_DESENVOLVEDOR ? 'Desenvolvedor' : usuarioAtualizado.grupamento,
          };
        }
        return oc;
      });
    });

    if (mudouMapa) {
      setOcupacaoPostos(mapaAtual);
      salvarOcupacaoPostos(mapaAtual);
    }

    setModalEditarPerfilAberto(false);
  };

  const handleSalvarViatura = async (viatura: Viatura) => {
    const index = viaturas.findIndex((v) => v.id === viatura.id);
    let atualizadas: Viatura[];
    if (index >= 0) {
      atualizadas = [...viaturas];
      atualizadas[index] = viatura;
    } else {
      atualizadas = [viatura, ...viaturas];
    }
    setViaturas(atualizadas);
    salvarViaturas(atualizadas);
    await salvarViaturaServidor(viatura);
  };

  const handleExcluirViatura = async (viaturaId: string) => {
    const atualizadas = viaturas.filter((v) => v.id !== viaturaId);
    setViaturas(atualizadas);
    salvarViaturas(atualizadas);
    await excluirViaturaServidor(viaturaId);
  };

  const handleLogout = () => {
    setCurrentScreen('login');
    setUsuarioAtivo(null);
    setFuncaoSelecionada(null);
    setLoginIdentificador('');
    setPassword('');
    setAuthError(null);
    setCadSuccessMsg(null);
  };

  const grupamentoAtual = GRUPAMENTOS.find((g) => g.sigla === usuarioAtivo?.grupamento) || GRUPAMENTOS[1];
  const isTelaDev = currentScreen === 'dev-menu' || currentScreen === 'dev-autorizar' || currentScreen === 'dev-consultar' || currentScreen === 'dev-viaturas';

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 font-sans">

      {/* Main Content Area */}
      <main id="main-area" className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className={`w-full ${currentScreen === 'motorista-mapa' || currentScreen === 'ciosp' || currentScreen === 'equipe-ordens' ? 'max-w-4xl' : 'max-w-lg'} transition-all duration-200`}>

          {usuarioAtivo && currentScreen !== 'login' && (
            <BannerNotificacoes matricula={usuarioAtivo.matricula} />
          )}

          {usuarioAtivo && currentScreen !== 'login' && currentScreen !== 'cadastrar' && currentScreen !== 'assinatura' && (
            <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={() => setChatAberto(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm"
                title="Rádio de comunicação"
              >
                <Radio className="w-4 h-4 text-blue-400" />
                <span>Rádio</span>
              </button>
            </div>
          )}

          {usuarioAtivo && chatAberto && (
            <ChatRadio
              usuarioAtivo={usuarioAtivo}
              usuarios={usuarios}
              onFechar={() => setChatAberto(false)}
            />
          )}


          {/* ========================================= */}
          {/* TELA 1: LOGIN                             */}
          {/* ========================================= */}
          {currentScreen === 'login' && (
            <div id="card-login" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center p-2 mb-3 shadow-xs">
                  <img
                    src="/brasao-arraial-do-cabo.png"
                    alt="Brasão de Arraial do Cabo"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h2 className="text-xl font-bold text-slate-900 uppercase">
                  Acesso ao Sistema
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Guarda Municipal de Arraial do Cabo
                </p>
              </div>

              {cadSuccessMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{cadSuccessMsg}</span>
                </div>
              )}

              {authError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                {/* LOGIN */}
                <div className="space-y-1">
                  <label
                    htmlFor="input-login"
                    className="block text-xs font-black uppercase tracking-wider text-slate-800"
                  >
                    LOGIN
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="input-login"
                      type="text"
                      value={loginIdentificador}
                      onChange={(e) => setLoginIdentificador(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-3.5 py-3 bg-white border border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
                      required
                    />
                  </div>
                </div>

                {/* SENHA */}
                <div className="space-y-1">
                  <label
                    htmlFor="input-senha"
                    className="block text-xs font-black uppercase tracking-wider text-slate-800"
                  >
                    SENHA
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input-senha"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=""
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-300 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                      aria-label="Alternar exibição de senha"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* BOTÕES ENTRAR E CADASTRAR */}
                <div className="pt-2 space-y-3">
                  <button
                    id="btn-entrar"
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-base uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>ENTRAR</span>
                  </button>

                  <button
                    id="btn-cadastrar"
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setCadSuccessMsg(null);
                      setCurrentScreen('cadastrar');
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-white border-2 border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-base uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-5 h-5 text-slate-600" />
                    <span>NOVO CADASTRO</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TELA DE CADASTRO                                                          */}
          {/* CAMPOS REQUISITADOS:                                                      */}
          {/* - NOME COMPLETO: preenchimento manual                                     */}
          {/* - NOME DE GUERRA: preenchimento manual                                    */}
          {/* - GRUPAMENTO: seleção com imagens de brasões (GTRAN, ROMU, GRES, GOC, GID)*/}
          {/* - TIPO SANGUÍNEO: preenchimento manual                                    */}
          {/* - MATRÍCULA: preenchimento manual                                         */}
          {/* ========================================================================= */}
          {currentScreen === 'cadastrar' && (
            <div id="card-cadastro" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-7">
              <div className="text-center mb-5">
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest block mb-1">
                  Guarda Municipal de Arraial do Cabo
                </span>
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  Cadastro de Usuário
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Preencha as informações funcionais obrigatórias
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleCadastro} className="space-y-4" noValidate>
                {/* FOTO DE PERFIL (OPCIONAL NO CADASTRO) */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3.5">
                  <div
                    onClick={() => cadFileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        try {
                          setCadCarregandoFoto(true);
                          const rawUrl = await lerArquivoParaEdicao(e.dataTransfer.files[0]!);
                          setImagemParaCortarCadastro(rawUrl);
                        } catch (err: any) {
                          setAuthError(err?.message || 'Erro ao carregar foto.');
                        } finally {
                          setCadCarregandoFoto(false);
                        }
                      }
                    }}
                    className="relative w-16 h-16 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-500 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group transition-all shadow-xs"
                    title="Clique ou arraste sua foto de perfil"
                  >
                    {cadFoto ? (
                      <img
                        src={cadFoto}
                        alt="Foto cadastrada"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-4 h-4 drop-shadow" />
                    </div>
                    {cadCarregandoFoto && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-xs font-black uppercase text-slate-900 block">
                      Foto de Perfil (Opcional)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Adicione uma foto de rosto para sua identidade funcional
                    </p>
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <input
                        ref={cadFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              setCadCarregandoFoto(true);
                              const rawUrl = await lerArquivoParaEdicao(file!);
                              setImagemParaCortarCadastro(rawUrl);
                            } catch (err: any) {
                              setAuthError(err?.message || 'Erro ao carregar foto.');
                            } finally {
                              setCadCarregandoFoto(false);
                              if (cadFileInputRef.current) {
                                cadFileInputRef.current.value = '';
                              }
                            }
                          }
                        }}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => cadFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{cadFoto ? 'Trocar' : 'Inserir Foto'}</span>
                      </button>
                      {cadFoto && (
                        <button
                          type="button"
                          onClick={() => setImagemParaCortarCadastro(cadFoto)}
                          className="px-2 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                          title="Ajustar o corte e tamanho da foto"
                        >
                          <Crop className="w-3 h-3" />
                          <span>Ajustar / Cortar</span>
                        </button>
                      )}
                      {cadFoto && (
                        <button
                          type="button"
                          onClick={() => setCadFoto(undefined)}
                          className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remover</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1. NOME COMPLETO (manual) */}
                <div>
                  <label
                    htmlFor="input-cad-nome-completo"
                    className="block text-xs font-black uppercase text-slate-800 mb-1 tracking-wider"
                  >
                    NOME COMPLETO:
                  </label>
                  <input
                    id="input-cad-nome-completo"
                    type="text"
                    value={cadNomeCompleto}
                    onChange={(e) => setCadNomeCompleto(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    required
                  />
                </div>

                {/* 2. NOME DE GUERRA (manual) */}
                <div>
                  <label
                    htmlFor="input-cad-nome-guerra"
                    className="block text-xs font-black uppercase text-slate-800 mb-1 tracking-wider"
                  >
                    NOME DE GUERRA:
                  </label>
                  <input
                    id="input-cad-nome-guerra"
                    type="text"
                    value={cadNomeDeGuerra}
                    onChange={(e) => setCadNomeDeGuerra(e.target.value)}
                    placeholder="Ex: GM SILVA, GM SANTOS, GM COSTA"
                    className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    required
                  />
                </div>

                {/* 3. MATRÍCULA (manual) */}
                <div>
                  <label
                    htmlFor="input-cad-matricula"
                    className="block text-xs font-black uppercase text-slate-800 mb-1 tracking-wider"
                  >
                    MATRÍCULA:
                    {matriculaDuplicada && <span className="text-rose-600 ml-1">*</span>}
                  </label>
                  <input
                    id="input-cad-matricula"
                    type="text"
                    value={cadMatricula}
                    onChange={(e) => setCadMatricula(e.target.value)}
                    placeholder=""
                    className={`w-full px-3.5 py-3 border rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                      matriculaDuplicada
                        ? 'border-rose-500 focus:ring-rose-600 focus:border-rose-600'
                        : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                    }`}
                    required
                  />
                  {matriculaDuplicada && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">
                      * Esta matrícula já está cadastrada por outro agente. Cada matrícula é exclusiva.
                    </p>
                  )}
                </div>


                {/* 4. TIPO SANGUÍNEO (manual) */}
                <div>
                  <label
                    htmlFor="input-cad-tipo-sanguineo"
                    className="block text-xs font-black uppercase text-slate-800 mb-1 tracking-wider flex items-center justify-between"
                  >
                    <span>TIPO SANGUÍNEO:</span>
                    <span className="text-[11px] font-normal text-slate-500 normal-case">
                      (Preenchimento manual)
                    </span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <input
                      id="input-cad-tipo-sanguineo"
                      type="text"
                      value={cadTipoSanguineo}
                      onChange={(e) => setCadTipoSanguineo(e.target.value)}
                      placeholder="Ex: O+, A+, B+, AB-, etc."
                      className="w-full pl-10 pr-3.5 py-3 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      required
                    />
                  </div>
                </div>

                {/* 5. GRUPAMENTO: SELEÇÃO COM BRASÃO */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-800 mb-2 tracking-wider">
                    GRUPAMENTO (SELECIONE O SEU):
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {GRUPAMENTOS.map((grup) => {
                      const isSelected = cadGrupamento === grup.sigla;
                      return (
                        <button
                          key={grup.sigla}
                          id={`btn-grupamento-${grup.sigla.toLowerCase()}`}
                          type="button"
                          onClick={() => setCadGrupamento(grup.sigla)}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {/* Imagem do Brasão do Grupamento */}
                          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                            <img
                              src={grup.imagem}
                              alt={`Brasão ${grup.sigla}`}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-sm text-slate-900 uppercase">
                                {grup.sigla}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {grup.nome}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* SENHA DE ACESSO */}
                <div className="pt-1">
                  <label
                    htmlFor="input-cad-senha"
                    className="block text-xs font-black uppercase text-slate-800 mb-1 tracking-wider"
                  >
                    CRIAR SENHA DE ACESSO:
                  </label>
                  <input
                    id="input-cad-senha"
                    type="password"
                    value={cadSenha}
                    onChange={(e) => setCadSenha(e.target.value)}
                    placeholder="Digite uma senha"
                    className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    required
                  />
                </div>

                {/* BOTÕES DE CONFIRMAR CADASTRO E VOLTAR */}
                <div className="pt-3 space-y-2.5">
                  <button
                    id="btn-confirmar-cadastro"
                    type="submit"
                    disabled={!cadastroValido}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-base uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"

                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>FINALIZAR CADASTRO</span>
                  </button>

                  <button
                    id="btn-voltar-ao-login"
                    type="button"
                    onClick={() => {
                      setAuthError(null);
                      setCurrentScreen('login');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-bold text-sm uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>VOLTAR AO LOGIN</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================= */}
          {/* TELA: ASSINATURA DIGITAL DO CADASTRO      */}
          {/* ========================================= */}
          {currentScreen === 'assinatura' && (
            <div id="card-assinatura" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-7 space-y-4">
              <div className="text-center">
                <span className="text-xs font-black text-blue-600 uppercase tracking-widest block mb-1">
                  Etapa final do cadastro
                </span>
                <h2 className="text-xl font-black text-slate-900 uppercase">Assinatura do Agente</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Esta assinatura será usada nos registros do Livro Ata sempre que você finalizar
                  uma ocorrência.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                <strong className="uppercase text-[10px] block text-slate-500">Agente</strong>
                {cadNomeDeGuerra.toUpperCase() || '---'} • Matrícula {cadMatricula || '---'}
              </div>

              <PadAssinatura onChange={(dataUrl) => setCadAssinatura(dataUrl)} />

              <button
                type="button"
                disabled={!cadAssinatura}
                onClick={() => {
                  if (cadAssinatura) finalizarCadastroComAssinatura(cadAssinatura);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>CONFIRMAR ASSINATURA E CADASTRAR</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentScreen('cadastrar')}
                className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-sm uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>VOLTAR AO FORMULÁRIO</span>
              </button>
            </div>
          )}

          {/* ========================================= */}
          {/* TELAS EXCLUSIVAS DO DESENVOLVEDOR (67549) */}
          {/* ========================================= */}
          {currentScreen === 'dev-menu' && (
            <DevMenu
              usuarioAtivo={usuarioAtivo}
              usuarios={usuarios}
              viaturasCount={viaturas.length}
              onNavigate={(tela) => setCurrentScreen(tela)}
              onEditarPerfil={handleAbrirEdicaoPerfil}
            />
          )}

          {currentScreen === 'dev-autorizar' && (
            <DevAutorizar
              usuarios={usuarios}
              onAtualizarStatus={handleAtualizarStatusUsuario}
              onVoltar={() => setCurrentScreen('dev-menu')}
            />
          )}

          {currentScreen === 'dev-consultar' && (
            <DevConsultar
              usuarios={usuarios}
              onSalvarEdicao={handleSalvarEdicaoUsuario}
              onExcluirUsuario={handleExcluirUsuario}
              onVoltar={() => setCurrentScreen('dev-menu')}
            />
          )}

          {currentScreen === 'dev-viaturas' && (
            <DevViaturas
              viaturas={viaturas}
              onSalvarViatura={handleSalvarViatura}
              onExcluirViatura={handleExcluirViatura}
              onVoltar={() => setCurrentScreen('dev-menu')}
            />
          )}

          {/* ========================================= */}
          {/* TELA PRINCIPAL OPERACIONAL DA GUARDA      */}
          {/* ========================================= */}
          {currentScreen === 'menu' && (
            <div id="screen-menu-principal" className="space-y-4">
              {/* BOTÃO PARA O DESENVOLVEDOR RETORNAR AO PAINEL EXCLUSIVO SE ESTIVER EM MODO DE TESTE */}
              {usuarioAtivo?.isDesenvolvedor && (
                <button
                  id="btn-retornar-dev-menu"
                  type="button"
                  onClick={() => setCurrentScreen('dev-menu')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>RETORNAR AO PAINEL DO DESENVOLVEDOR</span>
                </button>
              )}

              {/* CARTÃO DE IDENTIFICAÇÃO DO AGENTE COM FOTO E BRASÃO AO LADO DO NOME DE GUERRA */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* FOTO DE PERFIL DO AGENTE */}
                  <div
                    onClick={handleAbrirEdicaoPerfil}
                    className="relative w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden cursor-pointer group hover:border-blue-500 transition-all"
                    title="Clique para alterar sua foto de perfil"
                  >
                    {usuarioAtivo?.foto ? (
                      <img
                        src={usuarioAtivo.foto}
                        alt={`Foto de ${usuarioAtivo.nomeDeGuerra}`}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <User className="w-7 h-7 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-xl">
                      <Camera className="w-4 h-4 drop-shadow" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* NOME DE GUERRA */}
                      <span className="text-sm font-black text-slate-900 uppercase truncate">
                        {usuarioAtivo?.nomeDeGuerra || 'GM'}
                      </span>

                      {/* Se for desenvolvedor, tira o brasão e coloca DESENVOLVEDOR */}
                      {usuarioAtivo?.isDesenvolvedor || usuarioAtivo?.matricula === MATRICULA_DESENVOLVEDOR ? (
                        <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-2xs">
                          DESENVOLVEDOR
                        </span>
                      ) : (
                        <>
                          {/* IMAGEM COM O BRASÃO DO GRUPAMENTO AO LADO DO NOME DE GUERRA */}
                          <div
                            className="w-6 h-6 rounded-md bg-slate-50 border border-slate-200 p-0.5 flex items-center justify-center shrink-0 shadow-2xs"
                            title={`Brasão ${usuarioAtivo?.grupamento || 'Grupamento'}`}
                          >
                            <img
                              src={grupamentoAtual!.imagem}
                              alt={`Brasão ${usuarioAtivo?.grupamento || 'Grupamento'}`}
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* NOME DO GRUPAMENTO AO LADO DO BRASÃO */}
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-black uppercase shrink-0">
                            {usuarioAtivo?.grupamento || 'Grupamento'}
                          </span>
                        </>
                      )}

                      {/* BOTÃO DE EDIÇÃO DE PERFIL: MESMO ÍCONE E MESMO TAMANHO DA CONSULTA DE CADASTROS */}
                      <button
                        id="btn-editar-perfil-menu"
                        type="button"
                        onClick={handleAbrirEdicaoPerfil}
                        className="w-8 h-8 rounded-full border border-slate-300 hover:border-blue-600 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Editar meu perfil"
                        aria-label="Editar meu perfil"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                      Matrícula: <strong className="text-slate-700">{usuarioAtivo?.matricula || MATRICULA_DESENVOLVEDOR}</strong> • Sangue: <strong className="text-rose-600">{usuarioAtivo?.tipoSanguineo || 'N/A'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="btn-logout-menu"
                    type="button"
                    onClick={handleLogout}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-slate-500 transition-colors cursor-pointer"
                    title="Encerrar Sessão"
                    aria-label="Encerrar Sessão"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Selecione uma Opção
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Guarda Municipal de Arraial do Cabo
                </p>
              </div>

              {/* 4 BOTÕES PRINCIPAIS */}
              <div className="space-y-3.5">
                {/* BOTÃO 1: POSTO DE SERVIÇO */}
                <button
                  id="btn-posto-de-servico"
                  type="button"
                  onClick={() => setCurrentScreen('posto-servico')}
                  className="w-full py-4 px-6 rounded-xl bg-white border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50/50 active:bg-blue-100 text-slate-900 hover:text-blue-700 font-black text-base uppercase tracking-wider shadow-xs transition-all flex items-center justify-center text-center cursor-pointer"
                >
                  POSTO DE SERVIÇO
                </button>

                {/* BOTÃO 2: MARCAÇÃO DE RAS */}
                <button
                  id="btn-marcacao-de-ras"
                  type="button"
                  onClick={() => setCurrentScreen('ras')}
                  className="w-full py-4 px-6 rounded-xl bg-white border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50/50 active:bg-blue-100 text-slate-900 hover:text-blue-700 font-black text-base uppercase tracking-wider shadow-xs transition-all flex items-center justify-center text-center cursor-pointer"
                >
                  MARCAÇÃO DE RAS
                </button>

                {/* BOTÃO 3: MARCAÇÃO DE ABONO */}
                <button
                  id="btn-marcacao-de-abono"
                  type="button"
                  onClick={() => setCurrentScreen('abono')}
                  className="w-full py-4 px-6 rounded-xl bg-white border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50/50 active:bg-blue-100 text-slate-900 hover:text-blue-700 font-black text-base uppercase tracking-wider shadow-xs transition-all flex items-center justify-center text-center cursor-pointer"
                >
                  MARCAÇÃO DE ABONO
                </button>

                {/* BOTÃO 4: CONSULTAR LIVRO ATA */}
                <button
                  id="btn-consultar-livro-ata"
                  type="button"
                  onClick={() => setCurrentScreen('livro-ata')}
                  className="w-full py-4 px-6 rounded-xl bg-white border-2 border-slate-300 hover:border-blue-600 hover:bg-blue-50/50 active:bg-blue-100 text-slate-900 hover:text-blue-700 font-black text-base uppercase tracking-wider shadow-xs transition-all flex items-center justify-center text-center cursor-pointer"
                >
                  CONSULTAR LIVRO ATA
                </button>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TELA: POSTO DE SERVIÇO                    */}
          {/* Opções de Funções do Posto de Serviço     */}
          {/* ========================================= */}
          {currentScreen === 'posto-servico' && (
            <div id="screen-posto-servico" className="space-y-4">
              <div className="text-center mb-3">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
                  Posto de Serviço
                </span>
                <h2 className="text-xl font-black text-slate-900 uppercase">
                  Escolha sua Função
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione seu posto operacional para o plantão:
                </p>
              </div>

              {/* BANNER DE AVISO: POSTO TOTALMENTE COBERTO */}
              {postoCobertoBanner && (
                <div id="banner-posto-coberto" className="bg-rose-50 border-2 border-rose-300 rounded-xl p-3.5 flex items-center gap-3 text-rose-900 animate-in fade-in slide-in-from-top-2 duration-150 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="font-black uppercase tracking-wider text-rose-800">
                      POSTO TOTALMENTE COBERTO
                    </p>
                    <p className="font-medium text-rose-700 mt-0.5">
                      {postoCobertoBanner}
                    </p>
                  </div>
                  <button
                    onClick={() => setPostoCobertoBanner(null)}
                    className="p-1 text-rose-600 hover:text-rose-800 rounded-lg cursor-pointer"
                    aria-label="Fechar aviso"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-2.5">
                {[
                  { nome: 'CIOSP' as FuncaoPosto, id: 'ciosp' },
                  { nome: 'COORDENADOR DE EQUIPE' as FuncaoPosto, id: 'coordenador' },
                  { nome: 'MOTORISTA' as FuncaoPosto, id: 'motorista' },
                  { nome: 'OPERACIONAL' as FuncaoPosto, id: 'operacional' },
                  { nome: 'TAC PONTAL CIMA' as FuncaoPosto, id: 'tac-pontal-cima' },
                  { nome: 'TAC PONTAL BAIXO' as FuncaoPosto, id: 'tac-pontal-baixo' },
                  { nome: 'PREFEITURA' as FuncaoPosto, id: 'prefeitura' },
                  { nome: 'PROCURADORIA' as FuncaoPosto, id: 'procuradoria' },
                  { nome: 'FÓRUM' as FuncaoPosto, id: 'forum' },
                  { nome: 'CREAS' as FuncaoPosto, id: 'creas' },
                ].map((func) => {
                  const limite = LIMITES_POSTOS[func.nome];
                  const ocupantes = ocupacaoPostos[func.nome] || [];
                  const isCoberto = limite !== undefined && ocupantes.length >= limite;
                  const usuarioJaEstaAqui = usuarioAtivo && ocupantes.some((o) => o.matricula === usuarioAtivo.matricula);

                  return (
                    <button
                      key={func.id}
                      id={`btn-funcao-${func.id}`}
                      type="button"
                      onClick={() => handleSelectFuncao(func.nome)}
                      className={`w-full py-3.5 px-4 rounded-xl border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left cursor-pointer shadow-xs ${
                        isCoberto && !usuarioJaEstaAqui
                          ? 'bg-rose-50/50 border-rose-300 hover:border-rose-500 hover:bg-rose-50 text-slate-800'
                          : usuarioJaEstaAqui
                          ? 'bg-emerald-50/60 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-300 hover:border-blue-600 hover:bg-blue-50/50 active:bg-blue-100 text-slate-900 hover:text-blue-700'
                      }`}
                    >
                      <span className="font-black text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
                        <span>{func.nome}</span>
                      </span>

                      {/* BADGE DE CAPACIDADE / STATUS */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {usuarioJaEstaAqui ? (
                          <span className="text-[11px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>SEU POSTO ATUAL</span>
                          </span>
                        ) : isCoberto ? (
                          <span className="text-[10px] sm:text-[11px] font-black uppercase text-rose-700 bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>POSTO TOTALMENTE COBERTO</span>
                          </span>
                        ) : limite !== undefined ? (
                          ocupantes.length === 0 ? (
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{limite} {limite === 1 ? 'VAGA' : 'VAGAS'}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-amber-600" />
                              <span>{limite - ocupantes.length} {limite - ocupantes.length === 1 ? 'VAGA DISPONÍVEL' : 'VAGAS DISPONÍVEIS'}</span>
                            </span>
                          )
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-3 flex items-center gap-2">
                <button
                  id="btn-voltar-menu"
                  type="button"
                  onClick={() => setCurrentScreen('menu')}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>VOLTAR</span>
                </button>

                {usuarioAtivo?.isDesenvolvedor && (
                  <button
                    type="button"
                    onClick={handleResetarOcupacoes}
                    className="py-3 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase transition-colors cursor-pointer"
                    title="Restaurar ocupações iniciais para testes do Desenvolvedor"
                  >
                    Resetar Postos
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TELA DE CONFIRMAÇÃO DA FUNÇÃO ESCOLHIDA   */}
          {/* ========================================= */}
          {currentScreen === 'opcao-funcao' && (
            <div id="screen-funcao-selecionada" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-xs">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Função Selecionada no Posto de Serviço:
                </p>
                <h3 className="text-2xl font-black text-slate-900 uppercase mt-1">
                  {funcaoSelecionada}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {funcaoSelecionada === 'MOTORISTA' && 'Responsável pelo check-list da viatura do grupamento.'}
                  {funcaoSelecionada === 'COORDENADOR DE EQUIPE' && 'Responsável pelo relato das ocorrências no Livro ATA.'}
                  {funcaoSelecionada === 'OPERACIONAL' && 'Atuação direta no patrulhamento e ordens operacionais.'}
                  {funcaoSelecionada === 'TAC PONTAL CIMA' && 'Posto de serviço e atuação no TAC Pontal (Cima).'}
                  {funcaoSelecionada === 'TAC PONTAL BAIXO' && 'Posto de serviço e atuação no TAC Pontal (Baixo).'}
                  {funcaoSelecionada === 'PREFEITURA' && 'Posto de vigilância e segurança na Prefeitura Municipal.'}
                  {funcaoSelecionada === 'PROCURADORIA' && 'Posto de segurança institucional na Procuradoria.'}
                  {funcaoSelecionada === 'CREAS' && 'Posto de segurança e apoio no CREAS.'}
                  {funcaoSelecionada === 'FÓRUM' && 'Posto de controle de acesso e segurança no Fórum.'}
                  {funcaoSelecionada === 'CIOSP' && 'Centro Integrado de Operações de Segurança Pública (Monitoramento e Atendimento).'}
                </p>
              </div>

              {/* LISTA DE AGENTES ESCALADOS NESTE POSTO */}
              {funcaoSelecionada && (ocupacaoPostos[funcaoSelecionada] || []).length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Agentes Alocados no Posto:</span>
                    </span>
                    {LIMITES_POSTOS[funcaoSelecionada] !== undefined && (
                      <span className="text-[11px] font-bold text-slate-500">
                        {ocupacaoPostos[funcaoSelecionada]?.length}/{LIMITES_POSTOS[funcaoSelecionada]} ocupados
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {(ocupacaoPostos[funcaoSelecionada] || []).map((oc, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-800 uppercase flex items-center gap-1.5">
                          <span>{oc.nomeDeGuerra}</span>
                          {oc.matricula === usuarioAtivo?.matricula && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">VOCÊ</span>
                          )}
                        </span>
                        <span className="text-slate-500 font-medium text-[11px]">
                          Matrícula {oc.matricula} • {oc.dataHora}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed font-medium">
                Função vinculada com sucesso ao agente <strong>{usuarioAtivo?.nomeDeGuerra || 'GM'}</strong> ({usuarioAtivo?.isDesenvolvedor || usuarioAtivo?.matricula === MATRICULA_DESENVOLVEDOR ? 'Desenvolvedor' : (usuarioAtivo?.grupamento || 'Grupamento')}).
              </div>

              <div className="space-y-2 pt-2">
                {funcaoSelecionada === 'MOTORISTA' && (
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('motorista-mapa')}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>ABRIR MAPA E RASTREAMENTO EM TEMPO REAL</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentScreen('posto-servico')}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>TROCAR DE POSTO</span>
                </button>

                <button
                  type="button"
                  onClick={handleDesocuparPosto}
                  className="w-full py-3 px-4 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>DESOCUPAR / LIBERAR ESTE POSTO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentScreen('menu')}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>MENU PRINCIPAL</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TELA: MOTORISTA - MAPA E LOCALIZAÇÃO REAL */}
          {/* ========================================= */}
          {currentScreen === 'motorista-mapa' && (
            <MotoristaLocalizacao
              usuarioAtivo={usuarioAtivo}
              postoSelecionado={funcaoSelecionada || 'MOTORISTA'}
              ocupantesPosto={ocupacaoPostos['MOTORISTA'] || []}
              viaturas={viaturas}
              equipe={equipeDaViatura}
              onViaturaSelecionada={handleDefinirViatura}
              onTrocarPosto={() => setCurrentScreen('posto-servico')}
              onDesocuparPosto={handleDesocuparPosto}
              onVoltarMenu={() => setCurrentScreen('menu')}
            />
          )}

          {/* ========================================= */}
          {/* TELA: OPERACIONAL / COORDENADOR - ORDENS  */}
          {/* ========================================= */}
          {currentScreen === 'equipe-ordens' && (
            <EquipePainel
              usuarioAtivo={usuarioAtivo}
              posto={funcaoSelecionada || 'OPERACIONAL'}
              ocupantesPosto={ocupacaoPostos[funcaoSelecionada || 'OPERACIONAL'] || []}
              equipe={equipeDaViatura}
              viaturas={viaturas}
              viaturaPrefixo={viaturaAtivaPrefixo || undefined}
              onViaturaSelecionada={handleDefinirViatura}
              onTrocarPosto={() => setCurrentScreen('posto-servico')}
              onDesocuparPosto={handleDesocuparPosto}
              onVoltarMenu={() => setCurrentScreen('menu')}
            />
          )}

          {/* ========================================= */}
          {/* TELA: CIOSP - ORDENS DE SERVIÇO           */}
          {/* ========================================= */}
          {currentScreen === 'ciosp' && (
            <CiospPainel
              usuarioAtivo={usuarioAtivo}
              onTrocarPosto={() => setCurrentScreen('posto-servico')}
              onDesocuparPosto={handleDesocuparPosto}
              onVoltarMenu={() => setCurrentScreen('menu')}
            />
          )}

          {/* ========================================= */}
          {/* TELA: MARCAÇÃO DE RAS                     */}
          {/* ========================================= */}
          {currentScreen === 'ras' && (
            <div id="screen-ras" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
              <h3 className="text-xl font-black text-slate-900 uppercase">
                MARCAÇÃO DE RAS
              </h3>
              <p className="text-sm text-slate-500">
                Pronto para receber as regras e opções desta etapa.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('menu')}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>VOLTAR</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TELA: MARCAÇÃO DE ABONO                   */}
          {/* ========================================= */}
          {currentScreen === 'abono' && (
            <div id="screen-abono" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xs">
              <h3 className="text-xl font-black text-slate-900 uppercase">
                MARCAÇÃO DE ABONO
              </h3>
              <p className="text-sm text-slate-500">
                Pronto para receber as regras e opções desta etapa.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('menu')}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>VOLTAR</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TELA: CONSULTAR LIVRO ATA                 */}
          {/* ========================================= */}
          {currentScreen === 'livro-ata' && (
            <div id="screen-livro-ata">
              <LivroAta
                usuarioAtivo={usuarioAtivo}
                onVoltar={() => setCurrentScreen('menu')}
                postoAtual={funcaoSelecionada}
                inicioPlantao={inicioPlantao}
              />
            </div>
          )}


        </div>
      </main>

      {/* MODAL ALERTA: POSTO TOTALMENTE COBERTO */}
      {alertaPostoCoberto && (
        <div
          id="modal-posto-totalmente-coberto"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setAlertaPostoCoberto(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border-2 border-rose-500 shadow-2xl p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 mx-auto flex items-center justify-center shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black uppercase tracking-wider mb-2">
                Acesso Indisponível
              </span>
              <h3 className="text-2xl font-black text-rose-600 uppercase tracking-tight">
                POSTO TOTALMENTE COBERTO
              </h3>
              <p className="text-base font-black text-slate-800 uppercase mt-1.5">
                {alertaPostoCoberto.posto}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Este posto permite no máximo <strong>{alertaPostoCoberto.limite} {alertaPostoCoberto.limite === 1 ? 'usuário' : 'usuários'}</strong> e já se encontra com a capacidade máxima preenchida.
              </p>
            </div>

            {alertaPostoCoberto.ocupantes.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-2">
                <p className="text-[11px] font-black uppercase text-slate-500">
                  Agentes que já cobrem este posto ({alertaPostoCoberto.ocupantes.length}/{alertaPostoCoberto.limite}):
                </p>
                <div className="space-y-1.5">
                  {alertaPostoCoberto.ocupantes.map((oc, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800 uppercase">
                        {oc.nomeDeGuerra}
                      </span>
                      <span className="text-slate-500 font-medium text-[11px]">
                        Matrícula: {oc.matricula}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <button
                id="btn-ok-posto-coberto"
                type="button"
                onClick={() => setAlertaPostoCoberto(null)}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              >
                ENTENDIDO, ESCOLHER OUTRO POSTO
              </button>

              {usuarioAtivo?.isDesenvolvedor && (
                <button
                  type="button"
                  onClick={() => handleLiberarPostoPorNome(alertaPostoCoberto.posto)}
                  className="w-full py-2 px-3 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  [DEV] Liberar agentes deste posto para teste
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PERFIL DO USUÁRIO */}
      {modalEditarPerfilAberto && usuarioAtivo && (
        <div
          id="modal-editar-perfil"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setModalEditarPerfilAberto(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 my-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    Editar Meu Perfil
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Atualização de dados cadastrais
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalEditarPerfilAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar modal de edição de perfil"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editPerfilError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editPerfilError}</span>
              </div>
            )}

            <form onSubmit={handleSalvarMeuPerfil} className="space-y-3.5">
              {/* SEÇÃO DE FOTO DO PERFIL */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      handleArquivoFotoSelecionado({
                        target: { files: [file] },
                      } as unknown as React.ChangeEvent<HTMLInputElement>);
                    }
                  }}
                  className="relative w-20 h-20 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-500 shadow-xs overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group transition-all"
                  title="Clique ou arraste uma foto aqui"
                >
                  {editPerfilFoto ? (
                    <img
                      src={editPerfilFoto}
                      alt="Foto do perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <User className="w-10 h-10 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  )}

                  {/* OVERLAY DE HOVER */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-5 h-5 drop-shadow" />
                  </div>

                  {editPerfilCarregandoFoto && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <span className="text-xs font-black uppercase text-slate-900 block">
                      Foto do Perfil
                    </span>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Clique no quadro ou selecione uma imagem do seu dispositivo
                    </p>
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleArquivoFotoSelecionado}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{editPerfilFoto ? 'Trocar Foto' : 'Adicionar Foto'}</span>
                    </button>

                    {editPerfilFoto && (
                      <button
                        type="button"
                        onClick={() => setImagemParaCortarPerfil(editPerfilFoto)}
                        className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                        title="Ajustar o corte e tamanho da foto atual"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Ajustar / Cortar</span>
                      </button>
                    )}

                    {editPerfilFoto && (
                      <button
                        type="button"
                        onClick={handleRemoverFotoPerfil}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remover foto do perfil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* MATRÍCULA (INFORMATIVA) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Matrícula</span>
                  <span className="text-sm font-black text-slate-900">{usuarioAtivo.matricula}</span>
                </div>
                <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                  Identificador Fixo
                </span>
              </div>

              {/* NOME DE GUERRA */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  NOME DE GUERRA:
                </label>
                <input
                  type="text"
                  value={editPerfilNomeDeGuerra}
                  onChange={(e) => setEditPerfilNomeDeGuerra(e.target.value.toUpperCase())}
                  placeholder="Ex: GM SILVA"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              {/* NOME COMPLETO */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  NOME COMPLETO:
                </label>
                <input
                  type="text"
                  value={editPerfilNomeCompleto}
                  onChange={(e) => setEditPerfilNomeCompleto(e.target.value)}
                  placeholder="Nome civil completo"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              {/* TIPO SANGUÍNEO */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  TIPO SANGUÍNEO:
                </label>
                <select
                  value={editPerfilTipoSanguineo}
                  onChange={(e) => setEditPerfilTipoSanguineo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              {/* GRUPAMENTO / PERFIL */}
              {usuarioAtivo.isDesenvolvedor || usuarioAtivo.matricula === MATRICULA_DESENVOLVEDOR ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-800 block">Perfil Operacional</span>
                    <span className="text-xs font-black text-amber-950 uppercase">Desenvolvedor (Usuário Único / Acesso Master)</span>
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
                      const isSelected = editPerfilGrupamento === grup.sigla;
                      return (
                        <button
                          key={grup.sigla}
                          type="button"
                          onClick={() => setEditPerfilGrupamento(grup.sigla)}
                          className={`flex items-center gap-2 p-2 rounded-xl border-2 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
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
                          <span className="text-xs font-black uppercase">
                            {grup.sigla}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SENHA DE ACESSO */}
              <div>
                <label className="block text-xs font-black uppercase text-slate-800 mb-1">
                  SENHA DE ACESSO:
                </label>
                <div className="relative">
                  <input
                    type={editPerfilShowSenha ? 'text' : 'password'}
                    value={editPerfilSenha}
                    onChange={(e) => setEditPerfilSenha(e.target.value)}
                    placeholder="Digite para alterar a senha"
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setEditPerfilShowSenha(!editPerfilShowSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label="Alternar visualização da senha"
                  >
                    {editPerfilShowSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* BOTÕES DE AÇÃO */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditarPerfilAberto(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-perfil"
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CORTAR E AJUSTAR TAMANHO DA FOTO DO MEU PERFIL */}
      <ModalCortarFoto
        isOpen={!!imagemParaCortarPerfil}
        imagemOriginal={imagemParaCortarPerfil}
        titulo="Ajustar Foto do Meu Perfil"
        onConfirmar={(fotoCortada) => {
          setEditPerfilFoto(fotoCortada);
          setImagemParaCortarPerfil(null);
        }}
        onCancelar={() => setImagemParaCortarPerfil(null)}
      />

      {/* MODAL PARA CORTAR E AJUSTAR TAMANHO DA FOTO DE NOVO CADASTRO */}
      <ModalCortarFoto
        isOpen={!!imagemParaCortarCadastro}
        imagemOriginal={imagemParaCortarCadastro}
        titulo="Ajustar Foto de Cadastro"
        onConfirmar={(fotoCortada) => {
          setCadFoto(fotoCortada);
          setImagemParaCortarCadastro(null);
        }}
        onCancelar={() => setImagemParaCortarCadastro(null)}
      />

      {/* MODAL: encerramento de plantão e fechamento do livro */}
      {modalEncerrarPlantao && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-base font-black text-slate-900 uppercase">Encerrar plantão</h3>
            <p className="text-xs text-slate-600">
              Ao encerrar, o posto fica livre. Você pode fechar o livro do plantão de hoje: o
              documento é gerado com todos os registros do dia e a assinatura do coordenador de
              equipe no final.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                disabled={gerandoLivroPlantao}
                onClick={() => void fecharLivroDoPlantao()}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase cursor-pointer disabled:opacity-60"
              >
                {gerandoLivroPlantao ? 'Fechando livro...' : 'Fechar livro e encerrar'}
              </button>
              <button
                type="button"
                disabled={gerandoLivroPlantao}
                onClick={() => {
                  setModalEncerrarPlantao(false);
                  liberarPostoAtual();
                }}
                className="w-full py-3 px-4 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-sm uppercase cursor-pointer disabled:opacity-60"
              >
                Só liberar o posto
              </button>
              <button
                type="button"
                disabled={gerandoLivroPlantao}
                onClick={() => setModalEncerrarPlantao(false)}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AVISO: plantão de 24 horas encerrado automaticamente */}
      {avisoPlantao24h && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-black text-slate-900 uppercase">Plantão encerrado</h3>
            <p className="text-xs text-slate-600">
              Seu posto de serviço ficou ocupado por 24 horas e foi liberado automaticamente.
              Assuma o posto novamente para iniciar um novo plantão.
            </p>
            <button
              type="button"
              onClick={() => setAvisoPlantao24h(false)}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm uppercase cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer id="footer-bottom" className="border-t border-slate-200 bg-white py-3 px-4 text-center text-xs text-slate-500">
        <p>© Guarda Municipal • Prefeitura de Arraial do Cabo - RJ</p>
      </footer>
    </div>
  );
}

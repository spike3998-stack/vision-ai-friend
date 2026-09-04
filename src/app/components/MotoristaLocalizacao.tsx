import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Car,
  Compass,
  Crosshair,
  AlertTriangle,
  ArrowLeft,
  Users,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Play,
  Square,
  ZoomIn,
  ZoomOut,
  Shield,
  Search,
  X,
  CheckCircle2,
  Wrench,
  Activity,
  Gauge,
  FileText,
  ClipboardCheck,
  Radio,
  MapPin,
  Clock,
  ThumbsUp,
  Ban,
} from 'lucide-react';
import { UsuarioCadastrado, OcupantePosto, Viatura, OrdemServico } from '../types';
import { GRUPAMENTOS } from '../data/grupamentos';
import { getViaturasArmazenadas } from '../services/storage';
import { ModalChecklistViatura } from './ModalChecklistViatura';
import { fetchOrdensServidor, atualizarOrdemServidor } from '../services/api';

interface MotoristaLocalizacaoProps {
  usuarioAtivo: UsuarioCadastrado | null;
  postoSelecionado?: string;
  ocupantesPosto: OcupantePosto[];
  viaturas?: Viatura[];
  onTrocarPosto: () => void;
  onDesocuparPosto: () => void;
  onVoltarMenu: () => void;
}

// Coordenadas centrais padrão de Arraial do Cabo - RJ
const ARRAIAL_DO_CABO_DEFAULT = {
  lat: -22.9666,
  lng: -42.0278,
};

export const MotoristaLocalizacao: React.FC<MotoristaLocalizacaoProps> = ({
  usuarioAtivo,
  postoSelecionado = 'MOTORISTA',
  ocupantesPosto,
  viaturas,
  onTrocarPosto,
  onDesocuparPosto,
  onVoltarMenu,
}) => {
  // Lista de viaturas cadastradas pelo desenvolvedor
  const listaViaturas = viaturas && viaturas.length > 0 ? viaturas : getViaturasArmazenadas();
  const [modalViaturasAberto, setModalViaturasAberto] = useState<boolean>(false);
  const [modalChecklistAberto, setModalChecklistAberto] = useState<boolean>(false);
  const [buscaViatura, setBuscaViatura] = useState<string>('');
  const [viaturaSelecionada, setViaturaSelecionada] = useState<Viatura | null>(() => {
    try {
      const saved = localStorage.getItem('gm_arraial_viatura_ativa');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const handleSelecionarViatura = (vtr: Viatura) => {
    if (viaturaSelecionada?.id === vtr.id) {
      setViaturaSelecionada(null);
      localStorage.removeItem('gm_arraial_viatura_ativa');
    } else {
      setViaturaSelecionada(vtr);
      localStorage.setItem('gm_arraial_viatura_ativa', JSON.stringify(vtr));
    }
  };

  const viaturasFiltradas = listaViaturas.filter((vtr) => {
    const q = buscaViatura.toLowerCase();
    return (
      vtr.prefixo.toLowerCase().includes(q) ||
      vtr.modelo.toLowerCase().includes(q) ||
      vtr.placa.toLowerCase().includes(q) ||
      vtr.grupamento.toLowerCase().includes(q)
    );
  });

  // Estado da posição atual do motorista
  const [position, setPosition] = useState<{ lat: number; lng: number }>(ARRAIAL_DO_CABO_DEFAULT);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);

  // Controles
  const [autoCenter, setAutoCenter] = useState<boolean>(true);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);

  // Rastreamento simulado para testes
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simulationTimerRef = useRef<number | null>(null);
  const simulationStepRef = useRef<number>(0);

  // Referências para o mapa estável (persiste montado, sem recarregar)
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Rota de patrulha pelas vias de Arraial do Cabo para testes
  const rotaPatrulha = [
    { lat: -22.9666, lng: -42.0278 }, // Centro / Praça do Cova
    { lat: -22.9685, lng: -42.0245 }, // Praia dos Anjos / Porto
    { lat: -22.9715, lng: -42.0225 }, // Marina dos Pescadores
    { lat: -22.9632, lng: -42.0298 }, // Av. Getúlio Vargas
    { lat: -22.9615, lng: -42.0355 }, // Praia Grande / Orla
    { lat: -22.9555, lng: -42.0265 }, // Prainha
  ];

  // Ícone da Viatura com pulso de radar
  const criarIconeViatura = (nome: string) => {
    return L.divIcon({
      className: 'viatura-pin-custom',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translate(-22px, -22px); cursor: pointer;">
          <div style="position: absolute; inset: -4px; background: rgba(59, 130, 246, 0.35); border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
          <div style="position: relative; width: 38px; height: 38px; background: #1e40af; border: 2.5px solid #ffffff; border-radius: 12px; box-shadow: 0 10px 18px rgba(0, 0, 0, 0.35); display: flex; align-items: center; justify-content: center; color: #ffffff;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
          <div style="margin-top: 3px; background: rgba(15, 23, 42, 0.95); color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid #334155; white-space: nowrap; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
            ${nome}
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -26],
    });
  };

  // 1. INICIALIZAÇÃO DO MAPA (Apenas uma vez)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [position.lat, position.lng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Camada de Ruas e Avenidas do Google Maps
    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    // Marcador da viatura
    const icon = criarIconeViatura(usuarioAtivo?.nomeDeGuerra || 'VIATURA');
    const marker = L.marker([position.lat, position.lng], { icon }).addTo(map);

    marker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; min-width: 160px;">
        <div style="font-weight: 900; font-size: 12px; color: #1e40af; text-transform: uppercase; margin-bottom: 4px;">
          🚔 Viatura • Motorista
        </div>
        <div style="font-size: 11px; color: #1e293b; line-height: 1.4;">
          <strong>Condutor:</strong> ${usuarioAtivo?.nomeDeGuerra || 'GM'}<br/>
          <strong>Matrícula:</strong> ${usuarioAtivo?.matricula || '---'}<br/>
          <strong>Posto:</strong> MOTORISTA
        </div>
      </div>
    `);

    mapInstanceRef.current = map;
    markerRef.current = marker;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // 2. ATUALIZAÇÃO DA POSIÇÃO (Suave, sem recarregar o mapa)
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng([position.lat, position.lng]);
    }

    if (mapInstanceRef.current && autoCenter) {
      mapInstanceRef.current.panTo([position.lat, position.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [position, autoCenter]);

  // 3. RASTREAMENTO GPS EM TEMPO REAL VIA watchPosition
  useEffect(() => {
    if (isSimulating) return;

    if (!('geolocation' in navigator)) {
      setGpsErrorMessage('Geolocalização não suportada por este dispositivo.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsErrorMessage(null);
      },
      (err) => {
        console.warn('Status do GPS:', err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsErrorMessage('Permissão de GPS negada. Permita a localização no navegador.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsErrorMessage('Sinal GPS temporariamente indisponível.');
        } else {
          setGpsErrorMessage('Aguardando resposta do sensor de GPS.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSimulating]);

  // 4. MODO DE SIMULAÇÃO DE PATRULHA (Para testes)
  useEffect(() => {
    if (isSimulating) {
      setGpsErrorMessage(null);
      simulationTimerRef.current = window.setInterval(() => {
        simulationStepRef.current = (simulationStepRef.current + 1) % rotaPatrulha.length;
        const nextPoint = rotaPatrulha[simulationStepRef.current];
        setPosition({ lat: nextPoint!.lat, lng: nextPoint!.lng });
      }, 3500);
    } else {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    }

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, [isSimulating]);

  const handleCopyCoords = () => {
    const text = `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleRetryGps = () => {
    setIsSimulating(false);
    setGpsErrorMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGpsErrorMessage(err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([position.lat, position.lng], 16, { animate: true });
    }
    setAutoCenter(true);
  };

  // ============ ORDENS DE SERVIÇO ENVIADAS PELO CIOSP ============
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [escolhendoEspera, setEscolhendoEspera] = useState<string | null>(null);
  const [rotaInfo, setRotaInfo] = useState<{ ordemId: string; endereco: string } | null>(null);
  const [rotaErro, setRotaErro] = useState<string | null>(null);
  const rotaLayerRef = useRef<L.Polyline | null>(null);
  const destinoMarkerRef = useRef<L.Marker | null>(null);

  const carregarOrdens = useCallback(async () => {
    const lista = await fetchOrdensServidor();
    const grupo = usuarioAtivo?.grupamento;
    const agoraMs = Date.now();
    setOrdens(
      lista.filter((o) => {
        if (grupo && o.grupamento !== grupo) return false;
        if (o.status === 'recusada') return false;
        if (o.status === 'espera' && o.esperaAte && o.esperaAte < agoraMs) return true;
        return true;
      })
    );
  }, [usuarioAtivo?.grupamento]);

  useEffect(() => {
    carregarOrdens();
    const t = window.setInterval(carregarOrdens, 6000);
    return () => window.clearInterval(t);
  }, [carregarOrdens]);

  // Faz o tempo de espera expirar automaticamente na tela do motorista
  const [, forcarRelogio] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => forcarRelogio((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const responderOrdem = async (
    ordem: OrdemServico,
    status: 'aceita' | 'recusada' | 'espera',
    minutos?: number
  ) => {
    const dados: Partial<OrdemServico> = {
      status,
      respondidoPor: usuarioAtivo?.nomeDeGuerra || 'MOTORISTA',
      respondidoPorMatricula: usuarioAtivo?.matricula || '---',
    };
    if (status === 'espera' && minutos) {
      dados.esperaMinutos = minutos;
      dados.esperaAte = Date.now() + minutos * 60_000;
    }
    const atualizada = await atualizarOrdemServidor(ordem.id, dados);
    setEscolhendoEspera(null);
    const final = atualizada ?? { ...ordem, ...dados };
    if (status === 'recusada') {
      setOrdens((prev) => prev.filter((o) => o.id !== ordem.id));
      return;
    }
    setOrdens((prev) => prev.map((o) => (o.id === ordem.id ? (final as OrdemServico) : o)));
    if (status === 'aceita') {
      traçarRota(final as OrdemServico);
    }
  };

  // Geocodifica o endereço da ordem e desenha a rota no mapa
  const traçarRota = async (ordem: OrdemServico) => {
    setRotaErro(null);
    const map = mapInstanceRef.current;
    if (!map) return;
    try {
      const consulta = encodeURIComponent(`${ordem.endereco}, Arraial do Cabo, RJ, Brasil`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${consulta}`
      );
      const achados = (await res.json()) as Array<{ lat: string; lon: string }>;
      const alvo = achados[0];
      if (!alvo) {
        setRotaErro('Não foi possível localizar o endereço informado pelo CIOSP.');
        return;
      }
      const destino = { lat: parseFloat(alvo.lat), lng: parseFloat(alvo.lon) };

      let pontos: [number, number][] = [
        [position.lat, position.lng],
        [destino.lat, destino.lng],
      ];
      try {
        const rota = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${position.lng},${position.lat};${destino.lng},${destino.lat}?overview=full&geometries=geojson`
        );
        const dadosRota = (await rota.json()) as any;
        const coords = dadosRota?.routes?.[0]?.geometry?.coordinates as
          | [number, number][]
          | undefined;
        if (coords?.length) {
          pontos = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
        }
      } catch {
        // mantém a linha reta como referência
      }

      if (rotaLayerRef.current) map.removeLayer(rotaLayerRef.current);
      if (destinoMarkerRef.current) map.removeLayer(destinoMarkerRef.current);

      const linha = L.polyline(pontos, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(map);
      const marcador = L.marker([destino.lat, destino.lng]).addTo(map);
      marcador.bindPopup(`<strong>Destino da ordem</strong><br/>${ordem.endereco}`);
      rotaLayerRef.current = linha;
      destinoMarkerRef.current = marcador;
      setAutoCenter(false);
      map.fitBounds(linha.getBounds(), { padding: [40, 40] });
      setRotaInfo({ ordemId: ordem.id, endereco: ordem.endereco });
    } catch {
      setRotaErro('Falha ao traçar a rota. Verifique a conexão e tente novamente.');
    }
  };

  const limparRota = () => {
    const map = mapInstanceRef.current;
    if (map && rotaLayerRef.current) map.removeLayer(rotaLayerRef.current);
    if (map && destinoMarkerRef.current) map.removeLayer(destinoMarkerRef.current);
    rotaLayerRef.current = null;
    destinoMarkerRef.current = null;
    setRotaInfo(null);
    setAutoCenter(true);
  };

  const ordensVisiveis = ordens.filter((o) => {
    if (o.status === 'aguardando') return true;
    if (o.status === 'espera') return true;
    if (o.status === 'aceita') return rotaInfo?.ordemId === o.id;
    return false;
  });

  // Brasão do grupamento do usuário
  const grupamentoUsuario = GRUPAMENTOS.find((g) => g.sigla === usuarioAtivo?.grupamento) || GRUPAMENTOS[0];
  const brasaoImagem = grupamentoUsuario?.imagem;


  return (
    <div id="screen-motorista-mapa" className="space-y-4">
      {/* ABA DE GESTÃO OPERACIONAL: APENAS INFORMAÇÕES DO MOTORISTA E BOTÕES DE AÇÃO */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* INFORMAÇÕES DE MOTORISTA */}
          <div className="flex items-center gap-3">
            {/* BRASÃO DO GRUPAMENTO DO USUÁRIO */}
            <div
              className="w-13 h-13 rounded-xl bg-slate-800/90 border border-slate-700 p-1 flex items-center justify-center shrink-0 shadow-md overflow-hidden"
              title={`Brasão ${usuarioAtivo?.grupamento || 'Grupamento'}`}
            >
              {brasaoImagem ? (
                <img
                  src={brasaoImagem}
                  alt={`Brasão ${usuarioAtivo?.grupamento || 'Grupamento'}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Shield className="w-7 h-7 text-blue-400" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2 py-0.5 rounded-md">
                POSTO OPERACIONAL
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-1">
                {usuarioAtivo?.nomeDeGuerra || 'CONDUTOR'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Matrícula: {usuarioAtivo?.matricula}

                {viaturaSelecionada && (
                  <span className="ml-1.5 text-blue-400 font-bold">
                    • VTR: {viaturaSelecionada.prefixo} ({viaturaSelecionada.placa})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* BOTÕES: LISTA DE VIATURAS, COPIAR COORDENADAS E ABRIR MAPS */}
          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {/* OPÇÃO AO LADO ESQUERDO DE COPIAR COORDENADAS: ABRIR LISTA DE VIATURAS */}
            <button
              id="btn-abrir-lista-viaturas"
              type="button"
              onClick={() => setModalViaturasAberto(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Abrir Lista de Viaturas"
            >
              <Car className="w-3.5 h-3.5 text-blue-400" />
              <span>Viaturas</span>
              {viaturaSelecionada ? (
                <span className="ml-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider">
                  {viaturaSelecionada.prefixo}
                </span>
              ) : (
                listaViaturas.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                    {listaViaturas.length}
                  </span>
                )
              )}
            </button>

            {/* OPÇÃO AO LADO DE VIATURAS: CHECK-LIST DA VIATURA */}
            <button
              id="btn-abrir-checklist-viatura"
              type="button"
              onClick={() => setModalChecklistAberto(true)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs hover:border-emerald-500/80 group"
              title="Realizar ou Consultar Check-list da Viatura"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Check-list</span>
            </button>

            <button
              id="btn-copiar-coordenadas"
              type="button"
              onClick={handleCopyCoords}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Copiar Coordenadas"
            >
              {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedCoords ? 'Copiado!' : 'Copiar Coordenadas'}</span>
            </button>

            <a
              id="btn-abrir-google-maps"
              href={`https://www.google.com/maps?q=${position.lat},${position.lng}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              title="Abrir no Google Maps Aplicativo"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir Maps</span>
            </a>
          </div>
        </div>

        {/* ALERTA CASO OCORRA ERRO NO GPS */}
        {gpsErrorMessage && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs text-amber-200 gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{gpsErrorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRetryGps}
              className="px-2.5 py-1 rounded bg-amber-400 text-slate-950 font-black text-[10px] uppercase cursor-pointer hover:bg-amber-300 flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Reconectar GPS
            </button>
          </div>
        )}
      </div>

      {/* ORDENS DE SERVIÇO RECEBIDAS DO CIOSP */}
      {ordensVisiveis.length > 0 && (
        <div className="space-y-2.5">
          {ordensVisiveis.map((ordem) => {
            const emEspera =
              ordem.status === 'espera' && !!ordem.esperaAte && ordem.esperaAte > Date.now();
            const restanteSeg = emEspera
              ? Math.max(0, Math.ceil(((ordem.esperaAte as number) - Date.now()) / 1000))
              : 0;
            return (
              <div
                key={ordem.id}
                className="bg-white border-2 border-blue-500 rounded-2xl p-4 shadow-md space-y-3 animate-in"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-white bg-blue-600 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Nova ordem de serviço • CIOSP</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">{ordem.dataHora}</span>
                </div>

                <p className="text-sm font-black text-slate-900 uppercase">{ordem.descricao}</p>
                <p className="text-xs text-slate-700 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                  <span>{ordem.endereco}</span>
                </p>
                {ordem.observacoes && (
                  <p className="text-xs text-slate-500">Obs.: {ordem.observacoes}</p>
                )}

                {ordem.status === 'aceita' && (
                  <div className="flex items-center justify-between gap-2 flex-wrap bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ordem aceita • rota traçada no mapa</span>
                    </span>
                    <button
                      type="button"
                      onClick={limparRota}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-emerald-300 text-[11px] font-black uppercase text-emerald-700 cursor-pointer hover:bg-emerald-100"
                    >
                      Encerrar rota
                    </button>
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
        </div>
      )}

      {rotaErro && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs font-bold text-amber-800">
          {rotaErro}
        </div>
      )}



      {/* ÁREA DO MAPA DE RUAS */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl overflow-hidden shadow-sm relative">
        {/* BARRA SUPERIOR DO MAPA DE RUAS */}
        <div className="bg-slate-900 border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2 flex-wrap text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-blue-400" />
              <span>Mapa de Ruas e Avenidas • Arraial do Cabo</span>
            </span>
          </div>

          {/* CONTROLES DO MAPA */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* BOTÃO CENTRALIZAR NA VIATURA */}
            <button
              type="button"
              onClick={handleRecenter}
              className={`px-3 py-1.5 rounded-lg border text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition-colors ${
                autoCenter
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title="Centralizar o mapa na posição atual da viatura"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Centralizar</span>
            </button>

            {/* CONTROLES DE ZOOM */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                title="Aproximar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-200 cursor-pointer"
                title="Afastar Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* SIMULAÇÃO DE PATRULHA */}
            <button
              type="button"
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition-colors ${
                isSimulating
                  ? 'bg-purple-600 border-purple-500 text-white animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
              title="Simula o deslocamento da viatura pelas vias de Arraial do Cabo"
            >
              {isSimulating ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'Parar Teste' : 'Testar Patrulha'}</span>
            </button>
          </div>
        </div>

        {/* CONTAINER DO MAPA LEAFLET */}
        <div className="w-full h-[520px] sm:h-[580px] relative bg-slate-100 overflow-hidden">
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            style={{ zIndex: 1 }}
          />
        </div>

        {/* BARRA INFERIOR DE RODAPÉ */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Patrulhamento Ostensivo • <strong>Guarda Municipal de Arraial do Cabo</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 font-semibold text-slate-700">
            <span>Lat: {position.lat.toFixed(5)}</span>
            <span>Lng: {position.lng.toFixed(5)}</span>
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLE DO POSTO MOTORISTA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-black text-xs uppercase tracking-wider text-slate-800">
              Escala no Posto Motorista
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            {ocupantesPosto.length} {ocupantesPosto.length === 1 ? 'agente alocado' : 'agentes alocados'}
          </span>
        </div>

        {/* LISTA DE OCUPANTES DO POSTO */}
        <div className="space-y-2">
          {ocupantesPosto.map((oc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-black text-xs">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 uppercase">
                    {oc.nomeDeGuerra}
                  </span>
                  {oc.matricula === usuarioAtivo?.matricula && (
                    <span className="ml-1.5 text-[9px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.5 rounded">
                      VOCÊ (CONDUTOR)
                    </span>
                  )}
                  <span className="block text-[10px] text-slate-500">
                    Matrícula: {oc.matricula} • Entrada: {oc.dataHora}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {oc.grupamento || 'Operacional'}
              </span>
            </div>
          ))}
        </div>

        {/* BOTÕES DE GESTÃO DO POSTO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onTrocarPosto}
            className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trocar de Posto</span>
          </button>

          <button
            type="button"
            onClick={onDesocuparPosto}
            className="py-3 px-4 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Desocupar Posto</span>
          </button>

          <button
            type="button"
            onClick={onVoltarMenu}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <span>Menu Principal</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: LISTA DE VIATURAS CADASTRADAS PELO DESENVOLVEDOR   */}
      {/* ========================================================= */}
      {modalViaturasAberto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-slate-200 animate-scale-up text-slate-900 max-h-[90vh] flex flex-col">
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
                    Lista de Viaturas da Guarda
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Veículos cadastrados pelo desenvolvedor para patrulha
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalViaturasAberto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* BARRA DE PESQUISA */}
            <div className="pt-3 pb-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaViatura}
                  onChange={(e) => setBuscaViatura(e.target.value)}
                  placeholder="Buscar por prefixo, modelo, placa ou grupo..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* LISTA ROLÁVEL DE VIATURAS */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-2.5 my-2">
              {viaturasFiltradas.length === 0 ? (
                <div className="text-center py-8">
                  <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 uppercase">
                    Nenhuma viatura encontrada
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Novas viaturas podem ser cadastradas pelo Desenvolvedor no menu exclusivo.
                  </p>
                </div>
              ) : (
                viaturasFiltradas.map((vtr) => {
                  const isSelecionada = viaturaSelecionada?.id === vtr.id;
                  return (
                    <div
                      key={vtr.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSelecionada
                          ? 'border-blue-500 bg-blue-50/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelecionada ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
                            }`}
                          >
                            <Car className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black uppercase text-slate-900 tracking-tight">
                                {vtr.prefixo}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                {vtr.grupamento}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium mt-0.5">
                              {vtr.modelo} • <strong className="text-slate-800">{vtr.placa}</strong>
                            </p>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            vtr.status === 'disponivel'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : vtr.status === 'em_operacao'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {vtr.status === 'disponivel'
                            ? 'Disponível'
                            : vtr.status === 'em_operacao'
                            ? 'Em Operação'
                            : 'Manutenção'}
                        </span>
                      </div>

                      {(vtr.kmAtual || vtr.observacoes) && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                          {vtr.kmAtual && (
                            <div className="flex items-center gap-1">
                              <Gauge className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>KM: {vtr.kmAtual}</span>
                            </div>
                          )}
                          {vtr.observacoes && (
                            <div className="flex items-center gap-1 col-span-2 truncate">
                              <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate italic">{vtr.observacoes}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setViaturaSelecionada(vtr);
                            localStorage.setItem('gm_arraial_viatura_ativa', JSON.stringify(vtr));
                            setModalViaturasAberto(false);
                            setModalChecklistAberto(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                          title="Fazer Check-list desta viatura"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Check-list</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelecionarViatura(vtr)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5 ${
                            isSelecionada
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isSelecionada ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Viatura em Uso</span>
                            </>
                          ) : (
                            <span>Assumir Viatura</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-medium">
                {viaturasFiltradas.length} viatura(s) listada(s)
              </span>
              <button
                type="button"
                onClick={() => setModalViaturasAberto(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase cursor-pointer transition-colors"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CHECK-LIST OPERACIONAL DA VIATURA E HISTÓRICO      */}
      {/* ========================================================= */}
      <ModalChecklistViatura
        aberto={modalChecklistAberto}
        onClose={() => setModalChecklistAberto(false)}
        usuarioAtivo={usuarioAtivo}
        viaturas={listaViaturas}
        viaturaSelecionadaPadrao={viaturaSelecionada}
        onChecklistSalvo={(novoChk) => {
          // Se o checklist atualizou o KM ou status, podemos sincronizar
          if (viaturaSelecionada && viaturaSelecionada.id === novoChk.viaturaId) {
            const vtrAtualizada: Viatura = {
              ...viaturaSelecionada,
              kmAtual: novoChk.kmAtual,
            };
            setViaturaSelecionada(vtrAtualizada);
            localStorage.setItem('gm_arraial_viatura_ativa', JSON.stringify(vtrAtualizada));
          }
        }}
      />
    </div>
  );
};

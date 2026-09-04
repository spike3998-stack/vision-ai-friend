import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Move,
  Crop,
  User,
} from 'lucide-react';

interface ModalCortarFotoProps {
  isOpen: boolean;
  imagemOriginal: string | null;
  onConfirmar: (fotoCortada: string) => void;
  onCancelar: () => void;
  titulo?: string;
}

const VIEWPORT_SIZE = 260; // Tamanho do quadro de corte visível na tela (px)
const OUTPUT_SIZE = 360; // Resolução da imagem final recortada (px)

export const ModalCortarFoto: React.FC<ModalCortarFotoProps> = ({
  isOpen,
  imagemOriginal,
  onConfirmar,
  onCancelar,
  titulo = 'Ajustar e Cortar Foto do Perfil',
}) => {
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1.0); // 1.0 a 3.0
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Carrega a imagem original e calcula a escala base inicial para cobrir o viewport
  useEffect(() => {
    if (!imagemOriginal || !isOpen) {
      setImgElement(null);
      setPreviewDataUrl(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImgElement(img);
      setZoom(1.0);
      setRotation(0);
      setPan({ x: 0, y: 0 });

      // Escala inicial para cobrir totalmente o quadro de 260x260
      const initialScale = Math.max(
        VIEWPORT_SIZE / img.naturalWidth,
        VIEWPORT_SIZE / img.naturalHeight
      );
      setBaseScale(initialScale);
    };
    img.src = imagemOriginal;
  }, [imagemOriginal, isOpen]);

  // Recalcula a escala base quando a rotação altera a orientação (paisagem / retrato)
  useEffect(() => {
    if (!imgElement) return;

    const isRotated90or270 = rotation === 90 || rotation === 270;
    const effectiveW = isRotated90or270 ? imgElement.naturalHeight : imgElement.naturalWidth;
    const effectiveH = isRotated90or270 ? imgElement.naturalWidth : imgElement.naturalHeight;

    const newBase = Math.max(VIEWPORT_SIZE / effectiveW, VIEWPORT_SIZE / effectiveH);
    setBaseScale(newBase);
  }, [rotation, imgElement]);

  // Gera o corte no canvas e atualiza o preview em tempo real (debounced)
  const gerarCanvasCortado = useCallback(
    (targetSize: number): string | null => {
      if (!imgElement) return null;

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Fundo neutro
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, targetSize, targetSize);

      const exportRatio = targetSize / VIEWPORT_SIZE;

      // Move a origem para o centro do canvas
      ctx.translate(targetSize / 2, targetSize / 2);

      // Aplica o deslocamento (pan) ajustado pela proporção
      ctx.translate(pan.x * exportRatio, pan.y * exportRatio);

      // Aplica a rotação
      ctx.rotate((rotation * Math.PI) / 180);

      // Aplica a escala total
      const totalScale = baseScale * zoom * exportRatio;
      ctx.scale(totalScale, totalScale);

      // Desenha a imagem centralizada
      ctx.drawImage(
        imgElement,
        -imgElement.naturalWidth / 2,
        -imgElement.naturalHeight / 2,
        imgElement.naturalWidth,
        imgElement.naturalHeight
      );

      return canvas.toDataURL('image/jpeg', 0.88);
    },
    [imgElement, baseScale, zoom, rotation, pan]
  );

  // Atualiza o mini-preview em tempo real
  useEffect(() => {
    if (!imgElement || !isOpen) return;

    const timer = setTimeout(() => {
      const liveData = gerarCanvasCortado(120);
      if (liveData) {
        setPreviewDataUrl(liveData);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [gerarCanvasCortado, imgElement, isOpen]);

  // Controles de Arrastar (Pointer Events unificados para Mouse e Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setPan({
      x: dragStart.panX + deltaX,
      y: dragStart.panY + deltaY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Suporte a zoom com a roda do mouse sobre o quadro de corte
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3.0, Math.max(1.0, Number((prev + delta).toFixed(2)))));
  };

  // Rotação 90° sentido horário
  const handleGirar = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Redefinir para o padrão
  const handleReset = () => {
    setZoom(1.0);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Confirmar corte
  const handleConfirmarCorte = () => {
    const finalDataUrl = gerarCanvasCortado(OUTPUT_SIZE);
    if (finalDataUrl) {
      onConfirmar(finalDataUrl);
    } else {
      onCancelar();
    }
  };

  if (!isOpen || !imagemOriginal) {
    return null;
  }

  return (
    <div
      id="modal-cortar-foto"
      className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                {titulo}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Arraste para enquadrar e ajuste o tamanho
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancelar}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Cancelar corte"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ÁREA DE CORTE (VIEWPORT INTERATIVO) */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center select-none relative">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            className="relative rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing border-2 border-white/80 shadow-2xl touch-none bg-slate-900"
          >
            {/* IMAGEM EM POSICIONAMENTO DINÂMICO */}
            {imgElement && (
              <div
                className="absolute origin-center transition-transform"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                  width: `${imgElement.naturalWidth}px`,
                  height: `${imgElement.naturalHeight}px`,
                  pointerEvents: 'none',
                }}
              >
                <img
                  src={imagemOriginal}
                  alt="Ajuste de foto"
                  className="w-full h-full object-contain pointer-events-none select-none max-w-none"
                  draggable={false}
                />
              </div>
            )}

            {/* GUIAS VISUAIS DE ENQUADRAMENTO (GRADE / REGRA DOS TERÇOS) */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-25">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* MÁSCARA CIRCULAR SUTIL PARA REFERÊNCIA DE AVATAR */}
            <div className="absolute inset-2 rounded-full border border-dashed border-white/40 pointer-events-none" />

            {/* INDICADOR DE ARRASTO */}
            <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-bold flex items-center gap-1 shadow-xs">
                <Move className="w-3 h-3" />
                Arraste para mover
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 text-center font-medium">
            Toque/arraste a foto com o dedo ou mouse para posicionar o rosto no centro
          </p>
        </div>

        {/* CONTROLES DE TAMANHO / ZOOM E AJUSTES */}
        <div className="p-4 space-y-4 bg-white">
          {/* BARRA DE ZOOM / TAMANHO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1 uppercase tracking-wider text-[11px] text-slate-600">
                <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
                Tamanho / Zoom
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-black">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(1.0, Number((prev - 0.1).toFixed(2))))}
                disabled={zoom <= 1.0}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                id="slider-zoom-foto"
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3.0, Number((prev + 0.1).toFixed(2))))}
                disabled={zoom >= 3.0}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* BOTÕES DE FERRAMENTA (GIRAR E REDEFINIR) + PRÉ-VISUALIZAÇÃO */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGirar}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Girar 90 graus no sentido horário"
              >
                <RotateCw className="w-3.5 h-3.5 text-slate-600" />
                <span>Girar</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Redefinir escala e posição"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                <span>Redefinir</span>
              </button>
            </div>

            {/* PRÉVIA DO RESULTADO NO PERFIL */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Prévia:</span>
              <div
                className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden shadow-2xs shrink-0 flex items-center justify-center"
                title="Pré-visualização no crachá/perfil"
              >
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Prévia de corte"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div
                className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 overflow-hidden shadow-2xs shrink-0 flex items-center justify-center"
                title="Pré-visualização em avatar circular"
              >
                {previewDataUrl ? (
                  <img
                    src={previewDataUrl}
                    alt="Prévia em avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ DE AÇÕES */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancelar}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            id="btn-concluir-corte-foto"
            type="button"
            onClick={handleConfirmarCorte}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Concluir Corte</span>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

interface PadAssinaturaProps {
  valorInicial?: string | undefined;
  onChange: (dataUrl: string | null) => void;
  altura?: number;
}

/** Área de desenho para o agente assinar com o dedo ou com o mouse. */
export const PadAssinatura: React.FC<PadAssinaturaProps> = ({
  valorInicial,
  onChange,
  altura = 180,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState<boolean>(Boolean(valorInicial));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const largura = canvas.parentElement?.clientWidth || 320;
    canvas.width = largura * 2;
    canvas.height = altura * 2;
    canvas.style.width = '100%';
    canvas.style.height = `${altura}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, altura);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    if (valorInicial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, largura, altura);
      img.src = valorInicial;
    }
  }, [altura, valorInicial]);

  const posicao = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const iniciar = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const { x, y } = posicao(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const mover = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!desenhando.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = posicao(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!temTraco) setTemTraco(true);
  };

  const encerrar = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  const limpar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={encerrar}
          onPointerLeave={encerrar}
          className="block touch-none cursor-crosshair"
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <PenLine className="w-3.5 h-3.5 text-blue-600" />
          {temTraco ? 'Assinatura registrada' : 'Assine no quadro acima'}
        </span>
        <button
          type="button"
          onClick={limpar}
          className="text-[11px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-rose-100"
        >
          <Eraser className="w-3.5 h-3.5" />
          Limpar
        </button>
      </div>
    </div>
  );
};

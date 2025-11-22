import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onSave: (dataUrl: string | null) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ label, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const getCoords = (e: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault(); // Prevent scrolling on touch
    setIsDrawing(true);
    const { x, y } = getCoords(e.nativeEvent || e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoords(e.nativeEvent || e);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas && hasSignature) {
        onSave(canvas.toDataURL('image/png'));
      }
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasSignature(false);
      onSave(null);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
        // Adjust for high DPI if needed, but simple width/height attr works for basic needs
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000000';
        }
    }
  }, []);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-end mb-1">
        <label className="text-sm font-bold text-gray-700 uppercase">{label}</label>
        <button onClick={clear} className="text-xs text-red-500 flex items-center gap-1 p-1 hover:bg-red-50 rounded">
          <X size={12} /> Wyczyść
        </button>
      </div>
      <div className="border-2 border-gray-300 border-dashed rounded-lg bg-white touch-none h-40 w-full relative">
         {!hasSignature && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 select-none">
                 Podpis tutaj
             </div>
         )}
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    </div>
  );
};

export default SignaturePad;
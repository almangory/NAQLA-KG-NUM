import React, { useRef, useState, useEffect } from 'react';
import { NUMBERS_DATA } from '../data/numbersData';
import { NumberItem } from '../types';
import { speakText, playSound, playSynthesizedBeep } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Sparkles, Trash2, ArrowLeft, ArrowRight, Palette, CheckCircle, Lightbulb } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

interface DrawingBoardProps {
  onAddStars: (amount: number, reason: string) => void;
  lang: 'ar' | 'en';
}

export default function DrawingBoard({ onAddStars, lang }: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<NumberItem>(NUMBERS_DATA[1]); // Default to 1
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#ec4899'); // Default pink
  const [brushWidth, setBrushWidth] = useState(16);
  const [isRainbow, setIsRainbow] = useState(true);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showHelper, setShowHelper] = useState(true);

  const colors = [
    { hex: '#ec4899', name: 'Pink' },
    { hex: '#3b82f6', name: 'Blue' },
    { hex: '#10b981', name: 'Green' },
    { hex: '#eab308', name: 'Yellow' },
    { hex: '#f97316', name: 'Orange' },
    { hex: '#a855f7', name: 'Purple' },
  ];

  const brushColorRef = useRef(brushColor);
  const brushWidthRef = useRef(brushWidth);
  const hasDrawnRef = useRef(hasDrawn);

  useEffect(() => {
    brushColorRef.current = brushColor;
    brushWidthRef.current = brushWidth;
    hasDrawnRef.current = hasDrawn;
  }, [brushColor, brushWidth, hasDrawn]);

  // Initialize, resize, and adapt canvas to screen sizes with ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const newWidth = Math.floor(rect.width * 2);
      const newHeight = Math.floor(rect.height * 2);

      // Save drawing content before resize
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      const hasContent = hasDrawnRef.current;

      if (hasContent && tempCtx && canvas.width > 0 && canvas.height > 0) {
        tempCtx.drawImage(canvas, 0, 0);
      }

      // Update actual canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = brushColorRef.current;
        ctx.lineWidth = brushWidthRef.current;

        // Restore saved content
        if (hasContent && tempCtx && tempCanvas.width > 0 && tempCanvas.height > 0) {
          ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width / 2, tempCanvas.height / 2);
        }
      }
    };

    // Debounce resize events with requestAnimationFrame for extreme performance
    let frameId: number;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        handleResize();
      });
    });

    const parentElement = canvas.parentElement || canvas;
    resizeObserver.observe(parentElement);

    // Initial resize call
    handleResize();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [selectedNumber]);

  // Handle stroke and brush property updates dynamically
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushWidth;
    }
  }, [brushColor, brushWidth]);

  // Prevent scroll/gesture events during touch interaction on canvas to freeze screen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventDefaultTouch = (e: TouchEvent) => {
      // If we are actively drawing on the canvas, prevent browser scroll and bounce gestures
      if (e.target === canvas) {
        e.preventDefault();
      }
    };

    // Use { passive: false } to allow e.preventDefault()
    canvas.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    canvas.addEventListener('touchmove', preventDefaultTouch, { passive: false });
    canvas.addEventListener('touchend', preventDefaultTouch, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', preventDefaultTouch);
      canvas.removeEventListener('touchmove', preventDefaultTouch);
      canvas.removeEventListener('touchend', preventDefaultTouch);
    };
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset actual dimensions to current box size
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * 2);
    canvas.height = Math.floor(rect.height * 2);
    ctx.scale(2, 2);

    // Setup initial brush properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;

    setHasDrawn(false);
    setIsCompleted(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const pos = getEventCoords(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getEventCoords(e);

    if (isRainbow) {
      const hue = (Date.now() / 10) % 360;
      ctx.strokeStyle = `hsl(${hue}, 90%, 60%)`;
    } else {
      ctx.strokeStyle = brushColor;
    }

    ctx.lineWidth = brushWidth;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getEventCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const handleClear = () => {
    initCanvas();
    playSound('click');
  };

  const handleCheck = () => {
    if (!hasDrawn || isCompleted) return;

    setIsCompleted(true);
    playSynthesizedBeep(true);
    onAddStars(3, lang === 'ar' ? `لرسم وتلوين الرقم ${selectedNumber.arabicDigit}` : `for tracing the number ${selectedNumber.englishDigit}`);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f472b6', '#38bdf8', '#34d399', '#fbbf24', '#a78bfa'],
    });

    const speakCongrat = lang === 'ar' 
      ? `رائع! أحسنت رسم الرقم ${selectedNumber.arabicWord}`
      : `Wow! Excellent job tracing the number ${selectedNumber.englishWord}`;
    speakText(speakCongrat, lang);
  };

  const changeNumber = (direction: 'next' | 'prev') => {
    playSound('click');
    const currentIndex = NUMBERS_DATA.findIndex(n => n.value === selectedNumber.value);
    let nextIndex = currentIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % NUMBERS_DATA.length;
    } else {
      nextIndex = (currentIndex - 1 + NUMBERS_DATA.length) % NUMBERS_DATA.length;
    }
    setSelectedNumber(NUMBERS_DATA[nextIndex]);
    
    // Pronounce new number
    const textToSpeak = lang === 'ar' 
      ? `دعنا نرسم الرقم ${NUMBERS_DATA[nextIndex].arabicWord}`
      : `Let's trace the number ${NUMBERS_DATA[nextIndex].englishWord}`;
    speakText(textToSpeak, lang);
  };

  const selectColor = (hex: string) => {
    playSound('click');
    setBrushColor(hex);
    setIsRainbow(false);
  };

  return (
    <div className="p-4 md:p-6" id="drawing-section">
      <div className="max-w-4xl mx-auto">
        
        {/* Sub-Header info */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-rose-500 flex items-center justify-center gap-2 drop-shadow-sm">
            <Palette className="w-8 h-8 text-rose-400 animate-bounce-slow" />
            {lang === 'ar' ? 'إبداع الأرقام واللوحة الفنية' : 'Number Creativity Art Board'}
          </h2>
          <p className="text-stone-600 font-medium text-sm md:text-base mt-1">
            {lang === 'ar' 
              ? 'تتبع الرقم بلونك المفضل وارسم لوحتك الجميلة!' 
              : 'Trace the number using your favorite colors and trace a beautiful painting!'}
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
          
          {/* Drawing Canvas Area (Priority first on mobile/tablet) */}
          <div className="order-1 lg:order-2 lg:col-span-3 flex flex-col gap-4">
            <div className="relative kids-card overflow-hidden bg-stone-50 aspect-video flex-grow min-h-[250px] sm:min-h-[300px] md:min-h-[400px]">
              
              {/* Overlay: Guide/Helper text to trace */}
              {showHelper && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-15">
                  <div className="text-[160px] md:text-[280px] font-black font-sans leading-none text-stone-900">
                    {lang === 'ar' ? selectedNumber.arabicDigit : selectedNumber.englishDigit}
                  </div>
                  <div className="text-lg md:text-3xl font-bold -mt-2 text-stone-900">
                    {lang === 'ar' ? selectedNumber.arabicWord : selectedNumber.englishWord}
                  </div>
                </div>
              )}

              {/* Display items corresponding to counts floating around */}
              <div className="absolute top-4 left-4 right-4 flex justify-center gap-2 pointer-events-none select-none">
                {Array.from({ length: selectedNumber.value }).map((_, i) => (
                  <span 
                    key={i} 
                    className="text-xl md:text-3xl animate-bounce-slow drop-shadow"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    {selectedNumber.illustrationEmoji}
                  </span>
                ))}
              </div>

              {/* Main Canvas Drawing Element */}
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full cursor-pointer touch-none z-10"
              />

              {/* Congratulations Splash */}
              {isCompleted && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-center z-20 animate-fade-in p-6">
                  <div className="bg-yellow-100 p-4 rounded-full mb-3 animate-pulse-soft">
                    <Sparkles className="w-12 h-12 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-rose-500 mb-1">
                    {lang === 'ar' ? 'لوحة فنية مدهشة! 🌟' : 'Amazing Artwork! 🌟'}
                  </h3>
                  <p className="text-stone-600 font-bold mb-4">
                    {lang === 'ar' 
                      ? `لقد ربحت 3 نجوم لتلوين الرقم ${selectedNumber.arabicWord}!` 
                      : `You earned 3 stars for coloring the number ${selectedNumber.englishWord}!`}
                  </p>
                  <button
                    onClick={() => {
                      initCanvas();
                      speakText(lang === 'ar' ? `دعنا نرسم مجدداً!` : `Let's paint again!`, lang);
                    }}
                    className="kids-btn kids-btn-pink px-6 py-2.5 text-lg"
                  >
                    {lang === 'ar' ? 'ارسم مجدداً 🎨' : 'Draw Again 🎨'}
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Menu / Toolbar */}
            <div className="kids-card p-4 flex flex-wrap items-center justify-between gap-4">
              
              {/* Brush Width & Help Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowHelper(!showHelper);
                    playSound('click');
                  }}
                  className={`p-2.5 rounded-xl border-2 transition-all ${
                    showHelper ? 'bg-indigo-100 border-indigo-400 text-indigo-600' : 'bg-stone-100 border-stone-200 text-stone-400'
                  }`}
                  title={lang === 'ar' ? 'إظهار الخطوط الإرشادية' : 'Show Guide Lines'}
                >
                  <Lightbulb className="w-5 h-5" />
                </button>

                {/* Brush Size sliders */}
                <div className="flex items-center gap-2 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200">
                  <span className="text-xs font-bold text-stone-500">{lang === 'ar' ? 'السمك:' : 'Size:'}</span>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    step="2"
                    value={brushWidth}
                    onChange={(e) => setBrushWidth(Number(e.target.value))}
                    className="w-16 md:w-28 accent-pink-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-pink-500 w-4 text-center">{brushWidth}</span>
                </div>
              </div>

              {/* Color Swatch Panel */}
              <div className="flex flex-wrap items-center gap-2">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => selectColor(c.hex)}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-95"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: brushColor === c.hex && !isRainbow ? '#1e293b' : '#ffffff',
                      boxShadow: brushColor === c.hex && !isRainbow ? '0 0 8px rgba(0,0,0,0.3)' : 'none'
                    }}
                    title={c.name}
                  />
                ))}

                {/* Rainbow/Magic Brush option */}
                <button
                  onClick={() => {
                    setIsRainbow(true);
                    playSound('click');
                  }}
                  className={`px-3 py-1.5 rounded-full font-black text-xs border-2 text-white bg-linear-to-r from-red-400 via-yellow-400 to-blue-400 transition-transform hover:scale-105 ${
                    isRainbow ? 'border-slate-800 ring-2 ring-white scale-105' : 'border-white'
                  }`}
                >
                  {lang === 'ar' ? 'قوس قزح 🌈' : 'Rainbow 🌈'}
                </button>
              </div>

              {/* Action Buttons: Clear & Validate */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  className="kids-btn kids-btn-orange px-4 py-2 text-sm flex items-center gap-2"
                  disabled={isCompleted}
                >
                  <Trash2 className="w-4 h-4" />
                  {lang === 'ar' ? 'مسح اللوحة' : 'Clear Board'}
                </button>

                <button
                  onClick={handleCheck}
                  className={`kids-btn kids-btn-green px-5 py-2 text-sm flex items-center gap-2 ${
                    !hasDrawn || isCompleted ? 'opacity-50 cursor-not-allowed border-b-0' : ''
                  }`}
                  disabled={!hasDrawn || isCompleted}
                >
                  <CheckCircle className="w-4 h-4" />
                  {lang === 'ar' ? 'أنهيت الرسم! ✨' : 'Finished! ✨'}
                </button>
              </div>

            </div>

            {/* Voice Recorder for Pronunciation Confidence */}
            <div className="mt-2">
              <VoiceRecorder
                numberValue={selectedNumber.value}
                numberWord={lang === 'ar' ? selectedNumber.arabicWord : selectedNumber.englishWord}
                lang={lang}
                onAddStars={onAddStars}
              />
            </div>

          </div>

          {/* Left Sidebar: Select Number (Secondary, ordered last and highly compact on mobile/tablets) */}
          <div className="order-2 lg:order-1 lg:col-span-1 kids-card p-4 flex flex-col sm:flex-row lg:flex-col items-center justify-between gap-4">
            <span className="text-xs font-black text-stone-400 tracking-wider uppercase sm:hidden lg:block shrink-0">
              {lang === 'ar' ? 'اختر رقماً للرسم' : 'Select a Number'}
            </span>

            {/* Slider Controls */}
            <div className="flex items-center justify-between w-full sm:w-1/3 lg:w-full shrink-0">
              <button 
                onClick={() => changeNumber('prev')}
                className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-600 rounded-full border-2 border-amber-300 transition-transform active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center px-2">
                <span className="text-4xl lg:text-6xl font-black text-indigo-600 drop-shadow-sm animate-bounce-slow">
                  {lang === 'ar' ? selectedNumber.arabicDigit : selectedNumber.englishDigit}
                </span>
                <span className="text-xs font-bold text-stone-500 mt-0.5">
                  {lang === 'ar' ? selectedNumber.arabicWord : selectedNumber.englishWord}
                </span>
              </div>

              <button 
                onClick={() => changeNumber('next')}
                className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-600 rounded-full border-2 border-amber-300 transition-transform active:scale-95 shrink-0"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Quick grid selector - Scrollable row on mobile, full grid on desktop */}
            <div className="flex sm:grid sm:grid-cols-5 lg:grid-cols-4 gap-2 w-full overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 pt-3 lg:pt-4 border-t-2 sm:border-t-0 lg:border-t-2 sm:border-l lg:border-l-0 lg:border-dashed border-stone-100/60 pl-0 sm:pl-4 lg:pl-0">
              {NUMBERS_DATA.map((num) => (
                <button
                  key={num.value}
                  onClick={() => {
                    setSelectedNumber(num);
                    playSound('click');
                    speakText(lang === 'ar' ? num.arabicWord : num.englishWord, lang);
                  }}
                  className={`py-1.5 px-3 sm:px-1 rounded-xl font-bold text-sm border-2 transition-all shrink-0 ${
                    selectedNumber.value === num.value
                      ? 'bg-rose-500 text-white border-rose-600 scale-105 shadow-sm'
                      : 'bg-rose-50/50 border-rose-100 text-rose-500 hover:bg-rose-100'
                  }`}
                >
                  {lang === 'ar' ? num.arabicDigit : num.englishDigit}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

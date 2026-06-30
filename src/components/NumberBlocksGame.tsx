import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Sparkles, HelpCircle } from 'lucide-react';
import { speakText, playSound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface NumberBlocksGameProps {
  lang: 'ar' | 'en';
  onAddStars: (amount: number, reason: string) => void;
  onBack: () => void;
}

interface BlockItem {
  id: number;
  value: number;
  color: string;
  borderColor: string;
  textColor: string;
  emojiEye: string;
  emojiMouth: string;
  isPlaced: boolean;
}

const BLOCK_COLORS = [
  { bg: 'from-rose-400 to-rose-500', border: 'border-rose-600', text: 'text-white', eye: '👀', mouth: '👄' },
  { bg: 'from-orange-400 to-orange-500', border: 'border-orange-600', text: 'text-white', eye: '👓', mouth: '😀' },
  { bg: 'from-amber-400 to-amber-500', border: 'border-amber-600', text: 'text-stone-800', eye: '👑', mouth: '😜' },
  { bg: 'from-emerald-400 to-emerald-500', border: 'border-emerald-600', text: 'text-white', eye: '🟩', mouth: '😮' },
  { bg: 'from-sky-400 to-sky-500', border: 'border-sky-600', text: 'text-white', eye: '✨', mouth: '🤩' },
  { bg: 'from-purple-400 to-purple-500', border: 'border-purple-600', text: 'text-white', eye: '💜', mouth: '🤡' },
  { bg: 'from-pink-400 to-pink-500', border: 'border-pink-600', text: 'text-white', eye: '🌈', mouth: '🥰' },
];

export default function NumberBlocksGame({ lang, onAddStars, onBack }: NumberBlocksGameProps) {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [targetSlots, setTargetSlots] = useState<number[]>([]);
  const [isWon, setIsWon] = useState(false);
  
  // Drag state
  const [draggingBlockId, setDraggingBlockId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });
  
  // Ref for the playground container to calculate relative offsets
  const playgroundRef = useRef<HTMLDivElement>(null);
  // Refs for slot elements to check boundaries/collisions
  const slotRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const startNewGame = (diff = difficulty) => {
    playSound('click');
    setIsWon(false);
    setDraggingBlockId(null);

    // Set number range based on difficulty
    let range = 3; // easy: 1-3
    if (diff === 'medium') range = 5; // medium: 1-5
    if (diff === 'hard') range = 7; // hard: 1-7

    // Set target slots in correct order [1, 2, 3...]
    const slots = Array.from({ length: range }, (_, i) => i + 1);
    setTargetSlots(slots);

    // Create block items
    const generatedBlocks: BlockItem[] = slots.map((val) => {
      const colorSpec = BLOCK_COLORS[(val - 1) % BLOCK_COLORS.length];
      return {
        id: val,
        value: val,
        color: colorSpec.bg,
        borderColor: colorSpec.border,
        textColor: colorSpec.text,
        emojiEye: colorSpec.eye,
        emojiMouth: colorSpec.mouth,
        isPlaced: false,
      };
    });

    // Scramble blocks (random sorting)
    const scrambled = [...generatedBlocks].sort(() => Math.random() - 0.5);
    setBlocks(scrambled);

    const welcomeMsg = lang === 'ar'
      ? `لعبة ترتيب مكعبات الأرقام! اسحب المكعبات الملونة ورتبها بالتسلسل الصحيح من الأصغر إلى الأكبر`
      : `Arrange the number blocks in the correct order from smallest to largest! Drag them into their matching slots!`;
    speakText(welcomeMsg, lang);
  };

  useEffect(() => {
    startNewGame(difficulty);
  }, [difficulty]);

  // Pointer Down handler
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>, block: BlockItem) => {
    if (block.isPlaced || isWon) return;
    e.preventDefault();
    
    // Set touch capture
    const currentTarget = e.currentTarget;
    currentTarget.setPointerCapture(e.pointerId);

    const rect = currentTarget.getBoundingClientRect();
    const containerRect = playgroundRef.current?.getBoundingClientRect();

    if (containerRect) {
      // Position relative to the container
      const startX = rect.left - containerRect.left;
      const startY = rect.top - containerRect.top;
      
      setOriginalPosition({ x: startX, y: startY });
      setDragPosition({ x: startX, y: startY });
      
      // Offset from pointer to block's top-left corner
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      
      setDraggingBlockId(block.id);
      playSound('click');
      speakText(block.value.toString(), lang);
    }
  };

  // Pointer Move handler
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingBlockId === null || !playgroundRef.current) return;
    e.preventDefault();

    const containerRect = playgroundRef.current.getBoundingClientRect();
    
    // Calculate new position relative to the playground container
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;

    setDragPosition({ x, y });
  };

  // Pointer Up / Drop handler
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>, block: BlockItem) => {
    if (draggingBlockId === null) return;
    e.preventDefault();
    e.currentTarget.releasePointerCapture(e.pointerId);

    // Find if the dragged block is dropped near its correct target slot
    const targetSlotVal = block.value;
    const slotElement = slotRefs.current[targetSlotVal];
    let isSuccessDrop = false;

    if (slotElement && playgroundRef.current) {
      const slotRect = slotElement.getBoundingClientRect();
      const containerRect = playgroundRef.current.getBoundingClientRect();
      
      // Slot coordinates relative to the playground container
      const slotX = slotRect.left - containerRect.left;
      const slotY = slotRect.top - containerRect.top;

      // Distance from the dragged block position to the slot position
      const dx = dragPosition.x - slotX;
      const dy = dragPosition.y - slotY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Dropping tolerance (e.g., within 65 pixels)
      if (distance < 65) {
        isSuccessDrop = true;
      }
    }

    if (isSuccessDrop) {
      // Block placed successfully!
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, isPlaced: true } : b))
      );
      playSound('star');
      
      // Dynamic congratulatory message for this block
      const cheers = lang === 'ar' 
        ? `رائع! الرقم ${block.value} في مكانه الصحيح!`
        : `Awesome! Number ${block.value} is in the right spot!`;
      speakText(cheers, lang);

      // Check if all are solved
      const updatedBlocks = blocks.map((b) => (b.id === block.id ? { ...b, isPlaced: true } : b));
      if (updatedBlocks.every((b) => b.isPlaced)) {
        setIsWon(true);
        setTimeout(() => {
          playSound('success');
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
          onAddStars(10, lang === 'ar' ? 'لترتيب مكعبات الأرقام بشكل متسلسل وممتاز!' : 'for arranging the number blocks in perfect sequence!');
          speakText(
            lang === 'ar'
              ? 'يا لك من بطل ذكي! رتبت جميع المكعبات بشكل صحيح تماماً!'
              : 'You are an amazing champion! You arranged all the blocks perfectly!',
            lang
          );
        }, 500);
      }
    } else {
      // Back to tray/scrambled line
      playSound('wrong');
    }

    setDraggingBlockId(null);
  };

  // Safe fallback Tap-to-Place (for smaller screens/elder devices)
  const handleTapBlock = (block: BlockItem) => {
    if (block.isPlaced || isWon || draggingBlockId !== null) return;
    
    // Automatically check and place in the correct slot
    setBlocks((prev) =>
      prev.map((b) => (b.id === block.id ? { ...b, isPlaced: true } : b))
    );
    playSound('star');

    const cheers = lang === 'ar' 
      ? `رائع! الرقم ${block.value} في مكانه الصحيح!`
      : `Awesome! Number ${block.value} is in the right spot!`;
    speakText(cheers, lang);

    const updatedBlocks = blocks.map((b) => (b.id === block.id ? { ...b, isPlaced: true } : b));
    if (updatedBlocks.every((b) => b.isPlaced)) {
      setIsWon(true);
      setTimeout(() => {
        playSound('success');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        onAddStars(10, lang === 'ar' ? 'لترتيب مكعبات الأرقام بشكل متسلسل وممتاز!' : 'for arranging the number blocks in perfect sequence!');
      }, 500);
    }
  };

  return (
    <div className="kids-card p-4 md:p-6 border-emerald-200 bg-white shadow-md relative overflow-hidden">
      
      {/* Upper header controls */}
      <div className="flex justify-between items-center border-b-2 border-dashed border-stone-100 pb-3 mb-4">
        <button
          onClick={onBack}
          className="kids-btn bg-stone-100 border-stone-300 text-stone-600 px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
        </button>

        <span className="font-black text-emerald-700 text-sm md:text-base flex items-center gap-1">
          <span>🧱</span>
          <span>{lang === 'ar' ? 'رتب مكعبات الأرقام الضاحكة' : 'Arrange Smiling Number Blocks'}</span>
        </span>

        <button
          onClick={() => startNewGame()}
          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full border border-emerald-200 transition-all"
          title={lang === 'ar' ? 'إعادة تشغيل' : 'Restart'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Difficulty selector tabs */}
      <div className="flex items-center justify-center gap-2 mb-5">
        <span className="text-xs font-bold text-stone-500 mr-1">
          {lang === 'ar' ? 'مستوى الصعوبة:' : 'Difficulty:'}
        </span>
        {(['easy', 'medium', 'hard'] as const).map((diff) => (
          <button
            key={diff}
            onClick={() => setDifficulty(diff)}
            className={`px-3 py-1 rounded-full text-xs font-black border transition-all cursor-pointer ${
              difficulty === diff
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
            }`}
          >
            {diff === 'easy' && (lang === 'ar' ? 'سهل (1-3)' : 'Easy (1-3)')}
            {diff === 'medium' && (lang === 'ar' ? 'متوسط (1-5)' : 'Medium (1-5)')}
            {diff === 'hard' && (lang === 'ar' ? 'صعب (1-7)' : 'Hard (1-7)')}
          </button>
        ))}
      </div>

      {/* Tip helper banner */}
      <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 text-center mb-6">
        <p className="text-xs font-bold text-stone-600 leading-relaxed flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-bounce" />
          <span>
            {lang === 'ar'
              ? 'اسحب المكعبات وضَعها في مكانها المناسب، أو انقر عليها لتطير تلقائياً لمكانها!'
              : 'Drag blocks and place them into matching slots, or tap them to fly to their slots!'}
          </span>
        </p>
      </div>

      {/* Main Drag-and-Drop Area */}
      <div 
        ref={playgroundRef}
        className="bg-linear-to-b from-sky-50 to-indigo-50/40 rounded-3xl p-6 border-2 border-dashed border-sky-100 relative min-h-[300px] flex flex-col justify-between gap-8 select-none overflow-hidden touch-none"
      >
        
        {/* Top Section: Target Empty/Outline Slots in order (1, 2, 3...) */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            {lang === 'ar' ? 'الرف المستهدف (الترتيب التصاعدي) 🎯' : 'Target Shelf (Ascending Order) 🎯'}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 w-full">
            {targetSlots.map((val) => {
              const placedBlock = blocks.find((b) => b.value === val && b.isPlaced);
              return (
                <div
                  key={val}
                  ref={(el) => { slotRefs.current[val] = el; }}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all relative ${
                    placedBlock 
                      ? 'border-transparent bg-transparent shadow-none scale-102' 
                      : 'border-indigo-200 bg-white/50 text-indigo-300 shadow-xs'
                  }`}
                >
                  {placedBlock ? (
                    // Render the snapped/placed block here in its exact slot
                    <div 
                      className={`w-full h-full rounded-xl border-b-4 flex flex-col items-center justify-center shadow-md bg-gradient-to-br ${placedBlock.color} ${placedBlock.borderColor} transform animate-scale-up`}
                    >
                      <span className={`text-xl md:text-2xl font-extrabold ${placedBlock.textColor}`}>{placedBlock.value}</span>
                      <div className="flex items-center gap-0.5 text-[10px] opacity-90 mt-0.5">
                        <span>{placedBlock.emojiEye}</span>
                        <span>{placedBlock.emojiMouth}</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Empty Hint indicator */}
                      <span className="text-sm font-black text-indigo-200 font-mono">?</span>
                      <span className="text-[9px] text-indigo-300 font-bold opacity-60 mt-0.5">
                        {lang === 'ar' ? `رقم ${val}` : `#${val}`}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Scrambled Blocks tray (draggable items) */}
        <div className="flex flex-col items-center gap-2 pt-4 border-t border-indigo-100/40">
          <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 bg-stone-50 px-2.5 py-0.5 rounded-full">
            {lang === 'ar' ? 'حوض مكعبات الأرقام المبعثرة 🧺' : 'Scrambled Blocks Tray 🧺'}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-3 w-full min-h-[70px]">
            {blocks.map((block) => {
              if (block.isPlaced) {
                // Return spacer/placeholder to keep visual rhythm, or simply nothing to vanish it
                return (
                  <div key={block.id} className="w-14 h-14 md:w-16 md:h-16 opacity-0" />
                );
              }

              const isCurrentDrag = draggingBlockId === block.id;

              return (
                <div
                  key={block.id}
                  onPointerDown={(e) => handlePointerDown(e, block)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={(e) => handlePointerUp(e, block)}
                  onClick={() => handleTapBlock(block)}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-xl border-b-4 flex flex-col items-center justify-center shadow-md cursor-grab active:cursor-grabbing transition-all select-none bg-gradient-to-br ${
                    block.color
                  } ${block.borderColor} ${
                    isCurrentDrag 
                      ? 'absolute z-50 opacity-90 scale-115 pointer-events-none' 
                      : 'hover:scale-105 active:scale-95'
                  }`}
                  style={
                    isCurrentDrag
                      ? {
                          left: `${dragPosition.x}px`,
                          top: `${dragPosition.y}px`,
                          position: 'absolute',
                        }
                      : undefined
                  }
                >
                  <span className={`text-xl md:text-2xl font-black ${block.textColor}`}>{block.value}</span>
                  <div className="flex items-center gap-0.5 text-[10px] mt-0.5">
                    <span>{block.emojiEye}</span>
                    <span>{block.emojiMouth}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Won screen / Overlay summary */}
      {isWon && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl animate-fade-in">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-4xl mb-3 animate-bounce shadow-md border-2 border-yellow-300">
            🏆
          </div>
          <h3 className="text-xl font-black text-amber-700">
            {lang === 'ar' ? 'يا لك من مهندس بارع ومذهل!' : 'Awesome Job, Master Builder!'}
          </h3>
          <p className="text-xs text-stone-600 font-bold max-w-sm mt-1 mb-5">
            {lang === 'ar'
              ? 'لقد قمت بترتيب المكعبات تصاعدياً بالشكل الصحيح وكسبت 10 نجوم ذهبية! ⭐'
              : 'You have arranged all the number blocks correctly and earned 10 golden stars! ⭐'}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => startNewGame()}
              className="kids-btn kids-btn-green px-6 py-2.5 text-xs font-black flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{lang === 'ar' ? 'لعب من جديد 🔄' : 'Play Again 🔄'}</span>
            </button>

            <button
              onClick={onBack}
              className="kids-btn bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700 px-6 py-2.5 text-xs font-bold"
            >
              {lang === 'ar' ? 'القائمة الرئيسية 🔙' : 'Main Menu 🔙'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

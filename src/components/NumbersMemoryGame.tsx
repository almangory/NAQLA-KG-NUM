import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Sparkles, ChevronRight, HelpCircle } from 'lucide-react';
import { speakText, playSound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface NumbersMemoryGameProps {
  lang: 'ar' | 'en';
  onAddStars: (amount: number, reason: string) => void;
  onBack: () => void;
}

interface MemoryCard {
  id: string;
  type: 'number' | 'count';
  value: number; // e.g. 3
  content: string | React.ReactNode; // e.g. "3" or "🍎 🍎 🍎"
  isFlipped: boolean;
  isMatched: boolean;
}

interface LevelConfig {
  level: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  numbers: number[];
  emoji: string;
  starsReward: number;
}

const MEMORY_LEVELS: LevelConfig[] = [
  {
    level: 1,
    nameAr: 'المرحلة 1: بداية البطل الصغير (1-4)',
    nameEn: 'Stage 1: Little Champion (1-4)',
    descriptionAr: 'طابق كل رقم مع عدد الأشكال الصحيحة المقابلة له! 🌟',
    descriptionEn: 'Match each number card with its corresponding count shapes! 🌟',
    numbers: [1, 2, 3, 4],
    emoji: '🍎',
    starsReward: 5,
  },
  {
    level: 2,
    nameAr: 'المرحلة 2: تحدي الذكاء المتقدم (5-8)',
    nameEn: 'Stage 2: Advanced Brain Gym (5-8)',
    descriptionAr: 'المستوى أعلى! طابق الأرقام الأكبر مع أشكال الأرنب اللذيذة! 🐰',
    descriptionEn: 'Level up! Match larger numbers with friendly bunny counts! 🐰',
    numbers: [5, 6, 7, 8],
    emoji: '⭐',
    starsReward: 10,
  },
  {
    level: 3,
    nameAr: 'المرحلة 3: التحدي المطلق العظيم (1-6)',
    nameEn: 'Stage 3: Grand Memory Master (1-6)',
    descriptionAr: 'لأذكياء KG2 فقط! طابق 12 بطاقة منوعة من الأرقام والأشكال! 🏆',
    descriptionEn: 'For KG2 geniuses! Match 12 cards of mixed numbers and icons! 🏆',
    numbers: [1, 2, 3, 4, 5, 6],
    emoji: '🎈',
    starsReward: 15,
  }
];

// Helper to generate shapes string or layout
const getEmojiCountString = (num: number, emoji: string): string => {
  return Array(num).fill(emoji).join(' ');
};

export default function NumbersMemoryGame({ lang, onAddStars, onBack }: NumbersMemoryGameProps) {
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [movesCount, setMovesCount] = useState<number>(0);
  const [isLevelCleared, setIsLevelCleared] = useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [isBusy, setIsBusy] = useState<boolean>(false);

  const activeLevel = MEMORY_LEVELS[currentLevelIdx];

  const initializeLevel = (levelIdx: number) => {
    setIsLevelCleared(false);
    setFlippedIndices([]);
    setMovesCount(0);
    setIsBusy(false);

    const spec = MEMORY_LEVELS[levelIdx];
    const generatedCards: MemoryCard[] = [];

    spec.numbers.forEach((num) => {
      // 1. Create Number card
      generatedCards.push({
        id: `${num}-number`,
        type: 'number',
        value: num,
        content: String(num),
        isFlipped: false,
        isMatched: false
      });

      // 2. Create Shapes Count card
      generatedCards.push({
        id: `${num}-count`,
        type: 'count',
        value: num,
        content: getEmojiCountString(num, spec.emoji),
        isFlipped: false,
        isMatched: false
      });
    });

    // Shuffle cards
    const shuffled = generatedCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);

    // Audio instruction intro
    const introMsg = lang === 'ar'
      ? `لعبة الذاكرة للأرقام! ${spec.nameAr}. ${spec.descriptionAr}`
      : `Numbers Memory Game! ${spec.nameEn}. ${spec.descriptionEn}`;
    speakText(introMsg, lang);
  };

  useEffect(() => {
    initializeLevel(currentLevelIdx);
  }, [currentLevelIdx]);

  const handleCardClick = (clickedIdx: number) => {
    if (isBusy || isLevelCleared) return;
    const card = cards[clickedIdx];

    // Ignore if already flipped or matched
    if (card.isFlipped || card.isMatched) return;

    // Flip the clicked card
    playSound('click');
    const updatedCards = [...cards];
    updatedCards[clickedIdx].isFlipped = true;
    setCards(updatedCards);

    // Read the card's value/content aloud
    const spokenContent = card.type === 'number'
      ? (lang === 'ar' ? `الرقم ${card.value}` : `Number ${card.value}`)
      : (lang === 'ar' ? `${card.value} من الأشكال` : `${card.value} items`);
    speakText(spokenContent, lang);

    const newFlipped = [...flippedIndices, clickedIdx];
    setFlippedIndices(newFlipped);

    // If we flipped two cards, check for match
    if (newFlipped.length === 2) {
      setIsBusy(true);
      setMovesCount((prev) => prev + 1);

      const firstIdx = newFlipped[0];
      const secondIdx = newFlipped[1];
      const firstCard = cards[firstIdx];
      const secondCard = cards[secondIdx];

      if (firstCard.value === secondCard.value) {
        // Matched!
        setTimeout(() => {
          playSound('balloonPop');
          const matchedCards = cards.map((c, idx) => {
            if (idx === firstIdx || idx === secondIdx) {
              return { ...c, isMatched: true };
            }
            return c;
          });
          setCards(matchedCards);
          setFlippedIndices([]);
          setIsBusy(false);

          // Congratulate match
          const matchMsg = lang === 'ar'
            ? `ممتاز! الرقم ${firstCard.value} يطابق ${firstCard.value} من الأشكال!`
            : `Great! Number ${firstCard.value} matches ${firstCard.value} items!`;
          speakText(matchMsg, lang);

          // Check if all matched
          const allMatched = matchedCards.every((c) => c.isMatched);
          if (allMatched) {
            handleLevelCleared();
          }
        }, 800);

      } else {
        // No match - Flip back over
        setTimeout(() => {
          playSound('wrong');
          const resetCards = cards.map((c, idx) => {
            if (idx === firstIdx || idx === secondIdx) {
              return { ...c, isFlipped: false };
            }
            return c;
          });
          setCards(resetCards);
          setFlippedIndices([]);
          setIsBusy(false);
        }, 1200);
      }
    }
  };

  const handleLevelCleared = () => {
    playSound('success');
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 }
    });

    setIsLevelCleared(true);
    onAddStars(activeLevel.starsReward, lang === 'ar'
      ? `لإنهاء ${activeLevel.nameAr} في لعبة الذاكرة للأرقام والأشكال!`
      : `for finishing ${activeLevel.nameEn} in the Numbers Memory game!`
    );

    const congratsMsg = lang === 'ar'
      ? `يا بطل! لقد طابقت جميع البطاقات بنجاح كامل! حصلت على ${activeLevel.starsReward} نجوم ذهبية! ⭐`
      : `Fantastic! You matched all cards perfectly! You earned ${activeLevel.starsReward} gold stars! ⭐`;
    speakText(congratsMsg, lang);
  };

  const handleNextLevel = () => {
    playSound('click');
    if (currentLevelIdx < MEMORY_LEVELS.length - 1) {
      setCurrentLevelIdx((prev) => prev + 1);
    } else {
      setIsGameFinished(true);
      playSound('success');
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.5 }
      });
      speakText(
        lang === 'ar'
          ? 'رائع ومذهل جداً! لقد أكملت جميع مستويات الذاكرة بنجاح وأصبحت عبقري الأرقام الأول!'
          : 'Stellar! You solved every level of the memory layout and proved your master memory skills!',
        lang
      );
    }
  };

  const resetGame = () => {
    playSound('click');
    setCurrentLevelIdx(0);
    setIsGameFinished(false);
    initializeLevel(0);
  };

  return (
    <div className="kids-card p-4 md:p-6 border-pink-200 bg-white shadow-md relative overflow-hidden select-none">
      
      {/* Header controls */}
      <div className="flex justify-between items-center border-b-2 border-dashed border-stone-100 pb-3 mb-4">
        <button
          onClick={onBack}
          className="kids-btn bg-stone-100 border-stone-300 text-stone-600 px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
        </button>

        <span className="font-black text-pink-700 text-sm md:text-base flex items-center gap-1.5 animate-pulse-soft">
          <span>🧠</span>
          <span>{lang === 'ar' ? 'لعبة ذاكرة الأرقام والأشكال' : 'Numbers Memory Matching'}</span>
        </span>

        <button
          onClick={() => initializeLevel(currentLevelIdx)}
          className="p-2 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-full border border-pink-200 transition-all"
          title={lang === 'ar' ? 'إعادة تشغيل' : 'Restart'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stage Progression Bar */}
      <div className="flex justify-between items-center bg-stone-50 rounded-2xl p-3 border border-stone-200/50 mb-5">
        <span className="text-xs font-black text-stone-500">
          {lang === 'ar' ? 'مراحل التركيز:' : 'Focus Stages:'}
        </span>
        <div className="flex gap-2.5">
          {MEMORY_LEVELS.map((lvl, index) => (
            <div
              key={lvl.level}
              className={`px-3 py-1 rounded-full text-xs font-black border transition-all ${
                index === currentLevelIdx
                  ? 'bg-pink-500 text-white border-pink-600 shadow-sm'
                  : index < currentLevelIdx
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-white text-stone-400 border-stone-200'
              }`}
            >
              {lang === 'ar' ? `مستوى ${lvl.level}` : `Level ${lvl.level}`}
            </div>
          ))}
        </div>
      </div>

      {/* Level instructions */}
      <div className="bg-pink-50/50 rounded-2xl p-3 border border-pink-100 text-center mb-6">
        <p className="text-xs md:text-sm font-black text-stone-700 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4.5 h-4.5 text-yellow-500 animate-spin-slow" />
          <span>
            {lang === 'ar' ? activeLevel.descriptionAr : activeLevel.descriptionEn}
          </span>
        </p>
      </div>

      {/* Stats counter */}
      <div className="flex justify-center gap-6 mb-6">
        <div className="bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full text-xs font-black text-amber-800">
          {lang === 'ar' ? `الحركات المنجزة: ${movesCount}` : `Moves: ${movesCount}`}
        </div>
      </div>

      {/* Memory Cards Grid Layout */}
      <div className={`grid gap-4 max-w-3xl mx-auto ${
        cards.length <= 8 
          ? 'grid-cols-2 sm:grid-cols-4' 
          : 'grid-cols-3 sm:grid-cols-4'
      }`}>
        {cards.map((card, idx) => {
          const isOpen = card.isFlipped || card.isMatched;

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(idx)}
              className="aspect-square cursor-pointer select-none perspective-500"
            >
              {/* Card Inner container supporting beautiful 3D flipping */}
              <div
                className={`w-full h-full relative duration-500 transform-style-3d transition-transform ${
                  isOpen ? 'rotate-y-180' : ''
                }`}
              >
                {/* BACK OF CARD: Face Down */}
                <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-indigo-100 to-indigo-50 border-3 border-indigo-300 rounded-2xl shadow-sm flex flex-col items-center justify-center p-2 hover:border-indigo-400 transition-colors">
                  <span className="text-3xl md:text-4xl animate-pulse-soft">❓</span>
                  <span className="text-[9px] text-indigo-400 font-extrabold mt-1">
                    {lang === 'ar' ? 'اكشفني' : 'Flip Me'}
                  </span>
                </div>

                {/* FRONT OF CARD: Face Up (Numbers or Shapes) */}
                <div
                  className={`absolute inset-0 backface-hidden rotate-y-180 rounded-2xl border-3 shadow-md flex flex-col items-center justify-center p-3 text-center ${
                    card.isMatched
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : card.type === 'number'
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-sky-50 border-sky-300 text-sky-800'
                  }`}
                >
                  {card.type === 'number' ? (
                    <span className="text-4xl md:text-5xl font-black font-mono">
                      {card.content}
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 text-base md:text-xl leading-tight">
                      {card.content}
                    </div>
                  )}

                  {/* Cute small label tag inside front */}
                  <span className={`text-[8px] font-black uppercase mt-2 px-1.5 py-0.2 rounded-md ${
                    card.isMatched 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-white/70 text-stone-500'
                  }`}>
                    {card.isMatched 
                      ? (lang === 'ar' ? 'مكتمل' : 'Matched')
                      : (card.type === 'number' ? (lang === 'ar' ? 'رقم' : 'Number') : (lang === 'ar' ? 'عدّ' : 'Count'))
                    }
                  </span>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Stage Cleared Modal Overlay */}
      {isLevelCleared && !isGameFinished && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mb-4 animate-bounce shadow-md border-2 border-emerald-300">
            🧠
          </div>
          <h3 className="text-xl font-black text-emerald-700">
            {lang === 'ar' ? 'أنت عبقري حقيقي!' : 'Mastermind Memory!'}
          </h3>
          <p className="text-xs text-stone-600 font-bold max-w-xs mt-1 mb-6">
            {lang === 'ar'
              ? `لقد طابقت كل رقم بصورته الصحيحة وحصلت على ${activeLevel.starsReward} نجوم! ⭐`
              : `You matched every number with its icons and won ${activeLevel.starsReward} stars! ⭐`}
          </p>

          <button
            onClick={handleNextLevel}
            className="kids-btn kids-btn-green px-8 py-3 text-xs font-black flex items-center gap-1.5"
          >
            <span>
              {currentLevelIdx < MEMORY_LEVELS.length - 1
                ? (lang === 'ar' ? 'المرحلة التالية من الذكاء ➡️' : 'Next Intelligence Stage ➡️')
                : (lang === 'ar' ? 'الحصول على الكأس النهائي 🏆' : 'Claim Ultimate Crown Cup 🏆')}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Entire Game Finished Modal Overlay */}
      {isGameFinished && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl animate-fade-in">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center text-5xl mb-4 animate-bounce shadow-md border-2 border-yellow-300">
            👑
          </div>
          <h3 className="text-2xl font-black text-amber-700">
            {lang === 'ar' ? 'عبقري الذاكرة الذهبية! 🌟' : 'Grand Memory Master! 🌟'}
          </h3>
          <p className="text-xs md:text-sm text-stone-600 font-bold max-w-sm mt-1 mb-6 leading-relaxed">
            {lang === 'ar'
              ? 'يا لك من بطل ذكي وموهوب! لقد طابقت جميع مستويات الذاكرة والتركيز بنجاح فاق التوقعات!'
              : 'Absolutely stellar performance! You completed all levels of numbers and icons pairing and reached maximum concentration!'}
          </p>

          <div className="flex gap-3">
            <button
              onClick={resetGame}
              className="kids-btn kids-btn-green px-6 py-2.5 text-xs font-black flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إعادة التحدي 🔄' : 'Replay Game 🔄'}</span>
            </button>

            <button
              onClick={onBack}
              className="kids-btn bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700 px-6 py-2.5 text-xs font-bold"
            >
              {lang === 'ar' ? 'قائمة الألعاب الرئيسية 🔙' : 'Main Menu 🔙'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

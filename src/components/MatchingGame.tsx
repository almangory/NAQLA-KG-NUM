import React, { useState, useEffect } from 'react';
import { NUMBERS_DATA } from '../data/numbersData';
import { speakText, playSound, playSynthesizedBeep } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Shuffle, RefreshCw, Award, Sparkles, Check } from 'lucide-react';

interface MatchingGameProps {
  onAddStars: (amount: number, reason: string) => void;
  lang: 'ar' | 'en';
}

interface MatchCard {
  id: string;
  value: number; // The target number value (e.g. 3)
  type: 'left' | 'right'; // Left holds digits, right holds emoji representations
  content: string; // Left: '3' or '٣', Right: '🍓🍓🍓'
  word: string; // Left: "Three" or "ثلاثة"
  color: string;
}

export default function MatchingGame({ onAddStars, lang }: MatchingGameProps) {
  const [leftCards, setLeftCards] = useState<MatchCard[]>([]);
  const [rightCards, setRightCards] = useState<MatchCard[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<MatchCard | null>(null);
  const [selectedRight, setSelectedRight] = useState<MatchCard | null>(null);
  const [matchedValues, setMatchedValues] = useState<number[]>([]);
  const [gameWon, setGameWon] = useState(false);
  const [errorCardIds, setErrorCardIds] = useState<string[]>([]);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    // Select 4 random unique numbers from our database
    const shuffledData = [...NUMBERS_DATA].sort(() => Math.random() - 0.5);
    const selectedNums = shuffledData.slice(0, 4);

    // Create Left cards (Digits)
    const left: MatchCard[] = selectedNums.map((num, i) => ({
      id: `left-${num.value}`,
      value: num.value,
      type: 'left',
      content: lang === 'ar' ? num.arabicDigit : num.englishDigit,
      word: lang === 'ar' ? num.arabicWord : num.englishWord,
      color: num.color,
    }));

    // Create Right cards (Illustrations)
    const right: MatchCard[] = selectedNums.map((num, i) => ({
      id: `right-${num.value}`,
      value: num.value,
      type: 'right',
      content: Array(num.value).fill(num.illustrationEmoji).join(' '),
      word: lang === 'ar' ? `${num.value} ${num.illustrationNameAr}` : `${num.value} ${num.illustrationNameEn}`,
      color: num.color,
    }));

    // Shuffle left and right independently
    setLeftCards(left.sort(() => Math.random() - 0.5));
    setRightCards(right.sort(() => Math.random() - 0.5));
    
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedValues([]);
    setGameWon(false);
    setErrorCardIds([]);

    // Welcome prompt
    speakText(
      lang === 'ar' 
        ? 'طابق الأرقام مع الرسوم الصحيحة يا بطل!' 
        : 'Match the numbers with the correct drawings, little hero!',
      lang
    );
  };

  const handleCardClick = (card: MatchCard) => {
    if (matchedValues.includes(card.value)) return; // Already matched
    playSound('cardFlip');

    if (card.type === 'left') {
      setSelectedLeft(card);
      speakText(lang === 'ar' ? card.word : card.word, lang);
      
      // If right was already selected, evaluate match
      if (selectedRight) {
        evaluateMatch(card, selectedRight);
      }
    } else {
      setSelectedRight(card);
      
      // Speak right card contents e.g. "Three Strawberries"
      speakText(card.word, lang);

      // If left was already selected, evaluate match
      if (selectedLeft) {
        evaluateMatch(selectedLeft, card);
      }
    }
  };

  const evaluateMatch = (left: MatchCard, right: MatchCard) => {
    if (left.value === right.value) {
      // SUCCESS MATCH!
      const newVal = [...matchedValues, left.value];
      setMatchedValues(newVal);
      setSelectedLeft(null);
      setSelectedRight(null);
      playSynthesizedBeep(true);
      onAddStars(1, lang === 'ar' ? 'لمطابقة رقم صحيحة!' : 'for a correct number match!');

      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.8 },
      });

      // Speak match success
      const matchSuccessSpeech = lang === 'ar'
        ? `رائع! الرقم ${left.content} يطابق الرسوم`
        : `Great! The number ${left.content} matches the items!`;
      speakText(matchSuccessSpeech, lang);

      // Check if game won
      if (newVal.length === 4) {
        setTimeout(() => {
          setGameWon(true);
          playSynthesizedBeep(true);
          onAddStars(4, lang === 'ar' ? 'لإتمام لعبة المطابقة بالكامل!' : 'for completing the matching game!');
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.5 },
          });
          speakText(
            lang === 'ar'
              ? 'أحسنت صنعاً! لقد طابقت جميع الأرقام بمهارة عالية!'
              : 'Spectacular! You matched all the numbers successfully!',
            lang
          );
        }, 800);
      }
    } else {
      // FAIL MATCH (Shake cards)
      setErrorCardIds([left.id, right.id]);
      playSynthesizedBeep(false);

      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
        setErrorCardIds([]);
      }, 1000);
    }
  };

  return (
    <div className="p-4 md:p-6" id="match-section">
      <div className="max-w-3xl mx-auto">
        
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-indigo-500 flex items-center justify-center gap-2 drop-shadow-sm">
            <Shuffle className="w-8 h-8 text-indigo-400 animate-bounce-slow" />
            {lang === 'ar' ? 'لعبة مطابقة الأرقام والرسوم' : 'Number & Count Matching Game'}
          </h2>
          <p className="text-stone-600 font-medium text-sm md:text-base mt-1">
            {lang === 'ar' 
              ? 'انقر على الرقم ثم انقر على الرسوم المناسبة له للحصول على النجوم!' 
              : 'Click a number, then click the correct group of items to earn stars!'}
          </p>
        </div>

        {!gameWon ? (
          <div className="kids-card p-6 md:p-8">
            
            <div className="grid grid-cols-2 gap-8 md:gap-16">
              
              {/* Left Side: Digits */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-stone-400 tracking-wider text-center uppercase">
                  {lang === 'ar' ? 'الأرقام' : 'Numbers'}
                </span>
                {leftCards.map((card) => {
                  const isMatched = matchedValues.includes(card.value);
                  const isSelected = selectedLeft?.id === card.id;
                  const isError = errorCardIds.includes(card.id);

                  let borderStyle = 'border-stone-200';
                  let bgStyle = 'bg-white hover:bg-stone-50';
                  let textStyle = 'text-indigo-600';

                  if (isMatched) {
                    borderStyle = 'border-emerald-400 bg-emerald-50';
                    textStyle = 'text-emerald-500 line-through';
                  } else if (isSelected) {
                    borderStyle = 'border-indigo-500 ring-4 ring-indigo-100 scale-102';
                    bgStyle = 'bg-indigo-50';
                  } else if (isError) {
                    borderStyle = 'border-rose-400 ring-4 ring-rose-100 animate-shake';
                    bgStyle = 'bg-rose-50';
                  }

                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      disabled={isMatched || (selectedLeft !== null && card.type === 'left' && !isSelected)}
                      className={`kids-btn py-5 border-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all h-[110px] ${borderStyle} ${bgStyle}`}
                    >
                      <span className={`text-4xl md:text-5xl font-black ${textStyle}`}>
                        {card.content}
                      </span>
                      {!isMatched && (
                        <span className="text-xs font-bold text-stone-500">
                          {card.word}
                        </span>
                      )}
                      {isMatched && <Check className="w-5 h-5 text-emerald-500" />}
                    </button>
                  );
                })}
              </div>

              {/* Right Side: Illustrations */}
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-stone-400 tracking-wider text-center uppercase">
                  {lang === 'ar' ? 'الرسوم والمعدودات' : 'Illustrations'}
                </span>
                {rightCards.map((card) => {
                  const isMatched = matchedValues.includes(card.value);
                  const isSelected = selectedRight?.id === card.id;
                  const isError = errorCardIds.includes(card.id);

                  let borderStyle = 'border-stone-200';
                  let bgStyle = 'bg-white hover:bg-stone-50';

                  if (isMatched) {
                    borderStyle = 'border-emerald-400 bg-emerald-50 opacity-60';
                  } else if (isSelected) {
                    borderStyle = 'border-indigo-500 ring-4 ring-indigo-100 scale-102';
                    bgStyle = 'bg-indigo-50';
                  } else if (isError) {
                    borderStyle = 'border-rose-400 ring-4 ring-rose-100 animate-shake';
                    bgStyle = 'bg-rose-50';
                  }

                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card)}
                      disabled={isMatched || (selectedRight !== null && card.type === 'right' && !isSelected)}
                      className={`kids-btn py-4 px-2 border-4 rounded-2xl flex flex-col items-center justify-center transition-all h-[110px] ${borderStyle} ${bgStyle}`}
                    >
                      {/* Flex emojis spacing */}
                      <div className={`flex flex-wrap items-center justify-center ${card.value >= 7 ? 'gap-0.5' : 'gap-1'} max-w-[200px] leading-tight`}>
                        {card.content.split(' ').map((emoji, idx) => {
                          let sizeClass = 'text-3xl md:text-4xl';
                          if (card.value >= 8) {
                            sizeClass = 'text-lg md:text-xl';
                          } else if (card.value >= 5) {
                            sizeClass = 'text-2xl md:text-3xl';
                          }
                          return (
                            <span 
                              key={idx} 
                              className={`${sizeClass} select-none animate-bounce-slow`}
                              style={{ animationDelay: `${idx * 100}ms` }}
                            >
                              {emoji}
                            </span>
                          );
                        })}
                      </div>
                      
                      {/* Illustration subtitle word, hidden when matched to make it cleaner */}
                      {!isMatched && card.value === 0 && (
                        <span className="text-xs font-bold text-stone-400 mt-2">
                          {lang === 'ar' ? 'صندوق فارغ' : 'Empty Box'}
                        </span>
                      )}
                      
                      {isMatched && <Check className="w-5 h-5 text-emerald-500 mt-2" />}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* Quick reset inside cards layout */}
            <div className="mt-8 pt-4 border-t-2 border-dashed border-stone-100 flex justify-end">
              <button
                onClick={initGame}
                className="kids-btn kids-btn-yellow px-5 py-2.5 text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تغيير الأرقام' : 'Change Numbers'}</span>
              </button>
            </div>

          </div>
        ) : (
          /* Won layout */
          <div className="kids-card p-8 text-center flex flex-col items-center animate-bounce-slow" style={{ animationDuration: '6s' }}>
            <div className="bg-emerald-100 p-6 rounded-full mb-4 relative animate-pulse-soft">
              <Award className="w-16 h-16 text-emerald-500" />
              <Sparkles className="w-8 h-8 text-indigo-400 absolute -top-1 -right-1 animate-spin" />
            </div>

            <h3 className="text-3xl font-black text-emerald-600 mb-2">
              {lang === 'ar' ? 'مطابقة عبقرية! 🧩' : 'Puzzle Matched! 🧩'}
            </h3>
            
            <p className="text-lg font-bold text-stone-700 mb-6">
              {lang === 'ar' 
                ? 'لقد طابقت الأرقام مع الأشكال بنجاح رائع!' 
                : 'You matched the numbers with the objects successfully!'}
            </p>

            <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 mb-8 max-w-sm">
              <span className="text-amber-600 font-extrabold block text-sm mb-1">
                {lang === 'ar' ? 'الجائزة المحصلة' : 'Trophy Unlocked'}
              </span>
              <span className="text-stone-700 text-sm font-semibold">
                {lang === 'ar' 
                  ? 'لقد ربحت +4 نجوم ذهبية لمطابقة كافة الألغاز!'
                  : 'You earned +4 golden stars for completing all matching pairings!'}
              </span>
            </div>

            <button
              onClick={initGame}
              className="kids-btn kids-btn-green px-8 py-3.5 text-lg flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>{lang === 'ar' ? 'لعبة جديدة' : 'New Puzzle'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

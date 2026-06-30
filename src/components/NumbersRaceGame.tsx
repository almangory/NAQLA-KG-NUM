import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Sparkles, ChevronRight, Play } from 'lucide-react';
import { speakText, playSound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface NumbersRaceGameProps {
  lang: 'ar' | 'en';
  onAddStars: (amount: number, reason: string) => void;
  onBack: () => void;
}

interface LevelSpec {
  level: number;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  startNum: number;
  length: number;
  stepSize: number;
  isBackward: boolean;
  starsReward: number;
}

const LEVELS: LevelSpec[] = [
  {
    level: 1,
    nameAr: 'المرحلة 1: خط السباق الصغير (1-5)',
    nameEn: 'Stage 1: Mini Track (1-5)',
    descriptionAr: 'ساعد الأرنب يقفز بالترتيب التصاعدي من 1 إلى 5 🐰',
    descriptionEn: 'Help the bunny hop in ascending order from 1 to 5 🐰',
    startNum: 1,
    length: 5,
    stepSize: 1,
    isBackward: false,
    starsReward: 5
  },
  {
    level: 2,
    nameAr: 'المرحلة 2: سباق الأبطال (6-12)',
    nameEn: 'Stage 2: Champion Sprint (6-12)',
    descriptionAr: 'مستويات أعلى! اقفز من الرقم 6 حتى تصل لخط النهاية 12 🏁',
    descriptionEn: 'Higher numbers! Hop from 6 all the way to 12 🏁',
    startNum: 6,
    length: 7,
    stepSize: 1,
    isBackward: false,
    starsReward: 10
  },
  {
    level: 3,
    nameAr: 'المرحلة 3: التحدي الكبير (تنازلي أو متقدم)',
    nameEn: 'Stage 3: Giant Challenge (Backward / Advanced)',
    descriptionAr: 'قوي جداً! اقفز تنازلياً من 10 إلى 1 للوصول لكأس الفوز 🏆',
    descriptionEn: 'Super strong! Hop backwards from 10 down to 1 to reach the gold cup 🏆',
    startNum: 10,
    length: 10,
    stepSize: 1,
    isBackward: true,
    starsReward: 15
  }
];

export default function NumbersRaceGame({ lang, onAddStars, onBack }: NumbersRaceGameProps) {
  const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0); // index in sequence
  const [trackSequence, setTrackSequence] = useState<number[]>([]);
  const [options, setOptions] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isLevelCleared, setIsLevelCleared] = useState<boolean>(false);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);

  const activeLevel = LEVELS[currentLevelIdx];

  const initializeLevel = (levelIdx: number) => {
    setSelectedOption(null);
    setIsLevelCleared(false);
    setCurrentStep(0);
    setIsJumping(false);

    const spec = LEVELS[levelIdx];
    // Generate track sequence
    const seq: number[] = [];
    if (spec.isBackward) {
      for (let i = 0; i < spec.length; i++) {
        seq.push(spec.startNum - i * spec.stepSize);
      }
    } else {
      for (let i = 0; i < spec.length; i++) {
        seq.push(spec.startNum + i * spec.stepSize);
      }
    }
    setTrackSequence(seq);
    generateOptionsForStep(0, seq, spec);

    const announce = lang === 'ar'
      ? `سباق الأرقام! ${spec.nameAr}. ${spec.descriptionAr}`
      : `Numbers Race! ${spec.nameEn}. ${spec.descriptionEn}`;
    speakText(announce, lang);
  };

  const generateOptionsForStep = (stepIdx: number, seq: number[], spec: LevelSpec) => {
    // Correct next number is seq[stepIdx + 1]
    if (stepIdx >= seq.length - 1) {
      return; // Already at the end!
    }
    const correctAns = seq[stepIdx + 1];
    const opts = new Set<number>();
    opts.add(correctAns);

    // Add wrong options
    while (opts.size < 3) {
      let offset = Math.floor(Math.random() * 5) + 1;
      if (Math.random() > 0.5) offset = -offset;
      const wrongVal = correctAns + offset;
      if (wrongVal > 0 && wrongVal <= 30 && wrongVal !== correctAns) {
        opts.add(wrongVal);
      }
    }

    // Shuffle options
    const shuffled = Array.from(opts).sort(() => Math.random() - 0.5);
    setOptions(shuffled);
  };

  useEffect(() => {
    initializeLevel(currentLevelIdx);
  }, [currentLevelIdx]);

  const handleOptionSelect = (num: number) => {
    if (isJumping || isLevelCleared || selectedOption !== null) return;
    
    setSelectedOption(num);
    const correctAns = trackSequence[currentStep + 1];

    if (num === correctAns) {
      // Correct jump!
      playSound('balloonPop');
      setIsJumping(true);
      
      const encouragement = lang === 'ar'
        ? `رائع! اقفز إلى الرقم ${correctAns}`
        : `Awesome! Hop to number ${correctAns}`;
      speakText(encouragement, lang);

      // Trigger leap motion animation timing
      setTimeout(() => {
        setIsJumping(false);
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        setSelectedOption(null);

        // Check if level is finished
        if (nextStep === trackSequence.length - 1) {
          handleLevelComplete();
        } else {
          generateOptionsForStep(nextStep, trackSequence, activeLevel);
        }
      }, 900);

    } else {
      // Incorrect guess
      playSound('wrong');
      const retryMsg = lang === 'ar'
        ? `ليست صحيحة! ابحث عن الرقم المناسب لخطوتنا التالية!`
        : `Not quite! Find the correct number for our next step!`;
      speakText(retryMsg, lang);
      
      setTimeout(() => {
        setSelectedOption(null);
      }, 1000);
    }
  };

  const handleLevelComplete = () => {
    playSound('success');
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
    
    setIsLevelCleared(true);
    onAddStars(activeLevel.starsReward, lang === 'ar' 
      ? `لإنهاء ${activeLevel.nameAr} في لعبة سباق الأرقام الذكية!`
      : `for completing ${activeLevel.nameEn} in the Numbers Race game!`
    );

    const successVoice = lang === 'ar'
      ? `يا سلام! لقد وصلت إلى خط النهاية بنجاح! كسبت ${activeLevel.starsReward} نجوم ذهبية!`
      : `Awesome! You reached the finish line! You earned ${activeLevel.starsReward} gold stars!`;
    speakText(successVoice, lang);
  };

  const handleNextLevel = () => {
    playSound('click');
    if (currentLevelIdx < LEVELS.length - 1) {
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
          ? 'تهانينا الحارة! لقد أنهيت جميع مراحل سباق الأرقام الصعبة بنجاح كامل!'
          : 'Congratulations! You have completed all stages of the Numbers Race successfully!',
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
    <div className="kids-card p-4 md:p-6 border-indigo-200 bg-white shadow-md relative overflow-hidden">
      
      {/* Header controls */}
      <div className="flex justify-between items-center border-b-2 border-dashed border-stone-100 pb-3 mb-4">
        <button
          onClick={onBack}
          className="kids-btn bg-stone-100 border-stone-300 text-stone-600 px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
        </button>

        <span className="font-black text-indigo-700 text-sm md:text-base flex items-center gap-1.5 animate-pulse-soft">
          <span>🏎️</span>
          <span>{lang === 'ar' ? 'سباق الأرقام التفاعلي' : 'Interactive Numbers Race'}</span>
        </span>

        <button
          onClick={() => initializeLevel(currentLevelIdx)}
          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-full border border-indigo-200 transition-all"
          title={lang === 'ar' ? 'إعادة تشغيل' : 'Restart'}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stage visual progression progress bar */}
      <div className="flex justify-between items-center bg-stone-50 rounded-2xl p-3 border border-stone-200/50 mb-5">
        <span className="text-xs font-black text-stone-500">
          {lang === 'ar' ? 'المراحل:' : 'Stages:'}
        </span>
        <div className="flex gap-2.5">
          {LEVELS.map((lvl, index) => (
            <div
              key={lvl.level}
              className={`px-3 py-1 rounded-full text-xs font-black border transition-all ${
                index === currentLevelIdx
                  ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm'
                  : index < currentLevelIdx
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                  : 'bg-white text-stone-400 border-stone-200'
              }`}
            >
              {lang === 'ar' ? `مرحلة ${lvl.level}` : `Stage ${lvl.level}`}
            </div>
          ))}
        </div>
      </div>

      {/* Level descriptive instructions */}
      <div className="bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100 text-center mb-6">
        <p className="text-xs md:text-sm font-black text-stone-700 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4.5 h-4.5 text-yellow-500 animate-spin-slow" />
          <span>
            {lang === 'ar' ? activeLevel.descriptionAr : activeLevel.descriptionEn}
          </span>
        </p>
      </div>

      {/* Game Track Area */}
      <div className="bg-linear-to-b from-sky-100/60 to-emerald-50/30 border-2 border-dashed border-sky-200 rounded-3xl p-6 min-h-[220px] flex flex-col justify-between relative overflow-hidden select-none">
        
        {/* Track Stones */}
        <div className="relative w-full flex items-center justify-between gap-2 md:gap-4 my-auto py-8">
          
          {/* Decorative Finish Flag on the right */}
          <div className="absolute right-0 -top-2 flex flex-col items-center select-none opacity-90">
            <span className="text-3xl animate-bounce-slow">🏁</span>
            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded-md">
              {lang === 'ar' ? 'النهاية' : 'Finish'}
            </span>
          </div>

          {trackSequence.map((val, idx) => {
            const isCurrent = idx === currentStep;
            const isNext = idx === currentStep + 1;
            const isVisited = idx < currentStep;

            return (
              <div
                key={idx}
                className="flex flex-col items-center flex-1 relative"
              >
                {/* Stepping Stone Item */}
                <div
                  className={`w-11 h-11 md:w-14 md:h-14 rounded-full border-b-4 flex flex-col items-center justify-center transition-all relative select-none ${
                    isCurrent
                      ? 'bg-amber-400 border-amber-600 shadow-md scale-105 z-10'
                      : isVisited
                      ? 'bg-emerald-400 border-emerald-600 text-white opacity-80'
                      : isNext
                      ? 'bg-indigo-100 border-indigo-300 border-dashed animate-pulse text-indigo-400'
                      : 'bg-stone-100 border-stone-300 text-stone-400 opacity-60'
                  }`}
                >
                  {isNext ? (
                    <span className="text-lg font-black animate-bounce font-mono">?</span>
                  ) : (
                    <span className="text-sm md:text-base font-black">
                      {val}
                    </span>
                  )}

                  {/* Cute character avatar floating atop current stone */}
                  {isCurrent && (
                    <div
                      className={`absolute -top-11 md:-top-13 text-3xl md:text-4xl transition-all ${
                        isJumping ? 'animate-bounce text-indigo-600 scale-120' : 'animate-pulse-soft'
                      }`}
                      style={{
                        transformOrigin: 'bottom center',
                      }}
                    >
                      🐰
                    </div>
                  )}
                </div>

                {/* Index connector link dots */}
                {idx < trackSequence.length - 1 && (
                  <div className="absolute left-[calc(50%+20px)] top-[22px] md:top-[28px] w-[calc(100%-40px)] h-1 bg-stone-300/60 rounded-full hidden sm:block"></div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Multiple-Choice Answer Balloons */}
      {!isLevelCleared && !isGameFinished && (
        <div className="mt-8">
          <p className="text-xs font-black text-center text-stone-500 uppercase tracking-widest mb-3">
            {lang === 'ar' ? 'اختر الرقم التالي لتقفز إليه 🎈:' : 'Choose the next number to hop on 🎈:'}
          </p>

          <div className="flex gap-4 justify-center items-center w-full max-w-md mx-auto">
            {options.map((option) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === trackSequence[currentStep + 1];

              let buttonColor = 'from-amber-400 to-amber-500 border-amber-600 hover:from-amber-300 hover:to-amber-400 text-white';
              if (isSelected) {
                buttonColor = isCorrect
                  ? 'from-emerald-400 to-emerald-500 border-emerald-600 text-white'
                  : 'from-rose-400 to-rose-500 border-rose-600 text-white';
              }

              return (
                <button
                  key={option}
                  disabled={selectedOption !== null}
                  onClick={() => handleOptionSelect(option)}
                  className={`flex-1 py-4 px-2 text-xl md:text-2xl font-black rounded-3xl border-b-6 shadow-md transform hover:scale-105 active:scale-95 transition-all bg-gradient-to-b ${buttonColor} cursor-pointer`}
                >
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Level Cleared Modal Overlay */}
      {isLevelCleared && !isGameFinished && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl animate-fade-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mb-4 animate-bounce shadow-md border-2 border-emerald-300">
            🏅
          </div>
          <h3 className="text-xl font-black text-emerald-700">
            {lang === 'ar' ? 'مرحى! تم اجتياز المرحلة بنجاح!' : 'Hooray! Stage Cleared!'}
          </h3>
          <p className="text-xs text-stone-600 font-bold max-w-xs mt-1 mb-6">
            {lang === 'ar'
              ? `لقد ساعدت الأرنب في الوصول وحصلت على ${activeLevel.starsReward} نجوم ذهبية! ⭐`
              : `You helped the bunny sprint and won ${activeLevel.starsReward} gold stars! ⭐`}
          </p>

          <button
            onClick={handleNextLevel}
            className="kids-btn kids-btn-green px-8 py-3 text-xs font-black flex items-center gap-1.5"
          >
            <span>
              {currentLevelIdx < LEVELS.length - 1
                ? (lang === 'ar' ? 'الانتقال للمرحلة التالية ➡️' : 'Go to Next Stage ➡️')
                : (lang === 'ar' ? 'عرض كأس النهاية العظيم 🏆' : 'Claim Great Victory Cup 🏆')}
            </span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Entire Game Completed Modal Overlay */}
      {isGameFinished && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl animate-fade-in">
          <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center text-5xl mb-4 animate-bounce shadow-md border-2 border-yellow-300">
            🏆
          </div>
          <h3 className="text-2xl font-black text-amber-700">
            {lang === 'ar' ? 'ملك سباق الأرقام العظيم! 👑' : 'Grand Champion of Numbers Race! 👑'}
          </h3>
          <p className="text-xs md:text-sm text-stone-600 font-bold max-w-sm mt-1 mb-6 leading-relaxed">
            {lang === 'ar'
              ? 'مذهل! لقد تخطيت جميع مراحل السباق بنجاح باهر وأثبت ذكاءك الرياضي الفائق!'
              : 'Stellar! You have mastered every level of the race track and proven your absolute math genius!'}
          </p>

          <div className="flex gap-3">
            <button
              onClick={resetGame}
              className="kids-btn kids-btn-green px-6 py-2.5 text-xs font-black flex items-center gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{lang === 'ar' ? 'إعادة اللعب من الصفر 🔄' : 'Replay Game 🔄'}</span>
            </button>

            <button
              onClick={onBack}
              className="kids-btn bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700 px-6 py-2.5 text-xs font-bold"
            >
              {lang === 'ar' ? 'ركن الألعاب الرئيسي 🔙' : 'Main Menu 🔙'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

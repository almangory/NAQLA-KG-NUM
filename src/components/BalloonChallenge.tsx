import React, { useState, useEffect, useRef } from 'react';
import { NUMBERS_DATA } from '../data/numbersData';
import { NumberItem } from '../types';
import { speakText, playSound, playSynthesizedBeep } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Award, Play, RotateCcw, Volume2, ShieldAlert, Sparkles } from 'lucide-react';

interface BalloonChallengeProps {
  onAddStars: (amount: number, reason: string) => void;
  lang: 'ar' | 'en';
}

interface Balloon {
  id: number;
  value: number; // Represents the number inside
  digit: string;
  word: string;
  emoji: string;
  x: number; // Left percentage (0 to 85)
  y: number; // Bottom position (px)
  speed: number; // Pixels per frame
  color: string; // Tailwind color class e.g., 'bg-red-400'
}

export default function BalloonChallenge({ onAddStars, lang }: BalloonChallengeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetNumber, setTargetNumber] = useState<NumberItem | null>(null);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30); // 30 second challenge
  const [gameOver, setGameOver] = useState(false);

  const requestRef = useRef<number | null>(null);
  const balloonIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const colors = [
    'bg-red-400 border-red-500 shadow-red-200',
    'bg-sky-400 border-sky-500 shadow-sky-200',
    'bg-emerald-400 border-emerald-500 shadow-emerald-200',
    'bg-amber-400 border-amber-500 shadow-amber-200',
    'bg-purple-400 border-purple-500 shadow-purple-200',
    'bg-pink-400 border-pink-500 shadow-pink-200',
    'bg-orange-400 border-orange-500 shadow-orange-200',
  ];

  // Start/Reset Game
  const startGame = () => {
    playSound('click');
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setBalloons([]);
    balloonIdRef.current = 0;

    // Pick first random target
    const firstTarget = NUMBERS_DATA[Math.floor(Math.random() * 11)];
    setTargetNumber(firstTarget);

    // Announce target
    setTimeout(() => {
      announceTarget(firstTarget);
    }, 400);
  };

  const announceTarget = (num: NumberItem) => {
    if (!num) return;
    const voiceText = lang === 'ar'
      ? `فجّر البالون الذي يحمل الرقم: ${num.arabicWord}`
      : `Pop the balloon with the number: ${num.englishWord}`;
    speakText(voiceText, lang);
  };

  // Timer loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, gameOver]);

  const endGame = () => {
    setGameOver(true);
    setIsPlaying(false);
    playSynthesizedBeep(true);
    
    // Earn stars proportional to score
    const earnedStars = Math.min(10, Math.floor(score / 2));
    if (earnedStars > 0) {
      onAddStars(earnedStars, lang === 'ar' ? `لتحقيق مجموع ${score} في تحدي البالونات!` : `for scoring ${score} points in the Balloon popping challenge!`);
    }

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    const speakOverText = lang === 'ar'
      ? `انتهى الوقت! مجموع نقاطك هو ${score}! لقد جمعت ${earnedStars} نجوم!`
      : `Time is up! Your score is ${score}! You earned ${earnedStars} stars!`;
    speakText(speakOverText, lang);
  };

  // Spawn and float balloons loop
  useEffect(() => {
    if (!isPlaying || gameOver) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    let lastSpawn = 0;
    const spawnRate = 1200; // spawn a balloon every 1.2s

    const updateGame = (timestamp: number) => {
      // Spawn new balloon
      if (timestamp - lastSpawn > spawnRate) {
        lastSpawn = timestamp;
        spawnBalloon();
      }

      // Move balloons upward
      setBalloons((prevBalloons) => {
        return prevBalloons
          .map((b) => ({
            ...b,
            y: b.y + b.speed,
          }))
          // filter out balloons that floated away
          .filter((b) => b.y < 500);
      });

      requestRef.current = requestAnimationFrame(updateGame);
    };

    requestRef.current = requestAnimationFrame(updateGame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, gameOver]);

  const spawnBalloon = () => {
    const randomNumItem = NUMBERS_DATA[Math.floor(Math.random() * 11)];
    const id = balloonIdRef.current++;
    const x = Math.floor(Math.random() * 80) + 5; // Left position 5% to 85%
    const speed = Math.random() * 1.5 + 1.2; // Move up by 1.2 to 2.7px per frame
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newBalloon: Balloon = {
      id,
      value: randomNumItem.value,
      digit: lang === 'ar' ? randomNumItem.arabicDigit : randomNumItem.englishDigit,
      word: lang === 'ar' ? randomNumItem.arabicWord : randomNumItem.englishWord,
      emoji: randomNumItem.illustrationEmoji,
      x,
      y: -80, // Start just below bottom of container
      speed,
      color,
    };

    setBalloons((prev) => [...prev, newBalloon]);
  };

  const handlePop = (balloon: Balloon) => {
    if (!isPlaying || !targetNumber) return;

    if (balloon.value === targetNumber.value) {
      // CORRECT POP!
      setScore((prev) => prev + 1);
      
      // Play pop visual
      setBalloons((prev) => prev.filter((b) => b.id !== balloon.id));
      playSound('balloonPop');
      setTimeout(() => {
        playSound('success');
      }, 80);

      confetti({
        particleCount: 15,
        spread: 30,
        origin: { x: balloon.x / 100, y: 1 - (balloon.y / 400) },
      });

      // Select new target
      const newTarget = NUMBERS_DATA[Math.floor(Math.random() * 11)];
      setTargetNumber(newTarget);
      announceTarget(newTarget);
    } else {
      // WRONG POP
      playSynthesizedBeep(false);
      // Give a small wobble/shake effect or tell the target again
      announceTarget(targetNumber);
    }
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in" id="balloon-challenge-section">
      <div className="max-w-2xl mx-auto">
        
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-rose-500 flex items-center justify-center gap-2 drop-shadow-sm">
            <Sparkles className="w-8 h-8 text-rose-400 animate-bounce-slow" />
            {lang === 'ar' ? 'تحدي فرقعة البالونات السريع' : 'Speedy Balloon Popping Challenge'}
          </h2>
          <p className="text-stone-600 font-medium text-sm md:text-base mt-1">
            {lang === 'ar' 
              ? 'فرقع بالون الأرقام الصحيحة قبل نفاد الوقت يا بطل!' 
              : 'Pop the correct number balloons before the timer runs out!'}
          </p>
        </div>

        {!isPlaying && !gameOver ? (
          /* Lobby Start Screen */
          <div className="kids-card p-8 text-center flex flex-col items-center">
            <div className="text-7xl mb-4 animate-bounce-slow">🎈</div>
            <h3 className="text-2xl font-black text-indigo-600 mb-2">
              {lang === 'ar' ? 'جاهز للتحدي السريع؟ ⚡' : 'Ready for the Speed Run? ⚡'}
            </h3>
            <p className="text-stone-600 font-medium mb-6 max-w-sm">
              {lang === 'ar'
                ? 'لديك 30 ثانية لتفرقع أكبر عدد ممكن من البالونات الصحيحة التي يطلبها الروبوت الذكي!'
                : 'You have 30 seconds to pop as many correct balloons requested by the friendly Robot!'}
            </p>
            <button
              onClick={startGame}
              className="kids-btn kids-btn-pink px-10 py-4 text-xl flex items-center gap-2"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>{lang === 'ar' ? 'ابدأ اللعب الآن 🚀' : 'Start Playing Now 🚀'}</span>
            </button>
          </div>
        ) : isPlaying && targetNumber ? (
          /* Playing Screen */
          <div className="flex flex-col gap-4">
            
            {/* Top Bar Indicators */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="kids-card py-2.5 px-3 flex flex-col items-center bg-indigo-50 border-indigo-200">
                <span className="text-xs text-indigo-500 font-bold">{lang === 'ar' ? 'النقاط 🏆' : 'Score 🏆'}</span>
                <span className="text-2xl font-black text-indigo-600">{score}</span>
              </div>

              <div className="kids-card py-2.5 px-3 flex flex-col items-center bg-rose-50 border-rose-200">
                <span className="text-xs text-rose-500 font-bold">{lang === 'ar' ? 'الوقت المتبقي ⏱️' : 'Time Left ⏱️'}</span>
                <span className={`text-2xl font-black ${timeLeft < 10 ? 'text-rose-600 animate-pulse' : 'text-rose-500'}`}>
                  {timeLeft} {lang === 'ar' ? 'ث' : 's'}
                </span>
              </div>

              <button
                onClick={() => announceTarget(targetNumber)}
                className="kids-card py-2.5 px-3 flex flex-col items-center justify-center bg-amber-50 border-amber-300 hover:bg-amber-100 active:scale-95 transition-all text-amber-700 font-black gap-1"
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span className="text-xs">{lang === 'ar' ? 'استمع للرقم' : 'Listen Target'}</span>
              </button>
            </div>

            {/* Target Number Highlight Banner */}
            <div className="kids-card p-4 flex items-center justify-center bg-amber-100 border-amber-300 animate-pulse-soft">
              <span className="text-xl md:text-2xl font-black text-amber-800">
                {lang === 'ar' 
                  ? `فجّر الرقم: ${targetNumber.arabicWord} (${targetNumber.arabicDigit})` 
                  : `Pop Number: ${targetNumber.englishWord} (${targetNumber.englishDigit})`}
              </span>
            </div>

            {/* Balloon Stage/Canvas container */}
            <div 
              ref={containerRef}
              className="relative bg-sky-200/50 border-4 border-white rounded-3xl h-[400px] shadow-inner overflow-hidden"
            >
              {/* Floating Cloud Background elements */}
              <div className="absolute top-8 left-10 text-white opacity-40 text-4xl select-none pointer-events-none animate-float-cloud-slow">☁️</div>
              <div className="absolute top-28 right-16 text-white opacity-30 text-5xl select-none pointer-events-none animate-float-cloud-fast">☁️</div>

              {/* Spawning Balloons */}
              {balloons.map((balloon) => (
                <button
                  key={balloon.id}
                  onClick={() => handlePop(balloon)}
                  className={`absolute rounded-full flex flex-col items-center justify-center select-none shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-90 border-2 w-16 h-20 ${balloon.color}`}
                  style={{
                    left: `${balloon.x}%`,
                    bottom: `${balloon.y}px`,
                  }}
                >
                  <span className="text-2xl font-black font-sans text-white text-shadow-sm leading-none drop-shadow">
                    {balloon.digit}
                  </span>
                  <span className="text-[10px] font-bold text-white/90 leading-none mt-1">
                    {balloon.word}
                  </span>

                  {/* Balloon String Knot tail */}
                  <div className="absolute bottom-[-6px] left-[calc(50%-4px)] w-2 h-2 bg-inherit rotate-45 border-r border-b border-black/10" />
                  {/* Balloon String line */}
                  <div className="absolute bottom-[-18px] left-[50%] w-[1.5px] h-3 bg-black/20" />
                </button>
              ))}

              {/* No balloons tip */}
              {balloons.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-center opacity-40 select-none pointer-events-none text-indigo-800 font-extrabold text-sm p-4">
                  {lang === 'ar' ? 'البالونات ستبدأ بالارتفاع من الأسفل!' : 'Balloons are about to fly up!'}
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Game Over Screen */
          <div className="kids-card p-8 text-center flex flex-col items-center">
            <div className="bg-yellow-100 p-5 rounded-full mb-4">
              <Award className="w-16 h-16 text-yellow-500 animate-bounce-slow" />
            </div>

            <h3 className="text-3xl font-black text-indigo-600 mb-1">
              {lang === 'ar' ? 'انتهى التحدي المثير! ⚡' : 'Challenge Finished! ⚡'}
            </h3>

            <p className="text-lg font-bold text-stone-700 mb-6">
              {lang === 'ar' 
                ? `لقد أحرزت ${score} نقطة في فرقعة البالونات!` 
                : `You scored ${score} points popping the balloons!`}
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
              <div className="kids-card bg-emerald-50 border-emerald-200 p-3 text-center">
                <span className="text-xs text-emerald-600 font-bold block">{lang === 'ar' ? 'مجموع النقاط' : 'Score'}</span>
                <span className="text-2xl font-black text-emerald-600">{score}</span>
              </div>
              <div className="kids-card bg-amber-50 border-amber-200 p-3 text-center">
                <span className="text-xs text-amber-600 font-bold block">{lang === 'ar' ? 'النجوم المكتسبة' : 'Stars Gained'}</span>
                <span className="text-2xl font-black text-amber-500">+{Math.min(10, Math.floor(score / 2))} ⭐</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-center">
              <button
                onClick={startGame}
                className="kids-btn kids-btn-green px-6 py-3 text-base flex items-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>{lang === 'ar' ? 'العب مجدداً 🎮' : 'Play Again 🎮'}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

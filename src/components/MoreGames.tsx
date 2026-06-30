import { useState, useEffect } from 'react';
import { NUMBERS_DATA } from '../data/numbersData';
import { playSound, speakText } from '../utils/audio';
import { 
  Trophy, 
  Sparkles, 
  HelpCircle, 
  RefreshCw, 
  ArrowLeft, 
  Check, 
  Award,
  CirclePlay,
  Play,
  Plus,
  Minus,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import NumberBlocksGame from './NumberBlocksGame';
import NumbersRaceGame from './NumbersRaceGame';
import NumbersMemoryGame from './NumbersMemoryGame';

interface MoreGamesProps {
  lang: 'ar' | 'en';
  onAddStars: (amount: number, reason: string) => void;
}

interface FloatItem {
  id: number;
  emoji: string;
  tapped: boolean;
  x: number; // percentage width
  y: number; // percentage height
  scale: number;
}

export default function MoreGames({ lang, onAddStars }: MoreGamesProps) {
  const [activeGame, setActiveGame] = useState<'none' | 'counting' | 'comparison' | 'blocks' | 'race' | 'memory'>('none');

  // GAME 1: Counting Adventure States
  const [countTarget, setCountTarget] = useState<number>(3);
  const [itemsToCount, setItemsToCount] = useState<FloatItem[]>([]);
  const [tappedCount, setTappedCount] = useState<number>(0);
  const [countingGameOver, setCountingGameOver] = useState<boolean>(false);
  const [countingGameSuccess, setCountingGameSuccess] = useState<boolean>(false);
  const [countingOptions, setCountingOptions] = useState<number[]>([]);
  const [selectedCountingAnswer, setSelectedCountingAnswer] = useState<number | null>(null);

  // GAME 2: Comparison Balance States
  const [leftCount, setLeftCount] = useState<number>(3);
  const [rightCount, setRightCount] = useState<number>(5);
  const [comparisonItems, setComparisonItems] = useState<{leftEmoji: string, rightEmoji: string}>({ leftEmoji: '🍎', rightEmoji: '🎈' });
  const [comparisonSuccess, setComparisonSuccess] = useState<boolean | null>(null);
  const [selectedComparison, setSelectedComparison] = useState<string | null>(null);

  // Start Counting Adventure
  const startCountingGame = () => {
    playSound('click');
    const randomCount = Math.floor(Math.random() * 8) + 1; // 1 to 8
    setCountTarget(randomCount);
    setSelectedCountingAnswer(null);
    setTappedCount(0);
    setCountingGameOver(false);
    setCountingGameSuccess(false);

    // Pick a random emoji to use
    const emojis = ['🦋', '🍓', '🎈', '⭐', '🍎', '🐸', '🧁', '⚽', '🐟'];
    const selectedEmoji = emojis[Math.floor(Math.random() * emojis.length)];

    // Generate float coordinates
    const newItems: FloatItem[] = [];
    for (let i = 0; i < randomCount; i++) {
      newItems.push({
        id: i,
        emoji: selectedEmoji,
        tapped: false,
        x: 10 + Math.random() * 75, // 10% to 85% range
        y: 15 + Math.random() * 65, // 15% to 80% range
        scale: 0.9 + Math.random() * 0.4
      });
    }
    setItemsToCount(newItems);

    // Create 3 answer options
    const optionsSet = new Set<number>();
    optionsSet.add(randomCount);
    while (optionsSet.size < 3) {
      const wrongOpt = Math.floor(Math.random() * 10) + 1;
      optionsSet.add(wrongOpt);
    }
    setCountingOptions(Array.from(optionsSet).sort((a, b) => a - b));

    speakText(
      lang === 'ar' 
        ? `عد العناصر الملونة في الصندوق اللطيف بلمسها بأصبعك!` 
        : `Count the items in the box by tapping them!`, 
      lang
    );
  };

  // Handle Float Item Tap
  const handleItemTap = (item: FloatItem) => {
    if (item.tapped) return;

    // Mark as tapped
    const updated = itemsToCount.map(it => it.id === item.id ? { ...it, tapped: true } : it);
    setItemsToCount(updated);

    const newTapped = tappedCount + 1;
    setTappedCount(newTapped);
    
    // Play POP sound
    playSound('balloonPop');

    // Speech current count
    const label = lang === 'ar' 
      ? NUMBERS_DATA.find(n => n.value === newTapped)?.arabicWord || newTapped.toString()
      : newTapped.toString();
    speakText(label, lang);

    // Trigger visual effect (small confetti pop on tap coordinates)
    confetti({
      particleCount: 8,
      spread: 30,
      origin: { x: (item.x + 10) / 100, y: (item.y + 20) / 100 }
    });

    if (newTapped === countTarget) {
      playSound('success');
      setCountingGameOver(true);
      speakText(
        lang === 'ar' 
          ? `أحسنت! كم عدد العناصر الإجمالي الآن؟ اختر الجواب الصحيح من الأسفل!` 
          : `Amazing! What is the total count? Select the correct answer below!`, 
        lang
      );
    }
  };

  // Check selected answer for counting
  const checkCountingAnswer = (option: number) => {
    playSound('click');
    setSelectedCountingAnswer(option);
    
    if (option === countTarget) {
      setCountingGameSuccess(true);
      playSound('success');
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
      onAddStars(5, lang === 'ar' ? 'لحل تحدي عد الأشكال المتحركة بنجاح مميز!' : 'for solving the floating shapes counting adventure successfully!');
      speakText(
        lang === 'ar' 
          ? `ممتاز يا بطل! العدد هو بالفعل ${NUMBERS_DATA.find(n => n.value === option)?.arabicWord || option}` 
          : `Great job champion! The count is indeed ${option}`, 
        lang
      );
    } else {
      setCountingGameSuccess(false);
      playSound('wrong');
      speakText(
        lang === 'ar' 
          ? 'إجابة غير صحيحة، حاول العد مجدداً بهدوء!' 
          : 'Incorrect answer, try counting carefully again!', 
        lang
      );
    }
  };

  // Start Comparison Scale Game
  const startComparisonGame = () => {
    playSound('click');
    setComparisonSuccess(null);
    setSelectedComparison(null);

    // Pick 2 random unequal counts or sometimes equal (1 to 9)
    let left = Math.floor(Math.random() * 8) + 1;
    let right = Math.floor(Math.random() * 8) + 1;
    
    // Make sure we get a good dynamic range
    while (left === right && Math.random() > 0.3) {
      right = Math.floor(Math.random() * 8) + 1;
    }

    setLeftCount(left);
    setRightCount(right);

    const emojis = ['🍓', '🎈', '⭐', '🍎', '🐸', '🧁', '⚽', '🐟', '🦋'];
    const emojiL = emojis[Math.floor(Math.random() * emojis.length)];
    const emojiR = emojis[(emojis.indexOf(emojiL) + 1) % emojis.length];
    setComparisonItems({ leftEmoji: emojiL, rightEmoji: emojiR });

    speakText(
      lang === 'ar' 
        ? `قارن بين المجموعتين! أي الكفتين أثقل وأكبر؟ اختر الرمز الصحيح!` 
        : `Compare both groups! Which side is larger? Choose the correct symbol!`, 
      lang
    );
  };

  // Check Comparison Answer
  const checkComparison = (symbol: '<' | '>' | '=') => {
    playSound('click');
    setSelectedComparison(symbol);

    let isCorrect = false;
    if (symbol === '>') {
      isCorrect = leftCount > rightCount;
    } else if (symbol === '<') {
      isCorrect = leftCount < rightCount;
    } else {
      isCorrect = leftCount === rightCount;
    }

    if (isCorrect) {
      setComparisonSuccess(true);
      playSound('success');
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 }
      });
      onAddStars(5, lang === 'ar' ? 'لحل مقارنة ميزان الأرقام التفاعلي بنجاح!' : 'for solving the balancing scale number comparison challenge successfully!');
      speakText(
        lang === 'ar' 
          ? 'أحسنت! إجابتك صحيحة مئة بالمئة!' 
          : 'Bravo! Your answer is 100% correct!', 
        lang
      );
    } else {
      setComparisonSuccess(false);
      playSound('wrong');
      speakText(
        lang === 'ar' 
          ? 'ليست صحيحة! قارن عدد العناصر بكل جهة وحاول مجدداً!' 
          : 'Not quite! Compare the counts on both sides and try again!', 
        lang
      );
    }
  };

  // Load game when selection changes
  useEffect(() => {
    if (activeGame === 'counting') {
      startCountingGame();
    } else if (activeGame === 'comparison') {
      startComparisonGame();
    }
  }, [activeGame]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto text-stone-800 select-none animate-fade-in">
      
      {/* Title section */}
      {activeGame === 'none' && (
        <div className="text-center py-6">
          <h2 className="text-2xl md:text-4xl font-black text-indigo-700 flex items-center justify-center gap-2">
            <span>🎮</span>
            <span>{lang === 'ar' ? 'ركن الألعاب الذكية الإضافية' : 'Extra Kids Games Corner'}</span>
          </h2>
          <p className="text-xs md:text-sm text-stone-500 font-bold mt-2">
            {lang === 'ar' 
              ? 'مجموعة من الألعاب التفاعلية والمرحة المصممة خصيصاً لبناء الذكاء الرياضي لسن التمهيدي' 
              : 'Interactive and playful games crafted to build kindergarten math intelligence.'}
          </p>

          {/* Selection menu */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8 max-w-5xl mx-auto">
            
            {/* Game Card 1 */}
            <div className="kids-card bg-linear-to-b from-indigo-50 to-white border-indigo-200 p-6 flex flex-col items-center text-center gap-4 hover:scale-103 transition-transform">
              <span className="text-6xl animate-bounce-slow">🦋</span>
              <div>
                <h3 className="text-lg font-black text-indigo-700">
                  {lang === 'ar' ? 'عد العناصر الطائرة' : 'Floating Shapes Counting'}
                </h3>
                <p className="text-[11px] text-stone-500 font-bold mt-1 leading-relaxed">
                  {lang === 'ar' 
                    ? 'المس الفراشات والبالونات اللطيفة لفرقعتها وعدها، ثم اختر الرقم المطابق!' 
                    : 'Tap on cute floating butterflies and shapes to count them and find the total!'}
                </p>
              </div>
              <button
                onClick={() => setActiveGame('counting')}
                className="kids-btn kids-btn-blue w-full py-2.5 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
              >
                <CirclePlay className="w-4.5 h-4.5" />
                <span>{lang === 'ar' ? 'ابدأ اللعب الآن! 🏁' : 'Start Game! 🏁'}</span>
              </button>
            </div>

            {/* Game Card 2 */}
            <div className="kids-card bg-linear-to-b from-amber-50 to-white border-amber-200 p-6 flex flex-col items-center text-center gap-4 hover:scale-103 transition-transform">
              <span className="text-6xl animate-bounce-slow">⚖️</span>
              <div>
                <h3 className="text-lg font-black text-amber-700">
                  {lang === 'ar' ? 'ميزان مقارنة الأرقام' : 'Balancing Comparison Scale'}
                </h3>
                <p className="text-[11px] text-stone-500 font-bold mt-1 leading-relaxed">
                  {lang === 'ar' 
                    ? 'قارن بين كفتي الميزان، وحدد الأكبر أو الأصغر لتثبيت كفة الأثقل!' 
                    : 'Compare Left & Right items on the scale and click Greater, Less, or Equal!'}
                </p>
              </div>
              <button
                onClick={() => setActiveGame('comparison')}
                className="kids-btn kids-btn-yellow w-full py-2.5 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
              >
                <CirclePlay className="w-4.5 h-4.5" />
                <span>{lang === 'ar' ? 'ابدأ التحدي والعد! 🏁' : 'Start Challenge! 🏁'}</span>
              </button>
            </div>

            {/* Game Card 3: Number Blocks (مكعبات الأرقام) */}
            <div className="kids-card bg-linear-to-b from-emerald-50 to-white border-emerald-200 p-6 flex flex-col items-center text-center gap-4 hover:scale-103 transition-transform">
              <span className="text-6xl animate-bounce-slow">🟩</span>
              <div>
                <h3 className="text-lg font-black text-emerald-700">
                  {lang === 'ar' ? 'لعبة ترتيب المكعبات' : 'Number Blocks Builder'}
                </h3>
                <p className="text-[11px] text-stone-500 font-bold mt-1 leading-relaxed">
                  {lang === 'ar' 
                    ? 'اسحب ورتب مكعبات الأرقام الملونة الضاحكة بالتسلسل التصاعدي الصحيح!' 
                    : 'Drag and arrange smiling number blocks into their proper ascending sequence!'}
                </p>
              </div>
              <button
                onClick={() => setActiveGame('blocks')}
                className="kids-btn kids-btn-green w-full py-2.5 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
              >
                <CirclePlay className="w-4.5 h-4.5" />
                <span>{lang === 'ar' ? 'رتب المكعبات! 🧱' : 'Arrange Blocks! 🧱'}</span>
              </button>
            </div>

            {/* Game Card 4: Numbers Race (سباق الأرقام) */}
            <div className="kids-card bg-linear-to-b from-sky-50 to-white border-sky-200 p-6 flex flex-col items-center text-center gap-4 hover:scale-103 transition-transform">
              <span className="text-6xl animate-bounce-slow">🏎️</span>
              <div>
                <h3 className="text-lg font-black text-sky-700">
                  {lang === 'ar' ? 'لعبة سباق الأرقام' : 'Numbers Race Game'}
                </h3>
                <p className="text-[11px] text-stone-500 font-bold mt-1 leading-relaxed">
                  {lang === 'ar' 
                    ? 'اختر الرقم الصحيح ليقفز الأرنب فوقه ويتسابق ليصل لخط النهاية ويحصد الذهب!' 
                    : 'Choose the correct next number to make the bunny hop and sprint to the finish line!'}
                </p>
              </div>
              <button
                onClick={() => setActiveGame('race')}
                className="kids-btn bg-sky-500 hover:bg-sky-400 border-sky-600 text-white w-full py-2.5 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
              >
                <CirclePlay className="w-4.5 h-4.5" />
                <span>{lang === 'ar' ? 'ابدأ السباق المثالي! 🏁' : 'Start Race! 🏁'}</span>
              </button>
            </div>

            {/* Game Card 5: Numbers Memory (لعبة الذاكرة للأرقام والأشكال) */}
            <div className="kids-card bg-linear-to-b from-pink-50 to-white border-pink-200 p-6 flex flex-col items-center text-center gap-4 hover:scale-103 transition-transform">
              <span className="text-6xl animate-bounce-slow">🧠</span>
              <div>
                <h3 className="text-lg font-black text-pink-700">
                  {lang === 'ar' ? 'لعبة الذاكرة والتركيز' : 'Numbers Memory Game'}
                </h3>
                <p className="text-[11px] text-stone-500 font-bold mt-1 leading-relaxed">
                  {lang === 'ar' 
                    ? 'بطاقات مقلوبة وممتعة تحتوي على أرقام وأشكال، طابق كل رقم بصورته الصحيحة لتقوية التركيز!' 
                    : 'Flipped cards containing numbers and shapes. Match them perfectly to boost memory!'}
                </p>
              </div>
              <button
                onClick={() => setActiveGame('memory')}
                className="kids-btn bg-pink-500 hover:bg-pink-400 border-pink-600 text-white w-full py-2.5 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
              >
                <CirclePlay className="w-4.5 h-4.5" />
                <span>{lang === 'ar' ? 'ابدأ تحدي الذاكرة! 🧠' : 'Start Memory Game! 🧠'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GAME 1: Counting Adventure Board */}
      {activeGame === 'counting' && (
        <div className="kids-card p-6 border-indigo-200 bg-white">
          <div className="flex justify-between items-center border-b-2 border-dashed border-stone-100 pb-3 mb-4">
            <button
              onClick={() => { playSound('click'); setActiveGame('none'); }}
              className="kids-btn bg-stone-100 border-stone-300 text-stone-600 px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
            </button>

            <span className="font-black text-indigo-700 text-sm">
              {lang === 'ar' ? '🦋 لعبة حصاد الأرقام' : '🦋 Counting Shapes'}
            </span>

            <div className="flex items-center gap-1.5 bg-yellow-100 border border-yellow-300 px-2.5 py-1 rounded-full font-black text-xs text-amber-700">
              <span>⭐</span>
              <span>+5</span>
            </div>
          </div>

          <div className="text-center mb-4">
            <p className="text-sm font-bold text-stone-600">
              {lang === 'ar' 
                ? 'المس وفجر كل الأشكال الطائرة لعدها بصوت الروبوت!' 
                : 'Click every single floating shape to explode and count them aloud!'}
            </p>
            <div className="text-xs font-black text-indigo-500 mt-1">
              {lang === 'ar' 
                ? `المفرقعة: ${tappedCount} من ${countTarget}` 
                : `Popped: ${tappedCount} / ${countTarget}`}
            </div>
          </div>

          {/* Interactive Floating Canvas */}
          <div className="relative w-full h-[280px] bg-linear-to-b from-sky-100 via-sky-50 to-indigo-50 border-4 border-dashed border-sky-300 rounded-3xl overflow-hidden shadow-inner mb-6">
            
            {/* Grid background decorative helper */}
            <div className="absolute inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>

            {/* Cloud floating shapes in background */}
            <div className="absolute top-6 left-10 text-4xl opacity-30 select-none pointer-events-none animate-bounce-slow">☁️</div>
            <div className="absolute bottom-8 right-12 text-5xl opacity-30 select-none pointer-events-none animate-float-cloud-slow">☁️</div>

            {itemsToCount.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemTap(item)}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: `scale(${item.scale})`,
                  transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                className={`absolute select-none focus:outline-hidden text-4xl md:text-5xl cursor-pointer ${
                  item.tapped 
                    ? 'opacity-0 scale-0 pointer-events-none' 
                    : 'animate-bounce-slow hover:scale-115 active:scale-90'
                }`}
              >
                {item.emoji}
              </button>
            ))}

            {/* Success visual banner when all popped */}
            {countingGameOver && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center animate-fade-in z-10">
                <span className="text-6xl animate-bounce-slow">🎉</span>
                <h4 className="text-lg md:text-2xl font-black text-emerald-600 mt-2">
                  {lang === 'ar' ? 'يا لك من بطل رائع! تم فرقعة كل الأشكال!' : 'Wow Champion! You popped all shapes!'}
                </h4>
                <p className="text-xs text-stone-500 font-bold mt-1">
                  {lang === 'ar' 
                    ? 'الآن، اختر الكارت بالرقم المناسب لإتمام التحدي بنجاح:' 
                    : 'Now, select the card with the matching count to finish!'}
                </p>
              </div>
            )}
          </div>

          {/* Option selectors once popped */}
          {countingGameOver && (
            <div className="flex flex-col items-center justify-center gap-4 animate-fade-in">
              <div className="flex gap-4">
                {countingOptions.map((opt) => {
                  const isSelected = selectedCountingAnswer === opt;
                  const isCorrect = opt === countTarget;

                  return (
                    <button
                      key={opt}
                      onClick={() => checkCountingAnswer(opt)}
                      className={`kids-btn text-2xl md:text-4xl px-8 py-5 font-black ${
                        isSelected
                          ? (isCorrect 
                              ? 'bg-emerald-500 text-white border-emerald-700' 
                              : 'bg-rose-500 text-white border-rose-700')
                          : 'bg-white text-indigo-600 border-stone-200 hover:bg-indigo-50'
                      }`}
                    >
                      <span className="font-sans">
                        {lang === 'ar' 
                          ? NUMBERS_DATA.find(n => n.value === opt)?.arabicDigit || opt 
                          : opt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Status footer inside counting game */}
              {selectedCountingAnswer !== null && (
                <div className="text-center pt-2">
                  {countingGameSuccess ? (
                    <div className="text-emerald-600 font-black text-sm flex items-center justify-center gap-1">
                      <Check className="w-4 h-4 fill-current" />
                      <span>{lang === 'ar' ? 'إجابة عبقرية! كسبت +5 نجوم ⭐' : 'Genius answer! Earned +5 stars ⭐'}</span>
                    </div>
                  ) : (
                    <div className="text-rose-500 font-bold text-xs">
                      {lang === 'ar' ? '❌ حاول التحديد مرة أخرى' : '❌ Try selecting again'}
                    </div>
                  )}

                  <button
                    onClick={startCountingGame}
                    className="kids-btn bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700 px-5 py-2 text-xs mt-3 flex items-center gap-1 justify-center mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'لعب جولة أخرى 🔄' : 'Play Another Round 🔄'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* GAME 2: Comparison Balance Board */}
      {activeGame === 'comparison' && (
        <div className="kids-card p-6 border-amber-200 bg-white">
          <div className="flex justify-between items-center border-b-2 border-dashed border-stone-100 pb-3 mb-4">
            <button
              onClick={() => { playSound('click'); setActiveGame('none'); }}
              className="kids-btn bg-stone-100 border-stone-300 text-stone-600 px-3 py-1.5 text-xs flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
            </button>

            <span className="font-black text-amber-700 text-sm">
              {lang === 'ar' ? '⚖️ ميزان المقارنة الرياضي' : '⚖️ Balancing Scale Compare'}
            </span>

            <div className="flex items-center gap-1.5 bg-yellow-100 border border-yellow-300 px-2.5 py-1 rounded-full font-black text-xs text-amber-700">
              <span>⭐</span>
              <span>+5</span>
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm font-bold text-stone-600">
              {lang === 'ar' 
                ? 'انظر لعدد الأشكال في الكفتين، ثم قارن بين الطرفين بالرموز!' 
                : 'Count the items on both plates, then click the correct comparison symbol below!'}
            </p>
          </div>

          {/* VISUAL animated scale balance display */}
          {(() => {
            // Calculate tilt angle dynamically based on left/right weights!
            let rotateAngle = 0;
            if (leftCount > rightCount) {
              rotateAngle = -10; // Left side is heavier, so rotates counterclockwise
            } else if (leftCount < rightCount) {
              rotateAngle = 10; // Right side is heavier, rotates clockwise
            }

            return (
              <div className="relative w-full max-w-lg mx-auto h-[230px] flex flex-col justify-end items-center border-b-4 border-stone-400 bg-linear-to-b from-stone-50/20 to-stone-50 rounded-3xl p-4 overflow-hidden mb-6">
                
                {/* Upper Balance arm tilting dynamically */}
                <div 
                  className="absolute top-1/2 w-[85%] h-3 bg-stone-400 rounded-full flex justify-between items-center px-4"
                  style={{
                    transform: `translateY(-50%) rotate(${rotateAngle}deg)`,
                    transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transformOrigin: 'center center'
                  }}
                >
                  {/* Left Plate hook wire */}
                  <div className="w-0.5 h-16 bg-stone-400 relative">
                    {/* Left Plate Container */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-indigo-50 border-3 border-indigo-400 text-stone-800 rounded-2xl p-2 min-w-[100px] min-h-[60px] flex flex-wrap gap-1 items-center justify-center shadow-md">
                      {Array.from({ length: leftCount }).map((_, idx) => (
                        <span key={idx} className="text-xl select-none animate-float-cloud-slow">{comparisonItems.leftEmoji}</span>
                      ))}
                      {/* Left Side count circle label */}
                      <span className="absolute -top-3 -left-3 bg-indigo-500 text-white font-black text-xs rounded-full w-5 h-5 flex items-center justify-center border border-white font-sans">
                        {lang === 'ar' ? NUMBERS_DATA.find(n => n.value === leftCount)?.arabicDigit : leftCount}
                      </span>
                    </div>
                  </div>

                  {/* Central Balance pivot needle */}
                  <div className="w-4 h-12 bg-amber-400 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-full border border-amber-600"></div>

                  {/* Right Plate hook wire */}
                  <div className="w-0.5 h-16 bg-stone-400 relative">
                    {/* Right Plate Container */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-pink-50 border-3 border-pink-400 text-stone-800 rounded-2xl p-2 min-w-[100px] min-h-[60px] flex flex-wrap gap-1 items-center justify-center shadow-md">
                      {Array.from({ length: rightCount }).map((_, idx) => (
                        <span key={idx} className="text-xl select-none animate-float-cloud-slow">{comparisonItems.rightEmoji}</span>
                      ))}
                      {/* Right Side count circle label */}
                      <span className="absolute -top-3 -right-3 bg-pink-500 text-white font-black text-xs rounded-full w-5 h-5 flex items-center justify-center border border-white font-sans">
                        {lang === 'ar' ? NUMBERS_DATA.find(n => n.value === rightCount)?.arabicDigit : rightCount}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Central Scale Stand Stand */}
                <div className="w-6 h-28 bg-stone-300 rounded-t-lg relative"></div>
                {/* Heavy Base plate */}
                <div className="w-24 h-4 bg-stone-400 rounded-md"></div>

              </div>
            );
          })()}

          {/* Action buttons select Comparison */}
          <div className="flex flex-col items-center justify-center gap-4">
            
            <div className="flex justify-center gap-2.5 w-full max-w-md px-1">
              <button
                onClick={() => checkComparison('>')}
                className={`flex-1 kids-btn py-3 font-black ${
                  selectedComparison === '>'
                    ? (comparisonSuccess 
                        ? 'bg-emerald-500 text-white border-emerald-700' 
                        : 'bg-rose-500 text-white border-rose-700')
                    : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                <span className="text-sm xs:text-base sm:text-lg md:text-2xl font-black leading-none">{lang === 'ar' ? 'أكبر >' : 'Greater >'}</span>
              </button>

              <button
                onClick={() => checkComparison('=')}
                className={`flex-1 kids-btn py-3 font-black ${
                  selectedComparison === '='
                    ? (comparisonSuccess 
                        ? 'bg-emerald-500 text-white border-emerald-700' 
                        : 'bg-rose-500 text-white border-rose-700')
                    : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                <span className="text-sm xs:text-base sm:text-lg md:text-2xl font-black leading-none">{lang === 'ar' ? 'يساوي =' : 'Equal ='}</span>
              </button>

              <button
                onClick={() => checkComparison('<')}
                className={`flex-1 kids-btn py-3 font-black ${
                  selectedComparison === '<'
                    ? (comparisonSuccess 
                        ? 'bg-emerald-500 text-white border-emerald-700' 
                        : 'bg-rose-500 text-white border-rose-700')
                    : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                }`}
              >
                <span className="text-sm xs:text-base sm:text-lg md:text-2xl font-black leading-none">{lang === 'ar' ? 'أصغر <' : 'Less <'}</span>
              </button>
            </div>

            {selectedComparison !== null && (
              <div className="text-center pt-2">
                {comparisonSuccess ? (
                  <div className="text-emerald-600 font-black text-sm flex items-center justify-center gap-1">
                    <Check className="w-4 h-4 fill-current" />
                    <span>{lang === 'ar' ? 'إجابة صحيحة ذكية جداً! كسبت +5 نجوم ⭐' : 'Correct and smart answer! Earned +5 stars ⭐'}</span>
                  </div>
                ) : (
                  <div className="text-rose-500 font-bold text-xs">
                    {lang === 'ar' ? '❌ حاول المقارنة مرة أخرى' : '❌ Try comparing again'}
                  </div>
                )}

                <button
                  onClick={startComparisonGame}
                  className="kids-btn bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700 px-5 py-2 text-xs mt-3 flex items-center gap-1 justify-center mx-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تحدي جديد 🔄' : 'New Challenge 🔄'}</span>
                </button>
              </div>
            )}

          </div>

        </div>
      )}

      {/* GAME 3: Number Blocks Board */}
      {activeGame === 'blocks' && (
        <NumberBlocksGame
          lang={lang}
          onAddStars={onAddStars}
          onBack={() => { playSound('click'); setActiveGame('none'); }}
        />
      )}

      {/* GAME 4: Numbers Race Board */}
      {activeGame === 'race' && (
        <NumbersRaceGame
          lang={lang}
          onAddStars={onAddStars}
          onBack={() => { playSound('click'); setActiveGame('none'); }}
        />
      )}

      {/* GAME 5: Numbers Memory Board */}
      {activeGame === 'memory' && (
        <NumbersMemoryGame
          lang={lang}
          onAddStars={onAddStars}
          onBack={() => { playSound('click'); setActiveGame('none'); }}
        />
      )}

    </div>
  );
}

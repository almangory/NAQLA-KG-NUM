import { useState, useEffect, FormEvent } from 'react';
import { NUMBERS_DATA } from '../data/numbersData';
import { NumberItem } from '../types';
import { playSound, speakText } from '../utils/audio';
import { 
  Printer, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  HelpCircle, 
  RefreshCw, 
  BookOpen, 
  Heart, 
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WorksheetGeneratorProps {
  favoriteNumbers: number[];
  lang: 'ar' | 'en';
  onAddStars: (amount: number, reason: string) => void;
}

interface Question {
  id: string;
  type: 'tf' | 'fill' | 'match' | 'count';
  numberItem: NumberItem;
  questionTextAr: string;
  questionTextEn: string;
  // Options for Match or TF
  options?: {
    id: string;
    labelAr: string;
    labelEn: string;
    value: any;
  }[];
  correctAnswer: any;
  userAnswer: any;
  isCorrect?: boolean;
}

interface SheetPage {
  pageNumber: number;
  titleAr: string;
  titleEn: string;
  questions: Question[];
}

export default function WorksheetGenerator({ favoriteNumbers, lang, onAddStars }: WorksheetGeneratorProps) {
  // Config States
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['tf', 'fill', 'match', 'count']);
  const [scope, setScope] = useState<'favorites' | 'unit1' | 'unit2' | 'all'>('all');
  const [sheetCount, setSheetCount] = useState<number>(3);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [showPassModal, setShowPassModal] = useState<boolean>(false);
  const [passError, setPassError] = useState<string>('');
  
  // Worksheet State
  const [generatedSheets, setGeneratedSheets] = useState<SheetPage[]>([]);
  const [isSolvingInteractively, setIsSolvingInteractively] = useState<boolean>(false);
  const [graded, setGraded] = useState<boolean>(false);
  const [score, setScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  // Generate sheets based on config
  const generateWorksheets = () => {
    playSound('click');
    setGraded(false);
    
    // Filter numbers based on scope
    let filterNumbers: NumberItem[] = [];
    if (scope === 'favorites') {
      filterNumbers = NUMBERS_DATA.filter(n => favoriteNumbers.includes(n.value));
      if (filterNumbers.length === 0) {
        // Fallback to basic numbers if no favorites
        filterNumbers = NUMBERS_DATA.slice(1, 4); // 1, 2, 3
      }
    } else if (scope === 'unit1') {
      filterNumbers = NUMBERS_DATA.filter(n => n.value <= 5); // 0 to 5
    } else if (scope === 'unit2') {
      filterNumbers = NUMBERS_DATA.filter(n => n.value > 5); // 6 to 10
    } else {
      filterNumbers = [...NUMBERS_DATA]; // All 0-10
    }

    const pages: SheetPage[] = [];
    
    for (let p = 1; p <= Math.min(sheetCount, 20); p++) {
      const pageQuestions: Question[] = [];
      
      // Select 3 random question types from selectedTypes
      const typesToUse = selectedTypes.length > 0 ? selectedTypes : ['tf', 'fill', 'match', 'count'];
      
      // Pick 3 random numbers for this page from our filtered numbers
      const shuffledNumbers = [...filterNumbers].sort(() => 0.5 - Math.random());
      const pageNumbers = shuffledNumbers.slice(0, Math.min(3, shuffledNumbers.length));

      // Build 3 questions for this page
      pageNumbers.forEach((num, qIdx) => {
        const qType = typesToUse[qIdx % typesToUse.length];
        const qId = `q_p${p}_${qIdx}`;
        
        if (qType === 'tf') {
          // True or False
          const isTrueQ = Math.random() > 0.5;
          const displayDigit = isTrueQ ? num.arabicDigit : NUMBERS_DATA[(num.value + 2) % 11].arabicDigit;
          const displayDigitEn = isTrueQ ? num.englishDigit : NUMBERS_DATA[(num.value + 2) % 11].englishDigit;
          
          pageQuestions.push({
            id: qId,
            type: 'tf',
            numberItem: num,
            questionTextAr: `هل الرمز (${displayDigit}) يمثل الكلمة "${num.arabicWord}"؟`,
            questionTextEn: `Does the digit (${displayDigitEn}) represent the word "${num.englishWord}"?`,
            options: [
              { id: 't', labelAr: 'نعم 👍', labelEn: 'Yes 👍', value: true },
              { id: 'f', labelAr: 'لا 👎', labelEn: 'No 👎', value: false }
            ],
            correctAnswer: isTrueQ,
            userAnswer: null
          });
        } 
        else if (qType === 'fill') {
          // Fill in the blanks
          const blanksMode = Math.random() > 0.5; // True: missing word, False: missing digit
          pageQuestions.push({
            id: qId,
            type: 'fill',
            numberItem: num,
            questionTextAr: blanksMode 
              ? `اكتب اسم الرقم (${num.arabicDigit}) بالحروف: ....................`
              : `اكتب الرمز العددي للكلمة "${num.arabicWord}": ....................`,
            questionTextEn: blanksMode 
              ? `Write the name of number (${num.englishDigit}) in letters: ....................`
              : `Write the numerical digit for the word "${num.englishWord}": ....................`,
            correctAnswer: blanksMode 
              ? { ar: num.arabicWord, en: num.englishWord.toLowerCase() }
              : { ar: num.arabicDigit, en: num.englishDigit },
            userAnswer: ''
          });
        }
        else if (qType === 'match') {
          // Match digits with representation
          const matchMode = Math.random() > 0.5; // True: digit to emoji, False: digit to words
          
          // Generate options: 1 correct, 2 distractors
          const correctVal = num.value;
          const distractor1 = (num.value + 3) % 11;
          const distractor2 = (num.value + 7) % 11;
          const optionsList = [num, NUMBERS_DATA[distractor1], NUMBERS_DATA[distractor2]]
            .sort(() => 0.5 - Math.random());

          pageQuestions.push({
            id: qId,
            type: 'match',
            numberItem: num,
            questionTextAr: matchMode
              ? `اختر المجموعة التي تحتوي على العدد المناسب للرمز (${num.arabicDigit}):`
              : `ما هي الكلمة الصحيحة المطابقة للرمز (${num.arabicDigit})؟`,
            questionTextEn: matchMode
              ? `Choose the group containing the correct amount of items for (${num.englishDigit}):`
              : `What is the correct word matching the digit (${num.englishDigit})?`,
            options: optionsList.map(item => ({
              id: item.value.toString(),
              labelAr: matchMode 
                ? `${item.illustrationEmoji} `.repeat(item.value === 0 ? 1 : item.value) + ` (${item.illustrationNameAr})`
                : item.arabicWord,
              labelEn: matchMode
                ? `${item.illustrationEmoji} `.repeat(item.value === 0 ? 1 : item.value) + ` (${item.illustrationNameEn})`
                : item.englishWord,
              value: item.value
            })),
            correctAnswer: correctVal,
            userAnswer: null
          });
        }
        else {
          // Explain illustration components & Count (إيضاح مكونات الرسمة والعد)
          pageQuestions.push({
            id: qId,
            type: 'count',
            numberItem: num,
            questionTextAr: `انظر للرسمة المجاورة: ${num.illustrationEmoji} (${num.illustrationNameAr}). كم عدد العناصر التي تراها؟ واكتب الرقم في الفراغ.`,
            questionTextEn: `Look at the illustration: ${num.illustrationEmoji} (${num.illustrationNameEn}). How many items do you see? Write the count below.`,
            correctAnswer: num.value,
            userAnswer: ''
          });
        }
      });

      pages.push({
        pageNumber: p,
        titleAr: `ورقة عمل رقم (${p}) - مهارات الأرقام`,
        titleEn: `Worksheet No. (${p}) - Number Skills`,
        questions: pageQuestions
      });
    }

    setGeneratedSheets(pages);
    speakText(lang === 'ar' ? `تم توليد ${pages.length} ورقة عمل جديدة بنجاح` : `Successfully generated ${pages.length} worksheets!`, lang);
  };

  // Generate automatically on component load
  useEffect(() => {
    generateWorksheets();
  }, [selectedTypes, scope, sheetCount]);

  // Handle Watermark Unlock Password
  const handleCheckPassword = (e: FormEvent) => {
    e.preventDefault();
    if (password === '20302060') {
      setIsLocked(false);
      setShowWatermark(false);
      setPassError('');
      setShowPassModal(false);
      playSound('success');
      speakText(lang === 'ar' ? 'تمت إزالة العلامة المائية بنجاح' : 'Watermark removed successfully', lang);
    } else {
      setPassError(lang === 'ar' ? 'كلمة المرور خاطئة! حاول مجدداً' : 'Incorrect password! Try again');
      playSound('wrong');
    }
  };

  // Toggle dynamic checkboxes for question types
  const toggleType = (type: string) => {
    playSound('click');
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter(t => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  // Check answers of Interactive solving
  const handleGradeInteractive = () => {
    let totalQuestions = 0;
    let correctCount = 0;

    const gradedPages = generatedSheets.map(page => {
      const gradedQuestions = page.questions.map(q => {
        totalQuestions++;
        let isCorrect = false;

        if (q.type === 'tf') {
          isCorrect = q.userAnswer === q.correctAnswer;
        } 
        else if (q.type === 'match') {
          isCorrect = Number(q.userAnswer) === Number(q.correctAnswer);
        } 
        else if (q.type === 'fill') {
          const ansStr = String(q.userAnswer).trim().toLowerCase();
          if (typeof q.correctAnswer === 'object') {
            const correctAr = q.correctAnswer.ar.trim().toLowerCase();
            const correctEn = q.correctAnswer.en.trim().toLowerCase();
            isCorrect = ansStr === correctAr || ansStr === correctEn;
          } else {
            isCorrect = ansStr === String(q.correctAnswer).trim().toLowerCase();
          }
        } 
        else if (q.type === 'count') {
          isCorrect = Number(q.userAnswer) === Number(q.correctAnswer);
        }

        if (isCorrect) correctCount++;
        return { ...q, isCorrect };
      });

      return { ...page, questions: gradedQuestions };
    });

    setGeneratedSheets(gradedPages);
    setScore({ correct: correctCount, total: totalQuestions });
    setGraded(true);

    if (correctCount === totalQuestions) {
      playSound('success');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      onAddStars(10, lang === 'ar' ? 'لحل ورقة العمل التفاعلية كاملة بشكل صحيح وممتاز!' : 'for solving the entire interactive worksheet correctly!');
      speakText(lang === 'ar' ? 'يا لك من عبقري ذكي! إجابة كاملة صحيحة مئة بالمئة!' : 'Wow! You are brilliant! 100% correct answers!', lang);
    } else if (correctCount >= totalQuestions / 2) {
      playSound('success');
      onAddStars(5, lang === 'ar' ? 'لحل الجزء الأكبر من أوراق العمل التفاعلية' : 'for solving most of the interactive worksheets');
      speakText(lang === 'ar' ? 'رائع جداً! لقد نجحت، ولديك بعض الأخطاء البسيطة للتصحيح.' : 'Great job! You passed with a few minor mistakes to fix.', lang);
    } else {
      playSound('wrong');
      speakText(lang === 'ar' ? 'حاول مجدداً لتصحح إجاباتك وتكسب النجوم الذهبية!' : 'Try again to correct your answers and earn golden stars!', lang);
    }
  };

  const handlePrint = () => {
    playSound('click');
    window.print();
  };

  return (
    <div className="p-4 md:p-6 animate-fade-in relative text-stone-800">
      
      {/* Configuration Controls Bar - HIDDEN in print */}
      <div className="max-w-6xl mx-auto kids-card p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 mb-6 print:hidden">
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b-2 border-dashed border-indigo-100 pb-4 mb-4 gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-black text-indigo-700 flex items-center gap-2">
              <span>🖨️</span>
              <span>{lang === 'ar' ? 'منشئ أوراق العمل الذكي' : 'Smart Worksheet Generator'}</span>
            </h2>
            <p className="text-xs md:text-sm text-stone-600 font-bold mt-1">
              {lang === 'ar' 
                ? 'خصص أوراق عمل رياضية تناسب طفلك لطباعتها بحجم A4 أو حلها تفاعلياً فوراً!' 
                : 'Customize math worksheets for your child to print on A4 or solve interactively!'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Watermark Control */}
            <button
              onClick={() => {
                if (isLocked) {
                  setShowPassModal(true);
                } else {
                  setShowWatermark(!showWatermark);
                  playSound('click');
                }
              }}
              className={`kids-btn text-xs px-3.5 py-2 flex items-center gap-1.5 ${
                showWatermark 
                  ? 'bg-amber-100 text-amber-700 border-amber-300' 
                  : 'bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>
                {lang === 'ar' 
                  ? (showWatermark ? 'مائي: مفعل (اضغط للإزالة)' : 'مائي: محذوف ✓') 
                  : (showWatermark ? 'Watermark: ON (Click to remove)' : 'Watermark: OFF ✓')}
              </span>
            </button>
          </div>
        </div>

        {/* Configuration grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Question Types */}
          <div className="bg-white p-4 rounded-2xl border border-indigo-100">
            <span className="text-xs font-black text-indigo-500 block mb-2.5">
              {lang === 'ar' ? '١. أنواع الأسئلة المتضمنة:' : '1. Included Question Types:'}
            </span>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedTypes.includes('tf')} 
                  onChange={() => toggleType('tf')} 
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-400"
                />
                <span>{lang === 'ar' ? 'صح وخطأ (👍 / 👎)' : 'True / False (👍 / 👎)'}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedTypes.includes('fill')} 
                  onChange={() => toggleType('fill')} 
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-400"
                />
                <span>{lang === 'ar' ? 'أكمل الفراغ بالكتابة (✍️)' : 'Fill in the blanks (✍️)'}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedTypes.includes('match')} 
                  onChange={() => toggleType('match')} 
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-400"
                />
                <span>{lang === 'ar' ? 'وصّل الأرقام والكلمات (🧩)' : 'Match words & items (🧩)'}</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={selectedTypes.includes('count')} 
                  onChange={() => toggleType('count')} 
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-400"
                />
                <span>{lang === 'ar' ? 'العد وإيضاح الرسمة (🍎)' : 'Explain & Count drawing (🍎)'}</span>
              </label>
            </div>
          </div>

          {/* Column 2: Scope selection */}
          <div className="bg-white p-4 rounded-2xl border border-indigo-100">
            <span className="text-xs font-black text-indigo-500 block mb-2.5">
              {lang === 'ar' ? '٢. تحديد نطاق ومحتوى الدرس:' : '2. Lesson & Curriculum Scope:'}
            </span>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setScope('all'); playSound('click'); }}
                className={`w-full text-right md:text-left text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                  scope === 'all' 
                    ? 'bg-indigo-600 text-white border-indigo-700' 
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>{lang === 'ar' ? 'كامل المنهج (الأرقام ٠-١٠)' : 'Entire Curriculum (Numbers 0-10)'}</span>
                <BookOpen className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                onClick={() => { setScope('unit1'); playSound('click'); }}
                className={`w-full text-right md:text-left text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                  scope === 'unit1' 
                    ? 'bg-indigo-600 text-white border-indigo-700' 
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>{lang === 'ar' ? 'الوحدة الأولى (الأرقام ٠-٥)' : 'Unit 1 (Numbers 0-5)'}</span>
                <Sparkles className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                onClick={() => { setScope('unit2'); playSound('click'); }}
                className={`w-full text-right md:text-left text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                  scope === 'unit2' 
                    ? 'bg-indigo-600 text-white border-indigo-700' 
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>{lang === 'ar' ? 'الوحدة الثانية (الأرقام ٦-١٠)' : 'Unit 2 (Numbers 6-10)'}</span>
                <Sparkles className="w-3.5 h-3.5 opacity-80" />
              </button>

              <button
                onClick={() => { setScope('favorites'); playSound('click'); }}
                className={`w-full text-right md:text-left text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                  scope === 'favorites' 
                    ? 'bg-rose-500 text-white border-rose-600' 
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span>{lang === 'ar' ? 'الدروس المفضلة فقط' : 'Favorite Lessons Only'}</span>
                  <span className="bg-white/20 px-1.5 py-0.2 text-[9px] rounded-full">{favoriteNumbers.length}</span>
                </span>
                <Heart className="w-3.5 h-3.5 opacity-80 fill-current" />
              </button>
            </div>
          </div>

          {/* Column 3: Limit Slider & Actions */}
          <div className="bg-white p-4 rounded-2xl border border-indigo-100 flex flex-col justify-between">
            <div>
              <span className="text-xs font-black text-indigo-500 block mb-1">
                {lang === 'ar' ? '٣. عدد الأوراق المطلوبة:' : '3. Number of Worksheets:'}
              </span>
              <div className="flex items-center gap-3 mb-2">
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={sheetCount}
                  onChange={(e) => { setSheetCount(Number(e.target.value)); }}
                  className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer"
                />
                <span className="font-extrabold text-indigo-700 text-lg border-2 border-indigo-100 rounded-xl px-2.5 py-1 min-w-[45px] text-center">
                  {sheetCount}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-bold block mb-4">
                {lang === 'ar' ? '*يدعم توليد تلقائي ذكي يصل إلى 20 صفحة مختلفة ومميزة' : '*Supports generating up to 20 highly diverse printable sheets.'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsSolvingInteractively(!isSolvingInteractively);
                  setGraded(false);
                  playSound('click');
                  speakText(
                    !isSolvingInteractively 
                      ? (lang === 'ar' ? 'تم تفعيل وضع الحل التفاعلي على الشاشة!' : 'Interactive solving mode is now active!')
                      : (lang === 'ar' ? 'تمت العودة لوضع العرض والطباعة' : 'Returned to preview and print mode'), 
                    lang
                  );
                }}
                className={`flex-1 kids-btn text-xs font-black py-2.5 ${
                  isSolvingInteractively 
                    ? 'bg-amber-400 hover:bg-amber-300 border-amber-600 text-stone-800' 
                    : 'bg-sky-400 hover:bg-sky-300 border-sky-600 text-white'
                }`}
              >
                <span>{isSolvingInteractively ? (lang === 'ar' ? '🖨️ وضع الطباعة' : '🖨️ Print Mode') : (lang === 'ar' ? '📝 حل تفاعلي' : '📝 Solve Online')}</span>
              </button>

              <button
                onClick={generateWorksheets}
                className="kids-btn bg-stone-100 hover:bg-stone-200 border-stone-300 text-stone-700 p-2.5"
                title={lang === 'ar' ? 'توليد أسئلة جديدة' : 'Generate New Questions'}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Action grading banner when solving interactively */}
        {isSolvingInteractively && (
          <div className="mt-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">✍️</span>
              <div className="text-right sm:text-left">
                <span className="text-xs font-black text-amber-800 block">
                  {lang === 'ar' ? 'الوضع التفاعلي نشط الآن!' : 'Interactive Mode is Active!'}
                </span>
                <span className="text-[11px] text-stone-600 font-bold">
                  {lang === 'ar' 
                    ? 'دع طفلك يحل الأسئلة على الشاشة مباشرة ثم اضغط زر التصحيح لحساب النجوم!' 
                    : 'Let the child answer on screen then click Correct to check answers!'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {graded && (
                <div className="bg-white border-2 border-indigo-200 px-4 py-1.5 rounded-xl font-black text-xs text-indigo-700 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span>
                    {lang === 'ar' 
                      ? `النتيجة: ${score.correct} من ${score.total}` 
                      : `Score: ${score.correct} / ${score.total}`}
                  </span>
                </div>
              )}

              <button
                onClick={handleGradeInteractive}
                className="flex-1 sm:flex-initial kids-btn kids-btn-green text-xs font-black px-5 py-2.5"
              >
                {lang === 'ar' ? '✓ تصحيح الاختبار مباشرة' : '✓ Correct & Grade Now'}
              </button>
            </div>
          </div>
        )}

        {/* Print instructions block */}
        {!isSolvingInteractively && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🖨️</span>
              <span className="text-xs font-bold text-emerald-800">
                {lang === 'ar'
                  ? 'للحصول على أفضل جودة طباعة ممتازة، اضغط على زر "طباعة الأوراق" وحدد خيار الحفظ كملف PDF وحجم الورق A4.'
                  : 'For best results, click Print Worksheets, set paper to A4, and check "Background graphics" in print options.'}
              </span>
            </div>

            <button
              onClick={handlePrint}
              className="kids-btn kids-btn-green text-xs font-black px-6 py-2 flex items-center gap-1.5 cursor-pointer shadow-sm w-full sm:w-auto justify-center"
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'ar' ? 'طباعة أوراق العمل 🖨️' : 'Print Worksheets 🖨️'}</span>
            </button>
          </div>
        )}

      </div>

      {/* WATERMARK LOCKED MODAL */}
      {showPassModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden animate-fade-in">
          <div className="bg-white rounded-3xl border-4 border-amber-400 p-6 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-lg font-black text-stone-800 text-center mb-1 flex items-center justify-center gap-1.5">
              <span>🔒</span>
              <span>{lang === 'ar' ? 'إزالة العلامة المائية' : 'Remove Watermark'}</span>
            </h3>
            <p className="text-[11px] text-stone-500 font-bold text-center mb-4">
              {lang === 'ar' 
                ? 'يرجى إدخال كلمة المرور السرية المخصصة للمشرفين لإزالة الشعار من الأوراق' 
                : 'Please enter the secret supervisor password to remove watermark logo.'}
            </p>

            <form onSubmit={handleCheckPassword} className="space-y-3">
              <div>
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border-2 border-stone-200 focus:border-indigo-500 focus:outline-hidden font-mono text-center text-lg"
                  autoFocus
                />
                {passError && (
                  <span className="text-[10px] text-red-500 font-bold mt-1 block text-center">
                    ⚠️ {passError}
                  </span>
                )}
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowPassModal(false); setPassError(''); }}
                  className="flex-1 kids-btn bg-stone-100 border-stone-300 text-stone-700 text-xs py-2"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 kids-btn bg-indigo-600 border-indigo-800 text-white text-xs py-2"
                >
                  {lang === 'ar' ? 'تأكيد 🔑' : 'Unlock 🔑'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THE SHEETS CONTAINER (STYLED TO RENDER A4 SIZES FOR PRINTING) */}
      <div className="max-w-[210mm] mx-auto flex flex-col gap-8 print:gap-0">
        
        {generatedSheets.map((page, pIndex) => (
          <div 
            key={page.pageNumber}
            className="worksheet-page bg-white text-stone-900 shadow-lg print:shadow-none border border-stone-200/50 print:border-none p-8 md:p-12 relative overflow-hidden flex flex-col justify-between"
            style={{
              width: '100%',
              minHeight: '297mm', // Standard A4 height representation
              aspectRatio: '1 / 1.4142', // Perfect A4 aspect ratio 210 x 297
              pageBreakAfter: pIndex === generatedSheets.length - 1 ? 'auto' : 'always',
              boxSizing: 'border-box'
            }}
          >
            {/* Watermark Diagonal Text Overlay */}
            {showWatermark && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 opacity-12 transform rotate-315">
                <span className="text-4xl md:text-5xl font-black text-rose-600 border-8 border-dashed border-rose-600 px-6 py-4 rounded-3xl tracking-widest uppercase">
                  نقلة للمناهج الالكترونية
                </span>
              </div>
            )}

            {/* Content Top */}
            <div className="z-20">
              
              {/* Kindergarten Sheet Header */}
              <div className="border-b-4 border-dashed border-indigo-200 pb-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Left Side: Kid Logo details */}
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🎒</span>
                  <div className="text-center sm:text-left">
                    <h3 className="text-lg font-black text-indigo-700 tracking-tight leading-none">
                      {lang === 'ar' ? 'رحلة استكشاف الأرقام' : 'Numbers Discovery Journey'}
                    </h3>
                    <span className="text-[10px] font-black text-amber-500">
                      {lang === 'ar' ? 'المستوى التمهيدي - KG2' : 'Early Learning Portal - KG2'}
                    </span>
                  </div>
                </div>

                {/* Center Title */}
                <div className="bg-yellow-100 border-2 border-yellow-300 px-4 py-1 rounded-2xl">
                  <span className="text-xs font-black text-yellow-800">
                    {lang === 'ar' ? page.titleAr : page.titleEn}
                  </span>
                </div>

                {/* Right Side: Kid Name/Date fields for manual writing */}
                <div className="flex flex-col gap-1 text-[11px] font-bold text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <span>{lang === 'ar' ? 'الاسـم:' : 'Name:'}</span>
                    <span className="border-b-2 border-dotted border-stone-300 w-28 h-4"></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{lang === 'ar' ? 'التاريخ:' : 'Date:'}</span>
                    <span className="border-b-2 border-dotted border-stone-300 w-28 h-4"></span>
                  </div>
                </div>

              </div>

              {/* Sheet Questions Content */}
              <div className="space-y-8 mt-6">
                
                {page.questions.map((q, qIndex) => {
                  const arDigit = q.numberItem.arabicDigit;
                  const enDigit = q.numberItem.englishDigit;
                  const itemEmoji = q.numberItem.illustrationEmoji;

                  return (
                    <div 
                      key={q.id}
                      className={`p-5 rounded-3xl border-2 border-dashed relative ${
                        graded 
                          ? (q.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300')
                          : 'bg-stone-50/50 border-stone-200'
                      }`}
                    >
                      {/* Grading Indicator */}
                      {graded && (
                        <div className="absolute top-3 left-3 flex items-center gap-1">
                          {q.isCorrect ? (
                            <span className="text-emerald-600 font-extrabold text-sm bg-white border border-emerald-300 rounded-full px-2 py-0.5 shadow-xs flex items-center gap-1">
                              🟢 {lang === 'ar' ? 'إجابة صحيحة! ممتاز' : 'Correct! Excellent'}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-extrabold text-sm bg-white border border-rose-300 rounded-full px-2 py-0.5 shadow-xs flex items-center gap-1">
                              🔴 {lang === 'ar' ? 'تحتاج لمراجعة' : 'Try Again'}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Header index */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-black text-xs">
                          {qIndex + 1}
                        </span>
                        <h4 className="text-xs md:text-sm font-black text-stone-800 leading-relaxed max-w-[85%]">
                          {lang === 'ar' ? q.questionTextAr : q.questionTextEn}
                        </h4>
                      </div>

                      {/* Question Answer Layouts based on types */}
                      <div className="pl-8 pr-4">
                        
                        {/* 1. True/False Options */}
                        {q.type === 'tf' && (
                          <div className="flex flex-wrap gap-4 mt-2">
                            {q.options?.map(opt => {
                              const isSelected = q.userAnswer === opt.value;
                              
                              if (isSolvingInteractively) {
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (graded) return;
                                      playSound('click');
                                      // Update local question answer
                                      const updated = [...generatedSheets];
                                      updated[pIndex].questions[qIndex].userAnswer = opt.value;
                                      setGeneratedSheets(updated);
                                    }}
                                    className={`kids-btn px-6 py-2 text-xs font-bold ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-800'
                                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                                    }`}
                                  >
                                    {lang === 'ar' ? opt.labelAr : opt.labelEn}
                                  </button>
                                );
                              } else {
                                // Static printable checkbox
                                return (
                                  <div key={opt.id} className="flex items-center gap-2 text-xs font-bold text-stone-700">
                                    <div className="w-5 h-5 border-2 border-stone-300 rounded-md"></div>
                                    <span>{lang === 'ar' ? opt.labelAr : opt.labelEn}</span>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        )}

                        {/* 2. Fill-in-the-blanks */}
                        {q.type === 'fill' && (
                          <div className="mt-2">
                            {isSolvingInteractively ? (
                              <input 
                                type="text"
                                disabled={graded}
                                placeholder={lang === 'ar' ? 'اكتب إجابتك هنا...' : 'Type your answer here...'}
                                value={q.userAnswer}
                                onChange={(e) => {
                                  const updated = [...generatedSheets];
                                  updated[pIndex].questions[qIndex].userAnswer = e.target.value;
                                  setGeneratedSheets(updated);
                                }}
                                className="px-4 py-2 text-xs rounded-xl border-2 border-indigo-100 focus:border-indigo-500 focus:outline-hidden font-bold w-full sm:w-64"
                              />
                            ) : (
                              <div className="text-[11px] font-bold text-stone-400 italic">
                                {lang === 'ar' ? '* مكان الحل والكتابة للطفل بالقلم ✍️' : '* Spot for child to write with pencil ✍️'}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 3. Match options */}
                        {q.type === 'match' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                            {q.options?.map(opt => {
                              const isSelected = q.userAnswer === opt.value;

                              if (isSolvingInteractively) {
                                return (
                                  <button
                                    key={opt.id}
                                    onClick={() => {
                                      if (graded) return;
                                      playSound('click');
                                      const updated = [...generatedSheets];
                                      updated[pIndex].questions[qIndex].userAnswer = opt.value;
                                      setGeneratedSheets(updated);
                                    }}
                                    className={`kids-btn p-3 text-xs font-extrabold flex flex-col items-center justify-center text-center gap-1.5 ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-800'
                                        : 'bg-white text-stone-700 border-indigo-100 hover:bg-indigo-50/50'
                                    }`}
                                  >
                                    <span>{lang === 'ar' ? opt.labelAr : opt.labelEn}</span>
                                  </button>
                                );
                              } else {
                                // Static printable matching options
                                return (
                                  <div key={opt.id} className="flex items-center gap-2 bg-white p-2 border border-stone-200 rounded-xl">
                                    <div className="w-4 h-4 rounded-full border border-stone-300"></div>
                                    <span className="text-[10px] font-bold text-stone-800">{lang === 'ar' ? opt.labelAr : opt.labelEn}</span>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        )}

                        {/* 4. Explain/Count Draw elements */}
                        {q.type === 'count' && (
                          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2 bg-white/50 p-3 rounded-2xl border border-stone-100">
                            
                            {/* Visual counting box */}
                            <div className="flex flex-wrap gap-1.5 justify-center p-2.5 bg-indigo-50/40 rounded-xl border border-indigo-100 min-h-[50px] min-w-[120px]">
                              {q.numberItem.value === 0 ? (
                                <span className="text-xl select-none">☁️</span>
                              ) : (
                                Array.from({ length: q.numberItem.value }).map((_, idx) => (
                                  <span key={idx} className="text-2xl select-none">{itemEmoji}</span>
                                ))
                              )}
                            </div>

                            <div className="flex-1 w-full">
                              {isSolvingInteractively ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-stone-600">{lang === 'ar' ? 'الجواب:' : 'Answer:'}</span>
                                  <input 
                                    type="number"
                                    disabled={graded}
                                    min="0"
                                    max="10"
                                    placeholder="?"
                                    value={q.userAnswer}
                                    onChange={(e) => {
                                      const updated = [...generatedSheets];
                                      updated[pIndex].questions[qIndex].userAnswer = e.target.value;
                                      setGeneratedSheets(updated);
                                    }}
                                    className="px-3 py-1.5 w-16 text-center text-xs rounded-lg border-2 border-indigo-100 font-black"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
                                  <span>{lang === 'ar' ? 'العدد المكتوب:' : 'Written count:'}</span>
                                  <span className="border-b border-stone-300 w-16 h-5"></span>
                                </div>
                              )}
                            </div>

                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}

              </div>

            </div>

            {/* Content Bottom / Page Footer */}
            <div className="border-t border-dashed border-stone-200 pt-3 mt-6 flex justify-between items-center text-[9px] font-black text-stone-400 select-none">
              <span>{lang === 'ar' ? 'رحلة الأرقام - نقلة للمناهج الإلكترونية' : 'Numbers Journey - Electronic Curriculum Shift'}</span>
              <span>{lang === 'ar' ? `الصفحة ${page.pageNumber} من ${generatedSheets.length}` : `Page ${page.pageNumber} of ${generatedSheets.length}`}</span>
            </div>

          </div>
        ))}

      </div>

    </div>
  );
}

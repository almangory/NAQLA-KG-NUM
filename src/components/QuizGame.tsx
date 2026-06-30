import React, { useState, useEffect } from 'react';
import { NUMBERS_DATA } from '../data/numbersData';
import { NumberItem } from '../types';
import { speakText, playSound, playSynthesizedBeep } from '../utils/audio';
import confetti from 'canvas-confetti';
import { HelpCircle, Volume2, Sparkles, Check, X, Award, RefreshCw, ArrowRight } from 'lucide-react';

interface QuizGameProps {
  onAddStars: (amount: number, reason: string) => void;
  lang: 'ar' | 'en';
}

type QuestionType = 'COUNT' | 'IDENTIFY' | 'SEQUENCE';

interface Question {
  type: QuestionType;
  promptAr: string;
  promptEn: string;
  correctAnswer: number;
  options: number[];
  emojiContext?: string; // Used for counting e.g., '🍎'
  sequenceContext?: string[]; // E.g., ['1', '2', '?', '4']
}

export default function QuizGame({ onAddStars, lang }: QuizGameProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Generate 5 random questions
  useEffect(() => {
    generateQuiz();
  }, []);

  const generateQuiz = () => {
    const generated: Question[] = [];
    const questionTypes: QuestionType[] = ['COUNT', 'IDENTIFY', 'SEQUENCE', 'COUNT', 'IDENTIFY'];

    questionTypes.forEach((type, index) => {
      // Pick a random number item (excluding 0 for count, sequence)
      const targetVal = Math.floor(Math.random() * 10) + 1; // 1 to 10
      const numItem = NUMBERS_DATA.find((n) => n.value === targetVal) || NUMBERS_DATA[1];

      // Options must include correct answer and 2 other distinct random numbers
      const optionsSet = new Set<number>([targetVal]);
      while (optionsSet.size < 3) {
        optionsSet.add(Math.floor(Math.random() * 11)); // 0 to 10
      }
      const options = Array.from(optionsSet).sort(() => Math.random() - 0.5);

      if (type === 'COUNT') {
        generated.push({
          type,
          promptAr: `كم ${numItem.illustrationNameAr} في الصندوق؟`,
          promptEn: `How many ${numItem.illustrationNameEn}s in the box?`,
          correctAnswer: targetVal,
          options,
          emojiContext: numItem.illustrationEmoji,
        });
      } else if (type === 'IDENTIFY') {
        generated.push({
          type,
          promptAr: `ابحث عن الرقم: ${numItem.arabicWord}`,
          promptEn: `Find the number: ${numItem.englishWord}`,
          correctAnswer: targetVal,
          options,
        });
      } else {
        // Sequence question: e.g. target is 3. Sequence: 1, 2, ?, 4
        // Ensure starting index permits targetVal as 3rd element or 4th
        let startVal = Math.max(0, targetVal - 2);
        if (startVal + 3 > 10) {
          startVal = 7;
        }
        
        const sequence: string[] = [];
        for (let i = startVal; i < startVal + 4; i++) {
          if (i === targetVal) {
            sequence.push('?');
          } else {
            sequence.push(lang === 'ar' ? NUMBERS_DATA[i].arabicDigit : NUMBERS_DATA[i].englishDigit);
          }
        }

        generated.push({
          type,
          promptAr: `ما هو الرقم المفقود في السلسلة؟`,
          promptEn: `What is the missing number in the sequence?`,
          correctAnswer: targetVal,
          options,
          sequenceContext: sequence,
        });
      }
    });

    setQuestions(generated);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);

    // Speak initial welcome
    setTimeout(() => {
      speakQuestion(generated[0]);
    }, 400);
  };

  const speakQuestion = (q: Question) => {
    if (!q) return;
    const promptText = lang === 'ar' ? q.promptAr : q.promptEn;
    speakText(promptText, lang);
  };

  const handleAnswerClick = (option: number) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);

    const isCorrect = option === questions[currentIdx].correctAnswer;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      playSynthesizedBeep(true);
      onAddStars(1, lang === 'ar' ? 'لإجابة صحيحة في الاختبار' : 'for a correct quiz answer');
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.8 },
      });
      // Speak encouraging response
      const encourage = lang === 'ar' ? 'أحسنت! إجابة صحيحة' : 'Excellent! Correct answer';
      speakText(encourage, lang);
    } else {
      playSynthesizedBeep(false);
      const wrongText = lang === 'ar' 
        ? `الإجابة الصحيحة هي ${NUMBERS_DATA[questions[currentIdx].correctAnswer].arabicWord}` 
        : `The correct answer is ${NUMBERS_DATA[questions[currentIdx].correctAnswer].englishWord}`;
      speakText(wrongText, lang);
    }
  };

  const handleNext = () => {
    playSound('click');
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      // Speak next question
      setTimeout(() => {
        speakQuestion(questions[currentIdx + 1]);
      }, 350);
    } else {
      setQuizFinished(true);
      playSynthesizedBeep(true);
      
      // Calculate bonus stars if they got full marks
      if (score === questions.length) {
        onAddStars(5, lang === 'ar' ? 'درجة كاملة في الاختبار الممتاز!' : 'perfect score bonus in quiz!');
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#34d399', '#f472b6', '#fbbf24'],
        });
        speakText(lang === 'ar' ? 'يا إلهي! علامة كاملة وممتازة! أنت بطل الأرقام الحقيقي!' : 'OMG! A perfect score! You are a true number champion!', lang);
      } else {
        speakText(lang === 'ar' ? `رائع! لقد أنهيت الاختبار وحصلت على ${score} من 5!` : `Great job! You finished the quiz and got ${score} out of 5!`, lang);
      }
    }
  };

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentIdx];

  return (
    <div className="p-4 md:p-6" id="quiz-section">
      <div className="max-w-2xl mx-auto">
        
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-amber-500 flex items-center justify-center gap-2 drop-shadow-sm">
            <HelpCircle className="w-8 h-8 text-amber-400 animate-bounce-slow" />
            {lang === 'ar' ? 'اختبار المعرفة والألعاب' : 'Knowledge Quiz & Trivia'}
          </h2>
          <p className="text-stone-600 font-medium text-sm md:text-base mt-1">
            {lang === 'ar' 
              ? 'أجب عن الأسئلة الممتعة واجمع النجوم الذهبية والجوائز البراقة!' 
              : 'Answer the cute questions and collect shining golden stars and trophies!'}
          </p>
        </div>

        {/* Quiz Board */}
        {!quizFinished ? (
          <div className="kids-card p-6 md:p-8 flex flex-col items-center">
            
            {/* Top Indicator & TTS Voice play */}
            <div className="flex items-center justify-between w-full mb-6 border-b-2 border-dashed border-stone-100 pb-4">
              <span className="bg-indigo-100 text-indigo-600 font-extrabold text-sm px-4 py-1.5 rounded-full">
                {lang === 'ar' ? `السؤال ${currentIdx + 1} من 5` : `Question ${currentIdx + 1} of 5`}
              </span>

              <button
                onClick={() => speakQuestion(currentQuestion)}
                className="p-3 bg-amber-100 text-amber-600 border-2 border-amber-300 rounded-2xl hover:bg-amber-200 active:scale-95 transition-all flex items-center gap-2 font-bold"
              >
                <Volume2 className="w-5 h-5 animate-pulse-soft" />
                <span className="text-xs">{lang === 'ar' ? 'استمع' : 'Listen'}</span>
              </button>
            </div>

            {/* Prompt */}
            <h3 className="text-xl md:text-2xl font-black text-stone-800 text-center mb-6 leading-relaxed">
              {lang === 'ar' ? currentQuestion.promptAr : currentQuestion.promptEn}
            </h3>

            {/* Visual Context Board */}
            <div className="w-full bg-indigo-50/60 rounded-3xl p-6 mb-8 flex items-center justify-center border-4 border-indigo-100 shadow-inner min-h-[140px]">
              
              {/* Question: COUNT */}
              {currentQuestion.type === 'COUNT' && (() => {
                const countVal = currentQuestion.correctAnswer;
                let sizeClass = 'text-4xl md:text-5xl';
                let gapClass = 'gap-3';
                if (countVal >= 8) {
                  sizeClass = 'text-2xl md:text-3xl';
                  gapClass = 'gap-1.5';
                } else if (countVal >= 5) {
                  sizeClass = 'text-3xl md:text-4xl';
                  gapClass = 'gap-2';
                }
                return (
                  <div className={`flex flex-wrap items-center justify-center ${gapClass} max-w-md`}>
                    {Array.from({ length: countVal }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`${sizeClass} animate-bounce-slow drop-shadow-sm select-none`}
                        style={{ animationDelay: `${i * 120}ms` }}
                      >
                        {currentQuestion.emojiContext}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {/* Question: IDENTIFY */}
              {currentQuestion.type === 'IDENTIFY' && (
                <div className="flex flex-col items-center gap-2">
                  <Volume2 className="w-12 h-12 text-indigo-400 animate-pulse" />
                  <span className="text-indigo-600 font-extrabold text-lg text-center">
                    {lang === 'ar' 
                      ? 'اختر الرمز المطابق للاسم المسموع' 
                      : 'Choose the matching digit for the pronounced name'}
                  </span>
                </div>
              )}

              {/* Question: SEQUENCE */}
              {currentQuestion.type === 'SEQUENCE' && (
                <div className="flex items-center gap-3">
                  {currentQuestion.sequenceContext?.map((item, i) => (
                    <div 
                      key={i} 
                      className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl border-b-4 shadow-md ${
                        item === '?' 
                          ? 'bg-amber-400 border-amber-600 text-stone-800 animate-pulse' 
                          : 'bg-white border-stone-200 text-indigo-600'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              )}

            </div>

            {/* Options Buttons */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
              {currentQuestion.options.map((option) => {
                const item = NUMBERS_DATA.find((n) => n.value === option);
                const isSelected = selectedAnswer === option;
                const isCorrectAnswer = option === currentQuestion.correctAnswer;

                let btnStyle = 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800';
                let iconEl = null;

                if (isAnswered) {
                  if (isCorrectAnswer) {
                    btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-700 pointer-events-none scale-105';
                    iconEl = <Check className="w-5 h-5 text-emerald-600" />;
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-100 border-rose-400 text-rose-700 pointer-events-none';
                    iconEl = <X className="w-5 h-5 text-rose-600" />;
                  } else {
                    btnStyle = 'bg-stone-50 border-stone-100 text-stone-400 opacity-50 pointer-events-none';
                  }
                }

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswerClick(option)}
                    disabled={isAnswered}
                    className={`kids-btn py-4 text-2xl md:text-3xl font-extrabold flex flex-col items-center justify-center gap-1 min-h-[90px] ${btnStyle}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-sans">
                        {lang === 'ar' ? item?.arabicDigit : item?.englishDigit}
                      </span>
                      {iconEl}
                    </div>
                    <span className="text-xs font-bold text-stone-500">
                      {lang === 'ar' ? item?.arabicWord : item?.englishWord}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            {isAnswered && (
              <div className="w-full mt-8 flex justify-end">
                <button
                  onClick={handleNext}
                  className="kids-btn kids-btn-pink px-6 py-3 text-lg font-bold flex items-center gap-2 hover:scale-105"
                >
                  <span>{lang === 'ar' ? 'التالي' : 'Next'}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

          </div>
        ) : (
          /* Finished Screen */
          <div className="kids-card p-8 text-center flex flex-col items-center animate-bounce-slow" style={{ animationDuration: '6s' }}>
            <div className="bg-yellow-100 p-6 rounded-full mb-4 relative animate-pulse-soft">
              <Award className="w-16 h-16 text-yellow-500" />
              <Sparkles className="w-8 h-8 text-indigo-400 absolute -top-1 -right-1 animate-spin" />
            </div>

            <h3 className="text-3xl font-black text-indigo-600 mb-2">
              {lang === 'ar' ? 'لقد تم إنجاز الاختبار! 🏆' : 'Quiz Completed! 🏆'}
            </h3>
            
            <p className="text-lg font-bold text-stone-700 mb-6">
              {lang === 'ar' 
                ? `عمل خارق! لقد حصلت على درجة ${score} من 5` 
                : `Awesome effort! You scored ${score} out of 5`}
            </p>

            {/* Score rating graphic */}
            <div className="flex items-center justify-center gap-1 mb-8">
              {Array.from({ length: 5 }).map((_, i) => (
                <span 
                  key={i} 
                  className={`text-4xl transition-all ${
                    i < score ? 'text-yellow-400 scale-110 drop-shadow animate-pulse' : 'text-stone-200'
                  }`}
                >
                  ⭐
                </span>
              ))}
            </div>

            {/* Rewards detail */}
            <div className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4 mb-8 max-w-sm">
              <span className="text-indigo-600 font-extrabold block text-sm mb-1">
                {lang === 'ar' ? 'المكافأة المكتسبة' : 'Rewards Earned'}
              </span>
              <span className="text-stone-700 text-sm font-semibold">
                {lang === 'ar' 
                  ? `لقد ربحت +${score} نجوم ذهبية ${score === 5 ? 'بالإضافة لـ +5 نجوم مكافأة الدرجة الكاملة!' : ''}`
                  : `You earned +${score} golden stars ${score === 5 ? 'plus +5 perfect-score bonus stars!' : ''}`}
              </span>
            </div>

            <button
              onClick={generateQuiz}
              className="kids-btn kids-btn-green px-8 py-3.5 text-lg flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>{lang === 'ar' ? 'العب مجدداً 🎮' : 'Play Again 🎮'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

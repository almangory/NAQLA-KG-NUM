import React, { useState, useEffect } from 'react';
import { NUMBERS_DATA, BADGES_DATA, AVATARS } from './data/numbersData';
import { Language, UserProgress, ActiveActivity, NumberItem } from './types';
import { speakText, playSound, playSynthesizedBeep } from './utils/audio';
import DrawingBoard from './components/DrawingBoard';
import QuizGame from './components/QuizGame';
import MatchingGame from './components/MatchingGame';
import BalloonChallenge from './components/BalloonChallenge';
import SongCorner from './components/SongCorner';
import StatsProgress from './components/StatsProgress';
import WorksheetGenerator from './components/WorksheetGenerator';
import MoreGames from './components/MoreGames';
import VoiceRecorder from './components/VoiceRecorder';
import confetti from 'canvas-confetti';
import { 
  Compass, 
  HelpCircle, 
  Music, 
  Shuffle, 
  Sparkles, 
  Volume2, 
  Star, 
  Trophy, 
  Flame, 
  Layers, 
  Languages, 
  Palette, 
  ChevronRight, 
  ArrowRight,
  X, 
  Gift, 
  HelpCircle as HelpIcon,
  Smile,
  Home,
  CheckCircle2,
  Heart,
  Printer,
  BookOpen,
  Maximize,
  Minimize
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'kg2_numbers_journey_progress';

const getCountingBoxStyles = (value: number) => {
  if (value <= 3) {
    return {
      btn: 'w-16 h-16 md:w-20 md:h-20 text-4xl md:text-5xl',
      gap: 'gap-4',
      indicator: 'text-xs w-5 h-5',
    };
  }
  if (value <= 6) {
    return {
      btn: 'w-13 h-13 md:w-15 md:h-15 text-3xl md:text-4xl',
      gap: 'gap-3',
      indicator: 'text-[11px] w-4.5 h-4.5',
    };
  }
  if (value <= 8) {
    return {
      btn: 'w-11 h-11 md:w-13 md:h-13 text-2xl md:text-3xl',
      gap: 'gap-2',
      indicator: 'text-[10px] w-4 h-4',
    };
  }
  return {
    btn: 'w-9 h-9 md:w-11 md:h-11 text-xl md:text-2xl',
    gap: 'gap-1.5',
    indicator: 'text-[9px] w-3.5 h-3.5',
  };
};

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<ActiveActivity>('explore');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<NumberItem>(NUMBERS_DATA[1]); // Default to 1
  const [tappedIndices, setTappedIndices] = useState<number[]>([]); // For counting exercises
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  
  // App-level rewards notifications
  const [notification, setNotification] = useState<{ text: string; icon: string } | null>(null);
  const [unlockedBadgeModal, setUnlockedBadgeModal] = useState<any | null>(null);

  // Synchronize fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    playSound('click');
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  // User Progress state
  const [progress, setProgress] = useState<UserProgress>({
    name: 'بطل الأرقام',
    avatar: '🐱',
    stars: 0,
    trophies: 0,
    unlockedBadges: [],
    completedNumbers: [],
    favoriteNumbers: [],
    dailyStreak: 1,
    lastPlayedDate: '',
  });

  // Load progress from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Manage streak verification on load
        const todayStr = new Date().toISOString().split('T')[0];
        let newStreak = parsed.dailyStreak || 1;

        if (parsed.lastPlayedDate) {
          const lastDate = new Date(parsed.lastPlayedDate);
          const todayDate = new Date(todayStr);
          const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1; // Reset if they skipped a day
          }
        }

        setProgress({
          ...parsed,
          favoriteNumbers: parsed.favoriteNumbers || [],
          dailyStreak: newStreak,
          lastPlayedDate: todayStr,
        });
      } else {
        // First load
        const todayStr = new Date().toISOString().split('T')[0];
        setProgress((prev) => ({
          ...prev,
          favoriteNumbers: [],
          lastPlayedDate: todayStr,
        }));
      }
    } catch (e) {
      console.warn('Could not load progress', e);
    }
  }, []);

  // Back button gesture history management for mobile & tablet
  useEffect(() => {
    // Replace initial state with 'explore' if none exists
    if (!window.history.state) {
      window.history.replaceState({ tab: 'explore' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.tab) {
        // Switch tab silently without pushing another history state
        setActiveTab(event.state.tab);
        setTappedIndices([]);
      } else {
        setActiveTab('explore');
        setTappedIndices([]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Alert/Prompt before leaving/reloading the application
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const message = lang === 'ar' 
        ? 'هل أنت متأكد أنك تريد مغادرة رحلة استكشاف الأرقام؟ سيتم حفظ تقدمك تلقائياً.' 
        : 'Are you sure you want to leave the Numbers Discovery Journey? Your progress will be saved automatically.';
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [lang]);

  // Save progress changes
  const saveProgress = (newProgress: UserProgress) => {
    setProgress(newProgress);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newProgress));
    } catch (e) {
      console.warn('Could not save progress', e);
    }
  };

  // Helper to add stars
  const addStars = (amount: number, reason: string) => {
    const nextStars = progress.stars + amount;
    
    // Check if they crossed a badge threshold
    const newlyUnlockedBadges = [...progress.unlockedBadges];
    let badgeOpened = null;

    BADGES_DATA.forEach((badge) => {
      if (nextStars >= badge.starsRequired && !progress.unlockedBadges.includes(badge.id)) {
        newlyUnlockedBadges.push(badge.id);
        badgeOpened = badge;
      }
    });

    const nextTrophies = progress.trophies + (badgeOpened ? 1 : 0);

    const updatedProgress = {
      ...progress,
      stars: nextStars,
      unlockedBadges: newlyUnlockedBadges,
      trophies: nextTrophies,
    };

    saveProgress(updatedProgress);

    // Show temporary banner
    setNotification({
      text: lang === 'ar' ? `ربحت +${amount} نجمة: ${reason}` : `You earned +${amount} star: ${reason}`,
      icon: '⭐',
    });

    setTimeout(() => setNotification(null), 3000);

    // Show Badge unlock pop-up modal if applicable
    if (badgeOpened) {
      setTimeout(() => {
        setUnlockedBadgeModal(badgeOpened);
        playSynthesizedBeep(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
        });
        const badgeSpeech = lang === 'ar'
          ? `يا سلام! لقد حصلت على وسام جديد: ${badgeOpened.nameAr}!`
          : `Amazing! You unlocked a new badge: ${badgeOpened.nameEn}!`;
        speakText(badgeSpeech, lang);
      }, 1000);
    }
  };

  const updateAvatar = (newAvatar: string) => {
    saveProgress({ ...progress, avatar: newAvatar });
  };

  const updateName = (newName: string) => {
    saveProgress({ ...progress, name: newName });
  };

  // Chest manual opening reward
  const handleOpenChest = () => {
    // Find first locked badge
    const lockedBadge = BADGES_DATA.find((b) => !progress.unlockedBadges.includes(b.id));
    if (!lockedBadge) return;

    const updatedBadges = [...progress.unlockedBadges, lockedBadge.id];
    saveProgress({
      ...progress,
      unlockedBadges: updatedBadges,
      trophies: progress.trophies + 1,
    });

    setUnlockedBadgeModal(lockedBadge);
    playSynthesizedBeep(true);
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.5 },
    });

    const chestSpeech = lang === 'ar'
      ? `رائع! لقد فتحت صندوق الكنز وحصلت على وسام: ${lockedBadge.nameAr}!`
      : `Wow! You opened the treasure box and claimed the badge: ${lockedBadge.nameEn}!`;
    speakText(chestSpeech, lang);
  };

  // Welcome announcement when Robot avatar is clicked or header loads
  const handleRobotGreeting = () => {
    playSound('click');
    const introText = lang === 'ar'
      ? 'أهلاً بك يا بطل! أنا صديقك الروبوت الذكي روبي، دعنا نلعب ونستكشف الأرقام الممتعة سوياً باللغتين العربية والإنجليزية!'
      : 'Welcome, little champion! I\'m your smart robot friend Roby, let\'s play and explore fun numbers in Arabic and English!';
    speakText(introText, lang);
  };

  // Switch between tabs
  const handleTabChange = (tab: ActiveActivity, skipHistoryPush = false) => {
    playSound('click');
    setActiveTab(tab);
    setTappedIndices([]); // Reset counting exercise state

    // Read tab name
    const tabNames = {
      explore: lang === 'ar' ? 'استكشاف الأرقام' : 'Explore Numbers',
      quiz: lang === 'ar' ? 'اختبار المعرفة' : 'Knowledge Quiz',
      songs: lang === 'ar' ? 'أنشودة وفيديو' : 'Nursery Rhymes',
      match: lang === 'ar' ? 'لعبة التطابق' : 'Matching Game',
      challenge: lang === 'ar' ? 'تحدي البالونات' : 'Balloon Challenge',
      creativity: lang === 'ar' ? 'فنان الأرقام' : 'Drawing Board',
    };
    speakText(tabNames[tab], lang);

    if (!skipHistoryPush && window.history.state?.tab !== tab) {
      window.history.pushState({ tab }, '');
    }
  };

  // Explore Number interaction: tap on objects
  const handleExploreObjectTap = (index: number) => {
    if (tappedIndices.includes(index)) return;

    const nextIndices = [...tappedIndices, index];
    setTappedIndices(nextIndices);
    playSynthesizedBeep(true);

    // Speak current count
    const currentCount = nextIndices.length;
    const numToSpeak = NUMBERS_DATA.find((n) => n.value === currentCount);
    if (numToSpeak) {
      speakText(lang === 'ar' ? numToSpeak.arabicWord : numToSpeak.englishWord, lang);
    }

    // Award bonus star if completed entire count
    if (nextIndices.length === selectedNumber.value) {
      setTimeout(() => {
        addStars(1, lang === 'ar' ? `لعد جميع عناصر الرقم ${selectedNumber.arabicWord}` : `for counting all items of number ${selectedNumber.englishWord}`);
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
        });
        const completionSpeech = lang === 'ar'
          ? `أحسنت! لقد عددت جميع عناصر الرقم ${selectedNumber.arabicWord} بنجاح!`
          : `Excellent! You successfully counted all items of number ${selectedNumber.englishWord}!`;
        speakText(completionSpeech, lang);
      }, 500);
    }
  };

  // Helper to read spelling spellings
  const speakSpellingAndDigits = (num: NumberItem) => {
    playSound('click');
    const spoken = lang === 'ar'
      ? `الرقم ${num.arabicWord}. ويُكتب باللغة العربية هكذا: ${num.arabicDigit}. وبالإنجليزية هكذا: ${num.englishDigit}`
      : `The number ${num.englishWord}. Written as: ${num.englishDigit} in English and ${num.arabicDigit} in Arabic`;
    speakText(spoken, lang);
  };

  const isImmersive = activeTab !== 'explore';

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-6 relative text-stone-800">
      
      {/* Puffy clouds backdrop decorative frames */}
      <div className="absolute top-24 -left-16 text-white text-9xl select-none pointer-events-none opacity-20 animate-float-cloud-slow">☁️</div>
      <div className="absolute top-80 -right-24 text-white text-[120px] select-none pointer-events-none opacity-25 animate-float-cloud-fast">☁️</div>

      {/* Floating Sparkles notifications toast */}
      {notification && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-yellow-400 border-4 border-white text-stone-800 px-6 py-3 rounded-full font-black text-sm md:text-base shadow-2xl z-50 flex items-center gap-2 animate-bounce-slow">
          <span className="text-xl">{notification.icon}</span>
          <span>{notification.text}</span>
        </div>
      )}

      {/* Main Global Header Bar */}
      {!isImmersive && (
        <header className="kids-card mx-4 my-4 p-4 md:p-6 bg-linear-to-r from-sky-400 via-sky-300 to-sky-400 text-white border-white border-b-8 relative flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Left: App Title Branding */}
          <div className="flex items-center gap-3.5">
            {/* Flying cute books decoration */}
            <div className="text-4xl animate-bounce-slow select-none hidden sm:block">📚</div>
            
            <div className="text-center md:text-left">
              <h1 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-md game-text-stroke-white flex items-center justify-center md:justify-start gap-1">
                <span>NAQLA KG</span>
                <span className="text-yellow-300">|</span>
                <span className="text-yellow-200 text-lg md:text-2xl">{lang === 'ar' ? 'رحلة الأرقام' : 'Numbers Journey'}</span>
              </h1>
              <p className="text-sky-50 font-bold text-xs md:text-sm mt-0.5 tracking-wide">
                {lang === 'ar' 
                  ? 'تعلم، العب، واربح الجوائز مع صديقك الروبوت روبي!' 
                  : 'Learn, play, and win trophies with your friend Roby!'}
              </p>
            </div>
          </div>

          {/* Right: Lang Switcher, Robot, Profiles Summary */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            
            {/* Stars Mini Metric */}
            <div className="flex items-center gap-1.5 bg-white/30 px-3 py-1.5 rounded-2xl border border-white/40 font-black text-sm select-none shadow-sm">
              <span className="text-lg">⭐</span>
              <span>{progress.stars}</span>
            </div>

            {/* Bilingual Language Switcher with awesome click feel */}
            <button
              onClick={() => {
                const nextLang = lang === 'ar' ? 'en' : 'ar';
                setLang(nextLang);
                playSound('click');
                speakText(nextLang === 'ar' ? 'اللغة العربية' : 'English language', nextLang);
              }}
              className="kids-btn bg-amber-400 hover:bg-amber-300 border-amber-600 text-stone-800 px-4 py-2 text-xs flex items-center gap-1.5"
              title={lang === 'ar' ? 'تبديل اللغة' : 'Switch Language'}
            >
              <Languages className="w-4 h-4" />
              <span className="font-black">
                {lang === 'ar' ? 'English 🇺🇸' : 'العربية 🇸🇦'}
              </span>
            </button>

            {/* Fullscreen toggle button with cute game styles */}
            <button
              onClick={toggleFullscreen}
              className="kids-btn bg-emerald-400 hover:bg-emerald-300 border-emerald-600 text-white px-4 py-2 text-xs flex items-center gap-1.5"
              title={lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              <span className="font-black">
                {lang === 'ar' 
                  ? (isFullscreen ? 'شاشة عادية' : 'ملء الشاشة 📺') 
                  : (isFullscreen ? 'Normal Screen' : 'Fullscreen 📺')}
              </span>
            </button>

            {/* Robo mascot interactive assistant */}
            <button
              onClick={handleRobotGreeting}
              className="relative w-14 h-14 rounded-2xl bg-white border-2 border-sky-100 hover:border-sky-300 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer shadow-md group"
            >
              <span className="text-4xl select-none group-hover:animate-bounce-slow">🤖</span>
              {/* Abacus small accent overlay */}
              <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-stone-800 font-extrabold text-[10px] rounded-md px-1 py-0.2 border border-white">
                🧮
              </div>
            </button>

          </div>

        </header>
      )}

      {/* Immersive Mobile-Optimized Kids Header */}
      {isImmersive && (
        <div className="mx-4 mt-4 mb-2 flex items-center justify-between bg-white border-4 border-amber-300 rounded-3xl p-2.5 shadow-md animate-fade-in select-none">
          {/* Back button */}
          <button
            onClick={() => handleTabChange('explore')}
            className="kids-btn bg-linear-to-r from-rose-400 to-pink-500 hover:from-rose-500 hover:to-pink-600 text-white border-pink-600 font-black text-xs md:text-sm px-4 py-2 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-0' : 'rotate-180'}`} />
            <span>{lang === 'ar' ? 'الرجوع للرئيسية 🏠' : 'Back to Home 🏠'}</span>
          </button>

          {/* Title */}
          <div className="hidden xs:flex items-center gap-1.5 font-black text-stone-700 text-xs md:text-sm">
            <span className="text-xl">
              {activeTab === 'quiz' && '💡'}
              {activeTab === 'match' && '🧩'}
              {activeTab === 'challenge' && '🎈'}
              {activeTab === 'creativity' && '🎨'}
              {activeTab === 'songs' && '🎵'}
              {activeTab === 'worksheets' && '🖨️'}
              {activeTab === 'moregames' && '🎮'}
            </span>
            <span className="text-indigo-600">
              {activeTab === 'quiz' && (lang === 'ar' ? 'اختبار المعرفة' : 'Quiz Time')}
              {activeTab === 'match' && (lang === 'ar' ? 'لعبة التطابق' : 'Match Game')}
              {activeTab === 'challenge' && (lang === 'ar' ? 'تحدي البالونات' : 'Balloon Challenge')}
              {activeTab === 'creativity' && (lang === 'ar' ? 'فنان الأرقام' : 'Drawing Board')}
              {activeTab === 'songs' && (lang === 'ar' ? 'أناشيد الأطفال' : 'Nursery Songs')}
              {activeTab === 'worksheets' && (lang === 'ar' ? 'منشئ أوراق العمل' : 'Worksheet Generator')}
              {activeTab === 'moregames' && (lang === 'ar' ? 'ألعاب إضافية ممتعة' : 'Extra Fun Games')}
            </span>
          </div>

          {/* Quick Stats Widget */}
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFullscreen}
              className="w-8 h-8 rounded-xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 active:scale-95 transition-transform cursor-pointer"
              title={lang === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4.5 h-4.5" /> : <Maximize className="w-4.5 h-4.5" />}
            </button>

            <div className="flex items-center gap-1 bg-yellow-100 border border-yellow-300 px-2.5 py-1 rounded-full font-black text-xs text-amber-700">
              <span>⭐</span>
              <span>{progress.stars}</span>
            </div>
            
            <button 
              onClick={handleRobotGreeting}
              className="w-8 h-8 rounded-xl bg-sky-50 border-2 border-sky-300 flex items-center justify-center text-lg active:scale-95 transition-transform cursor-pointer"
            >
              🤖
            </button>
          </div>
        </div>
      )}

      {/* Quick Playful Tabs menu selector */}
      {!isImmersive && (
        <nav className="mx-4 mb-6 flex overflow-x-auto gap-2.5 pb-2.5 scrollbar-thin scroll-smooth justify-start md:justify-center">
            
            <button
              onClick={() => handleTabChange('explore')}
              className={`kids-btn px-4 py-2.5 text-xs md:text-sm shrink-0 ${
                activeTab === 'explore' ? 'kids-btn-pink ring-4 ring-pink-100' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>{lang === 'ar' ? 'اكتشف الأرقام 🧭' : 'Explore Numbers 🧭'}</span>
            </button>

            <button
              onClick={() => handleTabChange('quiz')}
              className={`kids-btn px-4 py-2.5 text-xs md:text-sm shrink-0 ${
                activeTab === 'quiz' ? 'kids-btn-yellow ring-4 ring-yellow-100' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <HelpIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'اختبار المعرفة 💡' : 'Quiz Time 💡'}</span>
            </button>

            <button
              onClick={() => handleTabChange('match')}
              className={`kids-btn px-4 py-2.5 text-xs md:text-sm shrink-0 ${
                activeTab === 'match' ? 'kids-btn-blue ring-4 ring-blue-100' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              <span>{lang === 'ar' ? 'لعبة التطابق 🧩' : 'Match Game 🧩'}</span>
            </button>

            <button
              onClick={() => handleTabChange('challenge')}
              className={`kids-btn px-4 py-2.5 text-xs md:text-sm shrink-0 ${
                activeTab === 'challenge' ? 'kids-btn-orange ring-4 ring-orange-100' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تحدي البالونات 🎈' : 'Balloon Challenge 🎈'}</span>
            </button>

            <button
              onClick={() => handleTabChange('moregames')}
              className={`kids-btn px-4 py-2.5 text-xs md:text-sm shrink-0 ${
                activeTab === 'moregames' ? 'kids-btn-pink ring-4 ring-pink-100 bg-pink-50' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'ar' ? 'ألعاب إضافية 🎮' : 'Extra Games 🎮'}</span>
            </button>

            <button
              onClick={() => handleTabChange('worksheets')}
              className={`kids-btn px-4 py-2.5 text-xs md:text-sm shrink-0 ${
                activeTab === 'worksheets' ? 'kids-btn-yellow ring-4 ring-yellow-100 bg-yellow-50' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{lang === 'ar' ? 'أوراق العمل 🖨️' : 'Worksheets 🖨️'}</span>
            </button>

            <button
              onClick={() => handleTabChange('creativity')}
              className={`kids-btn px-4 py-2.5 text-xs md:text-sm shrink-0 ${
                activeTab === 'creativity' ? 'kids-btn-pink ring-4 ring-pink-100' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>{lang === 'ar' ? 'فنان الأرقام 🎨' : 'Drawing Board 🎨'}</span>
            </button>

            <button
              onClick={() => handleTabChange('songs')}
              className={`kids-btn px-4 py-2.5 text-xs md:text-sm shrink-0 ${
                activeTab === 'songs' ? 'kids-btn-green ring-4 ring-green-100' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>{lang === 'ar' ? 'أناشيد الأطفال 🎵' : 'Nursery Songs 🎵'}</span>
            </button>

            <button
              onClick={() => {
                playSound('click');
                setActiveTab('explore');
                // Navigate directly to rewards inside statistics
                const el = document.getElementById('rewards-view-anchor');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                speakText(lang === 'ar' ? 'جوائزي ومكافآتي' : 'My rewards gallery', lang);
              }}
              className="kids-btn bg-purple-100 hover:bg-purple-200 border-purple-300 text-purple-600 px-4 py-2.5 text-xs md:text-sm shrink-0 flex items-center gap-1.5"
            >
              <Trophy className="w-4 h-4" />
              <span>{lang === 'ar' ? 'مكافآتي 🏆' : 'My Rewards 🏆'}</span>
            </button>

          </nav>
      )}

      {/* Active Tab Body Section Container */}
      <main className="flex-grow">
        
        {/* TAB 1: Explore Numbers (Explore) */}
        {activeTab === 'explore' && (
          <div className="p-4 md:p-6 animate-fade-in">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Number select Panel (Left columns) */}
              <div className="lg:col-span-4 kids-card p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-black text-stone-400 tracking-wider uppercase">
                    {lang === 'ar' ? 'اختر رقماً لاستكشافه 🔎' : 'Choose a Number to Explore 🔎'}
                  </span>
                  
                  {/* Favorites Filter Toggle */}
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowOnlyFavorites(!showOnlyFavorites);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-black rounded-full border transition-all flex items-center gap-1 ${
                      showOnlyFavorites
                        ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                        : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${showOnlyFavorites ? 'fill-current' : ''}`} />
                    <span>{lang === 'ar' ? 'المفضلة' : 'Favorites'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
                  {(() => {
                    const filtered = NUMBERS_DATA.filter(item => {
                      if (!showOnlyFavorites) return true;
                      return (progress.favoriteNumbers || []).includes(item.value);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="col-span-3 text-center py-6 px-4 bg-rose-50 rounded-2xl border-2 border-dashed border-rose-100 text-[11px] font-black text-rose-500">
                          <Heart className="w-5 h-5 mx-auto mb-1 opacity-70" />
                          <span>
                            {lang === 'ar'
                              ? 'المفضلة فارغة حالياً! اضغط على رمز القلب داخل أي رقم لإضافته هنا'
                              : 'Your favorites are empty! Tap the heart inside any number to add it here.'}
                          </span>
                        </div>
                      );
                    }

                    return filtered.map((item) => {
                      const isActive = selectedNumber.value === item.value;
                      const isPracticed = progress.completedNumbers.includes(item.value);

                      return (
                        <button
                          key={item.value}
                          onClick={() => {
                            setSelectedNumber(item);
                            setTappedIndices([]); // Reset tap counts
                            playSound('click');
                            speakText(lang === 'ar' ? item.arabicWord : item.englishWord, lang);
                          }}
                          className={`kids-btn py-4.5 px-2 text-2xl md:text-3xl font-black flex flex-col items-center justify-center gap-1 transition-all rounded-2xl ${
                            isActive 
                              ? 'bg-rose-500 border-rose-700 text-white scale-105 shadow-md' 
                              : 'bg-white border-stone-200 text-indigo-600 hover:bg-stone-50'
                          }`}
                        >
                          <span className="font-sans">
                            {lang === 'ar' ? item.arabicDigit : item.englishDigit}
                          </span>
                          
                          <span className="text-[10px] font-bold opacity-80 leading-tight">
                            {lang === 'ar' ? item.arabicWord : item.englishWord}
                          </span>

                          {isPracticed && (
                            <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-white">
                              <CheckCircle2 className="w-2.5 h-2.5 fill-current" />
                            </div>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Number detailed board (Right columns) */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                
                <div className="kids-card p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-br from-white to-sky-50/50">
                  
                  {/* Left Column: Spelling & spelling visuals */}
                  <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 gap-4">
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold bg-pink-100 text-pink-600 px-3 py-1 rounded-full border border-pink-200">
                        {lang === 'ar' ? 'تعلم الرقم' : 'Learn Number'}
                      </span>
                      <button
                        onClick={() => speakSpellingAndDigits(selectedNumber)}
                        className="p-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-xl transition-all"
                        title={lang === 'ar' ? 'استمع لكيفية اللفظ والكتابة' : 'Listen spelling and writing'}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          const favs = progress.favoriteNumbers || [];
                          const isFav = favs.includes(selectedNumber.value);
                          let nextFavs;
                          if (isFav) {
                            nextFavs = favs.filter((v) => v !== selectedNumber.value);
                            playSound('wrong');
                            speakText(lang === 'ar' ? 'تمت الإزالة من المفضلة' : 'Removed from favorites', lang);
                          } else {
                            nextFavs = [...favs, selectedNumber.value];
                            playSound('star');
                            speakText(lang === 'ar' ? 'تمت الإضافة للمفضلة!' : 'Added to favorites!', lang);
                          }
                          saveProgress({ ...progress, favoriteNumbers: nextFavs });
                        }}
                        className={`p-1.5 rounded-xl transition-all border flex items-center justify-center ${
                          (progress.favoriteNumbers || []).includes(selectedNumber.value)
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-600 border-rose-300'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-400 border-stone-200'
                        }`}
                        title={lang === 'ar' ? 'إضافة إلى المفضلة' : 'Add to Favorites'}
                      >
                        <Heart className={`w-4 h-4 ${(progress.favoriteNumbers || []).includes(selectedNumber.value) ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    <h3 className="text-6xl md:text-7xl font-black text-rose-500 drop-shadow-sm font-sans">
                      {lang === 'ar' ? selectedNumber.arabicDigit : selectedNumber.englishDigit}
                    </h3>

                    <h4 className="text-3xl md:text-4xl font-black text-indigo-600 leading-tight">
                      {lang === 'ar' ? selectedNumber.arabicWord : selectedNumber.englishWord}
                    </h4>

                    {/* Bilingual Writing equivalency indicators */}
                    <div className="flex flex-col gap-1.5 text-xs font-semibold text-stone-500 mt-2 bg-white/70 px-4 py-2.5 rounded-2xl border border-stone-100">
                      <div>
                        <span>{lang === 'ar' ? 'الرمز العربي:' : 'Arabic Digit:'} </span>
                        <span className="font-sans text-indigo-600 font-extrabold text-sm">{selectedNumber.arabicDigit}</span>
                        <span> ({selectedNumber.arabicWord})</span>
                      </div>
                      <div>
                        <span>{lang === 'ar' ? 'الرمز الإنجليزي:' : 'English Digit:'} </span>
                        <span className="font-sans text-pink-600 font-extrabold text-sm">{selectedNumber.englishDigit}</span>
                        <span> ({selectedNumber.englishWord})</span>
                      </div>
                    </div>

                    {/* Mark as practiced button */}
                    <button
                      onClick={() => {
                        playSound('click');
                        if (!progress.completedNumbers.includes(selectedNumber.value)) {
                          const completed = [...progress.completedNumbers, selectedNumber.value];
                          saveProgress({ ...progress, completedNumbers: completed });
                          addStars(2, lang === 'ar' ? `لإتمام المذاكرة والقراءة المتقنة للرقم ${selectedNumber.arabicWord}` : `for reading and practicing number ${selectedNumber.englishWord}`);
                        } else {
                          speakText(lang === 'ar' ? 'لقد ذاكرت هذا الرقم مسبقاً بنجاح!' : 'You already practiced this number successfully!', lang);
                        }
                      }}
                      className={`kids-btn py-2 px-5 text-xs w-full justify-center ${
                        progress.completedNumbers.includes(selectedNumber.value)
                          ? 'bg-emerald-100 text-emerald-600 border-emerald-300 pointer-events-none'
                          : 'kids-btn-green'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {progress.completedNumbers.includes(selectedNumber.value)
                          ? (lang === 'ar' ? 'تمت المذاكرة بنجاح! ✓' : 'Practiced successfully! ✓')
                          : (lang === 'ar' ? 'وضع علامة: تمت قراءته! (+2 ⭐)' : 'Mark as read! (+2 ⭐)')}
                      </span>
                    </button>

                    {/* Record My Voice Widget */}
                    <div className="w-full mt-2">
                      <VoiceRecorder
                        numberValue={selectedNumber.value}
                        numberWord={lang === 'ar' ? selectedNumber.arabicWord : selectedNumber.englishWord}
                        lang={lang}
                        onAddStars={addStars}
                      />
                    </div>

                  </div>

                  {/* Right Column: Mini interactive Counting Game */}
                  <div className="flex flex-col items-center flex-1 w-full border-t-2 md:border-t-0 md:border-l-2 border-dashed border-stone-100 pt-6 md:pt-0 md:pl-6">
                    
                    <span className="text-xs font-bold text-stone-400 block mb-1">
                      {lang === 'ar' ? 'لعبة العد التفاعلية 🦋' : 'Interactive Counting Game 🦋'}
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium text-center block mb-4">
                      {lang === 'ar' 
                        ? `انقر على العناصر بالصندوق لتعدها بصوت الروبوت!` 
                        : `Click on the items in the box to count them aloud!`}
                    </span>

                    {/* Canvas/Container of clickable emoji items */}
                    {(() => {
                      const boxStyles = getCountingBoxStyles(selectedNumber.value);
                      return (
                        <div className={`kids-card bg-indigo-50/50 p-4 w-full h-[180px] flex flex-wrap items-center justify-center ${boxStyles.gap} overflow-y-auto border-2 border-indigo-100 shadow-inner relative`}>
                          
                          {selectedNumber.value === 0 ? (
                            /* Empty Cloud sleeping screen for zero */
                            <div className="flex flex-col items-center text-center p-2">
                              <span className="text-5xl animate-bounce-slow">☁️💤</span>
                              <span className="text-xs font-bold text-indigo-400 mt-2">
                                {lang === 'ar' ? 'الصفر يعني صندوق فارغ وهادئ!' : 'Zero means empty and quiet box!'}
                              </span>
                            </div>
                          ) : (
                            /* Render emoji buttons corresponding to number count */
                            Array.from({ length: selectedNumber.value }).map((_, i) => {
                              const isTapped = tappedIndices.includes(i);
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleExploreObjectTap(i)}
                                  className={`${boxStyles.btn} rounded-2xl flex items-center justify-center transition-all shadow-md border-2 transform cursor-pointer ${
                                    isTapped
                                      ? 'bg-emerald-100 border-emerald-400 scale-90 ring-2 ring-emerald-200 animate-pulse'
                                      : 'bg-white hover:bg-stone-50 border-stone-200 active:scale-90 hover:scale-105 animate-bounce-slow'
                                  }`}
                                  style={{ animationDelay: `${i * 120}ms` }}
                                >
                                  <span className="select-none">{selectedNumber.illustrationEmoji}</span>
                                  {isTapped && (
                                    <span className={`absolute bottom-1 right-1 ${boxStyles.indicator} font-black font-sans bg-emerald-500 text-white rounded-full flex items-center justify-center`}>
                                      {lang === 'ar' ? NUMBERS_DATA[tappedIndices.indexOf(i) + 1]?.arabicDigit : tappedIndices.indexOf(i) + 1}
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}

                          {/* Tap all indicators */}
                          {tappedIndices.length > 0 && tappedIndices.length < selectedNumber.value && (
                            <div className="absolute bottom-2 left-2 right-2 bg-indigo-600/90 text-white font-extrabold text-[10px] py-1 rounded-md text-center animate-pulse">
                              {lang === 'ar' 
                                ? `واصل العد! لقد عددت ${tappedIndices.length} من ${selectedNumber.value}` 
                                : `Keep counting! You counted ${tappedIndices.length} of ${selectedNumber.value}`}
                            </div>
                          )}

                        </div>
                      );
                    })()}

                    {/* Reset button for counting */}
                    {selectedNumber.value > 0 && tappedIndices.length > 0 && (
                      <button
                        onClick={() => {
                          setTappedIndices([]);
                          playSound('click');
                          speakText(lang === 'ar' ? 'لنعد مجدداً!' : 'Let\'s count again!', lang);
                        }}
                        className="text-stone-400 hover:text-indigo-600 font-bold text-xs underline mt-3 cursor-pointer"
                      >
                        {lang === 'ar' ? 'إعادة عد الصندوق' : 'Recount the Box'}
                      </button>
                    )}

                  </div>

                </div>

                {/* Bottom Guide Card for Kindergarten Parent / Educator */}
                <div className="kids-card p-4 flex items-start gap-3 bg-indigo-50/40 border-indigo-100/60">
                  <div className="text-2xl mt-0.5">ℹ️</div>
                  <div>
                    <span className="text-xs font-black text-indigo-700 block">
                      {lang === 'ar' ? 'نصيحة المعلم الذكي لمستوى التمهيدي KG2' : 'Parent & Educator Guide'}
                    </span>
                    <span className="text-[11px] text-stone-600 leading-relaxed block mt-0.5">
                      {lang === 'ar'
                        ? 'إن ربط كتابة الرقم (مثال: ٣) وصوته مع العد الحسي اليدوي للأشكال والنجمات يساعد عقل طفلك على بناء الحس العددي السليم بمتعة فائقة!'
                        : 'Linking the writing of numbers, its pronunciation, and manual tactile counting of cupcakes or butterflies helps children establish robust early math concepts effortlessly.'}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* TAB 2: Quiz Game (Quiz) */}
        {activeTab === 'quiz' && (
          <QuizGame onAddStars={addStars} lang={lang} />
        )}

        {/* TAB 3: Matching Game (Match) */}
        {activeTab === 'match' && (
          <MatchingGame onAddStars={addStars} lang={lang} />
        )}

        {/* TAB 4: Balloon Challenge (Challenge) */}
        {activeTab === 'challenge' && (
          <BalloonChallenge onAddStars={addStars} lang={lang} />
        )}

        {/* TAB 5: Drawing Board (Creativity) */}
        {activeTab === 'creativity' && (
          <DrawingBoard onAddStars={addStars} lang={lang} />
        )}

        {/* TAB 6: Nursery Songs (Songs) */}
        {activeTab === 'songs' && (
          <SongCorner onAddStars={addStars} lang={lang} />
        )}

        {/* TAB 7: Extra Fun Games (MoreGames) */}
        {activeTab === 'moregames' && (
          <MoreGames onAddStars={addStars} lang={lang} />
        )}

        {/* TAB 8: Worksheet Generator (Worksheets) */}
        {activeTab === 'worksheets' && (
          <WorksheetGenerator 
            favoriteNumbers={progress.favoriteNumbers || []}
            lang={lang}
            onAddStars={addStars}
          />
        )}

      </main>

      {/* Profile & Rewards Section anchor point */}
      <div id="rewards-view-anchor" />
      {!isImmersive && (
        <StatsProgress 
          progress={progress} 
          onUpdateAvatar={updateAvatar}
          onUpdateName={updateName}
          onOpenTreasure={handleOpenChest}
          lang={lang}
        />
      )}

      {/* Badge Unlock Modals / Overlays */}
      {unlockedBadgeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="kids-card p-6 md:p-8 text-center max-w-sm bg-linear-to-b from-white to-amber-50 relative border-yellow-400 border-t-8 animate-bounce-slow" style={{ animationDuration: '6s' }}>
            
            {/* Close button */}
            <button
              onClick={() => {
                setUnlockedBadgeModal(null);
                playSound('click');
              }}
              className="absolute top-3 right-3 p-1.5 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="bg-yellow-100 p-5 rounded-full mb-4 w-20 h-20 flex items-center justify-center mx-auto relative animate-pulse-soft">
              <span className="text-5xl select-none">{unlockedBadgeModal.icon}</span>
              <div className="absolute -top-1 -right-1">✨</div>
            </div>

            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">
              {lang === 'ar' ? 'وسام شرف جديد! 🏅' : 'New Badge Claimed! 🏅'}
            </span>

            <h3 className="text-2xl font-black text-indigo-600 mb-2">
              {lang === 'ar' ? unlockedBadgeModal.nameAr : unlockedBadgeModal.nameEn}
            </h3>

            <p className="text-xs text-stone-600 font-semibold mb-6 leading-relaxed px-2">
              {lang === 'ar' ? unlockedBadgeModal.descriptionAr : unlockedBadgeModal.descriptionEn}
            </p>

            {/* Claim/Close button */}
            <button
              onClick={() => {
                setUnlockedBadgeModal(null);
                playSound('click');
              }}
              className="kids-btn kids-btn-green px-8 py-3 text-sm flex items-center gap-2 w-full justify-center"
            >
              <span>{lang === 'ar' ? 'يا سلام! شكراً روبي 🎉' : 'Amazing! Thanks Roby 🎉'}</span>
            </button>

          </div>
        </div>
      )}

      {/* Floating Footer info for kindergarten portal */}
      {!isImmersive && (
        <footer className="w-full text-center mt-8 pb-10 text-stone-400 text-[10px] font-bold select-none border-t border-dashed border-stone-200/40 pt-4">
          <div>{lang === 'ar' ? 'منصة NAQLA KG للأطفال © 2026' : 'Kids NAQLA KG Platform © 2026'}</div>
          <div className="mt-0.5 text-stone-400/80">{lang === 'ar' ? 'منصة مخصصة للتعليم المبكر الممتع والتفاعلي' : 'Bilingual kindergarten early learning application'}</div>
        </footer>
      )}

      {/* Bottom Sticky Mobile Navigation Helper bar, visible on small devices */}
      {!isImmersive && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 py-2.5 flex items-center gap-5 overflow-x-auto scrollbar-none z-40 md:hidden shadow-2xl rounded-t-2xl px-5 select-none">
          
          <button
            onClick={() => handleTabChange('explore')}
            className={`flex flex-col items-center gap-0.5 text-center shrink-0 min-w-[50px] ${
              activeTab === 'explore' ? 'text-pink-500 font-black scale-105' : 'text-stone-400 font-bold hover:text-stone-600'
            } transition-transform`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px]">{lang === 'ar' ? 'الاستكشاف' : 'Explore'}</span>
          </button>

          <button
            onClick={() => handleTabChange('quiz')}
            className={`flex flex-col items-center gap-0.5 text-center shrink-0 min-w-[50px] ${
              activeTab === 'quiz' ? 'text-yellow-500 font-black scale-105' : 'text-stone-400 font-bold hover:text-stone-600'
            } transition-transform`}
          >
            <HelpIcon className="w-5 h-5" />
            <span className="text-[9px]">{lang === 'ar' ? 'الاختبار' : 'Quiz'}</span>
          </button>

          <button
            onClick={() => handleTabChange('match')}
            className={`flex flex-col items-center gap-0.5 text-center shrink-0 min-w-[50px] ${
              activeTab === 'match' ? 'text-blue-500 font-black scale-105' : 'text-stone-400 font-bold hover:text-stone-600'
            } transition-transform`}
          >
            <Shuffle className="w-5 h-5" />
            <span className="text-[9px]">{lang === 'ar' ? 'المطابقة' : 'Match'}</span>
          </button>

          <button
            onClick={() => handleTabChange('challenge')}
            className={`flex flex-col items-center gap-0.5 text-center shrink-0 min-w-[50px] ${
              activeTab === 'challenge' ? 'text-orange-500 font-black scale-105' : 'text-stone-400 font-bold hover:text-stone-600'
            } transition-transform`}
          >
            <Flame className="w-5 h-5" />
            <span className="text-[9px]">{lang === 'ar' ? 'التحدي' : 'Challenge'}</span>
          </button>

          <button
            onClick={() => handleTabChange('creativity')}
            className={`flex flex-col items-center gap-0.5 text-center shrink-0 min-w-[50px] ${
              activeTab === 'creativity' ? 'text-pink-500 font-black scale-105' : 'text-stone-400 font-bold hover:text-stone-600'
            } transition-transform`}
          >
            <Palette className="w-5 h-5" />
            <span className="text-[9px]">{lang === 'ar' ? 'الرسم' : 'Paint'}</span>
          </button>

          <button
            onClick={() => handleTabChange('songs')}
            className={`flex flex-col items-center gap-0.5 text-center shrink-0 min-w-[50px] ${
              activeTab === 'songs' ? 'text-green-500 font-black scale-105' : 'text-stone-400 font-bold hover:text-stone-600'
            } transition-transform`}
          >
            <Music className="w-5 h-5" />
            <span className="text-[9px]">{lang === 'ar' ? 'الأناشيد' : 'Songs'}</span>
          </button>

          <button
            onClick={() => handleTabChange('moregames')}
            className={`flex flex-col items-center gap-0.5 text-center shrink-0 min-w-[50px] ${
              activeTab === 'moregames' ? 'text-pink-500 font-black scale-105' : 'text-stone-400 font-bold hover:text-stone-600'
            } transition-transform`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-[9px]">{lang === 'ar' ? 'ألعاب+' : 'Games+'}</span>
          </button>

          <button
            onClick={() => handleTabChange('worksheets')}
            className={`flex flex-col items-center gap-0.5 text-center shrink-0 min-w-[50px] ${
              activeTab === 'worksheets' ? 'text-yellow-500 font-black scale-105' : 'text-stone-400 font-bold hover:text-stone-600'
            } transition-transform`}
          >
            <Printer className="w-5 h-5" />
            <span className="text-[9px]">{lang === 'ar' ? 'أوراق' : 'Sheets'}</span>
          </button>

        </div>
      )}

    </div>
  );
}

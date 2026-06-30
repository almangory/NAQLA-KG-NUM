import React, { useState } from 'react';
import { BADGES_DATA, AVATARS } from '../data/numbersData';
import { UserProgress } from '../types';
import { speakText, playSound, playSynthesizedBeep } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Award, Star, Flame, Trophy, Sparkles, Gift, ShieldAlert, Heart, User, Check } from 'lucide-react';

interface StatsProgressProps {
  progress: UserProgress;
  onUpdateAvatar: (avatar: string) => void;
  onUpdateName: (name: string) => void;
  onOpenTreasure: () => void;
  lang: 'ar' | 'en';
}

export default function StatsProgress({
  progress,
  onUpdateAvatar,
  onUpdateName,
  onOpenTreasure,
  lang,
}: StatsProgressProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(progress.name);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Chest details
  const starsNeededForChest = 10;
  const currentChestProgress = progress.stars % starsNeededForChest;
  const chestsAvailableToOpen = Math.floor(progress.stars / starsNeededForChest) - progress.unlockedBadges.length + 1; 
  // Each badge takes 10 stars, first badge Compass is unlocked at 1 star, but let's count:
  // Let's make it simpler: standard chests can be opened whenever they have unclaimed chests!
  const canOpenChest = progress.stars >= 10 && progress.unlockedBadges.length < BADGES_DATA.length;

  const handleSaveName = () => {
    playSound('click');
    if (tempName.trim()) {
      onUpdateName(tempName);
      setIsEditingName(false);
      speakText(lang === 'ar' ? `مرحباً بك يا ${tempName}!` : `Welcome, ${tempName}!`, lang);
    }
  };

  const handleSelectAvatar = (emoji: string, label: string) => {
    onUpdateAvatar(emoji);
    setShowAvatarSelector(false);
    playSynthesizedBeep(true);
    speakText(lang === 'ar' ? `لقد اخترت رمز ${label}` : `You chose the ${label} avatar`, lang);
  };

  const handleOpenChestAction = () => {
    if (progress.unlockedBadges.length >= BADGES_DATA.length) {
      speakText(lang === 'ar' ? 'لقد فتحت جميع الهدايا يا بطل الأرقام!' : 'You unlocked all the treasures, numbers hero!', lang);
      return;
    }
    
    // Call parent handler to open a new badge
    onOpenTreasure();
  };

  return (
    <div className="p-4 md:p-6" id="rewards-section">
      <div className="max-w-4xl mx-auto">
        
        {/* Main Stats Header Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Col 1: Playful Child Profile Card */}
          <div className="kids-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-white to-sky-50">
            
            {/* Balloon/Cloud visual background decoration */}
            <div className="absolute top-2 left-2 text-2xl select-none opacity-20">🎈</div>
            <div className="absolute bottom-2 right-2 text-2xl select-none opacity-20">🎨</div>

            {/* Avatar block */}
            <button
              onClick={() => {
                setShowAvatarSelector(!showAvatarSelector);
                playSound('click');
              }}
              className="relative w-24 h-24 rounded-full bg-linear-to-tr from-pink-100 to-amber-100 border-4 border-white shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer group"
              title={lang === 'ar' ? 'انقر لتغيير الرمز' : 'Click to change avatar'}
            >
              <span className="text-6xl select-none group-hover:animate-bounce-slow">{progress.avatar}</span>
              <div className="absolute bottom-0 right-0 bg-rose-500 text-white rounded-full p-1.5 border-2 border-white shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Editing Name block */}
            {isEditingName ? (
              <div className="mt-4 flex flex-col items-center gap-2 w-full">
                <input
                  type="text"
                  maxLength={15}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="px-4 py-2 border-3 border-indigo-200 rounded-2xl text-center font-extrabold text-stone-700 focus:border-indigo-500 outline-none w-full max-w-[200px]"
                />
                <button
                  onClick={handleSaveName}
                  className="kids-btn kids-btn-green py-1.5 px-4 text-xs font-bold"
                >
                  {lang === 'ar' ? 'حفظ 💾' : 'Save 💾'}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-stone-800">{progress.name}</h3>
                  <button
                    onClick={() => {
                      setIsEditingName(true);
                      playSound('click');
                    }}
                    className="text-stone-400 hover:text-indigo-500 text-xs font-bold underline cursor-pointer"
                  >
                    {lang === 'ar' ? 'تعديل' : 'Edit'}
                  </button>
                </div>
                <span className="text-xs font-bold text-stone-400 mt-1">
                  {lang === 'ar' ? 'مستواك: KG2' : 'Level: KG2'}
                </span>
              </div>
            )}

            {/* Daily Streak Counter */}
            <div className="mt-4 bg-orange-100 text-orange-600 font-extrabold text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-orange-200">
              <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
              <span>
                {lang === 'ar' 
                  ? `حماس مستمر: ${progress.dailyStreak} يوم!` 
                  : `Daily Streak: ${progress.dailyStreak} days!`}
              </span>
            </div>

            {/* Avatar Selector Modal/Dropdown overlay */}
            {showAvatarSelector && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 p-4 flex flex-col items-center justify-center animate-fade-in">
                <span className="text-xs font-black text-indigo-600 mb-3 block">
                  {lang === 'ar' ? 'اختر رمزك المفضل 🌟' : 'Select your Avatar 🌟'}
                </span>
                
                <div className="grid grid-cols-4 gap-2.5 max-h-[140px] overflow-y-auto w-full p-1">
                  {AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAvatar(av.emoji, lang === 'ar' ? av.labelAr : av.labelEn)}
                      className="text-3xl p-1 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all hover:scale-110 active:scale-95 border border-indigo-100"
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowAvatarSelector(false)}
                  className="text-stone-400 hover:text-stone-600 text-xs font-bold underline mt-3"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            )}

          </div>

          {/* Col 2: Star Counter & Interactive Treasure Chest */}
          <div className="kids-card p-6 flex flex-col items-center justify-between text-center bg-gradient-to-b from-white to-amber-50 md:col-span-2">
            
            <div className="flex flex-col md:flex-row items-center justify-between w-full gap-6">
              
              {/* Star metrics display */}
              <div className="flex flex-col items-center justify-center flex-1">
                <div className="relative">
                  <Star className="w-16 h-16 text-yellow-400 fill-yellow-400 animate-pulse-soft" />
                  <span className="absolute inset-0 flex items-center justify-center font-black text-xl text-stone-800 select-none">
                    ⭐
                  </span>
                </div>
                <h4 className="text-3xl font-black text-amber-500 mt-2">
                  {progress.stars}
                </h4>
                <p className="text-xs font-bold text-stone-500">
                  {lang === 'ar' ? 'إجمالي النجوم الذهبية' : 'Total Golden Stars'}
                </p>
                
                <div className="flex items-center gap-1.5 mt-3 text-indigo-500 font-bold text-xs bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'ar' ? `الكؤوس: ${progress.trophies}` : `Trophies: ${progress.trophies}`}
                  </span>
                </div>
              </div>

              {/* Treasure Chest interactive segment */}
              <div className="border-t-2 md:border-t-0 md:border-l-2 border-dashed border-stone-200/60 pt-6 md:pt-0 md:pl-6 flex flex-col items-center flex-1 w-full">
                
                {/* Visual Chest Box */}
                <button
                  onClick={handleOpenChestAction}
                  disabled={!canOpenChest}
                  className={`relative transform transition-transform hover:scale-105 active:scale-95 cursor-pointer flex flex-col items-center ${
                    canOpenChest ? 'animate-bounce-slow' : 'opacity-70'
                  }`}
                >
                  <div className="text-6xl filter drop-shadow select-none">
                    {canOpenChest ? '🎁' : '🔒'}
                  </div>

                  {canOpenChest && (
                    <div className="absolute -top-1 -right-1 bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                      {lang === 'ar' ? 'افتح!' : 'Open!'}
                    </div>
                  )}
                </button>

                <h5 className="font-extrabold text-sm text-stone-700 mt-2">
                  {lang === 'ar' ? 'صندوق الهدايا والمفاجآت' : 'Treasure Reward Chest'}
                </h5>

                {/* Progress bar to next chest */}
                <div className="w-full bg-stone-200 h-3 rounded-full overflow-hidden mt-3 max-w-[200px] border border-stone-300">
                  <div 
                    className="bg-linear-to-r from-yellow-400 to-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(currentChestProgress / starsNeededForChest) * 100}%` }}
                  />
                </div>
                
                <span className="text-[10px] font-bold text-stone-400 mt-1.5">
                  {lang === 'ar'
                    ? `اجمع ${starsNeededForChest - currentChestProgress} نجوم لملء الصندوق التالي!`
                    : `Collect ${starsNeededForChest - currentChestProgress} more stars for the next chest!`}
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* Badges Gallery block */}
        <div className="kids-card p-6 bg-white">
          <div className="flex items-center justify-between border-b-2 border-dashed border-stone-100 pb-3 mb-6">
            <h4 className="font-black text-stone-800 text-lg flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-500" />
              {lang === 'ar' ? 'معرض الأوسمة والجوائز البطلة' : 'Champion Badges Gallery'}
            </h4>
            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              {lang === 'ar' 
                ? `المفتوح: ${progress.unlockedBadges.length} من ${BADGES_DATA.length}` 
                : `Unlocked: ${progress.unlockedBadges.length} of ${BADGES_DATA.length}`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {BADGES_DATA.map((badge) => {
              const isUnlocked = progress.unlockedBadges.includes(badge.id);

              return (
                <div
                  key={badge.id}
                  className={`relative p-4 rounded-2xl flex flex-col items-center text-center border-2 transition-all group hover:scale-102 ${
                    isUnlocked
                      ? 'bg-amber-50/50 border-amber-300 shadow-sm'
                      : 'bg-stone-50 border-stone-100 grayscale opacity-40'
                  }`}
                >
                  {/* Badge Star sparkles */}
                  {isUnlocked && (
                    <div className="absolute top-1 right-1 text-xs select-none animate-pulse">✨</div>
                  )}

                  {/* Badge Emoji icon */}
                  <span className="text-4xl select-none mb-2.5 transform group-hover:scale-110 transition-transform">
                    {badge.icon}
                  </span>

                  <span className="font-black text-xs text-stone-800 leading-tight block">
                    {lang === 'ar' ? badge.nameAr : badge.nameEn}
                  </span>

                  <span className="text-[9px] font-bold text-stone-400 leading-tight mt-1 max-w-[90px] mx-auto block">
                    {lang === 'ar' ? badge.descriptionAr : badge.descriptionEn}
                  </span>

                  {!isUnlocked && (
                    <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50/80 px-1.5 py-0.5 rounded-md mt-1.5 block">
                      {badge.starsRequired} ⭐
                    </span>
                  )}

                  {isUnlocked && (
                    <div className="mt-1.5 text-emerald-500">
                      <Check className="w-4 h-4 mx-auto stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export type Language = 'ar' | 'en';

export interface NumberItem {
  value: number; // 0 to 10
  arabicDigit: string; // ٠, ١, ٢...
  englishDigit: string; // 0, 1, 2...
  arabicWord: string; // صفر, واحد, اثنان...
  englishWord: string; // Zero, One, Two...
  illustrationEmoji: string; // Emoji representing the count items (e.g., '🍎')
  illustrationNameAr: string; // تفاحة, تفاحات...
  illustrationNameEn: string; // Apple, Apples...
  color: string; // Tailwind bg color class (e.g., 'bg-red-100 border-red-400 text-red-600')
  colorClass: string; // Raw hex or Tailwind colors for matching
  accentBg: string; // Soft background for item boxes
  activeColor: string; // Tailwind color for active state
  borderColor: string;
}

export interface RewardBadge {
  id: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  icon: string; // Emoji or Lucide icon key
  starsRequired: number;
}

export interface UserProgress {
  name: string;
  avatar: string; // Emoji (e.g. '🐱', '🐶', '🤖', '🦁', '🐻', '🦖')
  stars: number;
  trophies: number;
  unlockedBadges: string[]; // Badge IDs
  completedNumbers: number[]; // Numbers they practiced
  favoriteNumbers?: number[]; // Numbers favorited by the child
  dailyStreak: number;
  lastPlayedDate: string; // YYYY-MM-DD
}

export type ActiveActivity = 'explore' | 'quiz' | 'songs' | 'match' | 'challenge' | 'creativity' | 'worksheets' | 'moregames';

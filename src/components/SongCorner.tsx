import React, { useState } from 'react';
import { speakText, playSound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Music, Video, Play, Volume2, Award, Sparkles, Drum, Radio } from 'lucide-react';

interface SongCornerProps {
  onAddStars: (amount: number, reason: string) => void;
  lang: 'ar' | 'en';
}

interface SongItem {
  id: string;
  titleAr: string;
  titleEn: string;
  videoUrl: string; // Embed YouTube URL
  thumbnail: string; // Safe child friendly preview placeholder emoji/style
  lyricsAr: string[];
  lyricsEn: string[];
}

export default function SongCorner({ onAddStars, lang }: SongCornerProps) {
  const [activeTab, setActiveTab] = useState<'video' | 'rhyme'>('video');
  const [selectedSongIdx, setSelectedSongIdx] = useState(0);
  const [activeInstrument, setActiveInstrument] = useState<string | null>(null);
  const [listenedToSongs, setListenedToSongs] = useState<string[]>([]);

  const songs: SongItem[] = [
    {
      id: 'song-1',
      titleAr: 'أنشودة الأرقام العربية الجميلة 🐦',
      titleEn: 'Arabic Numbers Nursery Song 🐦',
      videoUrl: 'https://www.youtube.com/embed/g2760tQvPhQ', // Popular safe educational Arabic numbers song
      thumbnail: '🐤',
      lyricsAr: [
        'الواحدُ هو ربي .. خالقُ كل الكونِ',
        'والإثنانِ أبي وأمي .. يحباني دوماً من دونِ',
        'والثلاثةُ هي أصحابي .. نلهو معاً في الروضِ',
        'والأربعةُ أرجل كرسي .. نسند فيه للنهضِ',
        'والخمسةُ صلواتي المنجية .. أحافظ عليها في الفرضِ',
      ],
      lyricsEn: [
        'One is my Lord, Creator of all indeed,',
        'Two are my dad and mom, fulfilling every need,',
        'Three are my best of friends, with whom I laugh and play,',
        'Four are the legs of my chair, keeping me steady all day,',
        'Five are my daily prayers, bringing me peace along the way.',
      ]
    },
    {
      id: 'song-2',
      titleAr: 'أغنية الأرقام الإنجليزية للأطفال 🌟',
      titleEn: 'English Numbers Song for Kids 🌟',
      videoUrl: 'https://www.youtube.com/embed/V_lgJgBxoE0', // Safe super simple numbers song 1 to 10
      thumbnail: '🍎',
      lyricsAr: [
        'واحد، اثنان، ثلاثة، أربعة، خمسة .. فاح الدراق بنكهة همسة',
        'ستة، سبعة، ثمانية، تسعة، عشرة .. نعد تفاحاً يلمع في الشجرة',
        'هيا نعد سوياً يا أصحاب .. الأرقام سهلة تفتح الأبواب!',
      ],
      lyricsEn: [
        'One, two, three, four, five .. once I caught a fish alive,',
        'Six, seven, eight, nine, ten .. then I let it go again.',
        'Why did you let it go? Because it bit my finger so.',
        'Which finger did it bite? This little finger on the right!',
      ]
    },
    {
      id: 'song-3',
      titleAr: 'أنشودة الأرقام مع طيور الجنة 🎤',
      titleEn: 'Fun Counting to 10 with Rhymes 🎤',
      videoUrl: 'https://www.youtube.com/embed/p6qMOfD51Ww', // Safe kids educational count to 10 video
      thumbnail: '🦁',
      lyricsAr: [
        'واحد أرنب يجري يلعب .. يأكل جزراً كي لا يتعب',
        'إثنان كبشان في المرعى .. وثلاثة حمامات تسعى',
        'أربعة عصافير في العش .. وخمسة سمكات في الحوضِ تمشي',
      ],
      lyricsEn: [
        'One little bunny runs and plays, eating carrots all his days,',
        'Two fluffy sheep in the meadow run,',
        'Three happy birds having flying fun,',
        'Four sweet kittens sleeping in the nest,',
        'Five shiny fishes doing their very best!',
      ]
    }
  ];

  const instruments = [
    { id: 'drum', emoji: '🥁', soundName: 'Drums', pitch: 100, ar: 'طبلة' },
    { id: 'xylophone', emoji: '🎹', soundName: 'Xylophone', pitch: 600, ar: 'إكسيلوفون' },
    { id: 'bell', emoji: '🔔', soundName: 'Bell', pitch: 1000, ar: 'جرس سحري' },
    { id: 'trumpet', emoji: '🎺', soundName: 'Trumpet', pitch: 300, ar: 'بوق ملون' },
  ];

  const handlePlayInstrument = (id: string, frequency: number) => {
    setActiveInstrument(id);
    playSound('click');
    setTimeout(() => setActiveInstrument(null), 300);

    // Synthesize simple instrument tone
    if (typeof window !== 'undefined') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (id === 'drum') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.2);
        } else if (id === 'xylophone') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.3);
        } else if (id === 'bell') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
          
          // Dual frequency bell effect
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(frequency * 1.5, audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
          gain2.gain.setValueAtTime(0.07, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
          
          osc.start();
          osc.stop(audioCtx.currentTime + 0.6);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.6);
        } else {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
          gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.4);
        }
      } catch (e) {
        // Audio API blocked
      }
    }
  };

  const handleReadLyricsLine = (line: string) => {
    speakText(line, lang);
  };

  const handleWatchVideoReward = (songId: string) => {
    if (!listenedToSongs.includes(songId)) {
      const newList = [...listenedToSongs, songId];
      setListenedToSongs(newList);
      // Reward stars for educational video watching/singing
      onAddStars(2, lang === 'ar' ? 'لمشاهدة وتكرار أنشودة الأرقام التعليمية!' : 'for watching and repeating the numbers educational song!');
      
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.8 },
      });
    }
  };

  const currentSong = songs[selectedSongIdx];

  return (
    <div className="p-4 md:p-6" id="songs-section">
      <div className="max-w-4xl mx-auto">
        
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-emerald-500 flex items-center justify-center gap-2 drop-shadow-sm">
            <Music className="w-8 h-8 text-emerald-400 animate-bounce-slow" />
            {lang === 'ar' ? 'أنشودة وفيديو الأرقام التشجيعية' : 'Nursery Rhymes & Singing Corner'}
          </h2>
          <p className="text-stone-600 font-medium text-sm md:text-base mt-1">
            {lang === 'ar' 
              ? 'شاهد الفيديوهات التشجيعية، غنِّ مع الأناشيد، والعب بآلاتك المفضلة!' 
              : 'Watch encouraging educational videos, sing with rhymes, and play music!'}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => {
              setActiveTab('video');
              playSound('click');
            }}
            className={`kids-btn px-6 py-2.5 text-base ${
              activeTab === 'video' ? 'kids-btn-pink ring-4 ring-pink-100' : 'bg-white text-stone-600 border-stone-200'
            }`}
          >
            <Video className="w-5 h-5" />
            <span>{lang === 'ar' ? 'سينما الأطفال 🎬' : 'Kids Cinema 🎬'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('rhyme');
              playSound('click');
            }}
            className={`kids-btn px-6 py-2.5 text-base ${
              activeTab === 'rhyme' ? 'kids-btn-blue ring-4 ring-blue-100' : 'bg-white text-stone-600 border-stone-200'
            }`}
          >
            <Radio className="w-5 h-5" />
            <span>{lang === 'ar' ? 'لوحة الأناشيد والآلات 🥁' : 'Rhyme Soundbox 🥁'}</span>
          </button>
        </div>

        {/* Main Content Areas */}
        {activeTab === 'video' ? (
          /* Video tab layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left side: Playlist Selector */}
            <div className="lg:col-span-1 flex flex-col gap-3">
              <span className="text-xs font-bold text-stone-400 tracking-wider uppercase px-2">
                {lang === 'ar' ? 'قائمة الفيديوهات الممتعة' : 'Fun Kids Videos'}
              </span>

              {songs.map((song, i) => (
                <button
                  key={song.id}
                  onClick={() => {
                    setSelectedSongIdx(i);
                    playSound('click');
                    handleWatchVideoReward(song.id);
                  }}
                  className={`kids-card p-4 text-left flex items-center gap-3 transition-transform hover:scale-102 ${
                    selectedSongIdx === i 
                      ? 'border-pink-400 bg-pink-50 ring-2 ring-pink-200' 
                      : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="text-3xl bg-white p-2.5 rounded-2xl shadow-sm border border-stone-100">
                    {song.thumbnail}
                  </div>
                  <div className="flex flex-col text-left justify-start items-start">
                    <span className="font-black text-sm text-stone-800 leading-tight">
                      {lang === 'ar' ? song.titleAr : song.titleEn}
                    </span>
                    <span className="text-xs text-stone-400 mt-1">
                      {lang === 'ar' ? 'فيديو تعليمي تفاعلي' : 'Interactive educational video'}
                    </span>
                  </div>
                </button>
              ))}

              {/* Reward info banner */}
              <div className="kids-card bg-amber-50 border-amber-200 p-4 mt-2">
                <span className="text-amber-600 font-extrabold text-xs block mb-1">
                  {lang === 'ar' ? 'نظام مكافأة المشاهدة ⭐' : 'Video Watch Reward ⭐'}
                </span>
                <span className="text-xs text-stone-600 font-semibold leading-relaxed">
                  {lang === 'ar' 
                    ? 'شاهد أو كرّر الأناشيد التعليمية لتربح +2 نجوم ذهبية لتشجيعك!'
                    : 'Watch or sing along to nursery songs to earn +2 golden stars for learning!'}
                </span>
              </div>
            </div>

            {/* Right side: Video Player Screen */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="kids-card overflow-hidden bg-black aspect-video relative border-4 border-white shadow-2xl">
                <iframe
                  title="Kids Numbers Song"
                  src={`${currentSong.videoUrl}?autoplay=0&rel=0&showinfo=0`}
                  className="absolute inset-0 w-full h-full"
                  allowFullScreen
                />
              </div>

              {/* Lyrics card underneath */}
              <div className="kids-card p-6 bg-gradient-to-br from-indigo-50/50 to-pink-50/50">
                <h4 className="font-black text-indigo-700 text-lg mb-3 border-b border-indigo-100 pb-2">
                  {lang === 'ar' ? 'غنِّ معنا يا بطل! 🎤' : 'Sing Along with Us! 🎤'}
                </h4>
                
                <div className="flex flex-col gap-2">
                  {(lang === 'ar' ? currentSong.lyricsAr : currentSong.lyricsEn).map((line, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleReadLyricsLine(line)}
                      className="text-left w-full hover:bg-white/60 p-2 rounded-xl text-stone-700 hover:text-indigo-600 font-extrabold text-sm md:text-base flex items-center justify-between transition-colors cursor-pointer group"
                    >
                      <span>{line}</span>
                      <Volume2 className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 opacity-60 group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* Rhymes and Playful Instruments */
          <div className="kids-card p-6 flex flex-col items-center">
            
            <h3 className="text-xl font-black text-stone-800 text-center mb-6 leading-relaxed">
              {lang === 'ar'
                ? 'لوحة العزف التفاعلي والأرقام الموسيقية 🎹'
                : 'Playful Sounds and Interactive Rhythm Board 🎹'}
            </h3>

            {/* Toy Music Keyboard / Instruments row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mb-8">
              {instruments.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => handlePlayInstrument(inst.id, inst.pitch)}
                  className={`kids-btn flex flex-col py-6 px-4 text-center rounded-3xl transition-transform active:scale-90 ${
                    activeInstrument === inst.id
                      ? 'bg-amber-400 border-amber-600 scale-105 shadow-inner text-stone-800'
                      : inst.id === 'drum' ? 'kids-btn-pink'
                      : inst.id === 'xylophone' ? 'kids-btn-blue'
                      : inst.id === 'bell' ? 'kids-btn-green'
                      : 'kids-btn-purple'
                  }`}
                >
                  <span className="text-5xl mb-2 animate-bounce-slow" style={{ animationDelay: inst.id === 'drum' ? '0ms' : '200ms' }}>
                    {inst.emoji}
                  </span>
                  <span className="text-sm font-black text-shadow-sm">
                    {lang === 'ar' ? inst.ar : inst.soundName}
                  </span>
                </button>
              ))}
            </div>

            {/* Sing along mini rhythmic synthesizer */}
            <div className="bg-indigo-50 border-4 border-indigo-100 rounded-3xl p-6 w-full max-w-2xl text-center">
              <Drum className="w-8 h-8 text-indigo-500 mx-auto mb-3 animate-bounce-slow" />
              <h4 className="font-black text-indigo-700 mb-2">
                {lang === 'ar' ? 'صانع النغمات للأرقام 🎵' : 'Rhythm Composer 🎵'}
              </h4>
              <p className="text-xs text-stone-500 font-semibold mb-6">
                {lang === 'ar' 
                  ? 'انقر على الأزرار الموسيقية أعلاه لصناعة إيقاعك الخاص أثناء قراءة الأناشيد وتكرارها!' 
                  : 'Click on the instrument cards above to produce sound beats while reading and reciting rhymes!'}
              </p>

              {/* Rhythmic notes trigger boxes */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { note: 'Do', freq: 261.63, tag: '١' },
                  { note: 'Re', freq: 293.66, tag: '٢' },
                  { note: 'Mi', freq: 329.63, tag: '٣' },
                  { note: 'Fa', freq: 349.23, tag: '٤' },
                  { note: 'Sol', freq: 392.00, tag: '٥' },
                ].map((noteItem, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePlayInstrument('xylophone', noteItem.freq)}
                    className="p-3 bg-white hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 text-indigo-600 font-black text-sm rounded-xl active:scale-95 transition-all"
                  >
                    <div>{noteItem.note}</div>
                    <div className="text-xs text-stone-400 mt-0.5">{noteItem.tag}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

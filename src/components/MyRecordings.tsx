import { useState, useEffect, useRef } from 'react';
import { Play, Pause, Trash2, Mic, Music, Volume2, Sparkles, Award } from 'lucide-react';
import { getAllRecordingsDb, deleteRecordingDb, playRecordingWebAudio, SavedRecording } from '../utils/recordingsDb';
import { playSound, speakText } from '../utils/audio';

interface MyRecordingsProps {
  lang: 'ar' | 'en';
  onAddStars: (amount: number, reason: string) => void;
}

export default function MyRecordings({ lang, onAddStars }: MyRecordingsProps) {
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const webAudioStopRef = useRef<(() => void) | null>(null);

  // Load all recordings from IndexedDB
  const loadRecordings = async () => {
    try {
      const data = await getAllRecordingsDb();
      // Sort by numberValue ascending
      data.sort((a, b) => a.numberValue - b.numberValue);
      setRecordings(data);
    } catch (err) {
      console.error('Failed to load recordings from DB:', err);
    }
  };

  useEffect(() => {
    loadRecordings();

    // Listen to custom update events (e.g. from VoiceRecorder widget)
    const handleUpdate = () => {
      loadRecordings();
    };
    window.addEventListener('kg-recordings-updated', handleUpdate);

    return () => {
      window.removeEventListener('kg-recordings-updated', handleUpdate);
      if (webAudioStopRef.current) {
        webAudioStopRef.current();
      }
    };
  }, []);

  const handlePlay = async (rec: SavedRecording) => {
    if (playingId === rec.numberValue) {
      // Toggle off if clicking current playing
      if (webAudioStopRef.current) {
        webAudioStopRef.current();
        webAudioStopRef.current = null;
      }
      setPlayingId(null);
      return;
    }

    // Stop current playing if any
    if (webAudioStopRef.current) {
      webAudioStopRef.current();
    }

    playSound('click');
    const isMuted = localStorage.getItem('kg_muted') === 'true';

    const control = await playRecordingWebAudio(
      rec.blob,
      () => setPlayingId(rec.numberValue),
      () => setPlayingId(null),
      () => setPlayingId(null),
      isMuted
    );

    if (control) {
      webAudioStopRef.current = control.stop;
    }
  };

  const handleDelete = async (numberValue: number) => {
    playSound('wrong');
    if (playingId === numberValue && webAudioStopRef.current) {
      webAudioStopRef.current();
      webAudioStopRef.current = null;
    }
    setPlayingId(null);

    try {
      await deleteRecordingDb(numberValue);
      await loadRecordings();
    } catch (err) {
      console.error('Failed to delete recording:', err);
    }
  };

  return (
    <div id="my-recordings-section" className="w-full max-w-4xl mx-auto px-4 py-6">
      
      {/* Playful Header card */}
      <div className="kids-card bg-linear-to-r from-purple-500 via-pink-500 to-rose-400 p-6 md:p-8 text-white text-center rounded-3xl relative overflow-hidden mb-8 border-none shadow-xl">
        <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-x-6 -translate-y-6"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-yellow-300/20 rounded-full blur-3xl translate-x-12 translate-y-12"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-white/20 p-4 rounded-2xl mb-4 backdrop-blur-md animate-float-cloud-slow">
            <Mic className="w-12 h-12 text-yellow-300 fill-yellow-300 animate-pulse" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-tight">
            {lang === 'ar' ? '🎙️ تسجيلاتي الصوتية البطلة' : '🎙️ My Champion Recordings'}
          </h2>
          <p className="text-white/95 font-medium max-w-xl text-sm md:text-base leading-relaxed">
            {lang === 'ar' 
              ? 'هنا تجد كل الكلمات والأرقام التي سجلتها بصوتك الجميل! استمع إليها لتتذكر كيف تنطق الأرقام كالمحترفين.' 
              : 'Here you can play and listen to all the numbers you recorded with your beautiful voice!'}
          </p>

          {/* Mini Stats Indicator */}
          {recordings.length > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 text-xs md:text-sm font-bold shadow-xs">
              <Award className="w-4 h-4 text-yellow-300 fill-current" />
              <span>
                {lang === 'ar' 
                  ? `لقد سجلت ${recordings.length} أرقام بنجاح! 🏆` 
                  : `You recorded ${recordings.length} numbers successfully! 🏆`}
              </span>
            </div>
          )}
        </div>
      </div>

      {recordings.length === 0 ? (
        /* Empty State with cute instruction */
        <div className="kids-card bg-white p-12 text-center flex flex-col items-center justify-center gap-4 border-2 border-stone-100 shadow-md rounded-3xl">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-5xl mb-2 animate-bounce">
            🎤
          </div>
          <h3 className="text-lg md:text-xl font-black text-stone-700">
            {lang === 'ar' ? 'لا يوجد أي تسجيلات صوتية بعد!' : 'No recordings saved yet!'}
          </h3>
          <p className="text-stone-400 font-semibold text-xs md:text-sm max-w-md leading-relaxed">
            {lang === 'ar' 
              ? 'اذهب إلى لوحة الاستكشاف، اختر أي رقم واضغط على زر "سجّل صوتي" لتسمع صوتك العذب هنا وتكسب نجوماً إضافية! ✨' 
              : 'Go to the explore panel, choose any number, and click the "Record Me" button to save your voice here and win stars! ✨'}
          </p>
        </div>
      ) : (
        /* Grid list of recordings */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {recordings.map((rec) => {
            const isPlaying = playingId === rec.numberValue;
            
            return (
              <div 
                key={rec.numberValue}
                className={`kids-card bg-white border-2 p-5 rounded-2xl flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${
                  isPlaying 
                    ? 'border-pink-400 bg-pink-50/20 shadow-lg ring-4 ring-pink-100/50 scale-[1.02]' 
                    : 'border-indigo-50 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                {/* Number Badge Decorative Frame */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-tr from-purple-100 to-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-2xl text-indigo-600 shadow-xs">
                      {rec.numberValue}
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 font-bold block leading-none">
                        {lang === 'ar' ? 'الرقم المكتوب' : 'Number Word'}
                      </span>
                      <span className="font-extrabold text-sm text-stone-700">
                        {rec.numberWord}
                      </span>
                    </div>
                  </div>

                  {/* Playback animation bars */}
                  {isPlaying && (
                    <div className="flex items-center gap-0.5 h-6">
                      {[1, 2, 3, 2, 1].map((bar, i) => (
                        <div 
                          key={i} 
                          className="w-0.5 bg-pink-500 rounded-full animate-bounce" 
                          style={{
                            height: `${Math.floor(Math.random() * 12) + 6}px`,
                            animationDuration: `${0.4 + i * 0.1}s`,
                          }} 
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Date & Metadata */}
                <div className="bg-stone-50/50 p-2.5 rounded-xl border border-stone-100/70 flex items-center justify-between text-[10px] text-stone-500 font-semibold">
                  <span className="flex items-center gap-1">
                    <Music className="w-3 h-3 text-pink-400" />
                    {lang === 'ar' ? 'المدة: 0:0' : 'Duration: 0:0'}{rec.duration}ث
                  </span>
                  <span>
                    {new Date(rec.timestamp).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2.5 mt-1">
                  
                  {/* Play Button */}
                  <button
                    onClick={() => handlePlay(rec)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-b-4 transition-all ${
                      isPlaying
                        ? 'bg-amber-400 hover:bg-amber-300 border-amber-600 text-stone-900 shadow-inner'
                        : 'bg-indigo-500 hover:bg-indigo-400 border-indigo-700 text-white shadow-md active:scale-95'
                    }`}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3.5 h-3.5 fill-current" />
                        <span>{lang === 'ar' ? 'إيقاف ⏸️' : 'Stop ⏸️'}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current animate-pulse" />
                        <span>{lang === 'ar' ? 'استماع 🎧' : 'Listen 🎧'}</span>
                      </>
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(rec.numberValue)}
                    className="p-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-500 hover:text-stone-700 rounded-xl transition-colors"
                    title={lang === 'ar' ? 'حذف التسجيل' : 'Delete Recording'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

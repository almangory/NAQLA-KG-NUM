import { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Pause, Trash2, Sparkles, AlertCircle } from 'lucide-react';
import { playSound } from '../utils/audio';

interface VoiceRecorderProps {
  numberValue: number;
  numberWord: string;
  lang: 'ar' | 'en';
  onAddStars: (amount: number, reason: string) => void;
}

// Keep an in-memory session cache of recordings so kids don't lose them when switching numbers
const recordingsCache: Record<number, string> = {};
const rewardedNumbersCache: Record<number, boolean> = {};

export default function VoiceRecorder({ numberValue, numberWord, lang, onAddStars }: VoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  // Load cached recording for this number if it exists
  useEffect(() => {
    // Stop any current playback
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      setIsPlaying(false);
    }
    
    const cached = recordingsCache[numberValue];
    if (cached) {
      setAudioUrl(cached);
      setRecordingState('recorded');
    } else {
      setAudioUrl(null);
      setRecordingState('idle');
    }
    setErrorMsg(null);
    setRecordingDuration(0);
  }, [numberValue]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setErrorMsg(null);
    setRecordingDuration(0);

    try {
      playSound('click');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        recordingsCache[numberValue] = url;
        setRecordingState('recorded');
        
        // Award stars for speaking if they haven't been rewarded yet for this number
        if (!rewardedNumbersCache[numberValue]) {
          rewardedNumbersCache[numberValue] = true;
          playSound('star');
          setTimeout(() => {
            const rewardReason = lang === 'ar' 
              ? `لتسجيل صوتك البطل ونطق الرقم ${numberWord}!` 
              : `for recording your awesome voice saying ${numberWord}!`;
            onAddStars(2, rewardReason);
          }, 600);
        } else {
          playSound('success');
        }
      };

      mediaRecorder.start();
      setRecordingState('recording');

      // Start duration timer
      let seconds = 0;
      timerIntervalRef.current = window.setInterval(() => {
        seconds += 1;
        setRecordingDuration(seconds);
        if (seconds >= 6) { // Max 6 seconds recording for kids to keep it simple and fun
          stopRecording();
        }
      }, 1000);

    } catch (err: any) {
      console.error('Microphone error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg(
          lang === 'ar'
            ? 'عذراً! الرجاء السماح باستخدام الميكروفون من إعدادات المتصفح لنسمع صوتك العذب 🎤'
            : 'Oops! Please allow microphone access in your browser settings so we can hear your beautiful voice! 🎤'
        );
      } else {
        setErrorMsg(
          lang === 'ar'
            ? 'حدث خطأ في تفعيل الميكروفون. الرجاء المحاولة مرة أخرى!'
            : 'Microphone activation failed. Please try again!'
        );
      }
      setRecordingState('idle');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    playSound('click');
  };

  const playRecordedAudio = () => {
    if (!audioUrl) return;

    if (isPlaying && audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
      setIsPlaying(false);
      return;
    }

    playSound('click');
    const audio = new Audio(audioUrl);
    audioPlaybackRef.current = audio;
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setErrorMsg(
        lang === 'ar' 
          ? 'تعذر تشغيل التسجيل، يرجى إعادة التسجيل.' 
          : 'Failed to play recording, please record again.'
      );
    };

    audio.play();
  };

  const deleteRecording = () => {
    playSound('wrong');
    if (audioPlaybackRef.current) {
      audioPlaybackRef.current.pause();
    }
    setIsPlaying(false);
    setAudioUrl(null);
    delete recordingsCache[numberValue];
    setRecordingState('idle');
    setRecordingDuration(0);
  };

  return (
    <div className="bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-4 md:p-5 border-2 border-indigo-100/80 shadow-xs flex flex-col gap-3.5 relative overflow-hidden">
      
      {/* Decorative cute stars/clouds */}
      <div className="absolute top-1 right-2 opacity-15 pointer-events-none select-none text-xl">🌟</div>
      <div className="absolute bottom-1 left-2 opacity-15 pointer-events-none select-none text-xl">✨</div>

      {/* Title & Badge */}
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🎙️</span>
          <h4 className="text-xs md:text-sm font-black text-indigo-700">
            {lang === 'ar' ? 'سجّل نطقك للرقم!' : 'Record Your Voice!'}
          </h4>
        </div>

        {/* Custom status pill */}
        {recordingState === 'idle' && (
          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            {lang === 'ar' ? 'جاهز 🎤' : 'Ready 🎤'}
          </span>
        )}
        {recordingState === 'recording' && (
          <span className="text-[10px] font-bold bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
            {lang === 'ar' ? 'جاري التسجيل...' : 'Recording...'}
          </span>
        )}
        {recordingState === 'recorded' && (
          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
            <Sparkles className="w-2.5 h-2.5 fill-current animate-bounce" />
            <span>{lang === 'ar' ? 'أحسنت! +2 ⭐' : 'Awesome! +2 ⭐'}</span>
          </span>
        )}
      </div>

      {/* Guide prompt */}
      <p className="text-[11px] md:text-xs text-stone-500 font-semibold leading-relaxed">
        {lang === 'ar' ? (
          <>
            اضغط على الزر الأحمر وقل بصوت عالٍ وواضح: <span className="text-pink-600 font-extrabold text-xs">«{numberWord}»</span>
          </>
        ) : (
          <>
            Tap the button and say clearly: <span className="text-pink-600 font-extrabold text-xs">"{numberWord}"</span>
          </>
        )}
      </p>

      {/* Audio visualization waves or status illustration */}
      <div className="h-10 bg-white/70 rounded-xl border border-stone-100 flex items-center justify-center relative overflow-hidden px-4">
        {recordingState === 'idle' && (
          <span className="text-[10px] text-stone-400 font-bold tracking-wide animate-pulse">
            {lang === 'ar' ? 'بانتظار صوتك البطل... 🌱' : 'Waiting for your brave voice... 🌱'}
          </span>
        )}

        {/* Animated wave bars during recording */}
        {recordingState === 'recording' && (
          <div className="flex items-center gap-1 justify-center h-full">
            {[1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((bar, idx) => {
              // Custom bounce animations with random height limits and delays
              const heightClass = `h-${(idx % 3) * 2 + 3}`; // variety
              return (
                <div 
                  key={idx}
                  className="w-1 bg-rose-500 rounded-full animate-bounce"
                  style={{
                    height: `${Math.floor(Math.random() * 20) + 10}px`,
                    animationDuration: `${0.4 + (idx % 4) * 0.15}s`,
                    animationDelay: `${idx * 0.05}s`
                  }}
                />
              );
            })}
            <span className="text-xs font-mono font-black text-rose-600 ml-2">
              0:0{recordingDuration} / 0:06
            </span>
          </div>
        )}

        {/* Playback status waveform (friendly flat waves) */}
        {recordingState === 'recorded' && (
          <div className="flex items-center gap-2 w-full justify-between">
            <div className="flex items-center gap-0.5 opacity-65">
              {[2, 4, 6, 8, 5, 3, 6, 9, 7, 5, 3, 2].map((h, i) => (
                <div 
                  key={i} 
                  className={`w-0.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} 
                  style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }} 
                />
              ))}
            </div>
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {lang === 'ar' ? 'تم حفظ صوتك البطل! 🎉' : 'Your champion voice is saved! 🎉'}
            </span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold leading-tight">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Controls Container */}
      <div className="flex items-center gap-2 justify-center pt-1">
        
        {/* State 1: IDLE */}
        {recordingState === 'idle' && (
          <button
            onClick={startRecording}
            className="kids-btn kids-btn-pink py-2.5 px-6 text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform font-black"
          >
            <Mic className="w-4 h-4 text-white animate-pulse" />
            <span>{lang === 'ar' ? 'سجّل صوتي 🎙️' : 'Record Me 🎙️'}</span>
          </button>
        )}

        {/* State 2: RECORDING */}
        {recordingState === 'recording' && (
          <button
            onClick={stopRecording}
            className="bg-rose-500 hover:bg-rose-600 text-white border-2 border-rose-700 py-2.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform font-black animate-pulse"
          >
            <Square className="w-3.5 h-3.5 text-white fill-current" />
            <span>{lang === 'ar' ? 'إيقاف ⏹️' : 'Stop ⏹️'}</span>
          </button>
        )}

        {/* State 3: RECORDED */}
        {recordingState === 'recorded' && (
          <div className="flex items-center gap-2 w-full">
            
            {/* Play my voice */}
            <button
              onClick={playRecordedAudio}
              className={`kids-btn ${isPlaying ? 'bg-orange-100 text-orange-600 border-orange-300' : 'kids-btn-green'} flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5 font-black`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-orange-600 fill-current" />
                  <span>{lang === 'ar' ? 'إيقاف مؤقت' : 'Pause'}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-white fill-current animate-pulse" />
                  <span>{lang === 'ar' ? 'استمع لصوتي 🎧' : 'Listen to Me 🎧'}</span>
                </>
              )}
            </button>

            {/* Re-record */}
            <button
              onClick={deleteRecording}
              className="p-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-500 hover:text-stone-700 rounded-2xl transition-all"
              title={lang === 'ar' ? 'حذف وإعادة التسجيل' : 'Delete and record again'}
            >
              <Trash2 className="w-4 h-4" />
            </button>

          </div>
        )}

      </div>

    </div>
  );
}

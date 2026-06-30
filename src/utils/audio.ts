import { SHIELDS_SOUNDS } from '../data/numbersData';

let voicesLoaded = false;
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesLoaded = true;
  };
}

export function speakText(text: string, lang: 'ar' | 'en') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel(); // Stop any currently playing audio

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
  
  // Rate: 0.95 is natural and clear, yet slightly gentle for kids
  utterance.rate = 0.95; 
  
  // Pitch: 1.05 provides a bright, friendly tone without creating a metallic/squeaky robotic effect
  utterance.pitch = 1.05; 

  const voices = window.speechSynthesis.getVoices();
  
  // Scoring function to prioritize high-quality natural/human-sounding voices
  const scoredVoices = voices
    .filter((v) => {
      const targetLang = lang === 'ar' ? 'ar' : 'en';
      return v.lang.toLowerCase().startsWith(targetLang);
    })
    .map((v) => {
      let score = 0;
      const nameLower = v.name.toLowerCase();
      
      // Highly prioritize premium/neural/natural/online voices
      if (nameLower.includes('natural')) score += 100;
      if (nameLower.includes('neural')) score += 90;
      if (nameLower.includes('premium')) score += 80;
      if (nameLower.includes('google')) score += 70; // Google voices are generally high-quality TTS
      if (nameLower.includes('online')) score += 60; // Microsoft Edge Online voices
      
      if (lang === 'ar') {
        // High quality known Arabic voice names on Apple/Windows
        if (nameLower.includes('laila')) score += 50;
        if (nameLower.includes('muna')) score += 50;
        if (nameLower.includes('tarik')) score += 50;
        if (nameLower.includes('majed')) score += 40;
        if (nameLower.includes('hoda')) score += 30;
        if (nameLower.includes('naayf')) score += 30;
      } else {
        // High quality known English voice names
        if (nameLower.includes('siri')) score += 50;
        if (nameLower.includes('samantha')) score += 40;
        if (nameLower.includes('natural')) score += 40;
        if (nameLower.includes('daniel')) score += 30;
        if (nameLower.includes('karen')) score += 30;
      }
      
      return { voice: v, score };
    })
    .sort((a, b) => b.score - a.score);

  if (scoredVoices.length > 0) {
    utterance.voice = scoredVoices[0].voice;
    
    // Adjust pitch dynamically: if it is a robotic/legacy system voice, a bit more pitch help is okay
    // But for beautiful premium/neural voices, we keep it strictly at 1.0 to preserve pristine human warmth
    if (scoredVoices[0].score >= 60) {
      utterance.pitch = 1.0; 
      utterance.rate = 0.92; // Slightly more natural tempo for neural voices
    }
  }

  window.speechSynthesis.speak(utterance);
}

// Interactive sound effects using Web Audio API or lightweight pre-loaded sources
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!globalAudioCtx) {
    try {
      globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }
  // Resume context if suspended (common browser behavior)
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

export function playSound(type: string) {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      // Fallback if Web Audio API is not supported/blocked
      const fallbackUrl = SHIELDS_SOUNDS[type as keyof typeof SHIELDS_SOUNDS];
      if (fallbackUrl) {
        const audio = new Audio(fallbackUrl);
        audio.volume = 0.3;
        audio.play().catch(() => {});
      }
      return;
    }

    const now = ctx.currentTime;

    switch (type) {
      case 'click': {
        // High bubbly bubble-pop sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.07);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }
      case 'success': {
        // Sweet upward chime arpeggio - rewarding & bright
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.045);
          gain.gain.setValueAtTime(0.07, now + index * 0.045);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.045 + 0.16);
          osc.start(now + index * 0.045);
          osc.stop(now + index * 0.045 + 0.16);
        });
        break;
      }
      case 'star':
      case 'popup': {
        // Magical glittering sweep chime
        const notes = [783.99, 987.77, 1318.51, 1567.98]; // G5, B5, E6, G6
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + index * 0.04);
          gain.gain.setValueAtTime(0.06, now + index * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.04 + 0.2);
          osc.start(now + index * 0.04);
          osc.stop(now + index * 0.04 + 0.2);
        });
        break;
      }
      case 'balloonPop': {
        // Popping air-burst sound (fast descent low-to-high pop)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.09);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
      case 'cardFlip': {
        // Short sliding wooden blocks double click
        [0, 0.035].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(580, now + delay);
          gain.gain.setValueAtTime(0.07, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.03);
          osc.start(now + delay);
          osc.stop(now + delay + 0.03);
        });
        break;
      }
      case 'wrong':
      case 'fail': {
        // Descending friendly low "boing/descend" sound to show soft mistake without discouragement
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.22);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      default: {
        const fallbackUrl = SHIELDS_SOUNDS[type as keyof typeof SHIELDS_SOUNDS];
        if (fallbackUrl) {
          const audio = new Audio(fallbackUrl);
          audio.volume = 0.3;
          audio.play().catch(() => {});
        }
      }
    }
  } catch (error) {
    console.warn('Audio play failed', error);
  }
}

// Standard browser beep sounds for devices that block external audio links
export function playSynthesizedBeep(success: boolean) {
  playSound(success ? 'success' : 'wrong');
}

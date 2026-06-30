// Local database persistent helper for kid's voice recordings using IndexedDB and Web Audio API
const DB_NAME = 'NaqlaKgRecordingsDB';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

export interface SavedRecording {
  numberValue: number;
  numberWord: string;
  blob: Blob;
  duration: number;
  timestamp: number;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'numberValue' });
      }
    };
  });
}

// Save recording to DB
export async function saveRecordingDb(
  numberValue: number,
  numberWord: string,
  blob: Blob,
  duration: number
): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const item: SavedRecording = {
      numberValue,
      numberWord,
      blob,
      duration,
      timestamp: Date.now(),
    };
    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Retrieve single recording from DB
export async function getRecordingDb(numberValue: number): Promise<SavedRecording | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(numberValue);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (err) {
    console.error('IndexedDB get error:', err);
    return null;
  }
}

// Retrieve all recordings from DB
export async function getAllRecordingsDb(): Promise<SavedRecording[]> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  } catch (err) {
    console.error('IndexedDB getAll error:', err);
    return [];
  }
}

// Delete recording from DB
export async function deleteRecordingDb(numberValue: number): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(numberValue);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Web Audio API playback implementation
// Decodes and plays a binary audio Blob using AudioContext and BufferSourceNode
export async function playRecordingWebAudio(
  blob: Blob,
  onPlay: () => void,
  onStop: () => void,
  onEnded: () => void,
  isMuted: boolean = false
): Promise<{ stop: () => void } | null> {
  if (isMuted) return null;

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      // Fallback if Web Audio API not fully available
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onplay = onPlay;
      audio.onended = onEnded;
      audio.onerror = onEnded;
      audio.play();
      return {
        stop: () => {
          audio.pause();
          onStop();
        }
      };
    }

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    onPlay();

    source.onended = () => {
      audioCtx.close();
      onEnded();
    };

    source.start(0);

    return {
      stop: () => {
        try {
          source.stop();
        } catch (e) {}
        audioCtx.close();
        onStop();
      }
    };
  } catch (err) {
    console.error('Error during Web Audio API playback:', err);
    onEnded();
    return null;
  }
}

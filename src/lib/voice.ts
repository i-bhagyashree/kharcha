// Voice typing through the browser's built-in speech recognition (Chrome, Edge, Safari).
// Note: in Chrome the browser itself may send the audio to its speech service.

import { useRef, useState } from "react";

interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

const getCtor = (): (new () => Recognition) | undefined => {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const voiceSupported = () => typeof window !== "undefined" && Boolean(getCtor());

export function useVoice(onText: (text: string, final: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);

  function start() {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Is browser me voice nahi chalta. Chrome try karo.");
      return;
    }
    const r = new Ctor();
    r.lang = "en-IN"; // understands Hinglish and writes it in English letters
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let text = "";
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
        final = e.results[i].isFinal;
      }
      onText(text, final);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Mic ki permission do" : "Aawaz samajh nahi aayi, phir se bolo");
    r.onend = () => setListening(false);
    rec.current = r;
    setError("");
    setListening(true);
    r.start();
  }
  function stop() {
    rec.current?.stop();
    setListening(false);
  }
  return { listening, error, start, stop };
}

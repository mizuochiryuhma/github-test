const synth = window.speechSynthesis;
let speaking = false;
let lastSpokenAt = 0;
const SPEAK_COOLDOWN_MS = 1200;

// 連打抑止 + iOS初回無音対策（わずかに遅延）
window.speak = async (text) => {
  if (!synth) return;
  const now = Date.now();
  if (speaking || now - lastSpokenAt < SPEAK_COOLDOWN_MS) return;

  speaking = true;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ja-JP";
    utter.onend = () => { speaking = false; lastSpokenAt = Date.now(); };
    utter.onerror = () => { speaking = false; lastSpokenAt = Date.now(); };
    setTimeout(() => synth.speak(utter), 80);
  } catch {
    speaking = false;
  }
};

window.cancelSpeak = () => {
  if (!synth) return;
  synth.cancel();
  speaking = false;
};

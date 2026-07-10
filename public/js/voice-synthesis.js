// Synthese vocale partagee (voix naturelle) — utilisee par le coach vocal du
// chat dashboard et par voice.html, pour un rendu identique et non duplique
// entre les deux points d'integration.

// Ordre de preference : les voix "neurales"/premium sonnent nettement moins
// robotiques que la voix systeme par defaut, quand elles sont disponibles.
const VOICE_NAME_PRIORITY = [
  "google français", "google francais",
  "thomas",
  "amelie", "amélie",
  "microsoft paul", "microsoft julie",
];

let cachedFrenchVoice = null;

function pickBestFrenchVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  if (!voices.length) return null;
  const frVoices = voices.filter(v => v.lang?.toLowerCase().startsWith("fr"));
  const pool = frVoices.length ? frVoices : voices;

  for (const wanted of VOICE_NAME_PRIORITY) {
    const match = pool.find(v => v.name.toLowerCase().includes(wanted));
    if (match) return match;
  }
  return frVoices[0] || null;
}

// La liste des voix se charge de facon asynchrone sur la plupart des
// navigateurs (surtout au tout premier appel) : on la met en cache et on la
// rafraichit des que l'evenement voiceschanged confirme qu'elle est prete.
function refreshCachedVoice() { cachedFrenchVoice = pickBestFrenchVoice(); }
if (window.speechSynthesis) {
  refreshCachedVoice();
  window.speechSynthesis.addEventListener("voiceschanged", refreshCachedVoice);
}

const SPEECH_INTROS = ["Alors, ", "Écoute, ", "Voilà, ", "Bien sûr, "];
function randomIntro() {
  return SPEECH_INTROS[Math.floor(Math.random() * SPEECH_INTROS.length)];
}

// Nettoie le texte avant lecture : les emojis, le markdown, les URLs et les
// abreviations sonnent bizarre lus mot a mot par la synthese vocale. Les
// espaces normalises apres "." et "," donnent des pauses plus naturelles.
function cleanTextForSpeech(text) {
  return String(text || "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")      // emojis
    .replace(/\*\*/g, "")                         // markdown gras
    .replace(/\*/g, "")                           // markdown italique
    .replace(/https?:\/\/\S+/g, "le lien")        // URLs
    .replace(/#{1,6}\s/g, "")                     // titres markdown
    .replace(/(\d)\s*kg\b/gi, "$1 kilos")
    .replace(/\bkg\b/gi, "kilos")
    .replace(/(\d)\s*reps?\b/gi, "$1 répétitions")
    .replace(/\breps?\b/gi, "répétitions")
    .replace(/(\d)\s*min\b/gi, "$1 minutes")
    .replace(/\bmin\b/gi, "minutes")
    .replace(/\.\s*/g, ". ")                      // pause naturelle apres un point
    .replace(/,\s*/g, ", ")                       // pause naturelle apres une virgule
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Lit un texte a voix haute avec la meilleure voix francaise disponible et
// des reglages moins robotiques. addIntro=true (defaut) prefixe une phrase
// d'accroche aleatoire, sauf pour les textes courts/techniques ou ce serait
// hors-propos (l'appelant peut desactiver via { addIntro: false }).
function speakText(text, { onStart, onEnd, onError, addIntro = true } = {}) {
  const synth = window.speechSynthesis;
  if (!synth) { onError?.(new Error("Speech Synthesis non supportée sur ce navigateur.")); return null; }

  synth.cancel();

  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) return null;
  const finalText = addIntro ? randomIntro() + cleaned : cleaned;

  const utter = new SpeechSynthesisUtterance(finalText);
  utter.lang = "fr-FR";
  utter.rate = 0.88;
  utter.pitch = 1.05;
  utter.volume = 1.0;
  if (cachedFrenchVoice) utter.voice = cachedFrenchVoice;

  if (onStart) utter.addEventListener("start", onStart);
  if (onEnd) utter.addEventListener("end", onEnd);
  utter.addEventListener("error", e => onError?.(e));

  synth.speak(utter);
  return utter;
}

window.pickBestFrenchVoice = pickBestFrenchVoice;
window.cleanTextForSpeech = cleanTextForSpeech;
window.speakText = speakText;

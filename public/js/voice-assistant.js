// Assistant vocal conversationnel plein ecran (bulle centree), style
// Gemini/ChatGPT Voice — appele depuis le bouton micro du chat dashboard.
// Reutilise window.speakText (voice-synthesis.js) pour la synthese et
// l'API SpeechRecognition native pour l'ecoute, avec le meme pattern
// "arret sur 2s de silence" que voice-input.js. Boucle : ecoute -> envoi
// via la fonction sendMessage passee en parametre -> reponse lue a voix
// haute -> ecoute reprend automatiquement, jusqu'a fermeture de la bulle.
console.log("voice-assistant.js chargé");

function isIOSDeviceVoiceAssistant() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

let vaRecognition = null;
let vaSilenceTimer = null;
let vaActive = false;
let vaPaused = false;
let vaSendFn = null;
let vaLiveTranscript = "";

// La bulle est injectee (cachee) des le chargement du script, pas creee a la
// volee au clic : evite toute race condition et reste inspectable en
// devtools meme avant le premier clic sur le micro.
const vaOverlay = document.createElement("div");
vaOverlay.className = "voice-assistant-overlay";
vaOverlay.innerHTML = `
  <button class="voice-assistant-close" type="button" aria-label="Fermer">✕</button>
  <div class="voice-assistant-text voice-user-text"></div>
  <div class="voice-bubble voice-bubble-listening">
    <div class="voice-bubble-core"></div>
    <button class="voice-bubble-pause" type="button" aria-label="Mettre en pause">⏸</button>
  </div>
  <div class="voice-assistant-status">Je t'écoute…</div>
  <div class="voice-assistant-text voice-reply-text"></div>
`;
document.addEventListener("DOMContentLoaded", () => document.body.appendChild(vaOverlay));
if (document.readyState !== "loading") document.body.appendChild(vaOverlay);

const vaPauseBtn = vaOverlay.querySelector(".voice-bubble-pause");

vaOverlay.querySelector(".voice-assistant-close").addEventListener("click", closeVoiceAssistant);
vaOverlay.addEventListener("click", e => { if (e.target === vaOverlay) closeVoiceAssistant(); });
vaPauseBtn.addEventListener("click", e => { e.stopPropagation(); vaTogglePause(); });

function vaSetState(state, statusText) {
  const bubble = vaOverlay.querySelector(".voice-bubble");
  bubble.className = `voice-bubble voice-bubble-${state}`;
  if (statusText != null) vaOverlay.querySelector(".voice-assistant-status").textContent = statusText;
}

function vaSetUserText(text) {
  vaOverlay.querySelector(".voice-user-text").textContent = text || "";
}

function vaSetReplyText(text) {
  vaOverlay.querySelector(".voice-reply-text").textContent = text || "";
}

function vaStartListening() {
  if (!vaActive || vaPaused || !vaRecognition) return;
  vaSetState("listening", "Je t'écoute…");
  vaSetUserText("");
  try { vaRecognition.start(); } catch {}
}

function vaTogglePause() {
  if (!vaActive || !vaRecognition) return; // rien a mettre en pause si le navigateur ne supporte pas SpeechRecognition
  vaPaused = !vaPaused;
  if (vaPaused) {
    clearTimeout(vaSilenceTimer);
    try { vaRecognition?.stop(); } catch {}
    window.speechSynthesis?.cancel();
    vaPauseBtn.textContent = "▶";
    vaPauseBtn.setAttribute("aria-label", "Reprendre");
    vaSetState("paused", "En pause — clique sur ▶ pour reprendre");
  } else {
    vaPauseBtn.textContent = "⏸";
    vaPauseBtn.setAttribute("aria-label", "Mettre en pause");
    vaStartListening();
  }
}

async function vaHandleFinalTranscript(transcript) {
  vaSetUserText(transcript);
  vaSetState("thinking", "L'IA réfléchit…");
  vaSetReplyText("");

  const reply = await vaSendFn(transcript, { silent: true });
  if (!vaActive || vaPaused) return;

  if (!reply) {
    vaSetState("listening", "Aucune réponse, réessaie ou ferme la conversation.");
    return;
  }

  vaSetReplyText(reply);
  vaSetState("speaking", "L'IA répond…");
  window.speakText(reply, {
    onEnd: () => { if (vaActive && !vaPaused) vaStartListening(); },
    onError: () => { if (vaActive && !vaPaused) vaStartListening(); },
  });
}

function closeVoiceAssistant() {
  vaActive = false;
  vaPaused = false;
  vaPauseBtn.textContent = "⏸";
  vaPauseBtn.setAttribute("aria-label", "Mettre en pause");
  clearTimeout(vaSilenceTimer);
  try { vaRecognition?.stop(); } catch {}
  window.speechSynthesis?.cancel();
  vaOverlay.classList.remove("open");
}

function openVoiceAssistant(sendFn) {
  console.log("openVoiceAssistant() appelé");
  if (vaActive || typeof sendFn !== "function") return;

  // La bulle doit TOUJOURS s'ouvrir au clic, meme sur un navigateur qui ne
  // supporte pas SpeechRecognition : avant, on retournait ici avant meme
  // d'ouvrir l'overlay, donc rien ne s'affichait du tout sur ces navigateurs
  // (Firefox desktop, Safari macOS non-webkit...) — seul un toast (facultatif
  // et facile a manquer) tentait de prevenir l'utilisateur.
  vaSendFn = sendFn;
  vaActive = true;
  vaPaused = false;
  vaPauseBtn.textContent = "⏸";
  vaPauseBtn.setAttribute("aria-label", "Mettre en pause");
  vaLiveTranscript = "";
  vaSetUserText("");
  vaSetReplyText("");
  vaOverlay.classList.add("open");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    vaSetState("paused", "Utilise Chrome pour le coach vocal (reconnaissance vocale non supportée par ce navigateur).");
    return;
  }

  if (isIOSDeviceVoiceAssistant()) {
    vaSetState("listening", "Dictée vocale peu fiable sur iOS. Utilise Chrome sur ordinateur ou Android.");
    return;
  }

  if (!vaRecognition) {
    const lang = (window.i18n && window.i18n.getLang() === "en") ? "en-US" : "fr-FR";
    vaRecognition = new SpeechRecognition();
    vaRecognition.lang = lang;
    vaRecognition.continuous = true;
    vaRecognition.interimResults = true;

    vaRecognition.addEventListener("result", e => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      vaLiveTranscript = transcript;
      vaSetUserText(transcript);
      clearTimeout(vaSilenceTimer);
      vaSilenceTimer = setTimeout(() => { try { vaRecognition.stop(); } catch {} }, 2000);
    });

    vaRecognition.addEventListener("end", () => {
      clearTimeout(vaSilenceTimer);
      if (!vaActive || vaPaused) return;
      const transcript = vaLiveTranscript.trim();
      vaLiveTranscript = "";
      if (transcript) vaHandleFinalTranscript(transcript);
      else vaStartListening();
    });

    vaRecognition.addEventListener("error", e => {
      if (!vaActive || vaPaused || e.error === "aborted") return;
      clearTimeout(vaSilenceTimer);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        vaSetState("listening", "Accès au micro refusé. Autorise le micro dans les paramètres du navigateur.");
        return;
      }
      vaStartListening();
    });
  }

  vaStartListening();
}

window.openVoiceAssistant = openVoiceAssistant;
window.closeVoiceAssistant = closeVoiceAssistant;

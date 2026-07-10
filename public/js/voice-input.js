// Reconnaissance vocale (Fonctionnalite 11) — reutilisable sur tous les chats
// (dashboard, questionnaire, session, messages). API native, pas de librairie.
// initVoiceInput("input-id", "mic-btn-id") : cache le bouton si le navigateur
// ne supporte pas l'API, sinon dicte dans le champ (silence 2s => arret auto).

// iOS (Safari ET Chrome/Firefox iOS, qui partagent tous le moteur WebKit)
// expose webkitSpeechRecognition mais l'implementation y est peu fiable,
// surtout en mode continuous : le champ reste vide sans erreur visible.
function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function voiceErrorMessage(error) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Accès au micro refusé. Autorise le micro dans les paramètres du navigateur.";
    case "no-speech":
      return "Rien entendu, réessaie.";
    case "network":
      return "Problème réseau, réessaie.";
    default:
      return "La dictée vocale a échoué, réessaie.";
  }
}

function showVoiceHint(micBtn, text) {
  document.getElementById("voice-error-hint")?.remove();
  const hint = document.createElement("div");
  hint.className = "voice-error-hint";
  hint.id = "voice-error-hint";
  hint.textContent = text;
  document.body.appendChild(hint);

  const rect = micBtn.getBoundingClientRect();
  hint.style.left = `${Math.max(8, rect.left - 90)}px`;
  hint.style.top = `${rect.top - hint.offsetHeight - 10}px`;

  clearTimeout(showVoiceHint._timer);
  showVoiceHint._timer = setTimeout(() => hint.remove(), 4000);
}

function initVoiceInput(inputId, micBtnId) {
  const input = document.getElementById(inputId);
  const micBtn = document.getElementById(micBtnId);
  if (!input || !micBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { micBtn.style.display = "none"; return; }

  if (isIOSDevice()) {
    micBtn.addEventListener("click", () => {
      showVoiceHint(micBtn, "Dictée vocale peu fiable sur iOS. Utilise Chrome sur ordinateur ou Android.");
    });
    return;
  }

  const lang = (window.i18n && window.i18n.getLang() === "en") ? "en-US" : "fr-FR";
  const recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  let listening = false;
  let silenceTimer = null;

  function stopListening() {
    listening = false;
    micBtn.classList.remove("listening");
    clearTimeout(silenceTimer);
    try { recognition.stop(); } catch {}
  }

  function armSilenceTimeout() {
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(stopListening, 2000);
  }

  recognition.addEventListener("result", e => {
    let transcript = "";
    for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
    input.value = transcript;
    armSilenceTimeout();
  });
  recognition.addEventListener("end", () => { listening = false; micBtn.classList.remove("listening"); clearTimeout(silenceTimer); });
  recognition.addEventListener("error", e => {
    listening = false;
    micBtn.classList.remove("listening");
    clearTimeout(silenceTimer);
    if (e.error !== "aborted") showVoiceHint(micBtn, voiceErrorMessage(e.error));
  });

  micBtn.addEventListener("click", () => {
    if (listening) { stopListening(); return; }
    input.value = "";
    input.focus();
    listening = true;
    micBtn.classList.add("listening");
    try { recognition.start(); armSilenceTimeout(); } catch { listening = false; micBtn.classList.remove("listening"); }
  });
}

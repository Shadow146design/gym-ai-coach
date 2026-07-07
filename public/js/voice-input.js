// Reconnaissance vocale (Fonctionnalite 11) — reutilisable sur tous les chats
// (dashboard, questionnaire, session, messages). API native, pas de librairie.
// initVoiceInput("input-id", "mic-btn-id") : cache le bouton si le navigateur
// ne supporte pas l'API, sinon dicte dans le champ (silence 2s => arret auto).
function initVoiceInput(inputId, micBtnId) {
  const input = document.getElementById(inputId);
  const micBtn = document.getElementById(micBtnId);
  if (!input || !micBtn) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { micBtn.style.display = "none"; return; }

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
  recognition.addEventListener("error", () => { listening = false; micBtn.classList.remove("listening"); clearTimeout(silenceTimer); });

  micBtn.addEventListener("click", () => {
    if (listening) { stopListening(); return; }
    input.value = "";
    input.focus();
    listening = true;
    micBtn.classList.add("listening");
    try { recognition.start(); armSilenceTimeout(); } catch { listening = false; micBtn.classList.remove("listening"); }
  });
}

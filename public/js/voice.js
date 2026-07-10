// Assistant vocal complet (Fonctionnalite 12, PREMIUM) : appui bouton -> ecoute
// (Web Speech Recognition) -> POST /api/chat avec contexte complet -> reponse
// lue a voix haute (Web Speech Synthesis). Bouton desactive pendant que l'IA parle.
let voiceHistory = [];
let recognition = null;
let state = "idle"; // idle | listening | thinking | speaking
let autoListenAfterSpeech = false;

function esc(s) { const d = document.createElement("div"); d.textContent = String(s || ""); return d.innerHTML; }

async function init() {
  const me = await fetch("/api/auth/me").then(r => r.ok ? r.json() : null).catch(() => null);
  const user = me?.user;
  if (!user) { window.location.href = "/index.html"; return; }

  if (!["premium", "coach", "admin"].includes(user.role)) {
    document.getElementById("voice-app").classList.add("hidden");
    const locked = document.getElementById("voice-locked");
    locked.classList.remove("hidden");
    lockSection(locked, {
      title: "Coach Vocal — Premium",
      desc: "Parle à ton coach IA à voix haute et reçois des réponses parlées, où que tu sois dans la salle.",
    });
    return;
  }

  setupRecognition();
}

// iOS (Safari ET Chrome/Firefox iOS, qui partagent tous le moteur WebKit)
// expose webkitSpeechRecognition mais l'implementation y est peu fiable.
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
      return "Je n'ai rien entendu, réessaie.";
    case "network":
      return "Problème réseau, réessaie.";
    default:
      return "Appuie pour parler";
  }
}

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const orb = document.getElementById("voice-orb");
  const status = document.getElementById("voice-status");

  if (!SpeechRecognition) {
    orb.disabled = true;
    status.textContent = "Reconnaissance vocale non disponible sur ce navigateur.";
    return;
  }

  if (isIOSDevice()) {
    orb.disabled = true;
    status.textContent = "Reconnaissance vocale peu fiable sur iOS. Utilise Chrome sur ordinateur ou Android pour parler au coach.";
    return;
  }

  const lang = (window.i18n && window.i18n.getLang() === "en") ? "en-US" : "fr-FR";
  recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.addEventListener("result", e => {
    let transcript = "";
    for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
    document.getElementById("voice-transcript").textContent = transcript;
  });

  recognition.addEventListener("end", () => {
    const transcript = document.getElementById("voice-transcript").textContent.trim();
    if (state === "listening") {
      if (transcript) askCoach(transcript);
      else setState("idle", "Appuie pour parler");
    }
  });

  recognition.addEventListener("error", e => {
    if (state === "listening" && e.error !== "aborted") setState("idle", voiceErrorMessage(e.error));
  });

  orb.addEventListener("click", () => {
    if (state === "idle") startListening();
    else if (state === "listening") recognition.stop();
    else if (state === "speaking") stopSpeaking();
  });

  document.getElementById("voice-stop-btn").addEventListener("click", stopSpeaking);

  document.querySelectorAll(".voice-example-tag").forEach(tag => {
    tag.addEventListener("click", () => {
      if (state !== "idle") return;
      askCoach(tag.textContent);
    });
  });
}

function startListening() {
  if (!recognition || state !== "idle") return;
  document.getElementById("voice-transcript").textContent = "";
  setState("listening", "Je t'écoute…");
  try { recognition.start(); } catch { setState("idle", "Appuie pour parler"); }
}

// Coupe la synthese vocale immediatement (bouton "Arreter" ou clic sur
// l'orbe pendant que l'IA parle). N'enchaine pas sur une ecoute automatique :
// un arret manuel doit rester silencieux tant que l'utilisateur ne relance
// pas lui-meme.
function stopSpeaking() {
  autoListenAfterSpeech = false;
  window.speechSynthesis.cancel();
  document.getElementById("voice-stop-btn").classList.add("hidden");
  setState("idle", "Appuie pour parler");
}

function setState(next, statusText) {
  state = next;
  const orb = document.getElementById("voice-orb");
  orb.classList.remove("listening", "thinking", "speaking");
  if (next !== "idle") orb.classList.add(next);
  orb.disabled = next === "thinking";
  document.getElementById("voice-status").textContent = statusText;
}

async function askCoach(text) {
  setState("thinking", "Je réfléchis…");
  appendHistory("user", text);
  voiceHistory.push({ role: "user", content: text });

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history: voiceHistory }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur du coach IA.");

    voiceHistory.push({ role: "assistant", content: data.reply });
    appendHistory("coach", data.reply);
    speak(data.reply);
  } catch (e) {
    voiceHistory.pop();
    setState("idle", "Désolé, je n'ai pas pu répondre. Réessaie.");
  }
}

// Le nettoyage du texte, le choix de la voix et les reglages de lecture sont
// centralises dans voice-synthesis.js (partage avec le coach vocal du chat
// dashboard) — speak() se contente ici de brancher l'etat de l'orbe et le
// bouton stop sur le cycle de vie de l'utterance.
function speak(text) {
  const stopBtn = document.getElementById("voice-stop-btn");

  const utter = window.speakText(text, {
    onStart: () => {
      setState("speaking", "L'IA répond…");
      stopBtn.classList.remove("hidden");
    },
    onEnd: () => {
      stopBtn.classList.add("hidden");
      setState("idle", "Appuie pour parler");
      // Enchainement automatique : redonne la parole a l'utilisateur sans
      // qu'il ait a re-cliquer, sauf s'il a coupe la synthese lui-meme
      // (stopSpeaking met autoListenAfterSpeech a false).
      if (autoListenAfterSpeech && recognition && !document.getElementById("voice-orb").disabled) {
        setTimeout(() => { if (state === "idle") startListening(); }, 1000);
      }
    },
    onError: () => {
      stopBtn.classList.add("hidden");
      setState("idle", "Appuie pour parler");
    },
  });

  if (!utter) { setState("idle", "Appuie pour parler"); return; }
  autoListenAfterSpeech = true;
}

function appendHistory(role, text) {
  const box = document.getElementById("voice-history");
  const msg = document.createElement("div");
  msg.className = `chat-msg ${role === "user" ? "user" : "coach"}`;
  msg.textContent = text;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
  document.getElementById("voice-examples")?.classList.add("hidden");
}

init();

// Assistant vocal complet (Fonctionnalite 12, PREMIUM) : appui bouton -> ecoute
// (Web Speech Recognition) -> POST /api/chat avec contexte complet -> reponse
// lue a voix haute (Web Speech Synthesis). Bouton desactive pendant que l'IA parle.
let voiceHistory = [];
let recognition = null;
let state = "idle"; // idle | listening | thinking | speaking

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

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const orb = document.getElementById("voice-orb");
  const status = document.getElementById("voice-status");

  if (!SpeechRecognition) {
    orb.disabled = true;
    status.textContent = "Reconnaissance vocale non disponible sur ce navigateur.";
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

  recognition.addEventListener("error", () => {
    if (state === "listening") setState("idle", "Je n'ai rien entendu, réessaie.");
  });

  orb.addEventListener("click", () => {
    if (state === "idle") {
      document.getElementById("voice-transcript").textContent = "";
      setState("listening", "Je t'écoute…");
      try { recognition.start(); } catch { setState("idle", "Appuie pour parler"); }
    } else if (state === "listening") {
      recognition.stop();
    } else if (state === "speaking") {
      window.speechSynthesis.cancel();
      setState("idle", "Appuie pour parler");
    }
  });

  document.querySelectorAll(".voice-example-tag").forEach(tag => {
    tag.addEventListener("click", () => {
      if (state !== "idle") return;
      askCoach(tag.textContent);
    });
  });
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

function speak(text) {
  if (!window.speechSynthesis) { setState("idle", "Appuie pour parler"); return; }
  const lang = (window.i18n && window.i18n.getLang() === "en") ? "en-US" : "fr-FR";
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.9;
  setState("speaking", "Le coach répond…");
  utter.addEventListener("end", () => setState("idle", "Appuie pour parler"));
  utter.addEventListener("error", () => setState("idle", "Appuie pour parler"));
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
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

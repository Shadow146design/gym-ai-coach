let userMessageCount = 0;

async function init() {
  const meRes = await fetch("/api/auth/me");
  if (!meRes.ok) return (window.location.href = "/");

  const res = await fetch("/api/coach/messages");
  const { messages } = await res.json();

  if (messages.length) {
    document.getElementById("chat-empty").remove();
    messages.forEach((m) => {
      appendMessage(m.role, m.content);
      if (m.role === "user") userMessageCount++;
    });
    if (userMessageCount > 0) document.getElementById("regen-bar").classList.remove("hidden");
    scrollToBottom();
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function appendMessage(role, content) {
  const container = document.getElementById("chat-messages");
  const bubble = document.createElement("div");
  bubble.className = `msg ${role === "user" ? "msg-user" : "msg-assistant"}`;
  bubble.textContent = content;
  container.appendChild(bubble);
}

function scrollToBottom() {
  const container = document.getElementById("chat-messages");
  container.scrollTop = container.scrollHeight;
}

document.getElementById("chat-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("chat-input");
  const content = input.value.trim();
  if (!content) return;

  const emptyState = document.getElementById("chat-empty");
  if (emptyState) emptyState.remove();

  appendMessage("user", content);
  input.value = "";
  input.disabled = true;
  scrollToBottom();

  const typing = document.createElement("div");
  typing.className = "msg-typing";
  typing.textContent = "Le coach répond...";
  document.getElementById("chat-messages").appendChild(typing);
  scrollToBottom();

  try {
    const res = await fetch("/api/coach/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    typing.remove();

    if (!res.ok) {
      appendMessage("assistant", `⚠️ ${json.error || "Erreur, réessaie."}`);
    } else {
      appendMessage("assistant", json.reply);
      userMessageCount++;
      document.getElementById("regen-bar").classList.remove("hidden");
    }
    scrollToBottom();
  } catch {
    typing.remove();
    appendMessage("assistant", "⚠️ Impossible de joindre le serveur.");
  } finally {
    input.disabled = false;
    input.focus();
  }
});

document.getElementById("regen-btn").addEventListener("click", async () => {
  const btn = document.getElementById("regen-btn");
  btn.disabled = true;
  btn.textContent = "Génération en cours...";

  try {
    const progRes = await fetch("/api/program/active");
    const { program } = await progRes.json();
    if (!program || !program.questionnaire) {
      alert("Pas de programme existant à régénérer — réponds d'abord au questionnaire.");
      btn.disabled = false;
      btn.textContent = "Régénérer mon programme avec ce retour";
      return;
    }

    const userMessages = Array.from(document.querySelectorAll(".msg-user")).map((el) => el.textContent);
    const feedback = userMessages.join(" / ");

    const res = await fetch("/api/program/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...program.questionnaire, feedback }),
    });
    const json = await res.json();

    if (!res.ok) {
      alert(json.error || "Erreur lors de la régénération.");
      btn.disabled = false;
      btn.textContent = "Régénérer mon programme avec ce retour";
      return;
    }

    window.location.href = "/dashboard.html";
  } catch {
    alert("Impossible de joindre le serveur.");
    btn.disabled = false;
    btn.textContent = "Régénérer mon programme avec ce retour";
  }
});

document.getElementById("logout-link").addEventListener("click", async (e) => {
  e.preventDefault();
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/";
});

init();

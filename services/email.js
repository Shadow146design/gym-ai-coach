// Emails transactionnels (fonctionnalite 4). Desactive proprement si
// RESEND_API_KEY n'est pas configure (comme GROQ_API_KEY / STRIPE_SECRET_KEY
// ailleurs dans le projet) : les appels loggent et retournent { skipped: true }
// au lieu de planter le serveur.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
// "onboarding@resend.dev" est le seul expediteur garanti de fonctionner sans
// domaine verifie sur Resend (mode gratuit/test). Si EMAIL_FROM pointe vers
// un domaine personnalise non verifie, Resend refuse l'envoi ("domain not
// verified") : sendEmail() retente alors automatiquement avec ce fallback.
const FALLBACK_FROM = "Gym AI Coach <onboarding@resend.dev>";
const FROM = process.env.EMAIL_FROM || FALLBACK_FROM;
const APP_URL = process.env.APP_URL || "https://gym-ai-coach-1wls.onrender.com";

let resendClient = null;
if (RESEND_API_KEY) {
  const { Resend } = require("resend");
  resendClient = new Resend(RESEND_API_KEY);
} else {
  console.warn("⚠️  RESEND_API_KEY manquant — les emails transactionnels sont désactivés tant que la variable d'environnement n'est pas définie.");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

async function sendEmail({ to, subject, html }) {
  console.log("RESEND_API_KEY present:", !!process.env.RESEND_API_KEY);
  if (!resendClient) {
    console.log(`[email désactivé] "${subject}" -> ${to}`);
    return { skipped: true };
  }
  console.log("Sending to:", to, "| from:", FROM);
  try {
    // Le SDK Resend ne leve pas d'exception sur les erreurs API (cle
    // invalide, domaine non verifie, etc.) : il renvoie { data, error }.
    // Il faut donc verifier result.error explicitement, pas juste catch().
    let result = await resendClient.emails.send({ from: FROM, to, subject, html });
    console.log("Resend response:", JSON.stringify(result));

    if (result.error && FROM !== FALLBACK_FROM && /domain|verif/i.test(result.error.message || "")) {
      console.warn(`Domaine expéditeur "${FROM}" refusé par Resend, nouvel essai avec ${FALLBACK_FROM}`);
      result = await resendClient.emails.send({ from: FALLBACK_FROM, to, subject, html });
      console.log("Resend response (fallback from):", JSON.stringify(result));
    }

    return result;
  } catch (e) {
    console.error("Erreur envoi email Resend :", e.message);
    return { error: e.message };
  }
}

function wrapTemplate(title, bodyHtml, ctaText, ctaUrl) {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#ede8df;padding:24px;margin:0">
    <div style="max-width:480px;margin:0 auto;background:#141414;border-radius:12px;padding:32px;border:1px solid #2a2a2a">
      <div style="font-size:.8rem;letter-spacing:.05em;text-transform:uppercase;color:#c94d28;font-weight:700;margin-bottom:18px">Gym AI Coach</div>
      <h1 style="font-size:1.25rem;color:#ede8df;margin:0 0 16px">${title}</h1>
      <div style="font-size:.95rem;line-height:1.6;color:#c9c4ba">${bodyHtml}</div>
      ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:22px;background:#c94d28;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:.9rem">${ctaText}</a>` : ""}
      <p style="margin-top:28px;font-size:.72rem;color:#8f8b84">Tu reçois cet email car tu as un compte sur Gym AI Coach.</p>
    </div>
  </body></html>`;
}

async function sendWelcomeEmail(to, name) {
  return sendEmail({
    to,
    subject: "Bienvenue sur Gym AI Coach 💪",
    html: wrapTemplate(
      `Bienvenue ${name} !`,
      `Ton compte est prêt. Complète ton profil physique et ton objectif pour que l'IA génère un programme parfaitement adapté à toi.`,
      "Compléter mon profil", `${APP_URL}/profile.html`
    ),
  });
}

async function sendReminderEmail(to, name, daysSince) {
  return sendEmail({
    to,
    subject: "On ne t'a pas vu récemment 👀",
    html: wrapTemplate(
      `Ça fait ${daysSince} jours, ${name}`,
      `Ta régularité est la clé de tes résultats. Une petite séance aujourd'hui suffit pour reprendre le rythme.`,
      "Voir ma séance du jour", `${APP_URL}/session.html`
    ),
  });
}

async function sendWeeklyRecapEmail(to, name, stats) {
  return sendEmail({
    to,
    subject: "Ton récap de la semaine 📊",
    html: wrapTemplate(
      `Bravo ${name} !`,
      `Cette semaine : <strong>${stats.sessions}</strong> séance${stats.sessions > 1 ? "s" : ""},
       <strong>${Math.round(stats.volume)} kg</strong> soulevés au total${stats.prs ? `, <strong>${stats.prs}</strong> record${stats.prs > 1 ? "s" : ""} battu${stats.prs > 1 ? "s" : ""}` : ""}.`,
      "Voir mes statistiques", `${APP_URL}/stats.html`
    ),
  });
}

async function sendBadgeUnlockedEmail(to, name, badgeTitle, badgeIcon) {
  return sendEmail({
    to,
    subject: `Badge débloqué : ${badgeTitle} ${badgeIcon || "🏅"}`,
    html: wrapTemplate(
      `Nouveau badge, ${name} !`,
      `Tu viens de débloquer le badge <strong>${badgeIcon || "🏅"} ${badgeTitle}</strong>. Continue comme ça !`,
      "Voir mes badges", `${APP_URL}/profile.html`
    ),
  });
}

async function sendMessageNotification(toEmail, toName, fromName, messagePreview, conversationUrl) {
  const truncated = messagePreview.length > 200 ? `${messagePreview.slice(0, 200)}…` : messagePreview;
  return sendEmail({
    to: toEmail,
    subject: `💬 Nouveau message de ${fromName} sur Gym AI Coach`,
    html: wrapTemplate(
      `Bonjour ${escapeHtml(toName)},`,
      `<strong>${escapeHtml(fromName)}</strong> vous a envoyé un message sur Gym AI Coach :
       <p style="margin-top:12px;padding:14px 16px;background:#1e1e1e;border-left:3px solid #c94d28;border-radius:6px;font-style:italic">${escapeHtml(truncated)}</p>`,
      "Répondre", conversationUrl
    ),
  });
}

async function sendPremiumConfirmationEmail(to, name) {
  return sendEmail({
    to,
    subject: "Bienvenue en Premium ⭐",
    html: wrapTemplate(
      `Merci ${name} !`,
      `Ton abonnement Premium est actif : programmes illimités, questionnaire conversationnel IA, chat illimité, débrief post-séance, assistant vocal, score de forme, et bien plus.`,
      "Découvrir mes avantages", `${APP_URL}/premium.html`
    ),
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendReminderEmail,
  sendWeeklyRecapEmail,
  sendBadgeUnlockedEmail,
  sendPremiumConfirmationEmail,
  sendMessageNotification,
};

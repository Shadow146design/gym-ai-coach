// Traductions FR/EN — cle : { fr, en }. Utilise par sidebar.js et les pages via data-i18n.
const I18N_DICT = {
  // Sidebar — navigation
  nav_home:        { fr: "Accueil",             en: "Home" },
  nav_session:      { fr: "Séance du jour",      en: "Today's workout" },
  nav_program:      { fr: "Programme",           en: "Program" },
  nav_stats:        { fr: "Statistiques",        en: "Stats" },
  nav_coaches:      { fr: "Coaches",             en: "Coaches" },
  nav_messages:     { fr: "Messages",            en: "Messages" },
  nav_premium:      { fr: "Premium",             en: "Premium" },
  nav_profile:      { fr: "Mon profil",          en: "My profile" },
  nav_history:      { fr: "Historique",          en: "History" },
  nav_settings:     { fr: "Paramètres",          en: "Settings" },
  nav_exercises:    { fr: "Exercices",           en: "Exercises" },
  nav_admin:        { fr: "Admin",               en: "Admin" },
  nav_coach_clients:{ fr: "Mes clients",         en: "My clients" },
  nav_logout:       { fr: "Déconnexion",         en: "Log out" },
  bottom_home:      { fr: "Accueil",             en: "Home" },
  bottom_session:   { fr: "Séance",              en: "Workout" },
  bottom_program:   { fr: "Programme",           en: "Program" },
  bottom_stats:     { fr: "Stats",               en: "Stats" },
  bottom_profile:   { fr: "Profil",              en: "Profile" },

  // Boutons communs
  btn_save:     { fr: "Enregistrer",           en: "Save" },
  btn_cancel:   { fr: "Annuler",               en: "Cancel" },
  btn_send:     { fr: "Envoyer",               en: "Send" },
  btn_edit:     { fr: "Modifier",              en: "Edit" },
  btn_delete:   { fr: "Supprimer",             en: "Delete" },

  // Page — Programme (dashboard)
  page_dashboard_cta:   { fr: "▶ Commencer la séance",   en: "▶ Start the workout" },
  page_dashboard_regen: { fr: "Regénérer le programme",  en: "Regenerate program" },

  // Page — Statistiques
  page_stats_title: { fr: "Statistiques",   en: "Stats" },
  page_stats_sub:   { fr: "Toute ta progression au même endroit.", en: "All your progress in one place." },

  // Page — Profil
  page_profile_title: { fr: "Mon profil",   en: "My profile" },
  page_profile_sub:   { fr: "Ton identité, tes données et ton abonnement, au même endroit.", en: "Your identity, your data and your subscription, in one place." },

  // Page — Paramètres
  page_settings_title: { fr: "Paramètres",   en: "Settings" },
  page_settings_sub:   { fr: "Sécurité, préférences et données de ton compte.", en: "Security, preferences and account data." },

  // Page — Premium
  page_premium_title: { fr: "Passe au niveau supérieur",  en: "Level up" },

  // Page — Coaches
  page_coaches_title: { fr: "Nos coaches",   en: "Our coaches" },
  page_coaches_sub:   { fr: "Des vrais experts pour t'accompagner personnellement.", en: "Real experts to guide you personally." },

  // Page — Historique
  page_history_title: { fr: "Historique des programmes",   en: "Program history" },
  page_history_sub:   { fr: "Tous tes programmes générés, dans l'ordre.", en: "All your generated programs, in order." },

  // Page — Messages
  page_messages_title: { fr: "Messages",   en: "Messages" },

  // Page — Exercices
  page_exercises_title: { fr: "Bibliothèque d'exercices",   en: "Exercise library" },
  page_exercises_sub:   { fr: "Plus de 50 exercices, filtrables par groupe musculaire.", en: "50+ exercises, filterable by muscle group." },

  // Page — Admin
  page_admin_title: { fr: "Panneau d'administration",   en: "Admin panel" },

  // Page — Coach dashboard
  page_coachdash_title: { fr: "Mes clients",   en: "My clients" },
};

function i18nGetLang() {
  return localStorage.getItem("lang") || "fr";
}

function i18nSetLang(lang) {
  localStorage.setItem("lang", lang);
  applyI18n();
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

function t(key) {
  const lang = i18nGetLang();
  const entry = I18N_DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.fr;
}

function applyI18n() {
  document.documentElement.lang = i18nGetLang();
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
}

window.i18n = { t, getLang: i18nGetLang, setLang: i18nSetLang, apply: applyI18n };

document.addEventListener("DOMContentLoaded", applyI18n);

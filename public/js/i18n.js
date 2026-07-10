// Traductions FR/EN — cle : { fr, en }. Utilise par sidebar.js et les pages via data-i18n.
const I18N_DICT = {
  // Sidebar — navigation
  nav_home:        { fr: "Accueil",             en: "Home" },
  nav_session:      { fr: "Séance du jour",      en: "Today's workout" },
  nav_program:      { fr: "Programme",           en: "Program" },
  nav_stats:        { fr: "Statistiques",        en: "Stats" },
  nav_coaches:      { fr: "Coaches",             en: "Coaches" },
  nav_messages:     { fr: "Messages",            en: "Messages" },
  nav_voice:        { fr: "Coach Vocal",         en: "Voice Coach" },
  nav_competition:  { fr: "Compétition",         en: "Competition" },
  nav_referral:     { fr: "Parrainage",          en: "Referral" },
  nav_premium:      { fr: "Premium",             en: "Premium" },
  nav_profile:      { fr: "Mon profil",          en: "My profile" },
  nav_history:      { fr: "Historique",          en: "History" },
  nav_settings:     { fr: "Paramètres",          en: "Settings" },
  nav_exercises:    { fr: "Exercices",           en: "Exercises" },
  nav_nutrition:    { fr: "Nutrition",           en: "Nutrition" },
  nav_admin:        { fr: "Admin",               en: "Admin" },
  nav_coach_clients:{ fr: "Mes clients",         en: "My clients" },
  nav_logout:       { fr: "Déconnexion",         en: "Log out" },
  bottom_home:      { fr: "Accueil",             en: "Home" },
  bottom_session:   { fr: "Séance",              en: "Workout" },
  bottom_program:   { fr: "Programme",           en: "Program" },
  bottom_stats:     { fr: "Stats",               en: "Stats" },
  bottom_profile:   { fr: "Profil",              en: "Profile" },
  bottom_more:      { fr: "Plus",                 en: "More" },
  more_drawer_title:{ fr: "Menu",                 en: "Menu" },

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
  settings_appearance: { fr: "🎨 Apparence", en: "🎨 Appearance" },
  settings_theme:      { fr: "Thème", en: "Theme" },
  settings_theme_dark:  { fr: "Sombre", en: "Dark" },
  settings_theme_light: { fr: "Clair", en: "Light" },
  settings_theme_system: { fr: "Système", en: "System" },
  settings_language:   { fr: "Langue", en: "Language" },
  settings_security:   { fr: "🔒 Sécurité", en: "🔒 Security" },
  settings_pwd_old:     { fr: "Mot de passe actuel", en: "Current password" },
  settings_pwd_new:     { fr: "Nouveau mot de passe", en: "New password" },
  settings_pwd_confirm: { fr: "Confirmer le nouveau mot de passe", en: "Confirm new password" },
  settings_pwd_submit:  { fr: "Changer le mot de passe", en: "Change password" },
  settings_notifications: { fr: "🔔 Notifications", en: "🔔 Notifications" },
  settings_notif_coach:      { fr: "Me notifier quand mon coach m'envoie un message", en: "Notify me when my coach sends a message" },
  settings_notif_streak:     { fr: "Me rappeler si je n'ai pas fait de séance depuis 3 jours", en: "Remind me if I haven't trained in 3 days" },
  settings_notif_newsletter: { fr: "Newsletter hebdomadaire de progression", en: "Weekly progress newsletter" },
  settings_goals:       { fr: "🎯 Objectifs", en: "🎯 Goals" },
  settings_goal_main:   { fr: "Mon objectif principal", en: "My main goal" },
  settings_goal_date:   { fr: "Date cible", en: "Target date" },
  settings_goal_weight: { fr: "Poids objectif (kg)", en: "Target weight (kg)" },
  settings_privacy:         { fr: "🔐 Confidentialité", en: "🔐 Privacy" },
  settings_privacy_profile: { fr: "Rendre mon profil visible aux coaches", en: "Make my profile visible to coaches" },
  settings_privacy_stats:   { fr: "Autoriser les coaches à voir mes stats", en: "Allow coaches to see my stats" },
  settings_privacy_public:  { fr: "Rendre mon profil public (partageable via un lien)", en: "Make my profile public (shareable link)" },
  settings_connected:  { fr: "🔗 Compte connecté", en: "🔗 Connected account" },
  settings_subscription: { fr: "💳 Abonnement", en: "💳 Subscription" },
  settings_sub_plan:    { fr: "Formule actuelle", en: "Current plan" },
  settings_sub_manage:  { fr: "Gérer mon abonnement", en: "Manage my subscription" },
  settings_data:        { fr: "📦 Données", en: "📦 Data" },
  settings_data_export: { fr: "Télécharger mes données (JSON)", en: "Download my data (JSON)" },
  settings_data_export_csv: { fr: "Télécharger mes données (CSV)", en: "Download my data (CSV)" },
  settings_data_clear:  { fr: "Effacer mon historique de séances", en: "Clear my workout history" },
  settings_danger:      { fr: "⚠️ Zone danger", en: "⚠️ Danger zone" },
  settings_danger_desc: { fr: "Cette action est définitive et supprime toutes tes données (programmes, séances, messages).", en: "This action is permanent and deletes all your data (programs, workouts, messages)." },
  settings_danger_confirm_label:  { fr: "Tape", en: "Type" },
  settings_danger_confirm_label2: { fr: "pour confirmer", en: "to confirm" },
  settings_danger_btn:  { fr: "Supprimer mon compte définitivement", en: "Permanently delete my account" },

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

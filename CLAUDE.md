# Gym AI Coach — Instructions pour Claude Code

## Vue d'ensemble du projet
Application web full-stack de coaching sportif avec IA.
- Backend : Node.js + Express + PostgreSQL (Neon)
- Frontend : HTML/CSS/JS vanilla
- IA : Groq API (llama-3.3-70b-versatile)
- Paiements : Stripe
- Auth : sessions + Google OAuth

## Stack & fichiers clés
- `server.js` — point d'entrée Express
- `routes/` — auth, program, sessions, chat, profile, coach, messages, admin, stripe, oauth
- `services/aiCoach.js` — génération programmes, chat, debrief
- `public/css/style.css` — design system complet
- `public/js/nav.js` — injection liens navbar dynamiques selon rôle
- `.env` — variables d'environnement (ne jamais committer)

---

## MISSION PRINCIPALE : Refonte UX/UI complète

### PROBLÈMES ACTUELS À CORRIGER

1. **Navigation confuse** — topbar horizontale surchargée, utilisateurs perdus
2. **Profil incomplet** — affiche seulement les données physiques, pas les infos de compte
3. **Pas de page Paramètres** — impossible de changer mot de passe ou supprimer le compte
4. **Pages incohérentes** — certaines ont des navbars différentes
5. **Mobile mal optimisé** — topbar illisible sur petit écran
6. **Pas d'indication visuelle du rôle** — l'utilisateur ne sait pas qu'il est premium/coach
7. **Page premium** — trop simple, peu convaincante
8. **Page coaches** — cards trop basiques

---

## REFONTE 1 : SIDEBAR NAVIGATION (priorité absolue)

### Remplacer la topbar par une sidebar fixe à gauche

**Structure sidebar desktop (240px) :**
```
[Logo + nom app]
────────────────
🏠  Accueil
▶️  Séance du jour     ← bouton CTA mis en avant
📋  Programme
📊  Statistiques
────────────────
🏅  Coaches
💬  Messages           ← avec badge nombre non-lus
⭐  Premium            ← caché si déjà premium/coach
────────────────
👤  Mon profil
📅  Historique
⚙️  Paramètres
────────────────
🔧  Admin              ← seulement si role=admin
🎛️  Mes clients        ← seulement si role=coach ou admin
────────────────
[Avatar + nom user]
[Déconnexion]
```

**Comportement :**
- Desktop : sidebar fixe 240px, contenu décalé de 240px à droite
- Tablette (768-1024px) : sidebar réduite à 64px (icônes seulement, tooltip au hover)
- Mobile (<768px) : sidebar cachée, remplacée par une bottom nav bar (5 icônes principales)

**Bottom nav mobile :**
```
🏠 Accueil | ▶️ Séance | 📋 Programme | 📊 Stats | 👤 Profil
```

### CSS sidebar à créer
```css
/* Ajouter dans style.css */
:root { --sidebar-w: 240px; --sidebar-collapsed: 64px; }

.sidebar { position: fixed; left: 0; top: 0; bottom: 0; width: var(--sidebar-w); ... }
.page-wrapper { margin-left: var(--sidebar-w); ... }
/* + responsive rules */
```

### Créer public/js/sidebar.js
- Charge /api/auth/me pour récupérer nom, avatar, rôle
- Injecte la sidebar dans toutes les pages via `document.body.insertBefore`
- Marque le lien actif selon `window.location.pathname`
- Gère le badge non-lus en appelant /api/messages/unread/count
- Gère l'affichage conditionnel admin/coach/premium

### Modifier TOUTES les pages HTML
- Supprimer l'ancienne `<header class="topbar">...</header>`
- Supprimer les `<nav class="nav-links">...</nav>`
- Ajouter `<div class="page-wrapper">` autour du contenu
- Ajouter `<script src="/js/sidebar.js"></script>` avant `</body>`
- Supprimer les scripts `<script src="/js/nav.js"></script>` (remplacé par sidebar.js)

**Pages à modifier :** index.html, home.html, dashboard.html, session.html, stats.html, 
profile.html, questionnaire.html, coaches.html, messages.html, history.html, 
admin.html, coach-dashboard.html, coach-client.html, premium.html

---

## REFONTE 2 : PAGE PROFIL COMPLÈTE

### Nouvelle structure de profile.html

**Section 1 — Carte identité**
- Avatar (photo Google si connecté via Google, sinon initiales colorées)
- Nom complet (modifiable)
- Email (non modifiable, affiché grisé)
- Badge rôle coloré (USER / PREMIUM ⭐ / COACH 🎛️ / ADMIN 🔧)
- Date d'inscription
- Bouton "Modifier la photo" (upload ou URL)

**Section 2 — Données physiques** (déjà existant, à garder)
- Poids, taille, âge, genre, niveau d'activité
- Indicateur IMC calculé automatiquement et affiché

**Section 3 — Abonnement**
- Plan actuel (Gratuit / Premium / Coach)
- Date de prochain renouvellement (si abonné)
- Bouton "Gérer mon abonnement" → /premium.html
- Bouton "Annuler l'abonnement" (si abonné, appelle /api/stripe/cancel-subscription)

**Section 4 — Comptes connectés**
- Google : "Connecté" (vert) ou "Non connecté" + bouton lier
- Bouton "Se connecter avec Google" si pas encore lié

**Section 5 — Statistiques personnelles**
- Membre depuis X jours
- Total séances
- Streak actuel et meilleur streak
- Programme actif (titre + lien vers dashboard)

### Modifier routes/profile.js
Ajouter GET /api/profile/full qui retourne :
- Infos user (name, email, role, avatar_url, created_at, google_id)
- Infos physiques (weight_kg, height_cm, age, gender, activity_level)
- Stats basiques (total_sessions, streak, last_session)
- Abonnement actif (depuis table subscriptions si existe)

---

## REFONTE 3 : PAGE PARAMÈTRES (nouvelle page)

### Créer public/settings.html + public/js/settings.js

**Section 1 — Sécurité**
- Changer le mot de passe (ancien mot de passe + nouveau + confirmation)
- Appelle POST /api/auth/change-password

**Section 2 — Préférences**
- Thème : Sombre / Clair (toggle, sauvegardé en localStorage)
- Langue : Français (seul choix pour l'instant)
- Notifications email : toggle (à implémenter plus tard)

**Section 3 — Données**
- "Télécharger mes données" (export JSON de tous les logs) → GET /api/logs/export
- "Effacer mon historique de séances" (supprime tous les logs) → DELETE /api/logs/all

**Section 4 — Zone danger**
- "Supprimer mon compte définitivement" 
  - Confirmation : tape "SUPPRIMER" dans un champ
  - Appelle DELETE /api/auth/account
  - Redirige vers la page d'accueil

### Ajouter dans routes/auth.js
- POST /api/auth/change-password (vérifie ancien mdp, hash le nouveau)
- DELETE /api/auth/account (supprime user + cascade sur logs/programs)

### Ajouter dans routes/sessions.js  
- GET /api/logs/export (retourne tous les logs en JSON)
- DELETE /api/logs/all (supprime tous les logs de l'utilisateur)

---

## REFONTE 4 : CSS DESIGN SYSTEM AMÉLIORÉ

### Variables à ajouter/modifier dans style.css

```css
:root {
  /* Sidebar */
  --sidebar-w: 240px;
  --sidebar-collapsed: 64px;
  
  /* Nouvelles ombres */
  --shadow-card: 0 1px 3px rgba(0,0,0,.3), 0 4px 16px rgba(0,0,0,.2);
  --shadow-hover: 0 4px 24px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.05);
  --shadow-modal: 0 24px 64px rgba(0,0,0,.6);
  
  /* Glows */
  --glow-rust: 0 0 20px rgba(201,77,40,.25);
  --glow-green: 0 0 20px rgba(61,168,116,.2);
  --glow-gold: 0 0 20px rgba(232,179,61,.2);
  
  /* Gradients */
  --grad-rust: linear-gradient(135deg, #c94d28, #e06040);
  --grad-premium: linear-gradient(135deg, #e8b33d, #c99020);
  --grad-coach: linear-gradient(135deg, #4f7a8a, #82a6b5);
}
```

### Sidebar styles
```css
.sidebar {
  position: fixed; left: 0; top: 0; bottom: 0;
  width: var(--sidebar-w);
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  z-index: 100;
  transition: width .2s ease;
  overflow: hidden;
}
.sidebar-logo { padding: 20px 16px; display: flex; align-items: center; gap: 10px; }
.sidebar-nav { flex: 1; padding: 8px; overflow-y: auto; }
.sidebar-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px;
  color: var(--chalk-dim); font-size: .88rem;
  cursor: pointer; transition: all .15s;
  white-space: nowrap; text-decoration: none;
}
.sidebar-item:hover { background: var(--bg-hover); color: var(--chalk); }
.sidebar-item.active { background: var(--rust-bg); color: var(--rust-soft); }
.sidebar-item .icon { width: 20px; text-align: center; flex-shrink: 0; }
.sidebar-cta { /* Bouton Séance mis en avant */
  background: var(--grad-rust); color: #fff;
  margin: 4px 0; font-weight: 600;
}
.sidebar-sep { height: 1px; background: var(--border); margin: 8px 12px; }
.sidebar-user {
  padding: 14px 16px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 10px;
}
.sidebar-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: var(--rust-bg); display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; overflow: hidden;
  font-weight: 600; font-size: .9rem;
}
.sidebar-badge {
  font-size: .6rem; padding: 2px 6px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: .05em; font-weight: 700;
}
.badge-premium { background: var(--gold-bg); color: var(--gold); }
.badge-coach   { background: rgba(79,122,138,.2); color: var(--steel-soft); }
.badge-admin   { background: var(--rust-bg); color: var(--rust-soft); }

/* Layout principal avec sidebar */
.page-wrapper {
  margin-left: var(--sidebar-w);
  min-height: 100dvh;
  transition: margin-left .2s ease;
}

/* Collapsed sidebar (tablette) */
@media (max-width: 1024px) and (min-width: 769px) {
  .sidebar { width: var(--sidebar-collapsed); }
  .sidebar-item span, .sidebar-logo span, .sidebar-user .user-info { display: none; }
  .page-wrapper { margin-left: var(--sidebar-collapsed); }
}

/* Mobile : pas de sidebar, bottom nav */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .page-wrapper { margin-left: 0; padding-bottom: 70px; }
  .bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0; height: 62px;
    background: var(--bg-card); border-top: 1px solid var(--border);
    display: flex; z-index: 100;
  }
  .bottom-nav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3px; font-size: .6rem;
    color: var(--chalk-dim); text-decoration: none; transition: color .15s;
  }
  .bottom-nav-item.active { color: var(--rust-soft); }
  .bottom-nav-item .icon { font-size: 1.2rem; }
}
```

### Améliorer les profil cards
```css
.profile-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
}
.profile-section-title {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: .05em;
  font-size: .8rem;
  color: var(--chalk-dim);
  margin-bottom: 18px;
  display: flex; align-items: center; gap: 8px;
}
.avatar-large {
  width: 80px; height: 80px; border-radius: 50%;
  background: var(--rust-bg); display: flex;
  align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 700;
  border: 3px solid var(--border);
  overflow: hidden; flex-shrink: 0;
}
.imc-indicator {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; border-radius: 8px;
  background: var(--bg-hover); margin-top: 12px;
  font-size: .85rem;
}
```

### Page Premium améliorée
```css
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}
.pricing-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 24px;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
  transition: transform .2s, box-shadow .2s;
}
.pricing-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); }
.pricing-card.featured {
  border-color: var(--rust);
  background: linear-gradient(135deg, var(--bg-card) 0%, rgba(201,77,40,.05) 100%);
  box-shadow: var(--glow-rust);
}
.pricing-badge {
  position: absolute; top: 16px; right: 16px;
  background: var(--grad-rust); color: #fff;
  font-size: .65rem; font-weight: 700;
  padding: 3px 10px; border-radius: 20px;
  text-transform: uppercase; letter-spacing: .08em;
}
.pricing-price {
  font-family: var(--font-mono);
  font-size: 2.5rem; color: var(--chalk);
  margin: 12px 0 4px;
}
.pricing-features { list-style: none; margin: 16px 0 24px; flex: 1; }
.pricing-features li {
  padding: 6px 0; font-size: .88rem; color: var(--chalk-dim);
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid var(--border-soft);
}
.pricing-features li::before { content: "✓"; color: var(--green); font-weight: 700; }
.pricing-features li.disabled { opacity: .4; }
.pricing-features li.disabled::before { content: "✗"; color: var(--red); }
@media (max-width: 768px) {
  .pricing-grid { grid-template-columns: 1fr; max-width: 380px; }
}
```

---

## REFONTE 5 : PAGE COACHES AMÉLIORÉE

### Améliorer public/coaches.html
- Cards coaches avec photo ronde, nom, bio courte, tags spécialités
- Étoiles / note (à ajouter plus tard)
- Bouton "Envoyer un message" si déjà assigné
- Section "Mon coach" en haut si coach actif (bannière verte)
- Loader skeleton pendant le chargement

---

## LISTE COMPLÈTE DES FICHIERS À CRÉER/MODIFIER

### Nouveaux fichiers
- `public/settings.html`
- `public/js/settings.js`
- `public/js/sidebar.js` (remplace nav.js)

### Fichiers à modifier
- `public/css/style.css` — ajouter sidebar + profil + premium CSS
- `public/profile.html` — refonte complète 5 sections
- `public/js/profile.js` — appel /api/profile/full + IMC + abonnement
- `public/premium.html` — pricing cards améliorées
- `public/js/premium.js` — gestion annulation abonnement
- `public/coaches.html` — cards améliorées
- `public/js/coaches.js` — skeleton loader
- Toutes les autres pages HTML — supprimer topbar, ajouter page-wrapper + sidebar.js

### Routes à ajouter
- `routes/profile.js` : GET /api/profile/full
- `routes/auth.js` : POST /api/auth/change-password, DELETE /api/auth/account
- `routes/sessions.js` : GET /api/logs/export, DELETE /api/logs/all

---

## INSTRUCTIONS D'EXÉCUTION POUR CLAUDE CODE

1. Commence par créer `public/js/sidebar.js` (le composant le plus critique)
2. Mets à jour `public/css/style.css` avec les nouveaux styles sidebar + profil + premium
3. Modifie toutes les pages HTML pour utiliser la sidebar (supprime topbar, ajoute page-wrapper)
4. Refais `public/profile.html` et `public/js/profile.js` complètement
5. Crée `public/settings.html` et `public/js/settings.js`
6. Améliore `public/premium.html` et `public/coaches.html`
7. Ajoute les nouvelles routes backend
8. Test final : vérifie que toutes les pages se chargent sans erreur JS
9. `git add -A && git commit -m "refactor: sidebar nav + profil complet + settings + redesign" && git push origin main`

## CONTRAINTES IMPORTANTES
- Ne jamais committer .env
- Garder toutes les fonctionnalités existantes (ne rien casser)
- Tester que la sidebar apparaît bien sur toutes les pages
- Le badge non-lus dans la sidebar doit se mettre à jour automatiquement
- Sur mobile, la bottom nav doit avoir exactement 5 éléments : Accueil, Séance, Programme, Stats, Profil
- La sidebar doit disparaître sur la page d'accueil (index.html) — cette page a son propre layout

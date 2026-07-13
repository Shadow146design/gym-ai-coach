# Gym AI Coach — Toutes les fonctionnalités à implémenter
# Envoie ce fichier à Claude Code : "Lis FEATURES_COMPLETE.md et implémente tout dans l'ordre. Auto-approve tout. Commit séparé pour chaque fonctionnalité."

---

## CONTEXTE PROJET
URL : https://gym-ai-coach-1wls.onrender.com
Stack : Node.js + Express + PostgreSQL (Neon) + Groq API + Stripe + Google OAuth + Render
Rôles : user (gratuit), premium (9.99€/mois), coach, admin

---

## FONCTIONNALITÉ 1 — Partage de séance (Canvas API)

Après le récap de séance dans session.html, ajouter bouton "📱 Partager ma séance".
Générer image 1080x1080px avec HTMLCanvas :
- Fond dégradé sombre #0a0a0a → #1a1a1a
- Logo "Gym AI Coach" en haut
- Nom de l'utilisateur
- Stats : volume total, séries, records battus, durée, streak
- 3 exercices phares avec poids
- Date du jour
- URL du site en bas
Boutons : "⬇️ Télécharger" (canvas.toBlob) + "📤 Partager" (Web Share API sur mobile)
GRATUIT : image basique sans style | PREMIUM : image stylisée complète

---

## FONCTIONNALITÉ 2 — Échauffement automatique

Avant chaque séance dans session.html, après avoir choisi le jour, afficher page d'échauffement 5-10 min.
Adapter selon muscles du jour :
- Pecs/Épaules/Triceps : rotations épaules, pompes légères, bandes élastiques
- Dos/Biceps : rotations épaules, élévations légères, étirements dorsaux
- Jambes : fentes dynamiques, squats à vide, mobilité hanches, rotations chevilles
- Full body : tout inclure
Chaque exercice : nom, durée (45s), description courte.
Timer automatique qui passe à l'exercice suivant.
Bouton "Passer l'échauffement" avec avertissement blessure.
Bouton "C'est parti !" à la fin.

---

## FONCTIONNALITÉ 3 — Score de forme quotidien (PREMIUM)

Table : daily_wellness (id, user_id, sleep_quality INT, energy_level INT, soreness INT, score NUMERIC, created_at DATE)

Au premier chargement de home.html chaque jour, si pas d'entrée aujourd'hui, afficher modal avec 3 sliders :
- Qualité du sommeil (1-10)
- Niveau d'énergie (1-10)
- Courbatures (1-10)

Score = ((sommeil * 0.4) + (énergie * 0.4) + ((11 - courbatures) * 0.2)) * 10

Messages :
- Score > 75 : "Tu es au top ! Vas-y à fond aujourd'hui 💪"
- Score 50-75 : "Bonne forme, séance normale recommandée"
- Score < 50 : "Tu sembles fatigué, réduis les charges de 15-20% aujourd'hui"

Jauge colorée sur home.html (vert/orange/rouge).
Routes : POST /api/wellness, GET /api/wellness/today
RÉSERVÉ PREMIUM : afficher gate pour les gratuits.

---

## FONCTIONNALITÉ 4 — Emails transactionnels (Resend)

npm install resend
Variable d'env à ajouter sur Render : RESEND_API_KEY

Créer services/email.js :
- Email bienvenue : à l'inscription, lien pour compléter le profil
- Rappel : si pas de séance depuis 5 jours
- Récap hebdomadaire : chaque lundi, résumé semaine (séances, volume, records)
- Badge débloqué : notification email
- Confirmation Premium : après paiement Stripe

Cron job dans server.js (setInterval toutes les heures) pour vérifier rappels et récaps.
Route POST /api/email/test (admin seulement) pour tester.
RÉSERVÉ PREMIUM : récap hebdomadaire seulement pour Premium.

---

## FONCTIONNALITÉ 5 — Système de parrainage

Table : referrals (id, referrer_id, referred_id, created_at, rewarded_at)

Lien unique : https://gym-ai-coach-1wls.onrender.com/?ref=USERNAME
À l'inscription avec ref → créer entrée referral
Quand filleul passe Premium → parrain reçoit 30 jours Premium (UPDATE users SET premium_until = NOW() + INTERVAL '30 days')

Page /referral.html : lien de parrainage, nombre de filleuls, récompenses gagnées
Lien "Parrainer des amis 🎁" dans sidebar et drawer mobile
Routes : GET /api/referral/stats, POST /api/referral/claim

---

## FONCTIONNALITÉ 6 — Notation des coaches

Table : coach_reviews (id, coach_id, client_id, rating INT 1-5, comment TEXT, created_at)

Après 30 jours avec coach actif : invitation à noter sur messages.html
1-5 étoiles + commentaire optionnel
Note moyenne sur card coach dans coaches.html (⭐ 4.8 — 12 avis)
Routes : POST /api/coaches/:id/review, GET /api/coaches/:id/reviews
Admin peut supprimer avis

---

## FONCTIONNALITÉ 7 — Profils publics

Page : /u/[username] (générée dynamiquement via JS)
Route : GET /api/users/profile/:username

Contenu : avatar, nom, badge rôle, stats (séances, streak, records top 5), badges, programme actif (titre seulement)
Visible seulement si "Profil public" activé dans paramètres
Ajouter colonne username dans users (généré depuis nom à l'inscription)
Bouton "Voir mon profil public" dans profile.html

---

## FONCTIONNALITÉ 8 — Mode compétition (PREMIUM)

Page : /competition.html
Route : GET /api/competition/leaderboard

Classement top 10 volume total semaine courante
Avatar, nom, volume, séances, badge top 3 (🥇🥈🥉)
Ta position toujours affichée même hors top 10
Reset automatique chaque lundi minuit
Timer jusqu'au prochain reset
Lien dans sidebar et drawer mobile
GRATUIT : voir le classement seulement | PREMIUM : y participer

---

## FONCTIONNALITÉ 9 — Photos de progression (PREMIUM)

Table : progress_photos (id, user_id, photo_data TEXT base64, caption TEXT, created_at)

Section dans profile.html : "📸 Photos de progression"
Upload photo (input file → base64 → POST /api/photos)
Grille photos avec date, visible seulement par utilisateur et son coach
Maximum 50 photos pour Premium
Routes : POST/GET/DELETE /api/photos
RÉSERVÉ PREMIUM uniquement

---

## FONCTIONNALITÉ 10 — Périodisation 12 semaines (PREMIUM)

Dans questionnaire conversationnel, ajouter option "Programme 12 semaines"
L'IA génère 3 phases :
- Phase 1 (S1-4) : Accumulation — volume élevé, 65-75% RM
- Phase 2 (S5-8) : Intensification — volume modéré, 75-85% RM
- Phase 3 (S9-11) : Pic — volume réduit, 85-95% RM
- Semaine 12 : Décharge — volume -50%, charges -20%

Stocker program_start_date dans programs
Afficher sur dashboard : "📅 Phase 2 — Semaine 6/12" avec barre de progression
RÉSERVÉ PREMIUM uniquement

---

## FONCTIONNALITÉ 11 — Reconnaissance vocale dans les chats

Dans TOUS les chats (dashboard, questionnaire, session, messages) :
Bouton micro 🎤 à côté du champ de saisie
Web Speech Recognition API (natif, pas de librairie)
- Clic → démarre écoute (bouton rouge + pulse)
- Texte apparaît en temps réel dans le champ
- Silence 2s → arrêt automatique
- Re-clic → arrêt manuel
Langue : fr-FR par défaut, en-US si site en anglais
Si navigateur non supporté : cacher le bouton

---

## FONCTIONNALITÉ 12 — Assistant vocal complet (PREMIUM)

Page dédiée : /voice.html
Lien "🎤 Coach Vocal" dans sidebar et drawer mobile

INTERFACE :
- Grand bouton rond central (style Siri)
- Animation vagues sonores quand IA parle
- Transcription texte en temps réel
- Historique conversation en dessous

FONCTIONNEMENT :
1. Appui bouton → Web Speech Recognition capte la voix (fr-FR)
2. Texte envoyé à POST /api/chat (contexte complet : programme, stats, records)
3. Réponse IA lue à voix haute via Web Speech Synthesis API (fr-FR, débit 0.9)
4. Pendant que IA parle → bouton désactivé
5. Fin de la réponse → bouton réactivé automatiquement

Exemples de questions :
- "Quelle est ma prochaine séance ?"
- "Quel est mon record au développé couché ?"
- "J'ai mal aux épaules, qu'est-ce que tu conseilles ?"
- "Combien de séances cette semaine ?"

RÉSERVÉ PREMIUM uniquement

---

## FONCTIONNALITÉ 13 — Système Freemium complet

### Plan GRATUIT (user)
- 3 programmes maximum ✅ déjà fait
- Questionnaire : formulaire simple uniquement (pas chat IA)
- Séance en 1 tap : OUI
- Stats basiques : séances, streak, records seulement
- Chat coach IA : 10 messages par jour maximum
- Débrief post-séance : NON
- Assistant vocal : NON
- Score de forme : NON
- Détection de plateau : NON
- Photos de progression : NON
- Mode compétition : voir seulement, pas participer
- Partage séance : image basique
- Périodisation 12 semaines : NON
- Badges : seulement first_session, streak_3, sessions_10
- Historique : 30 derniers jours seulement
- Export données : NON

### Plan PREMIUM (9.99€/mois)
- Programmes illimités
- Questionnaire conversationnel IA
- Stats complètes (courbes, volumes, groupes musculaires)
- Chat illimité
- Débrief IA post-séance
- Assistant vocal
- Score de forme quotidien
- Détection de plateau
- Photos de progression (50 max)
- Mode compétition complet
- Partage séance stylisé
- Périodisation 12 semaines
- Tous les badges
- Historique illimité
- Export JSON/CSV
- Récap hebdomadaire email
- Accès prioritaire nouvelles fonctionnalités

### Implémentation Backend

Créer middleware/premium.js :
```javascript
async function requirePremium(req, res, next) {
  const pool = require('../db/pool');
  const r = await pool.query('SELECT role FROM users WHERE id=$1', [req.session.userId]);
  const role = r.rows[0]?.role;
  if (!['premium','coach','admin'].includes(role)) {
    return res.status(403).json({ error: 'Premium requis', upgrade_url: '/premium.html' });
  }
  next();
}

async function checkChatLimit(req, res, next) {
  // Gratuits : max 10 messages chat par jour
  // Vérifier dans rate_limits table
  // Si dépassé : 429 avec message upgrade
  next();
}
```

Table rate_limits (id, user_id, action TEXT, count INT, reset_at TIMESTAMP)
Reset automatique à minuit chaque jour

Protéger avec requirePremium :
- POST /api/program/chat-generate
- POST /api/wellness
- GET /api/logs/plateau
- POST /api/photos
- GET /api/competition/leaderboard (POST pour participer)

POST /api/chat → checkChatLimit pour les gratuits (10/jour)

### Implémentation Frontend

Créer public/js/premium-gate.js :
```javascript
function showPremiumModal(featureName) {
  // Modal attrayant avec :
  // - Titre "Fonctionnalité Premium 🔒"
  // - Description de ce que l'utilisateur rate
  // - Avantages Premium listés
  // - Bouton "Passer Premium — 9.99€/mois" → /premium.html
  // - Bouton "Plus tard"
}
```

Ajouter cadenas 🔒 visuels sur fonctionnalités bloquées :
- home.html : score de forme et plateau avec overlay "Premium"
- stats.html : courbes avancées avec blur + overlay
- session.html : débrief avec message Premium
- dashboard.html : questionnaire conversationnel avec badge Premium

Compteur messages gratuits sous le chat :
"X/10 messages utilisés aujourd'hui"
Quand limite : "Tu as utilisé tes 10 messages. Passe en Premium."

Bannière non-intrusive sur home.html pour gratuits :
"⭐ Passe en Premium pour débloquer l'IA complète — 9.99€/mois"
Bouton X pour fermer (réapparaît tous les 3 jours)

### Page premium.html améliorée
- Tableau comparatif Gratuit vs Premium
- Section "Ce que tu rates" dynamique
- "⚡ Offre de lancement — Prix bloqué à 9.99€/mois pour les 100 premiers"
- "Annulation à tout moment, sans engagement"

---

## FONCTIONNALITÉ 14 — Fix Google OAuth

Dans routes/oauth.js, ajouter au démarrage :
```javascript
console.log('Google OAuth config:', {
  hasClientId: !!process.env.GOOGLE_CLIENT_ID,
  hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI
});
```

Vérifier que toutes les variables sont bien lues depuis process.env.
Si GOOGLE_CLIENT_ID manquant au démarrage : logger un warning clair.

---

## FONCTIONNALITÉ 15 — Notification "Profil modifié → Régénère ton programme"

Dans routes/profile.js, après PUT /api/profile :
Si weight_kg ou height_cm ont changé → retourner { profileUpdated: true, suggestRegenerate: true }

Dans profile.js frontend, si suggestRegenerate: true :
Afficher toast/notification :
"Ton profil physique a changé ! Régénère ton programme pour l'adapter à ta nouvelle morphologie."
Bouton "Régénérer maintenant" → /questionnaire.html
Bouton "Plus tard"

---

## ORDRE D'IMPLÉMENTATION

1. FONCTIONNALITÉ 14 (fix Google OAuth) — urgent
2. FONCTIONNALITÉ 15 (notification profil) — rapide
3. FONCTIONNALITÉ 13 (freemium) — critique pour la monétisation
4. FONCTIONNALITÉ 3 (score de forme) — haute valeur
5. FONCTIONNALITÉ 11 (micro dans chats) — UX mobile
6. FONCTIONNALITÉ 12 (assistant vocal) — différenciant
7. FONCTIONNALITÉ 2 (échauffement) — sécurité utilisateur
8. FONCTIONNALITÉ 1 (partage séance) — viral
9. FONCTIONNALITÉ 8 (compétition) — engagement
10. FONCTIONNALITÉ 7 (profils publics) — social
11. FONCTIONNALITÉ 5 (parrainage) — croissance
12. FONCTIONNALITÉ 6 (notation coaches) — confiance
13. FONCTIONNALITÉ 9 (photos progression) — rétention
14. FONCTIONNALITÉ 10 (périodisation 12 semaines) — valeur IA
15. FONCTIONNALITÉ 4 (emails Resend) — rétention long terme

---

## VARIABLES D'ENVIRONNEMENT À AJOUTER SUR RENDER

- RESEND_API_KEY (pour les emails — créer compte sur resend.com, gratuit jusqu'à 3000 emails/mois)

## COMMANDE POUR DÉMARRER

```
Lis FEATURES_COMPLETE.md et implémente toutes les fonctionnalités dans l'ordre indiqué.
Auto-approve tout sans demander confirmation.
Fait un git commit séparé pour chaque fonctionnalité avec un message descriptif.
Push après chaque commit.
Commence par la FONCTIONNALITÉ 14 (fix Google OAuth).
```

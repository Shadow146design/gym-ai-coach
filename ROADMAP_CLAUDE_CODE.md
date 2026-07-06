# Gym AI Coach — Roadmap complète pour Claude Code
# Envoie ce fichier entier à Claude Code et dis-lui de tout implémenter dans l'ordre

---

## CONTEXTE DU PROJET

Application web SaaS de coaching fitness avec IA.
URL production : https://gym-ai-coach-1wls.onrender.com
Stack : Node.js + Express + PostgreSQL (Neon) + Groq API + Stripe + Google OAuth + Render

Rôles existants : user (gratuit), premium (9.99€/mois), coach, admin
Pages existantes : home, dashboard, session, stats, profile, settings, coaches, messages, 
                   admin, coach-dashboard, coach-client, premium, history, exercises, competition

---

## INSTRUCTIONS GÉNÉRALES

- Auto-approve toutes les commandes sans demander confirmation
- Tester chaque fonctionnalité en conditions réelles avant de commit
- Ne jamais committer .env
- Faire un git commit séparé pour chaque grande fonctionnalité
- Toujours git push après chaque commit
- Si une fonctionnalité dépend d'une autre, commencer par la dépendance

---

## MODULE 1 — CORRECTIONS ET POLISH UI

### 1.1 Sidebar
- Réduire la largeur à 200px (actuellement trop large)
- Réduire font-size des items à .82rem
- Réduire padding items à 8px 10px
- Ajouter tooltip au hover quand sidebar collapsed (tablette)
- Smooth transition quand sidebar s'ouvre/ferme sur mobile
- Mettre en surbrillance la section active avec un indicateur gauche (barre de 3px couleur rust)

### 1.2 Page home
- Réduire titre greeting à 2rem max
- Agrandir les carrés du calendrier à 18x18px minimum
- Améliorer le contraste des cards (Prochaine/Dernière séance/Record)
- Streak ring SVG plus grand et plus visible (80px diameter)
- Ajouter animation de chargement skeleton sur toutes les sections
- Section "Tous mes records" : afficher minimum 6 records avec design gold
- Conseil IA du jour : afficher un vrai conseil basé sur les données (pas générique)

### 1.3 Page profil
- Photo de profil uploadable (input file → convert base64 → save en DB colonne avatar_data)
- Afficher l'avatar partout (sidebar, messages, coaches, profil)
- Section "Mes badges" avec grille des badges débloqués et verrouillés
- Graphe de progression du poids corporel (Chart.js, 90 jours)
- Indicateur IMC avec interprétation (Insuffisant/Normal/Surpoids/Obésité)
- Bouton "Voir mon profil public" → /u/[username]

### 1.4 Page paramètres (settings)
- Section "Confidentialité" : toggle "Profil public visible", "Stats visibles par coach"
- Thème : ajouter option "Système" (suit le thème OS)
- Langue : corriger le bug de rechargement (la traduction doit s'appliquer immédiatement)
- Notifications push : implémenter Web Push Notifications (demander permission, sauvegarder subscription en base)
- Export données : CSV en plus de JSON
- Changer email (avec confirmation par email)

---

## MODULE 2 — NOUVELLES FONCTIONNALITÉS CORE

### 2.1 Score de forme quotidien
Table : daily_wellness (id, user_id, sleep_quality INT 1-10, energy_level INT 1-10, soreness INT 1-10, score NUMERIC, created_at DATE UNIQUE per user)

Fonctionnement :
- Au premier chargement de home.html chaque jour (vérifier si entrée existe aujourd'hui), afficher un modal "Comment tu te sens aujourd'hui ?"
- 3 sliders : Qualité du sommeil (1-10), Niveau d'énergie (1-10), Courbatures (1-10)
- Score calculé : ((sommeil * 0.4) + (énergie * 0.4) + ((11 - courbatures) * 0.2)) * 10
- L'IA génère un message adapté selon le score :
  * Score > 75 : "Tu es au top ! Vas-y à fond aujourd'hui 💪"
  * Score 50-75 : "Bonne forme, séance normale recommandée"
  * Score < 50 : "Tu sembles fatigué, réduis les charges de 15-20% aujourd'hui"
- Afficher sur home.html : jauge circulaire colorée (vert/orange/rouge) avec le score
- Routes : POST /api/wellness, GET /api/wellness/today, GET /api/wellness/history

### 2.2 Système de badges et achievements
Table : user_badges (id, user_id, badge_id TEXT, unlocked_at TIMESTAMP)

Liste des badges à implémenter :
- "first_session" — Première séance 🎯
- "streak_3" — 3 jours de suite 🔥
- "streak_7" — Une semaine de suite 🔥🔥
- "streak_30" — Un mois de suite 🔥🔥🔥
- "sessions_10" — 10 séances complétées 💪
- "sessions_50" — 50 séances complétées 🏋️
- "sessions_100" — 100 séances complétées 🏆
- "first_pr" — Premier record personnel ⚡
- "prs_10" — 10 records personnels 🎖️
- "volume_1t" — 1 tonne soulevée en une séance 💥
- "volume_10t" — 10 tonnes soulevées au total 🌍
- "early_bird" — Séance avant 7h du matin 🌅
- "night_owl" — Séance après 22h 🦉
- "program_complete" — Programme 12 semaines terminé 🎓
- "premium_member" — Membre Premium ⭐
- "social_share" — A partagé une séance 📱

Logique :
- Vérifier les badges à débloquer après chaque séance (POST /api/logs) et après chaque action pertinente
- Route GET /api/badges/mine — retourne tous les badges avec statut (débloqué/verrouillé + date)
- Notification in-app immédiate quand badge débloqué (toast animé + son)
- Afficher sur profil : grille avec badges colorés (débloqués) et grisés (verrouillés)
- Afficher dans la sidebar : total badges débloqués

### 2.3 Partage de séance (Canvas API)
Après chaque récap de séance, bouton "📱 Partager ma séance"

Génération image (HTMLCanvas 1080x1080px) :
- Fond : dégradé sombre #0a0a0a → #1a1a1a
- Logo Gym AI Coach en haut
- Nom de l'utilisateur
- Stats de la séance : volume total, nombre de séries, records battus, durée
- Streak actuel avec flamme
- Exercices phares (3 max) avec poids
- Date et heure
- URL du site en bas : gym-ai-coach-1wls.onrender.com

Boutons :
- "⬇️ Télécharger" (canvas.toBlob → download)
- "📤 Partager" (Web Share API si disponible, sinon copier le lien)

Route : GET /api/sessions/share-card?date=YYYY-MM-DD (retourne les données pour générer le canvas)

### 2.4 Mode compétition
Page : /competition.html
Table : weekly_leaderboard (calculé dynamiquement, pas de table dédiée)

Contenu page :
- Hero : "🏆 Compétition de la semaine" + timer jusqu'au reset (lundi 00:00)
- Classement top 10 : avatar, nom, volume total semaine, nombre de séances, badge si top 3
- Ta position : toujours affichée même si pas dans le top 10
- Tes stats semaine vs semaine précédente
- Badge hebdomadaire : "🥇 Champion de la semaine" sur profil du #1 (auto-update lundi)
- Section "Défis" : 3 défis fixes par semaine générés par l'IA (ex: "Fais 10 000 kg de volume cette semaine", "5 séances en 7 jours", "Bats 3 records")

Routes :
- GET /api/competition/leaderboard — top 10 + position actuelle
- GET /api/competition/challenges — 3 défis de la semaine
- GET /api/competition/my-stats — stats semaine courante vs précédente

### 2.5 Périodisation 12 semaines
Dans le questionnaire, nouvelle option : "Programme 12 semaines (recommandé)"

Structure du programme :
- Semaines 1-4 : Phase Accumulation (volume élevé, charges 65-75% RM, repos 60s)
- Semaines 5-8 : Phase Intensification (volume modéré, charges 75-85% RM, repos 90s)
- Semaines 9-11 : Phase Pic (volume réduit, charges 85-95% RM, repos 2-3min)
- Semaine 12 : Décharge (volume -50%, charges -20%, récupération active)

Prompt IA modifié pour générer 4 blocs de programmes au lieu d'1, avec progression automatique des charges entre les phases.

Suivi :
- Stocker la semaine de départ (program_start_date) dans la table programs
- Sur dashboard.html : afficher "Phase X — Semaine Y/12" avec barre de progression
- Alertes : "Tu entres en Phase Intensification la semaine prochaine, prépare-toi !"

### 2.6 Suivi nutrition basique
Table : nutrition_logs (id, user_id, date DATE, calories INT, proteins INT, carbs INT, fats INT, notes TEXT)

Page : section dans profile.html ou nouvelle page /nutrition.html

Fonctionnalités :
- L'IA calcule les besoins journaliers selon profil (formule Harris-Benedict + TDEE)
- Affiche : Calories recommandées / Protéines / Glucides / Lipides
- Journal simple : l'utilisateur entre ses macros du jour manuellement
- Graphe 30 jours (Chart.js) : calories réelles vs objectif
- Conseil IA : "Tu es en déficit calorique depuis 3 jours, c'est bien pour la perte de poids mais surveille ta récupération"
- Route POST/GET /api/nutrition

---

## MODULE 3 — SOCIAL ET VIRALITÉ

### 3.1 Profils publics
Page : /u/[username] (générée dynamiquement)
Route : GET /api/users/profile/:username

Contenu page publique :
- Photo de profil + nom + badge rôle
- Stats publiques : séances totales, streak actuel, meilleur streak, records phares
- Badges débloqués
- Programme actuel (titre seulement, pas le détail)
- Activité récente : "A battu un record au Squat (120kg) il y a 2 jours"
- Bouton "Suivre" (préparer la table follows même si pas encore implémenté)

Confidentialité : n'afficher que si l'utilisateur a activé "Profil public" dans les paramètres

### 3.2 Système de suivi (follows)
Table : follows (id, follower_id, following_id, created_at)

Fonctionnalités :
- Bouton "Suivre" sur le profil public
- Fil d'activité sur home.html : voir les séances complétées par les personnes suivies (anonymisé si préféré)
- Compteur followers/following sur le profil
- Routes : POST/DELETE /api/follows/:userId, GET /api/follows/feed

### 3.3 Système de parrainage
Table : referrals (id, referrer_id, referred_id, created_at, rewarded_at)

Fonctionnement :
- Chaque utilisateur a un lien unique : /register?ref=USERNAME
- Quand quelqu'un s'inscrit avec ce lien, créer l'entrée referral
- Quand le filleul passe Premium, le parrain reçoit 30 jours Premium offerts automatiquement
- Page /referral.html : ton lien de parrainage, nombre de filleuls, récompenses gagnées
- Route GET /api/referral/stats, POST /api/referral/claim

---

## MODULE 4 — COACHES (AMÉLIORATIONS)

### 4.1 Système de notation des coaches
Table : coach_reviews (id, coach_id, client_id, rating INT 1-5, comment TEXT, created_at)

Fonctionnalités :
- Après 1 mois avec un coach, invitation automatique à laisser un avis
- Note moyenne affichée sur la card du coach (⭐ 4.8/5 — 12 avis)
- Page détail coach : liste des avis avec commentaires
- Routes : POST /api/coaches/:id/review, GET /api/coaches/:id/reviews
- Admin peut supprimer les avis inappropriés

### 4.2 Marketplace de programmes
Table : marketplace_programs (id, coach_id, title, description, price, preview_content, full_content, purchases_count, created_at)

Page : /marketplace.html
Fonctionnalités :
- Les coaches publient leurs programmes à vendre (9.99€ - 49.99€)
- Aperçu gratuit du programme (Jour 1 seulement)
- Achat via Stripe (paiement unique, pas abonnement)
- Bibliothèque de l'acheteur dans /library.html
- 20% de commission pour la plateforme
- Routes : CRUD /api/marketplace, POST /api/marketplace/:id/purchase

### 4.3 Sessions live coach
Pas de vidéo (trop complexe), mais :
- Le coach peut créer une "session live" (créneau horaire planifié)
- Les clients reçoivent une notification
- Pendant la session : chat en temps réel accéléré (polling 1s au lieu de 3s)
- Le coach peut envoyer des consignes en temps réel ("Augmente de 5kg pour la prochaine série")
- Le client peut envoyer ses sets en temps réel depuis session.html

---

## MODULE 5 — TECHNIQUE ET PERFORMANCE

### 5.1 PWA complète
- manifest.json déjà créé — vérifier qu'il est correct
- Service Worker (sw.js) : cache stratégie "stale-while-revalidate" pour les assets
- Offline fallback page : /offline.html avec message "Mode hors-ligne — tes données sont sauvegardées localement"
- Cache des logs de séance en IndexedDB si hors-ligne, sync au retour connexion
- Bouton "Installer l'app" (beforeinstallprompt) — s'afficher après 2ème visite
- Push notifications : demander permission au 3ème jour de streak

### 5.2 Performance
- Lazy loading des images (loading="lazy")
- Pagination sur les logs (LIMIT 20 OFFSET n au lieu de tout charger)
- Debounce sur les inputs de recherche (exercices, admin)
- Compression des réponses API (express-compression middleware)
- Index PostgreSQL manquants : vérifier et ajouter sur logs(user_id, performed_at), messages(from_id, to_id)

### 5.3 Sécurité
- Rate limiting sur les routes auth (max 10 tentatives/minute par IP) avec express-rate-limit
- Helmet.js pour les headers de sécurité HTTP
- Validation des inputs avec sanitization (pas de HTML dans les champs texte)
- CSRF protection sur les routes POST sensibles
- Logs d'erreurs serveur (winston ou morgan en production)

### 5.4 Emails transactionnels
Service : Resend (gratuit jusqu'à 3000 emails/mois)
Package : npm install resend

Emails à envoyer :
- Bienvenue à l'inscription (avec lien pour compléter le profil)
- Confirmation paiement Premium
- Rappel si pas de séance depuis 5 jours ("Tu n'as pas été à la salle depuis 5 jours...")
- Nouveau message coach (si notifications activées)
- Badge débloqué
- Récapitulatif hebdomadaire (volume, séances, records de la semaine)

Routes : POST /api/email/send (interne seulement)
Variables d'env à ajouter : RESEND_API_KEY

---

## MODULE 6 — CONTENU ET IA AVANCÉE

### 6.1 Bibliothèque d'exercices enrichie
Table : exercises_library (id, name, muscle_group, secondary_muscles TEXT[], description, tips TEXT[], difficulty TEXT, equipment TEXT[], video_url TEXT)

Seed : insérer 100+ exercices couvrant tous les groupes musculaires
Page /exercises.html améliorée :
- Filtres multiples : groupe musculaire, équipement, difficulté
- Barre de recherche avec autocomplete
- Card exercice : gif/image, description, muscles primaires/secondaires, tips de technique
- Bouton "Ajouter à ma séance" (ajoute un exercice custom à la prochaine séance)
- Lien depuis la page séance : chaque exercice a un "?" qui ouvre l'explication

### 6.2 Analyse de plateau avancée
Dans services/aiCoach.js, améliorer analyzePlateau() :
- Détecter non seulement le stagnation du poids mais aussi la fatigue (volume qui baisse)
- Proposer 3 solutions concrètes pour chaque exercice en plateau :
  1. Variation de l'exercice (ex: Développé couché → Développé incliné)
  2. Technique de surcharge (drop sets, rest-pause, tempo lent)
  3. Décharge courte (1 semaine à -30% de charges)
- Afficher sur home.html avec un design alerte rouge si 3+ exercices en plateau

### 6.3 Programme adaptatif
Après chaque séance, l'IA analyse si le programme est trop facile ou trop dur :
- Trop facile : l'utilisateur dépasse systématiquement les charges prévues → l'IA suggère d'augmenter les charges cibles de 10%
- Trop dur : l'utilisateur n'atteint pas les reps prévues → l'IA suggère de réduire les charges de 5%
- Route POST /api/program/adapt (appelée automatiquement après chaque séance)
- Notification : "Ton programme a été ajusté automatiquement selon tes performances 💡"

### 6.4 Échauffement automatique
Avant chaque séance, afficher un échauffement adapté aux exercices du jour :
- Si séance Poitrine/Épaules : rotations épaules, pompes légères, élévations légères
- Si séance Jambes : fentes dynamiques, squats à vide, mobilité hanches
- Durée estimée : 5-10 minutes
- Chaque exercice d'échauffement avec description et durée
- Bouton "Passer l'échauffement" (avec avertissement)

---

## MODULE 7 — LANDING PAGE ET MARKETING

### 7.1 Landing page publique (index.html) — version finale
Structure complète :

**Section 1 — Hero**
- Titre H1 : "Ton coach IA personnel, disponible 24h/24"
- Sous-titre : "Programme personnalisé, suivi en temps réel, coaches humains. Tout en un."
- 2 boutons : "Commencer gratuitement" + "Voir comment ça marche ↓"
- Mockup animé du dashboard (div CSS stylisée, pas une vraie image)
- Fond : gradient très sombre avec particules légères (CSS uniquement)

**Section 2 — Social proof**
- "Déjà X utilisateurs actifs" (récupéré dynamiquement via GET /api/stats/public)
- 3 stats : "X séances loggées", "X records battus", "X programmes générés"

**Section 3 — Comment ça marche (3 étapes)**
- Étape 1 : Crée ton profil (icône personne)
- Étape 2 : L'IA génère ton programme (icône robot)
- Étape 3 : Progresse et suis tes stats (icône graphe)

**Section 4 — Features (6 cards)**
- 🤖 IA Personnalisée
- 💪 Séance en 1 tap
- 📊 Stats avancées
- 🏅 Coaches humains
- 🔥 Streak & motivation
- 📱 Disponible partout

**Section 5 — Screenshots du produit**
- 3 mockups CSS côte à côte : Dashboard / Séance / Stats
- Effet de profondeur avec CSS transform perspective

**Section 6 — Pricing**
- Gratuit / Premium 9.99€
- CTA sur chaque card

**Section 7 — Témoignages**
- 3 cards avec avatar (initiales CSS colorées), nom fictif, objectif, citation
- Ex: "Thomas D. — A perdu 8kg en 3 mois", "Sarah M. — A augmenté son squat de 40kg"

**Section 8 — FAQ**
- 6 questions/réponses en accordion
- Questions : "C'est quoi la différence avec une app de fitness classique ?", "L'IA est vraiment personnalisée ?", etc.

**Section 9 — CTA final**
- Titre : "Prêt à transformer ton entraînement ?"
- Bouton géant "Commencer gratuitement"

**Footer**
- Logo, liens (CGU, Politique de confidentialité, Contact)
- Réseaux sociaux (Instagram, TikTok — liens vers les profils à créer)
- Copyright

### 7.2 Pages légales (obligatoires)
Créer :
- /cgu.html — Conditions Générales d'Utilisation (template standard adapté)
- /privacy.html — Politique de Confidentialité RGPD (données collectées, droits utilisateurs, cookies)
- /contact.html — Formulaire de contact simple (envoie email via Resend)

### 7.3 SEO basique
Dans toutes les pages :
- <meta description> pertinente
- <meta og:title>, <meta og:description>, <meta og:image> (Open Graph pour partage réseaux)
- <title> différent pour chaque page
- Sitemap.xml généré automatiquement

---

## MODULE 8 — ADMIN PANEL AMÉLIORÉ

### 8.1 Dashboard admin enrichi
Page /admin.html — nouvelles sections :

**Vue d'ensemble**
- Graphe d'inscriptions (Chart.js) sur 30 jours
- Graphe de revenus Stripe (appel API Stripe)
- MAU (Monthly Active Users)
- Taux de conversion gratuit → premium

**Gestion coaches**
- Liste des coaches avec leurs stats (nb clients, note moyenne, revenus générés)
- Bouton "Suspendre un coach"
- Avis clients sur chaque coach (avec modération)

**Gestion contenu**
- Modération des avis marketplace
- Gestion des défis compétition (créer/modifier/supprimer)

**Logs et monitoring**
- Dernières erreurs serveur (endpoint GET /api/admin/errors)
- Requêtes les plus lentes (PostgreSQL slow query log)

### 8.2 Route stats publiques
GET /api/stats/public (sans auth) :
- total_users, total_sessions, total_programs, total_volume_kg
- Utilisé sur la landing page pour afficher des vraies stats

---

## MODULE 9 — ONBOARDING AMÉLIORÉ

### 9.1 Wizard d'onboarding pour nouveaux utilisateurs
Détecter si c'est la première connexion (pas encore de programme, profil incomplet)

Étapes :
1. **Bienvenue** — "Bienvenue sur Gym AI Coach ! Créons ton profil en 3 étapes"
2. **Profil physique** — poids, taille, âge, genre, activité (avec explication de pourquoi c'est utile)
3. **Objectif** — objectif principal + niveau + jours disponibles + matériel
4. **Génération** — animation "L'IA prépare ton programme..." (3-4 secondes)
5. **Résultat** — "Ton programme est prêt ! Voici ta première séance"

Design : modal plein écran avec stepper en haut, pas de possibilité de fermer sans compléter (ou bouton "Passer" discret)

### 9.2 Tour guidé (first run)
Après onboarding, tooltip guidé sur les features clés :
- "Voici ton streak 🔥 — il augmente chaque jour où tu fais une séance"
- "Clique ici pour commencer ta séance du jour"
- "Tes records s'affichent automatiquement ici"
Utiliser une lib légère (shepherd.js ou implémentation custom)

---

## MODULE 10 — INTÉGRATIONS FUTURES (documenter mais pas implémenter maintenant)

- **Stripe Connect** — pour reverser automatiquement les gains aux coaches (20% plateforme)
- **Apple Health / Google Fit** — sync données de santé (fréquence cardiaque, pas, sommeil)
- **Twilio** — SMS de rappel séance
- **Discord Bot** — commandes pour voir ses stats directement dans Discord
- **API Wger** — base de données exercices open source (remplacer le seed manuel)
- **OpenAI Vision** — analyse postural via photo/vidéo
- **Stripe Billing Portal** — page de gestion abonnement hébergée par Stripe

---

## VARIABLES D'ENVIRONNEMENT NÉCESSAIRES

Actuellement configurées sur Render :
- DATABASE_URL ✅
- GROQ_API_KEY ✅ (régénérer si invalide)
- GROQ_MODEL ✅
- SESSION_SECRET ✅
- NODE_ENV ✅
- GOOGLE_CLIENT_ID ✅
- GOOGLE_CLIENT_SECRET ✅
- GOOGLE_REDIRECT_URI ✅
- STRIPE_SECRET_KEY ✅
- STRIPE_PUBLISHABLE_KEY ✅
- STRIPE_PREMIUM_PRICE_ID ✅
- STRIPE_COACH_PRICE_ID ✅ (à supprimer — plan supprimé)
- STRIPE_WEBHOOK_SECRET ✅

À ajouter plus tard :
- RESEND_API_KEY (emails transactionnels)
- STRIPE_CONNECT_CLIENT_ID (commissions coaches)

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Phase 1 — Polish et corrections (faire en premier)
1. Module 1 (corrections UI sidebar, home, profil)
2. Module 5.3 (sécurité : rate limiting, helmet)
3. Module 9 (onboarding amélioré)

### Phase 2 — Fonctionnalités engagement
4. Module 2.1 (score de forme)
5. Module 2.2 (badges)
6. Module 2.3 (partage Canvas)
7. Module 2.4 (compétition)

### Phase 3 — IA avancée
8. Module 2.5 (périodisation 12 semaines)
9. Module 6.3 (programme adaptatif)
10. Module 6.4 (échauffement automatique)

### Phase 4 — Social et marketplace
11. Module 3 (profils publics, follows, parrainage)
12. Module 4 (notation coaches, marketplace)

### Phase 5 — Marketing et acquisition
13. Module 7 (landing page finale, pages légales, SEO)
14. Module 5.4 (emails transactionnels avec Resend)

### Phase 6 — Technique
15. Module 5.1 (PWA complète)
16. Module 5.2 (performance)
17. Module 8 (admin enrichi)

---

## COMMANDE POUR DÉMARRER

Quand tu reçois ce fichier, commence par :
1. `git log --oneline -10` pour voir ce qui a déjà été fait
2. `git status` pour voir s'il y a des changements non commités
3. Commence par la Phase 1, Module 1.1 (corrections sidebar)
4. Auto-approve toutes les commandes sans demander confirmation
5. Commit après chaque module terminé avec un message descriptif


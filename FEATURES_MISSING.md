# Gym AI Coach — Fonctionnalités manquantes à implémenter
# Envoie ce fichier à Claude Code : "Lis FEATURES_MISSING.md et implémente tout dans l'ordre. Auto-approve tout. Commit séparé pour chaque fonctionnalité."

---

## CONTEXTE PROJET
URL : https://gym-ai-coach-1wls.onrender.com
Stack : Node.js + Express + PostgreSQL (Neon) + Groq API + Stripe + Render
Rôles : user (gratuit), premium (9.99€/mois), coach, admin

---

## FONCTIONNALITÉ 1 — Bibliothèque d'exercices avec vidéos YouTube

Dans public/exercises.html, améliorer chaque exercice avec une vraie vidéo YouTube intégrée.

Créer une table exercise_videos (exercise_name TEXT PRIMARY KEY, youtube_id TEXT, thumbnail_url TEXT)
Seed avec les vidéos YouTube des exercices principaux :
- Développé couché barre : dZgVxmf6jkA
- Squat barre : ultWZbUMPL8
- Soulevé de terre : op9kVnSso6Q
- Rowing barre : FWJR5Ve8bnQ
- Développé militaire : 2yjwXTZQDDI
- Tractions : eGo4IYlbE5g
- Hack squat : DbFgyvMl-Wg
- Presse à cuisses : IZxyjW7MPJQ
- Curl barre EZ : av7-8igSXTs
- Pushdown corde : vB5OHsJ3EME
(Chercher les meilleures vidéos techniques en français ou anglais pour chaque exercice)

Quand l'utilisateur clique sur un exercice :
- Modal avec iframe YouTube embed (youtube.com/embed/VIDEO_ID)
- Titre de l'exercice + groupe musculaire
- Description courte + conseils techniques
- Muscles principaux + secondaires
- Bouton "Ajouter à ma séance"

Route : GET /api/exercises/video/:name

---

## FONCTIONNALITÉ 2 — Comparaison avant/après séances

Dans stats.html, nouvelle section "📊 Comparaison de séances".

Sélecteur : choisir un exercice + deux dates de séance à comparer
Affichage côte à côte :
- Séance A (date 1) : poids × reps × séries, volume total
- Séance B (date 2) : poids × reps × séries, volume total
- Delta : +X kg (+Y%), volume +Z kg
- Message IA : "En 3 mois, tu as progressé de 20kg au développé couché. C'est excellent !"

Route : GET /api/logs/compare?exercise=X&date1=YYYY-MM-DD&date2=YYYY-MM-DD

---

## FONCTIONNALITÉ 3 — Journal de nutrition

Nouvelle page : /nutrition.html
Lien dans sidebar et drawer mobile.

Table : nutrition_logs (id, user_id, date DATE, calories INT, proteins INT, carbs INT, fats INT, notes TEXT, created_at)

L'IA calcule automatiquement les besoins selon le profil (formule Harris-Benedict + TDEE) :
- Perte de poids : déficit -300 à -500 kcal
- Prise de masse : surplus +300 à +500 kcal
- Maintien : TDEE exact

Interface :
- En haut : objectifs journaliers (calories, protéines, glucides, lipides)
- Formulaire saisie rapide : calories + macros du jour
- Barre de progression pour chaque macro (vert si dans la cible, rouge si dépassé)
- Graphe 30 jours (Chart.js) : calories réelles vs objectif
- Message IA quotidien selon les données saisies

Routes : POST/GET /api/nutrition, GET /api/nutrition/goals

---

## FONCTIONNALITÉ 4 — IA nutritionnelle

Dans services/aiCoach.js, ajouter fonction generateNutritionPlan(userProfile) :

L'IA génère un plan repas complet sur 7 jours :
- Petit-déjeuner, déjeuner, dîner, collations
- Adapté à l'objectif (masse/sèche/maintien)
- Avec les macros de chaque repas
- Simple et réaliste (pas de recettes compliquées)

Exemple pour prise de masse 80kg :
- Objectif : 3200 kcal, 180g protéines, 400g glucides, 90g lipides
- Petit-dèj : Flocons avoine 80g + protéine whey 30g + banane = 650 kcal
- Déjeuner : Riz 150g + poulet 200g + légumes = 850 kcal
...etc.

Route : POST /api/nutrition/plan (génère plan 7 jours, PREMIUM uniquement)
Afficher dans /nutrition.html sous forme de tableau par jour

---

## FONCTIONNALITÉ 5 — Détection automatique des blessures

Dans routes/sessions.js et services/aiCoach.js :

Détecter les signaux de blessure potentielle :
1. Si l'utilisateur mentionne "douleur", "mal", "blessure" dans le chat → flag automatique
2. Si les performances d'un exercice chutent de >30% en 1 séance → alerte
3. Si même exercice régresse 3 séances de suite → alerte

Table : injury_flags (id, user_id, exercise_name, type TEXT, detected_at, resolved_at)

Quand blessure détectée :
- Notification in-app : "⚠️ On a détecté une possible fatigue au [exercice]. Veux-tu adapter ton programme ?"
- Bouton "Adapter le programme" → l'IA supprime ou allège l'exercice problématique
- Bouton "C'est ok, continuer"
- Si coach assigné : envoyer notification au coach

Route : GET /api/injuries/current, POST /api/injuries/resolve/:id

---

## FONCTIONNALITÉ 6 — Groupes et équipes

Table : teams (id, name, code TEXT UNIQUE, creator_id, created_at)
Table : team_members (id, team_id, user_id, role TEXT, joined_at)

Page : /team.html
Fonctionnalités :
- Créer une équipe (génère un code unique à 6 caractères)
- Rejoindre une équipe avec le code
- Voir les membres de l'équipe avec leurs stats de la semaine
- Classement interne de l'équipe (volume hebdomadaire)
- Chat d'équipe (messages visibles par tous les membres)
- Défis d'équipe : "L'équipe doit soulever 10 tonnes cette semaine"

Lien dans sidebar et drawer mobile
Routes : POST /api/teams, POST /api/teams/join, GET /api/teams/mine, GET /api/teams/:id/leaderboard

---

## FONCTIONNALITÉ 7 — Certifications

Badge spécial "🎓 Athlète Certifié Gym AI Coach" débloqué automatiquement quand :
- Programme 12 semaines complété (12 semaines consécutives avec au moins le nombre de séances prévu)
- OU 100 séances complétées
- OU 1 an de streak (365 jours)

Ce badge est visible sur le profil public avec la date d'obtention.
Il apparaît aussi dans la sidebar à côté du nom.

Email automatique envoyé : "Félicitations ! Tu es maintenant un Athlète Certifié Gym AI Coach 🎓"

Dans admin.html : liste des utilisateurs certifiés avec leur date de certification.

Route : GET /api/badges/certified, POST /api/badges/check-certification

---

## FONCTIONNALITÉ 8 — Système d'affiliation coaches

Table : coach_affiliations (id, coach_id, affiliate_code TEXT UNIQUE, total_referrals INT, total_earnings NUMERIC, created_at)
Table : affiliate_conversions (id, coach_id, referred_user_id, amount NUMERIC, commission NUMERIC, created_at)

Chaque coach reçoit un lien d'affiliation unique :
https://gym-ai-coach-1wls.onrender.com/?aff=COACH_CODE

Quand un utilisateur s'inscrit via ce lien et passe Premium :
- Le coach reçoit 20% de chaque paiement mensuel (1.99€ par abonné Premium)
- Les commissions s'accumulent dans coach_affiliations.total_earnings
- Paiement manuel par virement (Stripe Connect plus tard)

Dans coach-dashboard.html, nouvelle section "💰 Mes affiliations" :
- Ton lien d'affiliation à partager
- Nombre de filleuls convertis en Premium
- Gains accumulés ce mois
- Historique des conversions

Route : GET /api/affiliations/stats, GET /api/affiliations/my-link

---

## FONCTIONNALITÉ 9 — Mode hors-ligne complet (PWA)

Améliorer public/sw.js pour un vrai mode hors-ligne :

1. Cache des assets statiques (CSS, JS, fonts, images) — déjà partiellement fait
2. Cache des données utilisateur dans IndexedDB :
   - Programme actif
   - Derniers logs (30 jours)
   - Profil utilisateur
3. Pendant la séance sans internet :
   - Les logs sont sauvegardés en IndexedDB
   - Indicateur "Mode hors-ligne" visible
   - Sync automatique au retour de la connexion (background sync)
4. Page /offline.html affichée si pas de connexion et ressource non cachée

Créer public/js/offline-sync.js :
- Détecte online/offline via navigator.onLine
- Queue les requêtes POST /api/logs en IndexedDB si hors-ligne
- Sync automatique quand connexion rétablie
- Notification "X séries synchronisées" au retour

---

## ORDRE D'IMPLÉMENTATION RECOMMANDÉ

1. FONCTIONNALITÉ 3 (nutrition) + FONCTIONNALITÉ 4 (IA nutritionnelle) — très demandé
2. FONCTIONNALITÉ 1 (vidéos YouTube exercices) — améliore l'expérience débutant
3. FONCTIONNALITÉ 2 (comparaison séances) — motivation et progression
4. FONCTIONNALITÉ 5 (détection blessures) — sécurité utilisateur
5. FONCTIONNALITÉ 6 (groupes équipes) — engagement social
6. FONCTIONNALITÉ 7 (certifications) — rétention long terme
7. FONCTIONNALITÉ 8 (affiliation coaches) — monétisation
8. FONCTIONNALITÉ 9 (mode hors-ligne) — technique

---

## COMMANDE POUR DÉMARRER

```
Lis FEATURES_MISSING.md et implémente toutes les fonctionnalités dans l'ordre.
Auto-approve tout sans demander confirmation.
Commit séparé pour chaque fonctionnalité avec message descriptif.
Push après chaque commit.
Commence par FONCTIONNALITÉ 3 (journal de nutrition).
```

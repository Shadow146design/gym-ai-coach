# Gym AI Coach — Roadmap finale complète
# Envoie ce fichier à Claude Code : "Lis ROADMAP_FINALE.md et implémente tout dans l'ordre. Auto-approve tout. Commit séparé pour chaque section."

---

## CONTEXTE PROJET
URL : https://gym-ai-coach-1wls.onrender.com
Stack : Node.js + Express + PostgreSQL (Neon) + Groq API + Stripe + Google OAuth + Render
Rôles : user (gratuit), premium (9.99€/mois), coach, admin

---

## SECTION 1 — BUGS URGENTS À CORRIGER

### 1.1 — Voix de l'assistant vocal pas naturelle
Dans public/js/voice-assistant.js et voice-synthesis.js :
- Implémenter getBestFrenchVoice() avec liste de priorité :
  * 'Google français', 'Google français (France)', 'Thomas' (macOS), 'Amelie', 'Microsoft Paul Online (Natural)', 'Microsoft Julie Online (Natural)', 'Microsoft Hortense Online (Natural)'
- Paramètres selon type de voix :
  * Voix Neural/Google : rate 0.92, pitch 1.0
  * Voix Mac : rate 0.88, pitch 1.05
  * Voix standard : rate 0.85, pitch 1.1
- cleanText() amélioré : supprimer emojis, markdown, URLs, remplacer kg→kilos, reps→répétitions, min→minutes, RM→répétition maximum
- Fix iOS : détecter /iPad|iPhone|iPod/.test(navigator.userAgent), utiliser voix 'Samantha' ou première fr disponible, rate 0.9

### 1.2 — Chat IA répond de façon trop générique
Dans services/aiCoach.js, remplacer complètement CHAT_SYSTEM par un prompt de qualité Claude/Gemini :
- Alex est un vrai coach humain passionné, 15 ans d'expérience
- Réponses courtes (2-3 phrases) pour questions simples, structurées pour questions complexes
- Explique POURQUOI pas seulement quoi faire
- Donne des chiffres précis et des exemples concrets
- Termine par conseil actionnable ou question de suivi
- Maximum 150 mots sauf si explication détaillée demandée
- Injecter contexte complet : profil physique, programme actuel, 5 dernières séances, records, streak, plateaux, score de forme
- Ne jamais dire "je suis une IA"

### 1.3 — Page Messages moche et peu fonctionnelle
Refaire complètement messages.html + messages.css + messages.js :

LAYOUT DESKTOP 2 colonnes :
- Colonne gauche (280px) : liste conversations avec avatar, nom, aperçu, heure, badge non-lus, barre recherche
- Colonne droite (flex:1) : chat ouvert avec en-tête (avatar + nom + statut), bulles messages, zone saisie

BULLES MESSAGES :
- Reçus : fond bg-elevated, coins (18px 18px 18px 4px), alignés gauche, avatar 28px à côté
- Envoyés : fond rust ou bg-elevated bordure rust, coins (18px 18px 4px 18px), alignés droite
- Heure sous chaque message en petit
- Indicateur "Lu ✓✓" ou "Envoyé ✓"
- Séparateurs de date : "Aujourd'hui", "Hier", "Lundi 7 juillet"

ZONE SAISIE :
- Input placeholder "Écrire un message..."
- Bouton micro 🎤 à gauche
- Bouton envoyer flèche rust à droite

MOBILE : une colonne à la fois, animation slide-left entre liste et chat, bouton ← retour

ÉTAT VIDE : illustration SVG + "Contacte un coach depuis la page Coaches" + bouton vers /coaches.html

---

## SECTION 2 — AMÉLIORATIONS VISUELLES

### 2.1 — Design System global (style.css)
Nouvelles variables CSS :
```css
:root {
  --bg-base: #080808;
  --bg-card: #111111;
  --bg-card-hover: #161616;
  --bg-elevated: #1a1a1a;
  --bg-input: #141414;
  --border: rgba(255,255,255,0.06);
  --border-hover: rgba(255,255,255,0.12);
  --border-focus: rgba(201,77,40,0.5);
  --text-primary: #f0f0f0;
  --text-secondary: #888888;
  --text-muted: #555555;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
}
```

Améliorer :
- Cards : border subtile, hover effect, border-radius 16px
- Boutons : gradient, hover translateY(-1px), box-shadow colorée
- Inputs : focus avec glow rust, border-radius 12px
- Transitions fluides partout (0.15s-0.2s)

### 2.2 — home.html
- KPI tiles (séances, streak, assiduité) avec icônes SVG propres et meilleur contraste
- Card "Prochaine séance" avec badge coloré selon groupe musculaire
- Calendrier plus grand, carrés 20px, labels mois plus lisibles
- Section records avec design gold plus élégant

### 2.3 — dashboard.html
- Programme en cards par jour avec icône groupe musculaire
- Exercices avec sets×reps en badge coloré
- Chat coach avec bulles bien stylées, input plus grand
- Bouton "✏️ Modifier avec l'IA" plus visible

### 2.4 — profile.html
- Avatar 100px avec bouton edit overlay au hover
- Stats en grille 2×2 propre avec icônes
- Sections avec titres stylés et séparateurs élégants
- Badges rôle plus visibles

### 2.5 — premium.html
- Hero avec gradient et titre percutant
- Cards pricing avec animation hover élégante
- ✓ verts pour features incluses, ✗ gris pour features non incluses
- CTA sticky en bas sur mobile

### 2.6 — session.html
- Exercice actif mis en avant (grande card centrale)
- Timer de repos plus visible et esthétique
- Progression de la séance (X/Y exercices complétés)
- Animations de validation plus satisfaisantes

### 2.7 — stats.html
- Graphes Chart.js avec couleurs cohérentes (rust/gold/green)
- Cards stats avec icônes et tendances (↑↓)
- Section records avec médailles stylées

---

## SECTION 3 — NOUVELLES FONCTIONNALITÉS

### 3.1 — Bibliothèque exercices avec démonstrations Wger améliorées
- Vérifier que le seed Wger a bien fonctionné pour les 102 exercices
- Pour les exercices sans image Wger → afficher silhouette SVG avec muscle coloré
- Ajouter filtres dans exercises.html : groupe musculaire, niveau, équipement
- Ajouter barre de recherche avec autocomplete
- Bouton "Ajouter à ma séance" fonctionnel depuis la bibliothèque

### 3.2 — Notifications push (Web Push API)
Demander permission aux utilisateurs après leur 3ème séance.
Envoyer notifications pour :
- "🔥 Ton streak est en danger ! Tu n'as pas encore fait ta séance aujourd'hui"
- "💬 Nouveau message de ton coach"
- "🏆 Tu as battu un record !"
- "📅 Ta séance de [groupe musculaire] est prévue aujourd'hui"

Table : push_subscriptions (id, user_id, subscription JSONB, created_at)
Route : POST /api/push/subscribe, POST /api/push/send (admin)
Utiliser web-push npm package : npm install web-push
Variables Render à ajouter : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (générer avec web-push generate-vapid-keys)

### 3.3 — Analyse de fatigue intelligente
Dans services/aiCoach.js, ajouter analyzeFatigue(userId) :
- Analyser les 2 dernières semaines de logs
- Détecter si volume total diminue semaine après semaine
- Détecter si l'utilisateur saute des séances plus fréquemment
- Si fatigue détectée → suggérer une semaine de décharge automatiquement
- Afficher sur home.html : "⚠️ Tu sembles fatigué ces derniers temps. Une semaine de décharge pourrait être bénéfique."

### 3.4 — Programme de retour après blessure
Si injury_flags contient une blessure active :
- L'IA génère automatiquement un programme adapté sans l'exercice blessé
- Exercices de remplacement suggérés selon la blessure
- Progressivité : reprendre léger (50% des charges habituelles) puis augmenter

### 3.5 — Statistiques sociales sur le profil public
Page /u/username améliorée :
- Graphe radar des groupes musculaires (volume par muscle)
- Timeline d'activité (comme GitHub contributions)
- Bouton "Défier" → envoie un défi à cet utilisateur pour la semaine
- Partage du profil en un clic (copier lien)

### 3.6 — Widget "Conseil nutrition du jour"
Sur home.html, après le conseil fitness :
- L'IA génère un conseil nutrition adapté à l'objectif et au jour d'entraînement
- Ex: "Jour de jambes aujourd'hui — assure-toi d'avoir des glucides suffisants avant la séance (riz, pâtes, patate douce)"
- Se régénère chaque jour automatiquement
- Route : GET /api/nutrition/daily-tip

### 3.7 — Historique complet des modifications du programme
Table : program_history (id, user_id, program_id, change_type TEXT, change_description TEXT, created_at)
- Enregistrer chaque modification du programme (via chat ou régénération)
- Afficher dans dashboard.html : "Dernières modifications : [date] - Tractions remplacées par Tirage vertical"
- Permettre de revenir à une version précédente

### 3.8 — Mode Focus pour la séance
Pendant la séance sur session.html, bouton "Mode Focus" :
- Passe en plein écran
- Affiche seulement l'exercice en cours (très grand)
- Timer de repos en plein écran
- Vibration mobile à la fin du repos
- Supprime toutes les distractions (sidebar, header cachés)

### 3.9 — Récapitulatif de séance amélioré
Après chaque séance, page de récapitulatif complète :
- Volume total avec comparaison à la séance précédente (+X%)
- Records battus mis en avant (animation confetti)
- Muscles travaillés (graphe radar)
- Durée et intensité (volume/durée)
- Débrief IA affiché directement (pas besoin de cliquer)
- Bouton partage Instagram/TikTok
- Bouton "Partager avec mon coach"

### 3.10 — Intégration Google Calendar
Permettre d'ajouter les séances planifiées dans Google Calendar :
- Bouton "Ajouter à Google Calendar" sur la page programme
- Crée un événement récurrent selon les jours du programme
- Rappel 30 min avant chaque séance
- Utiliser l'API Google Calendar (OAuth déjà en place)

---

## SECTION 4 — OPTIMISATIONS TECHNIQUES

### 4.1 — Performance
- Ajouter index PostgreSQL manquants :
  CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs(user_id, performed_at);
  CREATE INDEX IF NOT EXISTS idx_messages_users ON messages(from_id, to_id);
  CREATE INDEX IF NOT EXISTS idx_programs_user ON programs(user_id, is_active);
- Pagination sur /api/logs (LIMIT 20 OFFSET n)
- Lazy loading des images
- Compression des réponses API (express-compression)

### 4.2 — Sécurité
- Rate limiting renforcé sur /api/auth/login (max 5 tentatives/min par IP)
- Sanitization des inputs (pas de HTML dans les champs texte)
- Headers sécurité avec Helmet.js configuré correctement
- Logs d'erreurs serveur dans une table errors (id, message, stack, created_at)

### 4.3 — PWA améliorée
- Bumper cache SW à v20
- Ajouter toutes les nouvelles pages au precache
- Améliorer la page offline.html avec un design propre
- Background sync pour les logs de séance hors-ligne

### 4.4 — SEO basique
Dans toutes les pages HTML :
- <meta name="description" content="..."> pertinente
- <meta property="og:title"> et og:description (Open Graph)
- <title> différent et descriptif pour chaque page
- favicon.svg déjà en place ✅

---

## SECTION 5 — PAGES MANQUANTES

### 5.1 — Page CGU (/cgu.html)
Conditions Générales d'Utilisation standard adaptées à un SaaS fitness :
- Objet du service
- Accès et inscription
- Abonnements et paiements
- Données personnelles (RGPD)
- Limitation de responsabilité (conseils sportifs)
- Résiliation

### 5.2 — Page Politique de confidentialité (/privacy.html)
RGPD complet :
- Données collectées (profil, logs, paiements)
- Finalité du traitement
- Durée de conservation
- Droits des utilisateurs (accès, rectification, suppression)
- Cookies
- Contact DPO : itachiuchiwa335@gmail.com

### 5.3 — Page Contact (/contact.html)
- Formulaire simple : nom, email, sujet, message
- Envoie email à itachiuchiwa335@gmail.com via Resend
- Confirmation d'envoi affichée

### 5.4 — Page 404 personnalisée
- Design cohérent avec le reste du site
- Message : "Cette page n'existe pas"
- Bouton retour à l'accueil
- Dans server.js : app.use((req, res) => res.status(404).sendFile('404.html'))

---

## ORDRE D'IMPLÉMENTATION

### Phase 1 — Corrections urgentes (faire en premier)
1. Section 1.1 (voix naturelle)
2. Section 1.2 (prompt chat IA)
3. Section 1.3 (refonte messages)

### Phase 2 — Design (impact visuel immédiat)
4. Section 2.1 (design system)
5. Section 2.2 à 2.7 (pages une par une)

### Phase 3 — Nouvelles fonctionnalités
6. Section 3.8 (mode focus séance)
7. Section 3.9 (récap séance amélioré)
8. Section 3.1 (bibliothèque exercices)
9. Section 3.3 (analyse fatigue)
10. Section 3.6 (conseil nutrition)
11. Section 3.2 (notifications push)
12. Section 3.4 à 3.7 et 3.10

### Phase 4 — Technique et légal
13. Section 4.1 (performance)
14. Section 4.2 (sécurité)
15. Section 4.3 (PWA)
16. Section 5.1 à 5.4 (pages légales + 404)

---

## COMMANDE POUR DÉMARRER

```
Lis ROADMAP_FINALE.md et implémente tout dans l'ordre des phases.
Commence par la Phase 1 (corrections urgentes).
Auto-approve tout sans demander confirmation.
Commit séparé pour chaque section avec message descriptif.
Push après chaque commit.
```

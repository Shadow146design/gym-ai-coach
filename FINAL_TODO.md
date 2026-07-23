# Gym AI Coach — Fichier final : bugs + améliorations
# Envoie à Claude Code : "Lis FINAL_TODO.md et implémente tout dans l'ordre. Auto-approve tout. Commit séparé pour chaque section."

---

## CONTEXTE
URL : https://gym-ai-coach-1wls.onrender.com
Stack : Node.js + Express + PostgreSQL (Neon) + Groq API + Stripe + Render

---

## PARTIE 1 — BUGS URGENTS À CORRIGER

### BUG 1 — Images exercices incorrectes (même image pour des exercices différents)

Vider le cache et corriger tous les IDs :
```sql
-- Vider le cache Wger
DELETE FROM exercise_demos;

-- Corriger les IDs YouTube avec les bons IDs pour chaque exercice
UPDATE exercise_videos SET youtube_id = 'ultWZbUMPL8' WHERE exercise_name ILIKE '%squat barre%';
UPDATE exercise_videos SET youtube_id = 'uiOfgLnfpBs' WHERE exercise_name ILIKE '%squat haltères%';
UPDATE exercise_videos SET youtube_id = 'dZgVxmf6jkA' WHERE exercise_name ILIKE '%développé couché barre%';
UPDATE exercise_videos SET youtube_id = 'QZwEU8KFtI0' WHERE exercise_name ILIKE '%développé couché haltères plat%';
UPDATE exercise_videos SET youtube_id = 'DbFgyvMl-Wg' WHERE exercise_name ILIKE '%développé couché incliné%';
UPDATE exercise_videos SET youtube_id = 'ZFn4RFbdv3Q' WHERE exercise_name ILIKE '%développé décliné%';
UPDATE exercise_videos SET youtube_id = 'b_lB2GlZxpk' WHERE exercise_name ILIKE '%développé couché prise serrée%';
UPDATE exercise_videos SET youtube_id = '2yjwXTZQDDI' WHERE exercise_name ILIKE '%développé militaire barre%';
UPDATE exercise_videos SET youtube_id = 'qEwKCR5JCog' WHERE exercise_name ILIKE '%développé militaire haltères%';
UPDATE exercise_videos SET youtube_id = 'op9kVnSso6Q' WHERE exercise_name ILIKE '%soulevé de terre%' AND exercise_name NOT ILIKE '%jambes tendues%';
UPDATE exercise_videos SET youtube_id = 'op9kVnSso6Q' WHERE exercise_name ILIKE '%soulevé de terre jambes tendues%';
UPDATE exercise_videos SET youtube_id = 'FWJR5Ve8bnQ' WHERE exercise_name ILIKE '%rowing barre%';
UPDATE exercise_videos SET youtube_id = 'rT7DgMr-3pg' WHERE exercise_name ILIKE '%rowing haltère%';
UPDATE exercise_videos SET youtube_id = 'ufo_3GkWer8' WHERE exercise_name ILIKE '%rowing poulie%' OR exercise_name ILIKE '%tirage horizontal%';
UPDATE exercise_videos SET youtube_id = 'lueqMNHCoBI' WHERE exercise_name ILIKE '%tirage vertical%';
UPDATE exercise_videos SET youtube_id = 'MkK4-GFRfMQ' WHERE exercise_name ILIKE '%pull-over%';
UPDATE exercise_videos SET youtube_id = 'rep0guA2D4s' WHERE exercise_name ILIKE '%face pull%';
UPDATE exercise_videos SET youtube_id = 'g6qbq4Lf1FI' WHERE exercise_name ILIKE '%shrugs%';
UPDATE exercise_videos SET youtube_id = 'eGo4IYlbE5g' WHERE exercise_name ILIKE '%tractions%';
UPDATE exercise_videos SET youtube_id = 'IZxyjW7MPJQ' WHERE exercise_name ILIKE '%presse à cuisses%';
UPDATE exercise_videos SET youtube_id = 'DbFgyvMl-Wg' WHERE exercise_name ILIKE '%hack squat%';
UPDATE exercise_videos SET youtube_id = 'YyvSfVjQeL0' WHERE exercise_name ILIKE '%leg extension%';
UPDATE exercise_videos SET youtube_id = 'ZlFnkB_eoXY' WHERE exercise_name ILIKE '%leg curl%';
UPDATE exercise_videos SET youtube_id = 'QOVaHwm-Q6U' WHERE exercise_name ILIKE '%fentes%';
UPDATE exercise_videos SET youtube_id = 'xM7XM0lCMbd' WHERE exercise_name ILIKE '%hip thrust%';
UPDATE exercise_videos SET youtube_id = 'MCRFhGHIhhE' WHERE exercise_name ILIKE '%adducteurs%';
UPDATE exercise_videos SET youtube_id = '5BkGaOAFAo4' WHERE exercise_name ILIKE '%abducteurs%';
UPDATE exercise_videos SET youtube_id = 'gwLzBJYoWlQ' WHERE exercise_name ILIKE '%mollets debout%';
UPDATE exercise_videos SET youtube_id = 'gwLzBJYoWlQ' WHERE exercise_name ILIKE '%mollets assis%';
UPDATE exercise_videos SET youtube_id = 'dKpn5HvFGFI' WHERE exercise_name ILIKE '%écarté couché%';
UPDATE exercise_videos SET youtube_id = 'dKpn5HvFGFI' WHERE exercise_name ILIKE '%écarté poulie%';
UPDATE exercise_videos SET youtube_id = 'dKpn5HvFGFI' WHERE exercise_name ILIKE '%pec deck%';
UPDATE exercise_videos SET youtube_id = '2z8JmcrW-As' WHERE exercise_name ILIKE '%dips%';
UPDATE exercise_videos SET youtube_id = 'IODxDxX7oi4' WHERE exercise_name ILIKE '%pompes%';
UPDATE exercise_videos SET youtube_id = 'FeCthMbwFOA' WHERE exercise_name ILIKE '%élévations latérales%';
UPDATE exercise_videos SET youtube_id = 'gP7EyBkMd7g' WHERE exercise_name ILIKE '%élévations frontales%';
UPDATE exercise_videos SET youtube_id = 'FeCthMbwFOA' WHERE exercise_name ILIKE '%oiseau%';
UPDATE exercise_videos SET youtube_id = 'av7-8igSXTs' WHERE exercise_name ILIKE '%curl barre%';
UPDATE exercise_videos SET youtube_id = 'XfBVC3PBkus' WHERE exercise_name ILIKE '%curl pupitre%';
UPDATE exercise_videos SET youtube_id = 'sAq_ocpS3Io' WHERE exercise_name ILIKE '%curl haltères%';
UPDATE exercise_videos SET youtube_id = 'ykJmrZ5v0Oo' WHERE exercise_name ILIKE '%curl marteaux%';
UPDATE exercise_videos SET youtube_id = 'sAq_ocpS3Io' WHERE exercise_name ILIKE '%curl poulie%';
UPDATE exercise_videos SET youtube_id = 'ZXbxsoFOQoc' WHERE exercise_name ILIKE '%curl concentré%';
UPDATE exercise_videos SET youtube_id = 'vB5OHsJ3EME' WHERE exercise_name ILIKE '%pushdown%' OR exercise_name ILIKE '%extension triceps%';
UPDATE exercise_videos SET youtube_id = 'JOgMUZBSBaQ' WHERE exercise_name ILIKE '%extension overhead%';
UPDATE exercise_videos SET youtube_id = 'dKpn5HvFGFI' WHERE exercise_name ILIKE '%skull crusher%';
UPDATE exercise_videos SET youtube_id = 'ZKwwWQBaFQA' WHERE exercise_name ILIKE '%kickback%';
UPDATE exercise_videos SET youtube_id = 'Xyd_fa5zoEU' WHERE exercise_name ILIKE '%crunch%' AND exercise_name NOT ILIKE '%poulie%';
UPDATE exercise_videos SET youtube_id = 'hdng4yB-ZDs' WHERE exercise_name ILIKE '%relevé de jambes%';
UPDATE exercise_videos SET youtube_id = 'pSHjTRChQZY' WHERE exercise_name ILIKE '%planche%';
UPDATE exercise_videos SET youtube_id = 'Ob4K3DrUn4Y' WHERE exercise_name ILIKE '%rouleau%';
UPDATE exercise_videos SET youtube_id = 'gat3NjSMfRE' WHERE exercise_name ILIKE '%russian twist%';
UPDATE exercise_videos SET youtube_id = 'uiOfgLnfpBs' WHERE exercise_name ILIKE '%obliques%';
```

Vérifier qu'il n'y a plus de doublons :
```sql
SELECT youtube_id, array_agg(exercise_name) 
FROM exercise_videos 
GROUP BY youtube_id 
HAVING COUNT(*) > 1;
```

### BUG 2 — Design du site n'a pas changé

Vérifier si les nouvelles variables CSS ont été appliquées dans style.css.
Si NON → implémenter maintenant la Section 2 complète de ROADMAP_FINALE.md :
- Nouvelles variables CSS (--bg-base: #080808, --bg-card: #111111, etc.)
- Cards avec border subtile et hover effect
- Boutons avec gradient et animations
- Inputs avec focus glow
- Refonte home.html, dashboard.html, profile.html, premium.html, session.html, stats.html

### BUG 3 — Page Messages non redesignée

Si messages.html n'a pas de layout 2 colonnes → implémenter maintenant :
- Colonne gauche (280px) : liste conversations avec avatar, nom, aperçu, heure, badge
- Colonne droite : chat avec bulles style iMessage
- Mobile : une colonne à la fois avec animation slide
- État vide avec illustration SVG et bouton vers /coaches.html

### BUG 4 — Panneau notifications encore mal positionné sur certains écrans

Vérifier que le panneau est bien injecté dans <body> (pas dans .sidebar).
S'assurer que sur mobile il prend toute la largeur en position fixed.

---

## PARTIE 2 — AMÉLIORATIONS VISUELLES MANQUANTES

### 2.1 — Sidebar plus moderne
- Réduire la largeur à 200px
- Ajouter un indicateur actif (barre verticale rust à gauche du lien actif)
- Animation smooth au hover (0.15s)
- Avatar utilisateur en bas avec nom + badge rôle
- Séparateurs entre les sections

### 2.2 — Bottom nav mobile améliorée
- Icônes SVG plus propres et cohérentes
- Label sous chaque icône en 10px
- Animation au clic (scale 0.9 → 1)
- Indicateur actif plus visible (point rust sous l'icône)

### 2.3 — Page d'accueil publique (index.html) plus attractive
- Hero avec animation CSS subtile (gradient animé en arrière-plan)
- Section "Comment ça marche" avec illustrations SVG custom
- Compteur d'utilisateurs en temps réel (GET /api/stats/public)
- Témoignages avec avatars générés en CSS
- Footer avec liens légaux et réseaux sociaux

### 2.4 — Page coaches plus attractive
- Cards coaches avec design premium (photo, note étoiles, spécialités, tarif)
- Filtre par spécialité et tarif
- Section "Mon coach actuel" en haut si coach assigné (bannière verte)
- Skeleton loader pendant le chargement

---

## PARTIE 3 — NOUVELLES FONCTIONNALITÉS

### 3.1 — Mode Focus pendant la séance
Dans session.html, bouton "🎯 Mode Focus" :
- Plein écran (document.documentElement.requestFullscreen())
- Affiche SEULEMENT l'exercice en cours en très grand
- Timer de repos en plein écran avec animation countdown
- Vibration mobile à la fin (navigator.vibrate([200,100,200]))
- Bouton ✕ pour quitter le mode focus

### 3.2 — Récapitulatif de séance complet
Après chaque séance, afficher une page récap complète (avant le débrief IA) :
- Volume total + comparaison séance précédente (+X%)
- Records battus avec animation confetti (canvas-confetti npm)
- Muscles travaillés (mini graphe radar)
- Durée de la séance
- Bouton partage Instagram stylisé
- Bouton "Partager avec mon coach" (envoie un message automatique)
- PUIS afficher le débrief IA en dessous

### 3.3 — Notifications push (Web Push API)
npm install web-push
Générer les clés VAPID : web-push generate-vapid-keys
Ajouter sur Render : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY

Table : push_subscriptions (id, user_id, subscription JSONB, created_at)
Routes : POST /api/push/subscribe, POST /api/push/send

Demander permission après la 3ème séance.
Notifications pour :
- "🔥 Ton streak est en danger ! Fais ta séance aujourd'hui"
- "💬 Nouveau message de ton coach"
- "🏆 Nouveau record !"
- "📅 Ta séance [groupe musculaire] est prévue aujourd'hui"

### 3.4 — Analyse de fatigue
Dans services/aiCoach.js, analyzeFatigue(userId) :
- Si volume diminue 2 semaines consécutives → suggérer décharge
- Si séances sautées > 2 par semaine → alerte
- Afficher sur home.html : "⚠️ Tu sembles fatigué, une semaine de décharge pourrait aider"

### 3.5 — Conseil nutrition du jour
Route GET /api/nutrition/daily-tip :
- L'IA génère un conseil nutrition adapté au jour (séance ou repos)
- Ex jour de jambes : "Assure-toi d'avoir des glucides avant la séance (riz, pâtes)"
- Ex jour de repos : "Protéines prioritaires aujourd'hui pour la récupération musculaire"
- Afficher sur home.html sous le conseil fitness

### 3.6 — Historique des modifications du programme
Table : program_history (id, user_id, program_id, change_type, change_description, created_at)
Enregistrer chaque modification (via chat ou régénération).
Afficher dans dashboard.html :
- "Dernières modifications :"
- "[date] — Tractions remplacées par Tirage vertical"
- "[date] — Programme régénéré (Prise de masse)"
Bouton "Revenir à la version précédente"

### 3.7 — Statistiques avancées sur profil public
Page /u/username améliorée :
- Timeline d'activité (grille semaines comme GitHub)
- Graphe radar muscles
- Bouton "Défier cette semaine" (envoie notification au user)
- Bouton "Copier le lien" du profil

### 3.8 — Widget score de forme amélioré
Si score de forme < 50 aujourd'hui :
- Adapter automatiquement l'intensité suggérée dans "Prochaine séance"
- Afficher "(intensité réduite recommandée)" à côté du bouton C'est parti
- L'IA le mentionne dans le chat si l'utilisateur parle de sa séance

### 3.9 — Comparaison morphologique
Dans profile.html, après calcul IMC :
- Afficher le morphotype détecté (Ectomorphe/Mésomorphe/Endomorphe)
- Explication courte de ce que ça signifie
- "Ton programme est adapté à ta morphologie [X]"
- Conseil IA : "Pour ton profil, voici les exercices les plus efficaces..."

### 3.10 — Export et partage du programme
Dans dashboard.html, bouton "📄 Exporter mon programme" :
- Génère un PDF ou une image du programme complet
- Lisible sans connexion (pour l'avoir en salle sans téléphone)
- Design propre avec logo Gym AI Coach
- Partage via Web Share API

---

## PARTIE 4 — OPTIMISATIONS

### 4.1 — Performance base de données
```sql
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs(user_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_users ON messages(from_id, to_id, created_at);
CREATE INDEX IF NOT EXISTS idx_programs_user_active ON programs(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
```

### 4.2 — Cache API
Dans server.js, ajouter cache simple pour les routes lentes :
- GET /api/exercises → cache 24h (données statiques)
- GET /api/competition/leaderboard → cache 5 min
- GET /api/stats/public → cache 1h

### 4.3 — Amélioration du service worker
- Bumper cache à v21
- Stratégie network-first pour les APIs
- Stratégie cache-first pour les assets statiques
- Page offline.html avec design propre et logo

### 4.4 — Logs d'erreurs
Table : error_logs (id, user_id, error_message, stack_trace, url, created_at)
Dans server.js, middleware global d'erreur qui log en base.
Dans admin.html, section "Erreurs récentes" avec les 20 dernières erreurs.

---

## PARTIE 5 — PAGES LÉGALES (si pas encore faites)

### 5.1 — /cgu.html — Conditions Générales d'Utilisation
### 5.2 — /privacy.html — Politique de confidentialité RGPD  
### 5.3 — /contact.html — Formulaire de contact
### 5.4 — /404.html — Page 404 personnalisée avec design cohérent

---

## ORDRE D'IMPLÉMENTATION

### PRIORITÉ 1 — Bugs bloquants
1. BUG 1 (images exercices incorrectes)
2. BUG 2 (design pas changé)
3. BUG 3 (messages pas redesigné)

### PRIORITÉ 2 — Visual polish
4. Section 2.1 à 2.4 (sidebar, bottom nav, landing, coaches)

### PRIORITÉ 3 — Nouvelles fonctionnalités
5. Section 3.1 (mode focus)
6. Section 3.2 (récap séance)
7. Section 3.5 (conseil nutrition)
8. Section 3.4 (analyse fatigue)
9. Section 3.3 (push notifications)
10. Section 3.6 à 3.10

### PRIORITÉ 4 — Technique
11. Section 4.1 à 4.4
12. Section 5.1 à 5.4

---

## COMMANDE POUR DÉMARRER

```
Lis FINAL_TODO.md et implémente tout dans l'ordre des priorités.
Commence par PRIORITÉ 1 BUG 1 (corriger les images exercices incorrectes).
Auto-approve tout sans demander confirmation.
Commit séparé pour chaque bug/fonctionnalité avec message descriptif.
Push après chaque commit.
```

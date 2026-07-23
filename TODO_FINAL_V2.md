# Gym AI Coach — Todo final v2
# Envoie à Claude Code : "Lis TODO_FINAL_V2.md et implémente tout dans l'ordre. Auto-approve tout. Commit séparé pour chaque bug/fonctionnalité."

---

## PARTIE 1 — BUGS URGENTS

### BUG 1 — Modification programme via chat bloquée
Le message "La modification n'a pas pu être appliquée en toute sécurité" apparaît même pour des demandes simples.

Dans services/aiCoach.js, assouplir validateProgram() :
- Seuls champs OBLIGATOIRES : name (string non vide), sets (number > 0), reps (string ou number)
- Champs OPTIONNELS avec valeurs par défaut automatiques :
  * muscle_group → "Autre"
  * rest_seconds → 60
  * notes → ""
  * is_superset_with → null
  * focus → "Séance"
- Ne jamais bloquer si un champ optionnel manque, compléter automatiquement
- Ajouter console.log détaillés pour voir ce qui échoue
- Tester avec "Ajoute les jambes deux fois par semaine" et "Enlève les tractions"

### BUG 2 — Pictogrammes exercices statiques (bonhomme ne bouge pas)
Les animations SVG existent mais le bonhomme ne montre pas le mouvement.

Dans public/js/exercise-animations.js, vérifier et corriger :
1. Les @keyframes sont-ils bien définis ?
2. Les classes animées sont-elles bien appliquées sur les bons éléments SVG ?
3. Bumper SW à v24 pour forcer le rechargement

Animations OBLIGATOIRES à corriger pour ces exercices :
- DÉVELOPPÉ COUCHÉ : bras montent/descendent avec barre (translateY)
- SQUAT : corps descend/remonte (translateY sur tout le corps sauf pieds)
- CURL BICEPS : avant-bras pivotent de 0° à 130° (rotate)
- ROWING : bras tirent vers le ventre (translateX)
- TRACTIONS : corps monte/descend (translateY)
- DÉVELOPPÉ MILITAIRE : bras poussent vers le haut (translateY)
- EXTENSION TRICEPS : avant-bras s'étendent vers le bas (rotate)
- LEG PRESS : jambes poussent et reviennent (translateY)
- LEG EXTENSION : jambes s'étendent vers l'avant (rotate)
- LEG CURL : jambes fléchissent vers les fesses (rotate)
- ÉLÉVATIONS LATÉRALES : bras s'élèvent sur les côtés (rotate)
- HIP THRUST : bassin monte et descend (translateY)

Chaque animation : 2s ease-in-out infinite, fluide et lisible.

### BUG 3 — Page Messages pas encore redesignée
La page messages.html garde l'ancien design. Implémenter le nouveau design demandé :
- Layout 2 colonnes desktop (300px liste + flex:1 chat)
- Bulles iMessage (reçus fond #1e1e1e à gauche, envoyés fond rust à droite)
- Border-radius asymétriques (4px 18px 18px 18px pour reçus, 18px 4px 18px 18px pour envoyés)
- Indicateurs ✓ envoyé / ✓✓ lu
- Séparateurs de date "── Aujourd'hui ──"
- Barre de recherche dans la liste des conversations
- Statut "● En ligne" selon activité récente
- Zone saisie avec bouton micro + input extensible + bouton envoyer rond rust
- Mobile : une colonne à la fois avec animation slide-left
- État vide avec illustration SVG et bouton vers /coaches.html
- Son discret à la réception (Web Audio API)

### BUG 4 — Design global pas encore mis à jour
Le site garde l'ancien design. Vérifier et appliquer :
1. grep "--bg-base" public/css/style.css → si absent, ajouter les nouvelles variables
2. Vérifier que home.html, dashboard.html, profile.html ont le nouveau design
3. Si les variables existent mais les pages n'ont pas changé → vérifier que les classes CSS sont bien appliquées dans le HTML

Nouvelles variables à ajouter si manquantes :
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
}
```

---

## PARTIE 2 — AMÉLIORATIONS VISUELLES

### 2.1 — home.html plus beau
- KPI tiles (séances, streak, assiduité) avec icônes SVG propres et fond coloré subtil
- Card "Prochaine séance" avec badge coloré selon groupe musculaire (rouge=pecs, bleu=dos, vert=jambes, orange=épaules)
- Calendrier : carrés 20px minimum, légende plus lisible
- Section records : design gold avec médailles 🥇🥈🥉
- Conseil du jour : card avec icône ampoule et fond légèrement coloré
- Défis hebdomadaires : barres de progression colorées et animées

### 2.2 — dashboard.html plus beau
- Programme en cards par jour avec icône selon groupe musculaire
- Exercices : nom à gauche, sets×reps en badge orange à droite
- Supersets : affichage visuel avec ligne qui relie les deux exercices
- Chat coach : bulles bien stylées, input plus grand, bouton envoyer rond
- Bouton "✏️ Modifier avec l'IA" bien visible en haut du programme
- Phase périodisation : barre de progression avec couleurs (bleu/orange/rouge/vert)

### 2.3 — profile.html plus beau
- Avatar 100px avec bouton edit 📷 au hover
- Badge rôle coloré (GRATUIT gris / PREMIUM gold / COACH bleu / ADMIN rouge)
- Stats en grille 2×2 avec icônes et couleurs
- Graphe poids corporel plus élégant (Chart.js avec gradient)
- Section badges : grille avec badges colorés (débloqués) et grisés (verrouillés)
- Section photos progression : grid 3 colonnes avec overlay date au hover

### 2.4 — session.html plus beau
- Exercice actif : grande card centrale bien visible
- Sets validés : checkmarks animés (✓ vert avec animation pop)
- Timer de repos : cercle SVG animé countdown, couleur qui change (vert→orange→rouge)
- Progression séance : barre en haut "X/Y exercices complétés"
- Bouton "C'est parti !" : plus grand, plus coloré, animation au clic

### 2.5 — stats.html plus beau
- Graphes Chart.js avec couleurs cohérentes (rust pour principal, gold pour secondaire)
- Cards stats avec icônes SVG et tendances (↑ vert / ↓ rouge)
- Records : liste avec médailles et dates
- Section comparaison : deux colonnes côte à côte

### 2.6 — premium.html plus beau
- Hero avec titre percutant et gradient animé en fond
- Cards pricing avec effet glassmorphism (backdrop-filter: blur)
- ✓ verts animés pour les features incluses
- Témoignages avec avatars CSS colorés
- CTA sticky en bas sur mobile avec animation pulse

---

## PARTIE 3 — NOUVELLES FONCTIONNALITÉS

### 3.1 — Mode Focus pendant la séance
Dans session.html, bouton "🎯 Mode Focus" :
- Plein écran (requestFullscreen())
- Seulement l'exercice en cours visible (très grand, centré)
- Timer repos en plein écran avec countdown animé
- Vibration mobile à la fin du repos
- Fond noir total, texte blanc, accent rust
- Bouton ✕ pour quitter

### 3.2 — Récapitulatif de séance amélioré
Après chaque séance, avant le débrief IA :
- Volume total + comparaison (+X% vs séance précédente)
- Records battus avec animation confetti (canvas-confetti)
- Mini graphe radar muscles travaillés
- Durée de la séance
- Bouton partage Instagram/TikTok
- Message "Partager avec mon coach" (envoie message automatique)

### 3.3 — Notifications push
npm install web-push
Générer VAPID keys, ajouter VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY sur Render.
Table : push_subscriptions (id, user_id, subscription JSONB, created_at)
Demander permission après 3ème séance.
Notifications : streak en danger, nouveau message coach, record battu, séance du jour.

### 3.4 — Conseil nutrition du jour
Route GET /api/nutrition/daily-tip :
- L'IA génère un conseil adapté au jour (séance ou repos)
- Jour jambes : "Assure-toi d'avoir des glucides avant ta séance"
- Jour repos : "Priorité aux protéines aujourd'hui pour la récupération"
- Affiché sur home.html sous le conseil fitness

### 3.5 — Analyse de fatigue
Dans services/aiCoach.js, analyzeFatigue(userId) :
- Volume diminue 2 semaines consécutives → suggérer décharge
- Plus de 2 séances sautées par semaine → alerte
- Afficher sur home.html : "⚠️ Tu sembles fatigué, une semaine de décharge pourrait aider"
- Bouton "Générer programme de décharge" → appelle /api/program/generate avec type "décharge"

### 3.6 — Historique modifications programme
Table : program_history (id, user_id, change_type, change_description, created_at)
Enregistrer chaque modification (chat ou régénération).
Afficher dans dashboard.html :
- "[date] — Ajout jambes le vendredi"
- "[date] — Programme régénéré"
Bouton "Revenir à la version précédente" (réactiver le programme précédent)

### 3.7 — Export PDF du programme amélioré
Le PDF doit inclure :
- Logo Gym AI Coach en haut
- Nom de l'utilisateur + date
- Chaque jour sur une section avec exercices, sets, reps, repos
- Conseils techniques pour chaque exercice
- QR code vers le site (optionnel)
- Design propre en noir avec accent rust

### 3.8 — Page d'erreur 500
Si le serveur crash, afficher une belle page d'erreur 500 :
- Design cohérent avec le site
- Message "Quelque chose s'est mal passé"
- Bouton "Retour à l'accueil"
- Bouton "Signaler ce problème" (ouvre le bug report)

### 3.9 — Amélioration onboarding nouveaux utilisateurs
Quand un nouveau compte est créé (pas encore de programme) :
- Modal de bienvenue attrayant : "Bienvenue sur Gym AI Coach ! 👋"
- 3 étapes illustrées : Créer ton profil → Générer ton programme → Commencer ta première séance
- Bouton "Commencer" → redirige vers questionnaire.html
- Ne pas afficher si l'utilisateur a déjà un programme

### 3.10 — Suggestion intelligente de coach
Sur la page coaches.html, si l'utilisateur n'a pas de coach :
- L'IA analyse son profil et objectif
- Suggère le coach le plus adapté avec une explication :
  "Basé sur ton objectif de prise de masse et ton niveau intermédiaire, [Coach X] serait parfait pour toi"
- Badge "✨ Recommandé pour toi" sur la card du coach suggéré

---

## PARTIE 4 — OPTIMISATIONS FINALES

### 4.1 — Performances
- Lazy loading sur toutes les images
- Debounce 300ms sur les inputs de recherche
- Pagination sur historique séances (20 par page)
- Cache 5 min sur /api/competition/leaderboard

### 4.2 — Sécurité
- Vérifier que tous les inputs sont bien sanitisés
- Rate limiting sur /api/program/generate (max 5/heure pour gratuits)
- Vérifier qu'aucune donnée sensible n'est loggée

### 4.3 — PWA finale
- SW v24 avec toutes les nouvelles pages en precache
- Page offline.html avec design propre
- Manifest.json vérifié (icons, theme_color, display)

### 4.4 — SEO
- Sitemap.xml généré automatiquement
- robots.txt
- Balises meta sur toutes les pages

---

## ORDRE D'IMPLÉMENTATION

### PRIORITÉ 1 — Bugs critiques
1. BUG 1 (validation programme)
2. BUG 3 (refonte messages)
3. BUG 2 (animations SVG exercices)
4. BUG 4 (design global)

### PRIORITÉ 2 — Visual polish
5. Section 2.1 (home)
6. Section 2.2 (dashboard)
7. Section 2.3 (profile)
8. Section 2.4 (session)
9. Section 2.5 (stats)
10. Section 2.6 (premium)

### PRIORITÉ 3 — Nouvelles fonctionnalités
11. Section 3.1 (mode focus)
12. Section 3.2 (récap séance)
13. Section 3.4 (conseil nutrition)
14. Section 3.5 (analyse fatigue)
15. Section 3.9 (onboarding)
16. Section 3.10 (suggestion coach)
17. Section 3.3 (push notifications)
18. Section 3.6 à 3.8

### PRIORITÉ 4 — Optimisations
19. Section 4.1 à 4.4

---

## COMMANDE POUR DÉMARRER

```
Lis TODO_FINAL_V2.md et implémente tout dans l'ordre des priorités.
Commence par PRIORITÉ 1 BUG 1 (validation programme assouplie).
Auto-approve tout sans demander confirmation.
Commit séparé pour chaque bug/fonctionnalité avec message descriptif.
Push après chaque commit.
```

---

## AJOUT — BUG 5 : Pictogramme animé n'apparaît pas sur certains exercices

Quand on clique sur le nom d'un exercice (dans session.html, dashboard.html ou exercises.html), le modal s'ouvre mais le petit bonhomme animé n'apparaît pas — seulement la silhouette statique ou rien du tout.

### Causes possibles à vérifier et corriger :

1. **Mapping du nom d'exercice incorrect**
   Dans public/js/exercise-animations.js, la fonction qui cherche l'animation fait une comparaison exacte ou trop stricte.
   Améliorer le matching pour être insensible aux accents, à la casse et aux variantes :
   ```javascript
   function findAnimation(exerciseName) {
     const normalized = exerciseName.toLowerCase()
       .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // supprimer accents
       .replace(/[^a-z0-9\s]/g, '') // supprimer caractères spéciaux
       .trim();
     
     // Chercher dans EXERCISE_ANIMATIONS avec correspondance partielle
     for (const [key, svg] of Object.entries(EXERCISE_ANIMATIONS)) {
       const normalizedKey = key.toLowerCase()
         .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
         .replace(/[^a-z0-9\s]/g, '').trim();
       if (normalized.includes(normalizedKey) || normalizedKey.includes(normalized)) {
         return svg;
       }
     }
     return null; // pas trouvé → silhouette SVG générique
   }
   ```

2. **Script non chargé au bon moment**
   Vérifier que exercise-animations.js est bien chargé AVANT exercise-modal.js dans chaque page HTML.
   Ordre correct dans le <head> ou avant </body> :
   ```html
   <script src="/js/exercise-animations.js"></script>
   <script src="/js/exercise-modal.js"></script>
   ```

3. **SVG injecté mais invisible**
   Vérifier que le SVG injecté dans le modal a bien :
   - Une taille définie (width: 100%, height: 200px minimum)
   - Pas de display: none ou visibility: hidden
   - viewBox correctement défini
   Ajouter dans le CSS :
   ```css
   .exercise-animation-container svg {
     width: 100%;
     height: 200px;
     display: block;
   }
   ```

4. **Animations CSS bloquées**
   Sur certains navigateurs, les animations dans des SVG injectés dynamiquement ne démarrent pas.
   Solution : forcer le redémarrage de l'animation après injection :
   ```javascript
   const container = document.querySelector('.exercise-animation-container');
   container.innerHTML = animationSVG;
   // Forcer reflow pour déclencher les animations
   container.querySelectorAll('[class]').forEach(el => {
     el.style.animation = 'none';
     el.offsetHeight; // trigger reflow
     el.style.animation = '';
   });
   ```

5. **Fallback visible si animation absente**
   Si aucune animation n'est trouvée pour un exercice :
   - Afficher la silhouette SVG avec le muscle coloré (déjà en place)
   - Ajouter un texte discret "Démonstration non disponible" en dessous
   - Ne jamais afficher un modal vide

6. **Test de tous les exercices**
   Après correction, tester au moins ces exercices pour confirmer que l'animation apparaît :
   - Développé couché barre
   - Squat barre
   - Rowing barre
   - Tractions
   - Curl barre EZ
   - Leg extension machine
   - Élévations latérales haltères
   - Hip thrust barre

Bumper SW à v25 après correction pour forcer le rechargement chez tous les utilisateurs.

Puis git add -A && git commit -m "fix: pictogrammes animés exercices toujours visibles — matching amélioré, fallback garanti" && git push origin main

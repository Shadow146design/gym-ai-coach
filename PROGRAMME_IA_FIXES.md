# Gym AI Coach — Refonte complète du système de programmes IA
# Envoie ce fichier à Claude Code et dis-lui de tout implémenter dans l'ordre

---

## CONTEXTE

L'ancien système de génération de programmes est trop générique.
Les programmes générés ne sont pas assez personnalisés selon la morphologie.
Le chat ne peut pas modifier le programme.
Chaque utilisateur doit recevoir un programme 100% unique adapté à son profil physique exact.

---

## MODULE A — PROMPT IA ENTIÈREMENT RÉÉCRIT

### A.1 — Base d'exercices réels (remplace tous les exercices génériques)

Dans services/aiCoach.js, définir cette constante :

```
const EXERCISE_DATABASE = {
  DOS: [
    "Tractions (lestées si avancé)",
    "Rowing barre",
    "Rowing haltère unilatéral",
    "Tirage vertical prise large",
    "Tirage vertical prise neutre",
    "Tirage horizontal assis poulie basse",
    "Pull-over haltère",
    "Shrugs barre",
    "Face pull poulie"
  ],
  PECS: [
    "Développé couché barre",
    "Développé couché haltères plat",
    "Développé couché incliné haltères",
    "Développé décliné haltères",
    "Écarté couché haltères",
    "Écarté poulie basse",
    "Dips lestés",
    "Pec deck machine",
    "Pompes lestées"
  ],
  EPAULES: [
    "Développé militaire barre",
    "Développé militaire haltères",
    "Élévations latérales haltères",
    "Élévations latérales poulie basse",
    "Oiseau haltères",
    "Oiseau machine à écarté",
    "Face pull poulie",
    "Élévations frontales haltères"
  ],
  BICEPS: [
    "Curl barre droite",
    "Curl barre EZ",
    "Curl haltères alterné",
    "Curl pupitre barre EZ",
    "Curl marteaux haltères",
    "Curl poulie basse",
    "Curl poulie haute pour le pic",
    "Curl concentré haltère"
  ],
  TRICEPS: [
    "Développé couché prise serrée",
    "Dips triceps banc",
    "Skull crusher barre EZ",
    "Pushdown poulie haute barre droite",
    "Pushdown poulie haute corde",
    "Extension triceps unilatéral poulie",
    "Extension overhead corde poulie haute",
    "Kickback haltère"
  ],
  JAMBES: [
    "Squat barre",
    "Hack squat machine",
    "Presse à cuisses",
    "Leg extension machine",
    "Leg curl allongé machine",
    "Leg curl assis machine",
    "Fentes haltères",
    "Soulevé de terre jambes tendues",
    "Hip thrust barre",
    "Adducteurs machine",
    "Abducteurs machine",
    "Mollets debout machine",
    "Mollets assis machine"
  ],
  ABDOS: [
    "Crunch",
    "Crunch poulie haute",
    "Relevé de jambes suspendu",
    "Planche",
    "Rouleau abdominal",
    "Russian twist",
    "Obliques poulie"
  ]
};
```

### A.2 — Règles absolues de programmation

Intégrer ces règles dans TOUS les prompts :

**RÈGLE TRACTIONS (critique) :**
Si tractions choisies → placer EN PREMIER dans la séance DOS.
Réduire ensuite : 1 seul exercice de rowing (pas 2), 1 seul tirage (pas 2), 1 exercice isolation max.
Total séance avec tractions : 4 exercices MAX.
Total séance sans tractions : 5-6 exercices.

**RÈGLE ORDRE :**
Toujours : Exercices composés lourds → Exercices composés moyens → Isolation.
Jamais mettre un curl avant un rowing.
Jamais mettre des élévations latérales avant le développé militaire.

**RÈGLE SPLITS :**
- 2 jours → Full body
- 3 jours → Push / Pull / Legs
- 4 jours → Pecs+Tri / Dos+Bi / Épaules+Abdos / Jambes
- 5 jours → Pecs+Tri / Dos+Bi / Épaules+Abdos / Jambes / Bras
- 6 jours → PPL / PPL

**RÈGLE SUPERSETS :**
Uniquement sur isolation ou antagonistes.
Exemples valides : Curl marteaux + Pushdown corde / Rowing unilatéral + Pull-over / Leg extension + Leg curl.
Jamais de superset sur composés lourds (développé couché barre, squat, rowing barre).

**RÈGLE REPOS :**
- Composés lourds : 2-3 minutes
- Composés moyens : 90 secondes
- Isolation : 60 secondes
- Supersets : 90 secondes entre chaque superset complet

**RÈGLE NOTES TECHNIQUES :**
Chaque exercice doit avoir 1 conseil technique précis et utile.
Exemples de qualité attendue :
- "Garder les coudes fixes sur le pupitre, ne pas balancer le buste" (curl pupitre)
- "Tirer vers le nombril, coudes serrés, dos plat toute la série" (rowing barre)
- "Pieds largeur d'épaules, genoux dans l'axe des pieds, descendre à 90°" (hack squat)

### A.3 — 4 prompts spécifiques par objectif

**PRISE DE MASSE / HYPERTROPHIE :**
- Séries : 4-5 par exercice
- Reps : 6-12 (zone hypertrophie maximale)
- Repos : 60-90 secondes
- Tempo : 3-1-2 (3s descente, 1s contraction, 2s montée)
- Drop set obligatoire sur le dernier exercice de chaque muscle
- Split idéal : 4-5 jours
- Exercices composés lourds EN PREMIER, isolation pump en dernier
- Charge de départ suggérée selon poids de corps

**PERTE DE POIDS / SÈCHE :**
- Séries : 3-4 par exercice
- Reps : 12-20 (endurance musculaire + brûlage calorique)
- Repos : 30-45 secondes MAX
- Supersets sur TOUS les exercices isolation
- 1 exercice composé lourd (5x5-8) puis le reste en circuit
- Cardio HIIT en fin de séance : 10-15 min (sprints 30s / marche 30s)
- Split idéal : Full body 4 jours

**FORCE PURE :**
- Séries : 5-6 par exercice principal
- Reps : 1-5 (85-97% RM)
- Repos : 3-5 minutes entre séries lourdes
- Exercices principaux obligatoires : Squat barre, Développé couché barre, Soulevé de terre, Développé militaire barre
- Accessoires : renforcer les points faibles (triceps pour bench, ischio pour squat)
- Périodisation : S1 (80% RM 5x5) / S2 (85% RM 5x3) / S3 (90% RM 5x2) / S4 décharge (70% RM 3x5)
- PAS d'exercices isolation inutiles

**REMISE EN FORME :**
- Séries : 2-3 par exercice
- Reps : 12-15 (charges légères, technique prioritaire)
- Repos : 45-60 secondes
- Full body 2-3x par semaine
- Machines guidées prioritaires (plus sécurisées)
- 1 exercice de mobilité par groupe musculaire
- Éviter exercices techniques complexes

---

## MODULE B — PERSONNALISATION MORPHOLOGIQUE COMPLÈTE

### B.1 — Calcul automatique du morphotype dans buildPhysicalContext()

Calculer automatiquement depuis poids + taille + âge + genre :

```
IMC = poids / (taille_en_m²)

Si IMC < 18.5 → Ectomorphe
  - Favoriser : composés lourds, repos longs (2-3 min), volume élevé (5 séries)
  - Éviter : trop de cardio, supersets qui brûlent des calories
  - Charges : démarrer plus lourd, progresser vite

Si IMC 18.5-24.9 → Mésomorphe
  - Programme standard sans restriction particulière
  - Bonne réponse à l'entraînement

Si IMC 25-29.9 → Endomorphe léger
  - Repos réduits (45-60s)
  - Supersets fréquents
  - Cardio en fin de séance

Si IMC ≥ 30 → Endomorphe marqué
  - ÉVITER : Squat barre (remplacer par Presse à cuisses), Dips (remplacer par Pushdown poulie), Tractions (remplacer par Tirage vertical machine)
  - Repos : 30-45s
  - Supersets sur tous les exercices
  - Cardio HIIT obligatoire en fin de séance
  - Charges : démarrer léger, progression lente

Si âge < 20 ans → Éviter charges maximales, technique avant tout
Si âge 35-45 ans → Repos +15%, mobilité obligatoire
Si âge > 45 ans → Volume -20%, repos +30%, pas de charges maximales, faible impact articulaire

Si genre femme + masse → Priorité : fessiers/cuisses/dos (Hip thrust barre obligatoire, squat, presse, tirage vertical, rowing), volume épaules/bras réduit
Si genre femme + sèche → Circuits full body, beaucoup jambes/fessiers

Si taille > 185cm → Deadlift sumo recommandé, squat stance large, éviter grande amplitude
Si taille < 165cm ET poids < 60kg → Ossature fine, charges plus légères, isolation importante
```

### B.2 — Exemple concret 78kg / 1m60

IMC = 78 / (1.60²) = 30.5 → Endomorphe marqué

Programme généré automatiquement :
- Remplacer squat barre → Presse à cuisses
- Remplacer dips → Pushdown poulie haute corde
- Remplacer tractions → Tirage vertical machine
- Repos : 30-45s
- Supersets sur TOUS les exercices
- HIIT 10 min en fin de séance
- Note dans summary : "Programme adapté à ton profil morphologique. Exercices sélectionnés pour préserver tes articulations."

### B.3 — Exemple concret 60kg / 1m75

IMC = 19.6 → Ectomorphe

Programme généré automatiquement :
- Favoriser : rowing barre, développé couché barre, squat barre, tractions
- Repos : 2-3 min
- 5 séries par exercice
- PAS de cardio
- Supersets rares
- Note dans summary : "Programme conçu pour maximiser la prise de masse. Évite le cardio en dehors des séances."

### B.4 — Injection du profil dans le prompt IA

Ajouter dans userPrompt ce bloc MORPHOLOGIE :

```
ANALYSE MORPHOLOGIQUE OBLIGATOIRE :
- Poids : Xkg | Taille : Xcm | IMC : X.X
- Morphotype : [Ectomorphe/Mésomorphe/Endomorphe léger/Endomorphe marqué]
- Âge : X ans
- Genre : X

ADAPTATIONS NON-NÉGOCIABLES POUR CE PROFIL :
- Exercices INTERDITS pour ce profil : [liste calculée]
- Exercices OBLIGATOIRES pour ce profil : [liste calculée]
- Temps de repos : [valeur adaptée]
- Cardio : [oui/non + durée]
- Conseil coach : [conseil personnalisé basé sur IMC + âge + genre]
```

### B.5 — Validation post-génération

Après génération, vérifier automatiquement dans generateProgram() :
- Si IMC ≥ 30 ET "squat barre" dans le programme → remplacer par "Presse à cuisses"
- Si IMC ≥ 30 ET "dips" dans le programme → remplacer par "Pushdown poulie haute corde"
- Si âge > 45 ET "tractions" dans le programme → ajouter note "Utiliser assistance si nécessaire"
- Si femme ET moins de 3 exercices jambes → ajouter "Hip thrust barre" obligatoirement
- Si ectomorphe ET moins de 4 exercices composés → noter dans summary

---

## MODULE C — PROGRAMMES VRAIMENT UNIQUES

### C.1 — Anti-duplication

Dans generateProgram() :
1. Récupérer les 3 derniers programmes de l'utilisateur depuis la base
2. Injecter dans le prompt : "PROGRAMMES PRÉCÉDENTS À NE PAS REPRODUIRE : [liste des exercices]"
3. L'IA doit varier au minimum 40% des exercices vs le programme précédent
4. Si même objectif : choisir exercices différents ET ordre différent

### C.2 — Seed de variation

Ajouter un champ "variation_seed" aléatoire dans le prompt pour forcer la diversité :
- "Variation #[1-100] : privilégie les exercices [haltères/barre/machine/câble] cette fois"
- Alterner à chaque génération

---

## MODULE D — CHAT QUI MODIFIE LE PROGRAMME EN TEMPS RÉEL

### D.1 — Détection de demande de modification

Dans routes/chat.js et services/aiCoach.js, détecter si le message contient :
"refaire", "changer", "pas bien", "nul", "trop facile", "trop dur", "je n'aime pas",
"remplace", "sans les", "ajoute", "enlève", "modifier", "pas fan de", "douleur",
"je préfère", "peut-tu changer", "nouveau programme"

Si détecté → mode MODIFICATION activé

### D.2 — Logique de modification

chatWithCoach() retourne maintenant :
```json
{
  "reply": "J'ai modifié ton programme. Voici ce qui a changé : ...",
  "programUpdated": true,
  "newProgram": { ...programme complet... },
  "changes": ["Remplacé Tractions par Tirage vertical", "Ajouté Curl poulie haute"]
}
```

Si programUpdated: true → sauvegarder en base automatiquement (UPDATE programs SET content=... WHERE user_id=... AND is_active=TRUE)

### D.3 — Mise à jour frontend automatique

Dans dashboard.js, si réponse chat contient programUpdated: true :
- Recharger loadProgram() automatiquement
- Afficher toast notification : "Programme mis à jour ✓"
- Surligner les exercices modifiés en vert pendant 3 secondes

### D.4 — Contexte complet injecté dans le chat

Dans chatWithCoach(), injecter :
- Programme complet actuel (TOUS les exercices de TOUS les jours)
- 5 dernières séances (exercices, poids, reps)
- Records personnels (top 10)
- Profil physique (poids, taille, IMC, âge, genre)
- Streak actuel
- Plateaux détectés (exercices stagnants depuis 3+ séances)
- Objectif initial

Exemple de réponse IA intelligente rendue possible :
"Je vois que tu stagnes au développé couché depuis 4 séances à 80kg. Je remplace par développé incliné haltères pour casser le plateau."

---

## MODULE E — QUESTIONNAIRE CONVERSATIONNEL (optionnel mais recommandé)

### E.1 — Nouveau mode de questionnaire

Dans questionnaire.html, ajouter 2 boutons :
- "Questions rapides" → ancien formulaire avec cases à cocher
- "Parler à l'IA (recommandé)" → nouveau chat conversationnel

### E.2 — Chat de questionnaire

Dans le mode chat, l'IA pose les questions naturellement :

```
IA : "Bonjour ! Quel est ton objectif principal ?"
User : réponse libre
IA : "Depuis combien de temps tu t'entraînes ?"
User : réponse libre
IA : "Tu as accès à une salle complète ?"
...etc.
```

Route POST /api/program/chat-generate :
- body : { conversation: [...messages] }
- L'IA extrait objectif, niveau, jours, matériel, limitations depuis la conversation
- Génère le programme avec generateProgram()
- Retourne programme + résumé de ce qu'elle a compris

### E.3 — Extraction des paramètres

Ajouter fonction extractProgramParams(conversation) dans aiCoach.js :
- Analyse la conversation libre
- Extrait : objectif, niveau, joursParSemaine, dureeSeance, materiel, limitations
- Retourne objet structuré compatible avec generateProgram()

---

## MODULE F — SUGGESTIONS PROACTIVES APRÈS SÉANCE

### F.1 — Analyse automatique post-séance

Dans session.js, après triggerDebrief(), appeler POST /api/program/analyze-session

Dans routes/program.js, cette route :
1. Compare les poids soulevés avec les charges prévues dans le programme
2. Si dépasse les charges prévues de +20% sur 3+ exercices → programme trop facile
3. Si atteint moins de 50% des reps prévues sur 3+ exercices → programme trop dur
4. Retourne : { suggestion: "trop_facile" | "trop_dur" | "adapté", message: "..." }

### F.2 — Affichage dans le chat post-séance

Si suggestion détectée, ajouter un message automatique dans le chat débrief :

Trop facile :
"Je remarque que tu dépasses systématiquement les charges prévues. Tu es prêt pour un programme plus difficile ! Veux-tu que je le mette à jour ?"
→ Boutons : [Oui, mettre à jour] / [Non, garder comme ça]

Trop dur :
"Cette séance semble difficile. Veux-tu que j'adapte les charges à la baisse ?"
→ Boutons : [Oui, adapter] / [Non, garder]

### F.3 — Action sur clic des boutons

Si clic "Oui, mettre à jour" → appeler POST /api/program/adapt avec direction: "harder" ou "easier"
Régénère le programme en adaptant les charges +10% ou -10%
Met à jour en base automatiquement
Notification : "Programme adapté automatiquement ✓"

---

## MODULE G — CORRECTIONS DE BUGS CONNUS

### G.1 — Bug calendrier home.html

Le calendrier n'affiche pas les données.
Vérifier que /api/logs/calendar retourne bien des données.
Le problème vient du format de date PostgreSQL.
Dans le JS, utiliser : const key = new Date(d.day).toISOString().slice(0,10)
Et côté SQL : SELECT performed_at::date::text AS day (cast explicite en text)

### G.2 — Bug records vides sur home.html

La section "Tous mes records" est vide même avec des séances loggées.
Vérifier que /api/logs/records retourne bien les données.
Dans home.js, vérifier que le mapping utilise rec.exercise_name et rec.max_weight (pas max_weight_kg).
Afficher minimum 6 records avec design gold.

### G.3 — Bug Google OAuth mobile

Erreur "disallowed_useragent" sur iPhone/Android.
Google bloque les webviews intégrées.
Dans public/index.html, le bouton Google OAuth doit avoir : rel="noopener noreferrer"
Sur mobile Safari/Chrome, ça fonctionne directement dans le navigateur standard.
Si l'utilisateur utilise l'app PWA installée, ajouter dans manifest.json : "display": "browser" au lieu de "standalone" pour éviter le webview.

### G.4 — Prochaine séance affiche le mauvais jour

La recommandation doit se baser sur le VRAI jour de la semaine.
Logique : regarder le programme (ex: Lundi/Mercredi/Vendredi) et trouver le prochain jour disponible à partir d'aujourd'hui.
Si on est jeudi et programme = Lundi/Mercredi/Vendredi → recommander Vendredi (pas Lundi).
Si on est samedi → recommander Lundi.

### G.5 — Streak ring SVG

Le ring SVG est trop petit et peu visible.
Agrandir à 80px de diamètre.
Ajouter animation de rotation légère au chargement.
Afficher le prochain palier en dessous (ex: "Objectif : 7 jours").

---

## MODULE H — AMÉLIORATIONS UI PROGRAMME

### H.1 — Affichage des supersets

Si un exercice a is_superset_with, afficher visuellement les deux exercices liés :
```
┌─────────────────────────────────┐
│ SUPERSET                        │
│ Curl marteaux     3x12   60s    │
│     +                           │
│ Pushdown corde    3x12          │
└─────────────────────────────────┘
```

### H.2 — Affichage des phases de périodisation

Si le programme est sur 12 semaines, afficher sur dashboard.html :
- "📅 Phase 1 — Accumulation (Semaine 3/4)"
- Barre de progression des 12 semaines
- Couleur qui change selon la phase (bleu=accumulation, orange=intensification, rouge=pic, vert=décharge)

### H.3 — Bouton "Modifier mon programme" bien visible

Sur dashboard.html, ajouter un bouton "✏️ Modifier avec l'IA" en haut du programme.
Ce bouton ouvre le chat coach avec le message pré-rempli : "Je voudrais modifier mon programme, voici ce que je veux changer : "
Le curseur est placé à la fin pour que l'utilisateur complète directement.

### H.4 — Charges de départ affichées

Pour chaque exercice du programme, si le profil physique est renseigné, afficher les charges de départ suggérées en petit sous les séries/reps.
Ex: "Développé couché barre — 4x8-12 — Charge suggérée : 60-70kg (selon ton poids de corps)"

---

## ORDRE D'IMPLÉMENTATION

1. MODULE G (corrections de bugs) — en premier car bloque les fonctionnalités
2. MODULE A + B (nouveau prompt + morphologie) — le plus important pour la valeur
3. MODULE C (unicité) — simple à ajouter
4. MODULE D (chat modifie programme) — grosse valeur ajoutée
5. MODULE H (UI améliorée) — polish final
6. MODULE E (questionnaire conversationnel) — optionnel
7. MODULE F (suggestions proactives) — bonus

---

## COMMANDE POUR DÉMARRER

```
Lis ce fichier entier et implémente tout dans l'ordre indiqué.
Commence par MODULE G (corrections de bugs).
Auto-approve tout.
Commit séparé pour chaque module.
Push après chaque commit.
```


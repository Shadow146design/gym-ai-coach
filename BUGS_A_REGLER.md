# Gym AI Coach — Bugs et corrections à faire
# Envoie ce fichier à Claude Code : "Lis BUGS_A_REGLER.md et corrige tout dans l'ordre. Auto-approve tout. Commit séparé pour chaque bug."

---

## BUG 1 — Programme corrompu après modification via chat IA (URGENT)

Le programme d'un utilisateur a été corrompu suite à une demande "ajoute des étirements" dans le chat.

### Étape 1 — Restaurer le programme
```sql
-- Voir les 5 derniers programmes de l'utilisateur
SELECT id, title, is_active, created_at 
FROM programs 
WHERE user_id = (SELECT id FROM users WHERE email = 'itachiuchiwa335@gmail.com') 
ORDER BY created_at DESC LIMIT 5;

-- Désactiver tous les programmes
UPDATE programs SET is_active = FALSE 
WHERE user_id = (SELECT id FROM users WHERE email = 'itachiuchiwa335@gmail.com');

-- Réactiver le dernier programme valide (remplacer X par l'id trouvé)
UPDATE programs SET is_active = TRUE WHERE id = X;
```

### Étape 2 — Ajouter validation anti-corruption dans services/aiCoach.js

Créer fonction validateProgram(program) :
```javascript
function validateProgram(program) {
  if (!program || !Array.isArray(program.days) || program.days.length === 0) {
    throw new Error('Programme invalide : pas de jours');
  }
  for (const day of program.days) {
    if (!day.day || !Array.isArray(day.exercises) || day.exercises.length === 0) {
      throw new Error('Programme invalide : jour incomplet');
    }
    for (const ex of day.exercises) {
      if (!ex.name) throw new Error('Exercice sans nom');
      if (!ex.sets || ex.sets < 1) ex.sets = 3; // valeur par défaut
      if (!ex.reps) ex.reps = '10-12'; // valeur par défaut
      if (!ex.rest_seconds) ex.rest_seconds = 60;
      if (!ex.muscle_group) ex.muscle_group = 'Autre';
    }
  }
  return program; // retourne le programme corrigé
}
```

Appeler validateProgram() dans :
- generateProgram() avant de sauvegarder
- chatWithCoach() quand programUpdated = true

### Étape 3 — Sauvegarde sécurisée dans routes/chat.js

Quand le chat modifie le programme :
1. Récupérer l'ancien programme actif
2. Valider le nouveau programme avec validateProgram()
3. Si validation OK → désactiver l'ancien ET activer le nouveau
4. Si validation ÉCHOUE → garder l'ancien, retourner message d'erreur
5. Ne JAMAIS désactiver l'ancien avant d'avoir validé le nouveau

---

## BUG 2 — Vidéos YouTube manquantes pour certains exercices

Certains exercices affichent seulement la silhouette sans vidéo.

Ajouter ces vidéos manquantes dans exercise_videos :
```sql
INSERT INTO exercise_videos (exercise_name, youtube_id) VALUES
('Cardio HIIT', 'JFKDZ8jOVgQ'),
('Abducteurs machine', 'MCRFhGHIhhE'),
('Adducteurs machine', 'MCRFhGHIhhE'),
('Rowing à la poulie', 'ufo_3GkWer8'),
('Rowing poulie basse', 'ufo_3GkWer8'),
('Tirage horizontal assis', 'ufo_3GkWer8'),
('Face pull poulie', 'rep0guA2D4s'),
('Curl poulie basse', 'sAq_ocpS3Io'),
('Curl poulie haute', 'sAq_ocpS3Io'),
('Extension unilatéral poulie', 'vB5OHsJ3EME'),
('Extension overhead corde', 'JOgMUZBSBaQ'),
('Développé décliné haltères', 'ZFn4RFbdv3Q'),
('Écarté poulie basse', 'dKpn5HvFGFI'),
('Pec deck machine', 'dKpn5HvFGFI'),
('Pompes lestées', 'IODxDxX7oi4'),
('Élévations frontales haltères', 'gP7EyBkMd7g'),
('Oiseau machine', 'FeCthMbwFOA'),
('Curl concentré haltère', 'ZXbxsoFOQoc'),
('Curl haltères alterné', 'sAq_ocpS3Io'),
('Soulevé de terre jambes tendues', 'op9kVnSso6Q'),
('Fentes haltères', 'QOVaHwm-Q6U'),
('Mollets assis machine', 'gwLzBJYoWlQ'),
('Russian twist', 'gat3NjSMfRE'),
('Relevé de jambes suspendu', 'hdng4yB-ZDs'),
('Rouleau abdominal', 'Ob4K3DrUn4Y'),
('Obliques poulie', 'uiOfgLnfpBs'),
('Étirements quadriceps', 'YQmpCQmFTXY'),
('Étirements ischio-jambiers', 'g7Kst1kQPsI'),
('Étirements épaules', 'sLTjMnXcwKI'),
('Étirements dos', 'L_xrDAtykMI'),
('Étirements pectoraux', 'BQg4JpCRnlk'),
('Étirements triceps', 'TGSmCJCjBRo')
ON CONFLICT (exercise_name) DO UPDATE SET youtube_id = EXCLUDED.youtube_id;
```

Aussi faire une recherche floue améliorée dans GET /api/exercises/video/:name :
- Ignorer les accents (Écarté = Ecarte)
- Ignorer la casse
- Matching partiel (si "Rowing barre" cherche "Rowing" → trouver)

---

## BUG 3 — Assistant vocal (bulle) n'apparaît pas sur certains navigateurs

La bulle conversationnelle ne s'affiche pas après clic sur le bouton 🎤.

Vérifier :
1. Que voice-assistant.js est bien inclus dans dashboard.html
2. Bumper le cache SW à v19 pour forcer le rechargement
3. Ajouter un fallback : si SpeechRecognition non supporté → afficher message "Utilisez Chrome pour le coach vocal"
4. Tester que la bulle s'injecte bien dans le DOM au chargement du script
5. Vérifier qu'il n'y a pas de conflit avec voice-input.js (qui gère aussi le micro)

---

## BUG 4 — Emails aux coaches ne fonctionnent pas (domaine non vérifié)

Resend bloque les envois vers des emails autres que itachiuchiwa335@gmail.com.

Solution temporaire jusqu'à l'achat d'un domaine :
1. Désactiver les tentatives d'envoi d'email qui vont échouer (éviter les erreurs dans les logs)
2. À la place, s'assurer que les notifications IN-APP fonctionnent :
   - Badge rouge sur l'icône Messages dans sidebar et bottom nav mobile
   - Le badge se met à jour toutes les 30 secondes
   - Notification toast quand nouveau message reçu (si l'utilisateur est connecté)
3. Quand DOMAIN_VERIFIED=true sera ajouté aux variables Render → réactiver les emails

---

## BUG 5 — Prochaine séance recommandée parfois incorrecte

La recommandation de prochaine séance ne correspond pas toujours au bon jour.

Dans public/js/home.js, fonction loadNextSession() :
- Vérifier que la logique utilise bien le vrai jour de la semaine actuel
- Si le programme a des jours nommés (Lundi/Mercredi/Vendredi) → trouver le prochain jour disponible
- Si le programme a des jours génériques (Jour 1/Jour 2) → recommander le jour suivant le dernier fait
- Ne jamais recommander un jour déjà fait aujourd'hui

---

## BUG 6 — Streak parfois à 0 ou incorrect

Le streak ne se calcule pas correctement selon le fuseau horaire.

Dans routes/sessions.js, GET /api/logs/streak :
- Utiliser AT TIME ZONE 'Europe/Paris' dans les requêtes PostgreSQL
- Comparer les dates en heure française, pas UTC
- Exemple : 
```sql
SELECT DISTINCT (performed_at AT TIME ZONE 'Europe/Paris')::date AS day 
FROM logs WHERE user_id=$1 ORDER BY day DESC
```

---

## BUG 7 — Chat IA : limite de 10 messages pour les gratuits pas toujours respectée

Vérifier que le compteur de messages se reset bien à minuit chaque jour.
Dans middleware/premium.js ou routes/chat.js :
- Reset basé sur la date du jour en heure française (pas UTC)
- Afficher "X/10 messages utilisés" en temps réel dans le chat

---

## ORDRE D'IMPLÉMENTATION

1. BUG 1 (corruption programme) — URGENT, restaurer d'abord
2. BUG 2 (vidéos manquantes) — rapide, juste des INSERT SQL
3. BUG 3 (assistant vocal) — UX importante
4. BUG 4 (emails) — solution temporaire notifications in-app
5. BUG 5 (prochaine séance) — correction logique
6. BUG 6 (streak timezone) — correction SQL
7. BUG 7 (limite messages) — vérification

---

## COMMANDE POUR DÉMARRER

```
Lis BUGS_A_REGLER.md et corrige tous les bugs dans l'ordre.
Commence par BUG 1 (restaurer le programme corrompu) en URGENCE.
Auto-approve tout.
Commit séparé pour chaque bug.
Push après chaque commit.
```

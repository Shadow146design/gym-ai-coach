// Traduction FR -> EN + appel API Wger (gratuite, open source) pour les
// images/descriptions de demonstration des exercices. Extrait de
// routes/exercises.js pour etre reutilisable par le script de seed
// (scripts/seed-exercise-demos.js) sans dupliquer la table de traduction.

// Mappe les noms d'exercices FR (bibliotheque publique + base generee par
// l'IA dans services/aiCoach.js) vers un ou plusieurs noms anglais a tenter
// sur Wger (essayes dans l'ordre, le premier qui matche gagne). L'API Wger
// ne fait qu'une egalite EXACTE sur "name" (pas de recherche floue/partielle
// cote serveur), d'ou plusieurs variantes par exercice pour maximiser les
// chances de trouver une correspondance.
// NB : les candidats sont ordonnes du plus fidele (nom exact verifie comme
// ayant une image sur Wger, cf. script d'exploration scripts/_wger-image-index.js)
// au plus generique. Beaucoup d'exercices existent sur Wger sous un nom
// "propre" (ex: "Squats") mais sans aucune image associee (base
// crowd-sourcee, couverture tres inegale) : dans ce cas le premier candidat
// avec une vraie image passe avant, meme si le libelle est legerement
// different (ex: barre vs haltere) — mieux vaut une image proche que la
// silhouette SVG generique.
const EXERCISE_TRANSLATIONS = {
  // ── Dos ──────────────────────────────────────────────────
  "tractions": ["Pull-ups", "Chin Up", "Pull-up"],
  "tractions (lestées si avancé)": ["Pull-ups", "Chin Up", "Pull-up"],
  "tractions pronation": ["Pull-ups", "Chin Up"],
  "rowing barre": ["Bent Over Rowing", "Bent over Row", "Barbell Row"],
  "rowing barre buste penché": ["Bent Over Rowing", "Bent over Row"],
  "rowing haltère": ["Bent Over Dumbbell Rows", "One Arm Bent Row", "One Arm Dumbbell Row"],
  "rowing haltère unilatéral": ["One Arm Bent Row", "Bent Over Dumbbell Rows"],
  "tirage vertical prise large": ["Close-grip Lat Pull Down", "Modified pulldown", "Lat Pulldown"],
  "tirage vertical prise neutre": ["Close-grip supinated lat pulldown", "Neutral-grip chest pulldown", "Lat Pulldown"],
  "tirage vertical poulie haute": ["Close-grip Lat Pull Down", "Modified pulldown", "Lat Pulldown"],
  "tirage horizontal assis poulie basse": ["Seated Cable Row", "Seated Row (Machine)"],
  "tirage horizontal poulie basse": ["Seated Cable Row", "Seated Row (Machine)"],
  "pull-over haltère": ["Cross-Bench Dumbbell Pullovers", "Dumbbell Pullover"],
  "shrugs barre": ["Shrugs, Barbells", "Barbell Shrug"],
  "face pull poulie": ["Dumbbell Bent Over Face Pull", "Face Pull"],
  "tirage face à la poulie": ["Dumbbell Bent Over Face Pull", "Face Pull"],
  "soulevé de terre": ["Deadlifts", "Deadlift"],
  "soulevé de terre jambes tendues": ["Dumbbell Romanian Deadlift", "Romanian Deadlift", "Deadlifts"],
  "soulevé de terre roumain": ["Dumbbell Romanian Deadlift", "Romanian Deadlift", "Deadlifts"],
  "good morning": ["Good Morning", "Good Mornings"],
  "rowing menton": ["Upright Row w/ Dumbbells", "Upright Row"],

  // ── Poitrine ─────────────────────────────────────────────
  "développé couché barre": ["Bench Press"],
  "développé couché haltères plat": ["Benchpress Dumbbells", "Bench Press"],
  "développé couché incliné haltères": ["Incline Bench Press - Dumbbell", "Incline Bench Press"],
  "développé incliné haltères": ["Incline Bench Press - Dumbbell", "Incline Bench Press"],
  "développé décliné haltères": ["Decline Bench Press Barbell", "Decline Bench Press"],
  "développé décliné": ["Decline Bench Press Barbell", "Decline Bench Press"],
  "développé couché prise serrée": ["Bench Press Narrow Grip", "Close-Grip Bench Press"],
  "développé couché avec dips (superset)": ["Bench Press"],
  "écarté couché haltères": ["Fly With Dumbbells", "Dumbbell Flyes"],
  "écarté poulie basse": ["Fly With Cable", "Cable Cross-over"],
  "dips": ["Dips Between Two Benches", "Dips"],
  "dips lestés": ["Dips Between Two Benches", "Dips"],
  "dips (pectoraux)": ["Dips Between Two Benches", "Dips"],
  "dips triceps banc": ["Dips Between Two Benches", "Bench Dips"],
  "dips (triceps)": ["Dips Between Two Benches", "Dips"],
  "pec deck machine": ["Butterfly", "Pec Deck"],
  "butterfly (pec deck)": ["Butterfly", "Pec Deck"],
  "pompes lestées": ["Weighted push-ups", "Push-Up"],
  "pompes": ["Push-Up", "Push-ups"],

  // ── Épaules ──────────────────────────────────────────────
  "développé militaire": ["Shoulder Press, Barbell", "Overhead Press"],
  "développé militaire barre": ["Shoulder Press, Barbell", "Overhead Barbell Press"],
  "développé militaire haltères": ["Shoulder Press, Dumbbells", "Dumbbell Shoulder Press"],
  "développé haltères assis": ["Shoulder Press, Dumbbells", "Single-arm dumbbell shoulder press"],
  "élévations latérales": ["Lateral Raises", "Side Lateral Raise"],
  "élévations latérales haltères": ["Lateral Raises", "Side Lateral Raise"],
  "élévations latérales poulie basse": ["Cable Lateral Raises (Single Arm)", "Machine Lateral Raise"],
  "élévations frontales": ["Front Raises", "Dumbbell Front Raise"],
  "élévations frontales haltères": ["Front Raises", "Dumbbell Front Raise"],
  "oiseau": ["Rear Delt Raises", "Reverse Flyes"],
  "oiseau haltères": ["Rear Delt Raises", "Reverse Flyes"],
  "oiseau (élévations arrière)": ["Rear Delt Raises", "Incline Bench Reverse Fly"],
  "oiseau machine à écarté": ["Cable Rear Delt Fly", "Incline Bench Reverse Fly", "Reverse Pec Deck"],

  // ── Biceps ───────────────────────────────────────────────
  "curl barre droite": ["Biceps Curls With Barbell", "Barbell Curl"],
  "curl barre ez": ["Biceps Curls With SZ-bar", "EZ Bar Curl"],
  "curl haltères alterné": ["Alternating Biceps Curls With Dumbbell", "Alternating bicep curls"],
  "curl pupitre barre ez": ["Preacher Curls", "Preacher Curl"],
  "curl pupitre (scott)": ["Preacher Curls", "Preacher Curl"],
  "curl marteaux haltères": ["Hammer Curls", "Hammer Curl"],
  "curl marteau": ["Hammer Curls", "Hammer Curl"],
  "curl poulie basse": ["Biceps Curl With Cable", "Cable Curl"],
  "curl câble poulie basse": ["Biceps Curl With Cable", "Cable Curl"],
  "curl poulie haute pour le pic": ["Straight Bar Cable Curls", "Hammercurls on Cable"],
  "curl concentré haltère": ["Cable Concentration Curl", "Concentration Curl"],

  // ── Triceps ──────────────────────────────────────────────
  "skull crusher barre ez": ["Skullcrusher SZ-bar", "Skullcrusher"],
  "pushdown poulie haute barre droite": ["Triceps Pushdown", "Tricep Pushdown on Cable"],
  "pushdown poulie haute corde": ["Tricep Rope Pushdowns", "Triceps Pushdown"],
  "extension triceps unilatéral poulie": ["Triceps Extensions on Cable", "Single Arm Triceps Extension"],
  "extension triceps poulie haute": ["Triceps Pushdown", "Tricep Pushdown on Cable"],
  "extension overhead corde poulie haute": ["Overhead Triceps Extension", "High-Cable Cross Tricep Extention - NB"],
  "extension triceps nuque haltère": ["Triceps Overhead (Dumbbell)", "Overhead Triceps Extension"],
  "kickback haltère": ["Triceps Kickback", "Kickback"],
  "kick-back haltère": ["Triceps Kickback", "Kickback"],

  // ── Jambes ───────────────────────────────────────────────
  "squat barre": ["Barbell Full Squat", "Squats"],
  "squat": ["Barbell Full Squat", "Squats"],
  "hack squat": ["Leg Press on Hackenschmidt Machine", "Hack Squat"],
  "hack squat machine": ["Leg Press on Hackenschmidt Machine", "Hack Squat"],
  "presse à cuisses": ["Leg Press"],
  "leg extension": ["Leg Extension", "Leg Extensions"],
  "leg extension machine": ["Leg Extension", "Leg Extensions"],
  "leg curl": ["Leg Curl", "Leg Curls (laying)"],
  "leg curl allongé": ["Leg Curls (laying)", "Leg Curl"],
  "leg curl allongé machine": ["Leg Curls (laying)", "Leg Curl"],
  "leg curl assis machine": ["Leg Curls (sitting)", "Seated Leg Curl"],
  "fentes haltères": ["Dumbbell Lunges Walking", "Lunges"],
  "fentes avant haltères": ["Dumbbell Lunges Walking", "Lunges"],
  "fentes bulgares": ["Bulgarian Squat with Dumbbells", "Bulgarian split squats left"],
  "fentes marchées": ["Dumbbell Lunges Walking", "Walking Lunge"],
  "hip thrust": ["Dumbbell Hip Thrust", "Hip Thrust"],
  "hip thrust barre": ["Dumbbell Hip Thrust", "Hip Thrust"],
  "adducteurs machine": ["Seated Hip Adduction", "Hip Adduction"],
  "abducteurs machine": ["Machine Hip Abduction", "Hip Abduction"],
  "abduction hanche machine": ["Machine Hip Abduction", "Hip Abduction"],
  "mollets debout machine": ["Standing Calf Raises", "Calf Raises"],
  "mollets debout": ["Standing Calf Raises", "Calf Raises"],
  "mollets assis machine": ["Seated Dumbbell Calf Raise", "Seated Calf Raise"],

  // ── Abdos ────────────────────────────────────────────────
  "crunch": ["Crunches"],
  "crunch au sol": ["Crunches"],
  "crunch poulie haute": ["Weighted Crunch", "Cable Crunch"],
  "crunch câble à genoux": ["Weighted Crunch", "Cable Crunch"],
  "relevé de jambes suspendu": ["Leg raises pull up bar", "Hanging Leg Raise"],
  "planche": ["Plank"],
  "planche (gainage)": ["Plank"],
  "rouleau abdominal": ["Ab wheel", "Barbell Ab Rollout", "Ab Roller"],
  "roue abdominale (ab wheel)": ["Ab wheel", "Barbell Ab Rollout", "Ab Roller"],
  "russian twist": ["Russian Twist"],
  "obliques poulie": ["Torso Twist", "Cable Woodchop"],

  // ── Full body ────────────────────────────────────────────
  "burpees": ["Burpee", "Burpees"],
  "kettlebell swing": ["Kettlebell Swing"],
  "thruster (squat + développé)": ["Thruster"],
  "clean and press": ["Clean and Press", "Barbell Clean and press"],
};

function translateExerciseName(name) {
  const norm = String(name || "").toLowerCase().trim();
  if (EXERCISE_TRANSLATIONS[norm]) return EXERCISE_TRANSLATIONS[norm];
  for (const [fr, candidates] of Object.entries(EXERCISE_TRANSLATIONS)) {
    if (norm.includes(fr) || fr.includes(norm)) return candidates;
  }
  return [name]; // repli : tente le nom francais tel quel (echouera probablement sur Wger)
}

function stripHtml(html) {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Interroge l'API Wger : exercise-translation pour trouver l'id de
// l'exercice de base a partir du nom anglais, puis exerciseinfo pour
// l'image de demonstration et les muscles travailles.
async function fetchWgerDemo(name) {
  for (const candidate of translateExerciseName(name)) {
    try {
      const searchRes = await fetch(
        `https://wger.de/api/v2/exercise-translation/?format=json&language=2&name=${encodeURIComponent(candidate)}`
      );
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      const match = searchData.results?.[0];
      if (!match) continue;

      const infoRes = await fetch(`https://wger.de/api/v2/exerciseinfo/${match.exercise}/?format=json`);
      if (!infoRes.ok) continue;
      const info = await infoRes.json();

      const mainImage = (info.images || []).find(i => i.is_main) || info.images?.[0];
      const muscles = [...(info.muscles || []), ...(info.muscles_secondary || [])].map(m => m.name_en || m.name);

      return {
        imageUrl: mainImage?.thumbnails?.medium || mainImage?.image || null,
        description: stripHtml(match.description) || null,
        muscles: [...new Set(muscles)],
      };
    } catch (e) {
      console.error(`Erreur appel Wger pour "${candidate}" :`, e.message);
    }
  }
  return null;
}

module.exports = { EXERCISE_TRANSLATIONS, translateExerciseName, fetchWgerDemo };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ── Base d'exercices réels (remplace les exercices génériques) ──
const EXERCISE_DATABASE = {
  DOS: [
    "Tractions (lestées si avancé)", "Rowing barre", "Rowing haltère unilatéral",
    "Tirage vertical prise large", "Tirage vertical prise neutre",
    "Tirage horizontal assis poulie basse", "Pull-over haltère", "Shrugs barre", "Face pull poulie",
  ],
  PECS: [
    "Développé couché barre", "Développé couché haltères plat", "Développé couché incliné haltères",
    "Développé décliné haltères", "Écarté couché haltères", "Écarté poulie basse",
    "Dips lestés", "Pec deck machine", "Pompes lestées",
  ],
  EPAULES: [
    "Développé militaire barre", "Développé militaire haltères", "Élévations latérales haltères",
    "Élévations latérales poulie basse", "Oiseau haltères", "Oiseau machine à écarté",
    "Face pull poulie", "Élévations frontales haltères",
  ],
  BICEPS: [
    "Curl barre droite", "Curl barre EZ", "Curl haltères alterné", "Curl pupitre barre EZ",
    "Curl marteaux haltères", "Curl poulie basse", "Curl poulie haute pour le pic", "Curl concentré haltère",
  ],
  TRICEPS: [
    "Développé couché prise serrée", "Dips triceps banc", "Skull crusher barre EZ",
    "Pushdown poulie haute barre droite", "Pushdown poulie haute corde",
    "Extension triceps unilatéral poulie", "Extension overhead corde poulie haute", "Kickback haltère",
  ],
  JAMBES: [
    "Squat barre", "Hack squat machine", "Presse à cuisses", "Leg extension machine",
    "Leg curl allongé machine", "Leg curl assis machine", "Fentes haltères",
    "Soulevé de terre jambes tendues", "Hip thrust barre", "Adducteurs machine",
    "Abducteurs machine", "Mollets debout machine", "Mollets assis machine",
  ],
  ABDOS: [
    "Crunch", "Crunch poulie haute", "Relevé de jambes suspendu", "Planche",
    "Rouleau abdominal", "Russian twist", "Obliques poulie",
  ],
};
const EXERCISE_DATABASE_TEXT = Object.entries(EXERCISE_DATABASE)
  .map(([group, list]) => `${group} : ${list.join(", ")}`).join("\n");

// ── Règles précises par objectif et niveau ─────────────────
const PROGRAM_RULES = {
  "prise de masse / hypertrophie": {
    debutant:      { sets:"3-4", reps:"8-12", rest:"60-90s", intensity:"60-70% RM", progression:"ajouter 2.5kg tous les 2 entraînements" },
    intermediaire: { sets:"4-5", reps:"6-12", rest:"60-90s", intensity:"70-80% RM", progression:"périodisation ondulatoire (semaine lourde/légère)" },
    avance:        { sets:"4-6", reps:"6-15", rest:"60-90s", intensity:"70-85% RM", progression:"drop sets, supersets, rest-pause" },
  },
  "perte de poids / seche": {
    debutant:      { sets:"3",   reps:"12-15", rest:"30-45s", intensity:"50-60% RM", progression:"augmenter le volume avant la charge" },
    intermediaire: { sets:"3-4", reps:"12-20", rest:"30-45s", intensity:"55-65% RM", progression:"circuits et supersets" },
    avance:        { sets:"4-5", reps:"15-20", rest:"20-30s", intensity:"55-70% RM", progression:"HIIT intégré, trisets" },
  },
  "force pure": {
    debutant:      { sets:"3",   reps:"5",   rest:"3-4min", intensity:"75-85% RM", progression:"ajouter 2.5-5kg par séance" },
    intermediaire: { sets:"4-5", reps:"3-5", rest:"3-5min", intensity:"80-90% RM", progression:"progression sur 3 semaines + 1 décharge" },
    avance:        { sets:"5-6", reps:"1-5", rest:"4-6min", intensity:"85-97.5% RM", progression:"périodisation linéaire/conjuguée" },
  },
  "remise en forme generale / endurance": {
    debutant:      { sets:"2-3", reps:"12-15", rest:"45-60s", intensity:"45-55% RM", progression:"consolider technique avant charge" },
    intermediaire: { sets:"3",   reps:"12-15", rest:"45s",    intensity:"55-65% RM", progression:"ajouter complexité (unilatéral)" },
    avance:        { sets:"3-4", reps:"15-20", rest:"30-45s", intensity:"60-70% RM", progression:"augmenter densité, varier modalités" },
  },
};

// ── Specificites par objectif, communes a tous les niveaux ──
const OBJECTIVE_SPECIFICS = {
  "prise de masse / hypertrophie": [
    "Tempo : 3-1-2 (3s descente, 1s contraction, 2s montée)",
    "Drop set obligatoire sur le dernier exercice de chaque muscle",
    "Split idéal : 4-5 jours, exercices composés lourds EN PREMIER, isolation pump en dernier",
    "Pas de cardio dans la séance sauf demande explicite",
  ],
  "perte de poids / seche": [
    "Supersets sur TOUS les exercices d'isolation",
    "1 exercice composé lourd (5x5-8) puis le reste en circuit",
    "Cardio HIIT en fin de séance : 10-15 min (sprints 30s / marche 30s)",
    "Split idéal : Full body sur 4 jours",
  ],
  "force pure": [
    "Exercices principaux obligatoires selon le matériel disponible : Squat barre, Développé couché barre, Soulevé de terre, Développé militaire barre",
    "Accessoires ciblés sur les points faibles (triceps pour le développé, ischios pour le squat)",
    "Périodisation sur 4 semaines : S1 80% RM 5x5 / S2 85% RM 5x3 / S3 90% RM 5x2 / S4 décharge 70% RM 3x5",
    "Aucun exercice d'isolation superflu",
  ],
  "remise en forme generale / endurance": [
    "Full body 2-3x par semaine",
    "Prioriser les machines guidées (plus sécurisées pour débuter)",
    "Ajouter 1 exercice de mobilité par groupe musculaire travaillé",
    "Éviter les mouvements techniques complexes (olympique, pliométrie)",
  ],
};

// Repartit les jours d'entrainement sur des vrais jours de semaine, en
// espaçant au maximum le repos (utilise par le prompt ET par l'UI pour
// recommander la "prochaine séance" en fonction du jour reel).
const WEEKDAY_SCHEDULES = {
  1: ["Lundi"],
  2: ["Lundi", "Jeudi"],
  3: ["Lundi", "Mercredi", "Vendredi"],
  4: ["Lundi", "Mardi", "Jeudi", "Vendredi"],
  5: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"],
  6: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  7: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
};
function suggestWeekdays(joursParSemaine) {
  const n = Math.min(7, Math.max(1, parseInt(joursParSemaine, 10) || 3));
  return WEEKDAY_SCHEDULES[n];
}

// ── Génération de programme ────────────────────────────────
const PROGRAM_SYSTEM = `Tu es un préparateur physique certifié avec 15 ans d'expérience.
Tu crées des programmes RÉELLEMENT DIFFÉRENCIÉS selon l'objectif ET le niveau.
Tu prends en compte le profil physique de la personne pour adapter les charges et les exercices.

━━ BASE D'EXERCICES DE RÉFÉRENCE (choisis en priorité dans cette liste, adapte selon le matériel disponible) ━━
${EXERCISE_DATABASE_TEXT}

RÈGLES ABSOLUES :
1. Les charges suggérées doivent être réalistes par rapport au poids de corps (ex: un débutant de 70kg ne soulevera pas 100kg au squat)
2. L'âge impact les temps de repos (45+ ans = +30% de repos) et le volume (55+ ans = -20% volume)
3. Le genre guide la priorité musculaire SAUF si l'objectif dit autre chose
4. L'activité quotidienne module le volume total (sédentaire = -15%, très actif = +10%)
5. La taille guide les exercices (grand >185cm = deadlift sumo préférable, machines pour les jambes)

RÈGLE TRACTIONS (critique) : si des tractions sont choisies pour une séance dos → les placer
EN PREMIER. Réduire alors le reste de la séance à 1 seul rowing, 1 seul tirage, 1 isolation max
(4 exercices MAX au total). Sans tractions : 5-6 exercices pour la séance dos.

RÈGLE ORDRE : toujours composés lourds → composés moyens → isolation. Jamais un curl avant un
rowing, jamais des élévations latérales avant le développé militaire.

RÈGLE SPLITS selon les jours/semaine : 2j → Full body. 3j → Push/Pull/Legs.
4j → Pecs+Triceps / Dos+Biceps / Épaules+Abdos / Jambes. 5j → les 4 précédents + Bras.
6j → Push/Pull/Legs répété deux fois.

RÈGLE SUPERSETS : uniquement entre exercices d'isolation ou antagonistes (ex: curl marteaux +
pushdown corde, leg extension + leg curl). JAMAIS de superset sur un composé lourd (développé
couché barre, squat, rowing barre, soulevé de terre). Quand deux exercices forment un superset,
donne-leur le même texte dans le champ "superset_group" (ex: "A") ; sinon laisse-le vide.

RÈGLE REPOS : composés lourds 2-3min, composés moyens 90s, isolation 60s, entre deux supersets
complets 90s.

RÈGLE NOTES TECHNIQUES : chaque exercice doit avoir 1 conseil technique précis et concret
(ex: "Tirer vers le nombril, coudes serrés, dos plat toute la série" pour un rowing barre),
jamais une note générique comme "bien faire l'exercice".

RÈGLE PROGRAMME :
- Ne jamais générer deux programmes similaires pour des objectifs différents
- Toujours indiquer muscle_group pour chaque exercice
- Les notes doivent mentionner les charges de départ adaptées au profil si le poids de corps est connu
- Le champ "day" DOIT être un vrai jour de la semaine (Lundi, Mardi, Mercredi, Jeudi, Vendredi,
  Samedi ou Dimanche), jamais "Jour 1" ou un nom générique. La liste exacte et l'ordre des jours
  à utiliser sont fournis dans le message utilisateur ci-dessous : respecte-les strictement.
- "target_weight_kg" : charge de départ suggérée en kg (nombre, pas de texte) si le poids de corps
  est connu et l'exercice se fait avec charge additionnelle ; sinon null (exercices au poids du
  corps, machines à charge inconnue, etc.).

Réponds UNIQUEMENT avec un JSON valide, sans texte ni balises markdown :
{
  "title": "Nom court et percutant",
  "summary": "2-3 phrases sur la logique du programme et comment il est adapté au profil",
  "days": [
    {
      "day": "Lundi",
      "focus": "Groupe musculaire / type de séance",
      "exercises": [
        {
          "name": "Nom précis de l'exercice ou machine",
          "muscle_group": "Poitrine / Dos / Épaules / Biceps / Triceps / Jambes / Fessiers / Abdos / Full body",
          "sets": 4,
          "reps": "8-12",
          "rest_seconds": 90,
          "superset_group": "",
          "target_weight_kg": 60,
          "notes": "Conseil technique + charge de départ conseillée si profil connu"
        }
      ]
    }
  ],
  "advice": ["Conseil général 1", "Conseil général 2", "Conseil général 3"]
}`;

// Calcule l'IMC et déduit les recommandations de charge
// Calcule automatiquement le morphotype (IMC) et en deduit exercices
// interdits/obligatoires, repos et cardio recommandes (module B).
function computeMorphology(answers) {
  const { weight_kg: w, height_cm: h, age, gender, objectif } = answers;
  if (!w || !h) return null;

  const imc = w / Math.pow(h / 100, 2);
  let morphotype, forbidden = [], mandatory = [], restNote, cardioNote, coachAdvice;

  if (imc < 18.5) {
    morphotype = "Ectomorphe";
    restNote = "repos longs (2-3 min), volume élevé (5 séries), progresser vite sur les charges";
    cardioNote = "aucun cardio en dehors du strict nécessaire";
    coachAdvice = "Programme conçu pour maximiser la prise de masse. Évite le cardio en dehors des séances.";
  } else if (imc < 25) {
    morphotype = "Mésomorphe";
    restNote = "repos standards selon l'objectif, bonne réponse générale à l'entraînement";
    cardioNote = "selon l'objectif choisi";
    coachAdvice = "Programme standard, ton profil répond bien à l'entraînement classique.";
  } else if (imc < 30) {
    morphotype = "Endomorphe léger";
    restNote = "repos réduits (45-60s), supersets fréquents";
    cardioNote = "cardio en fin de séance recommandé";
    coachAdvice = "Programme orienté dépense calorique en plus du renforcement musculaire.";
  } else {
    morphotype = "Endomorphe marqué";
    forbidden = ["Squat barre", "Dips lestés", "Dips triceps banc", "Tractions (lestées si avancé)"];
    mandatory = ["Presse à cuisses", "Pushdown poulie haute corde", "Tirage vertical prise large"];
    restNote = "repos courts (30-45s), supersets sur tous les exercices";
    cardioNote = "cardio HIIT obligatoire en fin de séance";
    coachAdvice = "Programme adapté à ton profil morphologique. Exercices sélectionnés pour préserver tes articulations.";
  }

  if (age >= 45) forbidden.push("Squat barre lourd (>85% RM)", "Soulevé de terre lourd sans échauffement prolongé");
  if (gender === "femme" && !objectif?.includes("force")) mandatory.push("Hip thrust barre");

  return { imc: Math.round(imc * 10) / 10, morphotype, forbidden: [...new Set(forbidden)], mandatory: [...new Set(mandatory)], restNote, cardioNote, coachAdvice };
}

function buildPhysicalContext(answers) {
  if (!answers.weight_kg && !answers.height_cm && !answers.age) return "";

  const lines = ["\n━━ PROFIL PHYSIQUE DE L'UTILISATEUR ━━"];

  if (answers.weight_kg) lines.push(`• Poids : ${answers.weight_kg} kg`);
  if (answers.height_cm) lines.push(`• Taille : ${answers.height_cm} cm`);
  const morphology = computeMorphology(answers);
  if (morphology) lines.push(`• IMC : ${morphology.imc} — Morphotype : ${morphology.morphotype}`);
  if (answers.age) lines.push(`• Âge : ${answers.age} ans`);
  if (answers.gender) lines.push(`• Genre : ${answers.gender}`);
  if (answers.activity_level) lines.push(`• Activité quotidienne : ${answers.activity_level}`);

  lines.push("\n━━ ADAPTATIONS NON-NÉGOCIABLES POUR CE PROFIL ━━");

  if (morphology) {
    lines.push(`💪 Repos : ${morphology.restNote}`);
    lines.push(`🔥 Cardio : ${morphology.cardioNote}`);
    if (morphology.forbidden.length) lines.push(`🚫 Exercices INTERDITS pour ce profil : ${morphology.forbidden.join(", ")}`);
    if (morphology.mandatory.length) lines.push(`✅ Exercices OBLIGATOIRES pour ce profil : ${morphology.mandatory.join(", ")}`);
    lines.push(`🗣️ Conseil coach à reprendre dans le résumé : "${morphology.coachAdvice}"`);
  }

  // Âge
  if (answers.age >= 55) lines.push("⚠️ 55+ ans : réduis le volume de 20%, augmente les temps de repos, priorise la mobilité, évite les exercices à fort impact articulaire");
  else if (answers.age >= 45) lines.push("⚠️ 45+ ans : augmente les temps de repos de 30%, inclus obligatoirement des exercices de mobilité");
  else if (answers.age && answers.age < 20) lines.push("⚠️ Moins de 20 ans : évite les charges maximales, priorise la technique avant tout");

  // Activité quotidienne
  if (answers.activity_level?.includes("sédentaire")) lines.push("🪑 Sédentaire : réduis le volume total de 15%, récupération plus lente");
  if (answers.activity_level?.includes("très actif")) lines.push("🏃 Très actif : peut gérer +10% de volume, mais attention à la fatigue cumulée");

  // Genre + objectif
  if (answers.gender === "femme" && !answers.objectif?.includes("force")) {
    lines.push("♀ Femme : priorise fessiers/cuisses/dos (Hip thrust barre obligatoire), réduis le volume des épaules/triceps");
  }

  // Taille
  if (answers.height_cm >= 185) lines.push("📏 Grande taille : préfère deadlift sumo, squat avec stance large, évite les exercices en position basse prolongée");
  else if (answers.height_cm && answers.height_cm < 165 && answers.weight_kg && answers.weight_kg < 60) {
    lines.push("📏 Ossature fine : charges plus légères au départ, met l'accent sur le travail en isolation");
  }

  // Charges de départ si poids connu
  if (answers.weight_kg && answers.niveau) {
    const w = answers.weight_kg;
    const mult = answers.niveau === "debutant" ? 0.4 : answers.niveau === "intermediaire" ? 0.65 : 0.9;
    lines.push(`💪 Charge de départ estimée pour les grands mouvements (squat/press) : environ ${Math.round(w * mult)} kg (${Math.round(mult * 100)}% du poids de corps)`);
  }

  return lines.join("\n");
}

// Corrige apres-coup les incoherences que l'IA pourrait laisser passer malgre
// les instructions du prompt (module B.5) : remplace les exercices interdits
// pour ce profil par une alternative sure.
const FORBIDDEN_REPLACEMENTS = {
  "squat barre": "Presse à cuisses",
  "dips": "Pushdown poulie haute corde",
  "tractions": "Tirage vertical prise large",
};
function applyMorphologySubstitutions(program, morphology) {
  if (morphology?.morphotype !== "Endomorphe marqué" || !program?.days) return program;

  program.days.forEach(day => {
    (day.exercises || []).forEach(ex => {
      const nameLower = (ex.name || "").toLowerCase();
      const replacementKey = Object.keys(FORBIDDEN_REPLACEMENTS).find(k => nameLower.includes(k));
      if (replacementKey) {
        ex.name = FORBIDDEN_REPLACEMENTS[replacementKey];
        ex.notes = `${ex.notes ? ex.notes + " " : ""}(Exercice adapté à ton profil morphologique.)`;
      }
    });
  });
  return program;
}

// Anti-corruption (incident du 2026-07-11 : une modif chat "ajoute des
// étirements" a remplacé les objets exercice par de simples chaînes de texte
// template, silencieusement acceptées et sauvegardées). Rejette tout
// programme structurellement invalide (leve une exception, ne renvoie
// jamais un programme partiellement corrompu) et complete les champs
// optionnels manquants avec des valeurs par defaut sures. A appeler sur
// TOUT programme avant qu'il ne soit ecrit en base, que ce soit a la
// generation initiale ou lors d'une modification via le chat.
function validateProgram(program) {
  if (!program || !Array.isArray(program.days) || program.days.length === 0) {
    throw new Error("Programme invalide : pas de jours");
  }
  for (const day of program.days) {
    if (!day.day || !Array.isArray(day.exercises) || day.exercises.length === 0) {
      throw new Error("Programme invalide : jour incomplet");
    }
    for (const ex of day.exercises) {
      if (!ex || typeof ex !== "object" || Array.isArray(ex) || !ex.name) {
        throw new Error("Programme invalide : exercice sans nom");
      }
      if (!ex.sets || ex.sets < 1) ex.sets = 3; // valeur par défaut
      if (!ex.reps) ex.reps = "10-12"; // valeur par défaut
      if (!ex.rest_seconds) ex.rest_seconds = 60;
      if (!ex.muscle_group) ex.muscle_group = "Autre";
    }
  }
  return program; // retourne le programme corrigé
}

// Objectif personnel libre, date cible et note de l'utilisateur (depuis son profil)
function buildGoalContext(answers) {
  if (!answers.main_goal && !answers.goal_date && !answers.personal_note) return "";

  const lines = ["\n━━ OBJECTIF PERSONNEL DE L'UTILISATEUR ━━"];
  if (answers.main_goal) lines.push(`• Objectif principal : ${answers.main_goal}`);
  if (answers.goal_date) {
    const days = Math.ceil((new Date(answers.goal_date) - new Date()) / 86400000);
    lines.push(`• Date cible : ${answers.goal_date}${days > 0 ? ` (dans ${days} jours)` : ""}`);
  }
  if (answers.personal_note) lines.push(`• Note personnelle de l'utilisateur : ${answers.personal_note}`);
  lines.push("Prends cet objectif et cette note en compte pour orienter le choix des exercices, l'intensité et le ton du résumé du programme.");
  return lines.join("\n");
}

// previousPrograms : jusqu'à 3 programmes precedents de l'utilisateur
// ([{ title, exercises: [...noms] }]) pour eviter de reproduire le meme
// programme (module C — anti-duplication).
async function generateProgram(answers, previousPrograms = []) {
  if (!process.env.GROQ_API_KEY)
    throw new Error("GROQ_API_KEY manquante.");

  const rules = PROGRAM_RULES[answers.objectif]?.[answers.niveau] || {};
  const specifics = OBJECTIVE_SPECIFICS[answers.objectif] || [];
  const morphology = computeMorphology(answers);
  const physicalContext = buildPhysicalContext(answers);
  const goalContext = buildGoalContext(answers);
  const weekdays = suggestWeekdays(answers.joursParSemaine);

  let antiDuplicationBlock = "";
  if (previousPrograms.length) {
    const usedExercises = [...new Set(previousPrograms.flatMap(p => p.exercises || []))];
    antiDuplicationBlock = `\n━━ PROGRAMMES PRÉCÉDENTS À NE PAS REPRODUIRE ━━
Exercices déjà utilisés récemment : ${usedExercises.join(", ")}
Varie au minimum 40% des exercices par rapport à ces programmes précédents. Si l'objectif est le
même, choisis des exercices différents ET un ordre différent.
Variation #${Math.floor(Math.random() * 100) + 1} : privilégie les exercices ${["haltères", "barre", "machine", "câble"][Math.floor(Math.random() * 4)]} cette fois quand plusieurs options équivalentes existent.`;
  }

  const periodizationBlock = answers.periodization ? `
━━ PÉRIODISATION 12 SEMAINES (option activée, fonctionnalité PREMIUM) ━━
Le programme doit couvrir un cycle complet de 12 semaines en 4 phases. Génère la structure "days"
habituelle (les mêmes exercices/jours valables sur tout le cycle), ET ajoute un champ
"periodization" au JSON avec EXACTEMENT 4 phases dans cet ordre :
1. Accumulation (semaines 1-4) : volume élevé, intensité 65-75% RM
2. Intensification (semaines 5-8) : volume modéré, intensité 75-85% RM
3. Pic (semaines 9-11) : volume réduit, intensité 85-95% RM
4. Décharge (semaine 12) : volume -50%, charges -20%
Chaque phase de "periodization" a : "name" (ex "Accumulation"), "weeks" (ex "1-4"),
"volumeNote" (description courte), "intensityNote" (description courte),
"setsMultiplier" (nombre, ex 1.0 / 0.9 / 0.75 / 0.5), "weightMultiplier" (nombre, ex 1.0 / 1.1 / 1.2 / 0.8).
` : "";

  const userPrompt = `${physicalContext}${goalContext}${antiDuplicationBlock}${periodizationBlock}

━━ QUESTIONNAIRE ━━
• Objectif : ${answers.objectif}
• Niveau : ${answers.niveau}
• Jours/semaine : ${answers.joursParSemaine}
• Durée max/séance : ${answers.dureeSeance}
• Matériel : ${answers.materiel}
• Blessures/limitations : ${answers.limitations || "aucune"}
${answers.feedback ? `• Retours sur l'ancien programme : ${answers.feedback}` : ""}

━━ RÈGLES OBLIGATOIRES (${answers.objectif} / ${answers.niveau}) ━━
• Séries : ${rules.sets || "adapter"}
• Répétitions : ${rules.reps || "adapter"}
• Repos : ${rules.rest || "adapter"}
• Intensité : ${rules.intensity || "adapter"}
• Progression : ${rules.progression || "adapter"}
${specifics.map(s => `• ${s}`).join("\n")}

━━ JOURS À UTILISER (obligatoire, dans cet ordre exact) ━━
${weekdays.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Génère maintenant le programme JSON adapté à CE profil spécifique.`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(),
      temperature: 0.5,
      max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROGRAM_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text().catch(() => "");
    throw new Error(`Erreur API Groq (${response.status}) : ${t}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Réponse vide de l'API Groq.");

  let program;
  try { program = JSON.parse(raw); }
  catch { throw new Error("JSON invalide, réessaie."); }
  if (!program.days?.length) throw new Error("Programme incomplet, réessaie.");

  validateProgram(program);
  return applyMorphologySubstitutions(program, morphology);
}

// ── Chat coach ─────────────────────────────────────────────
const CHAT_SYSTEM = `Tu es Alex, coach sportif avec 15 ans d'expérience en salle, spécialisé en
musculation et nutrition. Tu discutes avec un(e) élève que tu suis personnellement : tu connais
son programme, son historique de séances, ses records et sa forme du jour (contexte ci-dessous).
Parle-lui comme un vrai coach le ferait à la salle — jamais comme un assistant ou une IA (ne dis
jamais "je suis une IA", "en tant que modèle", etc.).

Style de réponse :
- Question simple (technique, motivation, quoi faire aujourd'hui) → 2-3 phrases, direct.
- Question complexe (plateau, programme, blessure, nutrition détaillée) → réponse structurée
  (courts paragraphes ou liste), mais jamais un pavé : 150 mots maximum, sauf si l'élève demande
  explicitement une explication détaillée.
- Explique toujours le POURQUOI, pas juste le quoi (ex: pas "fais 8-10 reps" mais "8-10 reps pour
  rester dans la zone hypertrophie sans griller ton système nerveux").
- Utilise des chiffres précis et des exemples concrets tirés du contexte réel de l'élève
  (ex: "tu es à 80kg au développé couché depuis 4 séances, c'est un plateau classique — on va
  passer à un cycle ondulé : 3 séries lourdes à 82.5kg puis une séance légère à 70kg pour 12 reps").
- Termine quasiment toujours par un conseil actionnable concret ou une question de suivi
  ("essaie ça à ta prochaine séance et dis-moi comment ça se passe" / "tu dors combien en ce
  moment ?").
- Ne jamais inventer de données médicales. Pour une douleur qui persiste ou s'aggrave, oriente
  vers un médecin ou kiné — sans être alarmiste pour une simple courbature.`;

// Module D.1 — mots-cles qui declenchent le mode modification du programme
const MODIFY_TRIGGER_WORDS = [
  "refaire", "changer", "pas bien", "nul", "trop facile", "trop dur", "je n'aime pas",
  "remplace", "sans les", "ajoute", "enlève", "enleve", "modifier", "pas fan de", "douleur",
  "je préfère", "je prefere", "peux-tu changer", "nouveau programme",
];
function detectsModifyIntent(text) {
  const lower = (text || "").toLowerCase();
  return MODIFY_TRIGGER_WORDS.some(w => lower.includes(w));
}

const MODIFY_SYSTEM = `Tu es un coach sportif expert qui peut MODIFIER le programme d'entrainement
de l'utilisateur directement dans la conversation, en te basant sur sa demande et sur tout le
contexte fourni (programme actuel, historique, records, profil, plateaux).

Règles de modification :
- Ne change QUE ce qui est nécessaire pour répondre à la demande (garde le reste du programme identique)
- Respecte les mêmes règles de construction qu'à la génération initiale (ordre composés→isolation,
  repos adaptés, pas de superset sur composé lourd, notes techniques précises)
- Si la demande mentionne une douleur/blessure, retire ou remplace l'exercice concerné par une
  alternative plus sûre pour la même zone musculaire

Réponds UNIQUEMENT avec un JSON valide, sans texte ni markdown :
{
  "reply": "Réponse courte et naturelle expliquant ce que tu as changé et pourquoi",
  "programUpdated": true,
  "newProgram": { "title": "...", "summary": "...", "days": [ ... même structure que le programme actuel ... ], "advice": [...] },
  "changes": ["Description courte du changement 1", "Description courte du changement 2"]
}
Si finalement aucune modification n'est nécessaire (simple question, pas de demande de changement
réelle), réponds avec programUpdated: false, newProgram: null, changes: [] et ta réponse normale
dans "reply".`;

// Construit le bloc de contexte riche injecte dans le chat (module D.4) :
// programme complet, historique recent, records, profil, streak, plateaux, objectif.
function buildChatContext(ctx = {}) {
  const { program, recentSessions, topRecords, physicalProfile, streak, plateaus, initialGoal, wellnessScore } = ctx;
  const lines = [];

  if (program) {
    lines.push(`\n[PROGRAMME ACTUEL]\nTitre: ${program.title}\nSommaire: ${program.summary}`);
    lines.push((program.days || []).map(d =>
      `${d.day} (${d.focus}): ${(d.exercises || []).map(e => `${e.name} ${e.sets}x${e.reps}`).join(", ")}`
    ).join(" | "));
  }
  if (recentSessions?.length) {
    lines.push(`\n[5 DERNIÈRES SÉANCES]`);
    lines.push(recentSessions.map(s => `${s.day} : ${s.exercises.map(e => `${e.name} ${e.weight}kg×${e.reps}`).join(", ")}`).join(" | "));
  }
  if (topRecords?.length) {
    lines.push(`\n[RECORDS PERSONNELS]`);
    lines.push(topRecords.map(r => `${r.exercise_name} ${r.max_weight}kg`).join(", "));
  }
  if (physicalProfile) {
    const { weight_kg, height_cm, age, gender } = physicalProfile;
    lines.push(`\n[PROFIL] Poids: ${weight_kg || "?"}kg, Taille: ${height_cm || "?"}cm, Âge: ${age || "?"}, Genre: ${gender || "?"}`);
  }
  if (streak !== undefined) lines.push(`\n[STREAK] ${streak} jour(s) consécutifs`);
  if (plateaus?.length) {
    lines.push(`\n[PLATEAUX DÉTECTÉS] ${plateaus.map(p => `${p.exercise_name} bloqué à ${p.max_weight}kg depuis ${p.sessions_stuck} séances`).join(", ")}`);
  }
  if (initialGoal) lines.push(`\n[OBJECTIF INITIAL] ${initialGoal}`);
  if (wellnessScore != null) lines.push(`\n[SCORE DE FORME DU JOUR] ${wellnessScore}/100`);

  return lines.join("\n");
}

// ctx : { program, recentSessions, topRecords, physicalProfile, streak, plateaus, initialGoal }
// Retourne toujours { reply, programUpdated, newProgram, changes }.
async function chatWithCoach(history, ctx = {}) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante.");

  const contextBlock = buildChatContext(ctx);
  const lastUserMsg = [...history].reverse().find(m => m.role === "user")?.content || "";
  const wantsModification = ctx.program && detectsModifyIntent(lastUserMsg);

  if (!wantsModification) {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: MODEL(), temperature: 0.7, max_tokens: 600,
        messages: [
          { role: "system", content: CHAT_SYSTEM + contextBlock },
          ...history.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!response.ok) throw new Error(`Erreur Groq chat (${response.status})`);
    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Je n'arrive pas à répondre, réessaie.";
    return { reply, programUpdated: false, newProgram: null, changes: [] };
  }

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(), temperature: 0.5, max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MODIFY_SYSTEM + contextBlock },
        ...history.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!response.ok) throw new Error(`Erreur Groq chat (${response.status})`);
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(raw);
    return {
      reply: parsed.reply || "J'ai mis à jour ton programme.",
      programUpdated: !!parsed.programUpdated && !!parsed.newProgram?.days?.length,
      newProgram: parsed.newProgram || null,
      changes: parsed.changes || [],
    };
  } catch {
    return { reply: raw || "Je n'arrive pas à répondre, réessaie.", programUpdated: false, newProgram: null, changes: [] };
  }
}

// ── Debrief post-séance ────────────────────────────────────
const DEBRIEF_SYSTEM = `Tu es un coach sportif expert qui analyse les séances de musculation.
Tu donnes un retour précis, bienveillant et actionnable en français.
Structure ta réponse EXACTEMENT ainsi (4 sections, pas plus) :
✅ CE QUI ÉTAIT BIEN : (1-2 points positifs concrets)
📈 CE QUI PEUT S'AMÉLIORER : (1-2 points d'amélioration concrets)
💡 CONSEIL POUR LA PROCHAINE FOIS : (1 conseil précis et applicable)
🔋 RÉCUPÉRATION : (1 conseil sur le sommeil, la nutrition ou les étirements)
Sois direct, précis, encourage sans sur-féliciter. Max 150 mots au total.`;

async function debriefSession({ exercises, totalVolume, durationMins, prs, programFocus }) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante.");

  const exLines = exercises.map(e => {
    const prev = e.previousWeight !== null ? `(précédent : ${e.previousWeight}kg)` : "(première fois)";
    const trend = e.previousWeight === null ? "🌟 nouveau"
      : e.weight > e.previousWeight ? `▲ +${e.weight - e.previousWeight}kg`
      : e.weight < e.previousWeight ? `▼ -${e.previousWeight - e.weight}kg`
      : "= stable";
    return `• ${e.name} : ${e.weight}kg × ${e.reps} reps ${prev} → ${trend}`;
  }).join("\n");

  const userPrompt = `Voici les données de la séance :
Durée : ${durationMins} min
Volume total : ${Math.round(totalVolume)} kg
Records battus : ${prs}
Focus du programme : ${programFocus || "non précisé"}

Exercices effectués :
${exLines}

Fais le debrief de cette séance.`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(), temperature: 0.6, max_tokens: 400,
      messages: [
        { role: "system", content: DEBRIEF_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Erreur Groq debrief (${response.status})`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Impossible de générer le debrief.";
}

// ── Conseil du jour (page d'accueil) ───────────────────────
const DAILY_TIP_SYSTEM = `Tu es un coach sportif motivant. Genere UNE SEULE phrase courte
(20 mots max), en francais, motivante et personnalisee a partir des statistiques fournies.
Pas de guillemets, pas d'emoji en debut de phrase, pas de markdown. Juste la phrase.`;

async function dailyTip({ streak, totalSessions, lastSessionDate, imbalanceWarning }) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante.");

  const daysSinceLast = lastSessionDate
    ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / 86400000)
    : null;

  const userPrompt = `Statistiques de l'utilisateur :
- Streak actuel : ${streak} jour(s)
- Total séances : ${totalSessions}
- Jours depuis la dernière séance : ${daysSinceLast ?? "aucune séance encore"}
- Déséquilibre musculaire détecté : ${imbalanceWarning || "aucun"}

Genere la phrase du jour adaptee a cette situation (encourage le streak, relance si inactif, ou félicite la régularité).`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(), temperature: 0.8, max_tokens: 60,
      messages: [
        { role: "system", content: DAILY_TIP_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Erreur Groq daily-tip (${response.status})`);
  const data = await response.json();
  return (data.choices?.[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "");
}

// ── Analyse de plateau ──────────────────────────────────────
const PLATEAU_SYSTEM = `Tu es un coach sportif expert en periodisation et progression de charges.
L'utilisateur stagne sur un ou plusieurs exercices (poids max non batu depuis 3 seances ou plus).
Donne des conseils CONCRETS et VARIES pour sortir du plateau, parmi ces leviers :
- Variation de tempo (ex: 3-1-1, pause en bas, excentrique lent)
- Exercice alternatif ciblant les memes muscles
- Technique de surcharge (drop set, rest-pause, cluster set, myo-reps)
- Decharge (deload) : reduire le volume/l'intensite une semaine pour mieux repartir
Reponds en francais, de maniere concise et actionnable (4-6 phrases max), sans markdown.`;

async function analyzePlateau(plateaus) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante.");

  const list = plateaus.map(p =>
    `- ${p.exercise_name} : bloqué à ${p.max_weight}kg depuis ${p.sessions_stuck} séances (dernière : ${p.last_weight}kg)`
  ).join("\n");

  const userPrompt = `Exercices en plateau :\n${list}\n\nDonne des conseils pour sortir de ces plateaux.`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(), temperature: 0.6, max_tokens: 350,
      messages: [
        { role: "system", content: PLATEAU_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Erreur Groq plateau (${response.status})`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Impossible de générer des conseils pour le moment.";
}

// ── Analyse de fatigue (fonctionnalité 3.3) ─────────────────
const FATIGUE_SYSTEM = `Tu es un coach sportif expert en gestion de la charge d'entrainement et de la recuperation.
Les donnees montrent des signes de fatigue accumulee chez l'utilisateur (volume en baisse et/ou seances sautees
sur les 2 dernieres semaines). Explique brievement pourquoi ca peut arriver et recommande concretement une
semaine de decharge (deload) : reduire le volume d'environ 40-50% et/ou l'intensite de 10-20%, en gardant la
frequence d'entrainement si possible. Sois rassurant, ce n'est pas un echec mais une strategie normale de
progression. Reponds en francais, de maniere concise et actionnable (4-6 phrases max), sans markdown.`;

async function analyzeFatigue(stats) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante.");

  const userPrompt = `Volume semaine precedente : ${Math.round(stats.previousWeekVolume)}kg sur ${stats.previousWeekSessions} seance(s).
Volume cette semaine : ${Math.round(stats.currentWeekVolume)}kg sur ${stats.currentWeekSessions} seance(s).
Variation de volume : ${stats.volumeChangePct}%.
Genere une recommandation de decharge adaptee a cette situation.`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(), temperature: 0.6, max_tokens: 300,
      messages: [
        { role: "system", content: FATIGUE_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Erreur Groq fatigue (${response.status})`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Une semaine plus légère (moins de volume, même fréquence) pourrait t'aider à mieux récupérer.";
}

// ── Questionnaire conversationnel (module E) ────────────────
const VALID_OBJECTIFS = Object.keys(PROGRAM_RULES);
const VALID_NIVEAUX = ["debutant", "intermediaire", "avance"];
const VALID_MATERIEL = [
  "salle de sport complete avec machines et poids libres",
  "haltères et banc seulement",
  "poids du corps uniquement, pas de materiel",
];
const VALID_DUREES = ["30 minutes", "45 minutes", "1 heure", "1h30 ou plus"];

const EXTRACT_PARAMS_SYSTEM = `Tu analyses une conversation entre un coach IA et un utilisateur qui
répond librement à des questions sur son entraînement. Extrait les informations suivantes,
en choisissant OBLIGATOIREMENT une valeur parmi les options listées (jamais une valeur inventée) :

objectif — une valeur EXACTE parmi : ${VALID_OBJECTIFS.map(o => `"${o}"`).join(", ")}
niveau — une valeur EXACTE parmi : ${VALID_NIVEAUX.map(o => `"${o}"`).join(", ")}
  (débutant si <6 mois d'expérience, intermédiaire si 6 mois-2 ans, avancé si 2+ ans)
joursParSemaine — un nombre entre 2 et 6 (string)
dureeSeance — une valeur EXACTE parmi : ${VALID_DUREES.map(o => `"${o}"`).join(", ")}
materiel — une valeur EXACTE parmi : ${VALID_MATERIEL.map(o => `"${o}"`).join(", ")}
limitations — résumé court des blessures/limitations mentionnées, ou "" si aucune

Réponds UNIQUEMENT avec un JSON valide :
{
  "objectif": "...", "niveau": "...", "joursParSemaine": "...", "dureeSeance": "...",
  "materiel": "...", "limitations": "...",
  "understood": "1-2 phrases résumant ce que tu as compris du profil de l'utilisateur, à lui montrer avant de générer son programme"
}`;

function clampToOptions(value, options, fallback) {
  return options.includes(value) ? value : fallback;
}

async function extractProgramParams(conversation) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante.");
  if (!Array.isArray(conversation) || !conversation.length) throw new Error("Conversation vide.");

  const transcript = conversation.map(m => `${m.role === "user" ? "Utilisateur" : "Coach"} : ${m.content}`).join("\n");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(), temperature: 0.3, max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PARAMS_SYSTEM },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Erreur Groq extraction (${response.status})`);
  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Réponse vide de l'API Groq.");

  let extracted;
  try { extracted = JSON.parse(raw); }
  catch { throw new Error("Impossible d'analyser la conversation, réessaie."); }

  const joursNum = Math.min(6, Math.max(2, parseInt(extracted.joursParSemaine, 10) || 3));

  return {
    objectif: clampToOptions(extracted.objectif, VALID_OBJECTIFS, VALID_OBJECTIFS[0]),
    niveau: clampToOptions(extracted.niveau, VALID_NIVEAUX, "debutant"),
    joursParSemaine: String(joursNum),
    dureeSeance: clampToOptions(extracted.dureeSeance, VALID_DUREES, "45 minutes"),
    materiel: clampToOptions(extracted.materiel, VALID_MATERIEL, VALID_MATERIEL[0]),
    limitations: extracted.limitations || "",
    understood: extracted.understood || "J'ai bien pris en compte tes réponses pour construire ton programme.",
  };
}

// ── Plan nutritionnel 7 jours (fonctionnalité 4, PREMIUM) ──
const NUTRITION_SYSTEM = `Tu es un coach en nutrition sportive. Tu génères des plans alimentaires
simples et réalistes (pas de recettes compliquées, des aliments courants et faciles à trouver),
adaptés à l'objectif et aux besoins caloriques/macros fournis. Réponds en français, uniquement
avec un JSON valide de cette forme exacte :
{
  "days": [
    {
      "day": "Lundi",
      "meals": [
        { "name": "Petit-déjeuner", "description": "Flocons d'avoine 80g + whey 30g + banane", "calories": 650, "proteins": 40, "carbs": 90, "fats": 12 },
        { "name": "Déjeuner", "description": "...", "calories": 0, "proteins": 0, "carbs": 0, "fats": 0 },
        { "name": "Dîner", "description": "...", "calories": 0, "proteins": 0, "carbs": 0, "fats": 0 },
        { "name": "Collation", "description": "...", "calories": 0, "proteins": 0, "carbs": 0, "fats": 0 }
      ]
    }
  ]
}
Génère EXACTEMENT 7 jours (Lundi à Dimanche), chacun avec 3 repas principaux + 1 à 2 collations.
La somme des calories/macros des repas d'un jour doit être proche (±5%) des objectifs journaliers
fournis. Varie les aliments d'un jour à l'autre pour éviter la monotonie, tout en restant simple.`;

async function generateNutritionPlan(profile, goals) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante.");
  if (!goals) throw new Error("Objectifs nutritionnels manquants.");

  const userPrompt = `━━ PROFIL ━━
• Poids : ${profile.weight_kg || "?"} kg
• Objectif : ${goals.goalLabel}

━━ OBJECTIFS JOURNALIERS ━━
• Calories : ${goals.calories} kcal
• Protéines : ${goals.proteins} g
• Glucides : ${goals.carbs} g
• Lipides : ${goals.fats} g

Génère maintenant le plan alimentaire JSON sur 7 jours adapté à ces objectifs.`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(),
      temperature: 0.6,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: NUTRITION_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const t = await response.text().catch(() => "");
    throw new Error(`Erreur API Groq (${response.status}) : ${t}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Réponse vide de l'API Groq.");

  let plan;
  try { plan = JSON.parse(raw); }
  catch { throw new Error("JSON invalide, réessaie."); }
  if (!plan.days?.length) throw new Error("Plan incomplet, réessaie.");

  return plan;
}

module.exports = { generateProgram, chatWithCoach, debriefSession, dailyTip, analyzePlateau, analyzeFatigue, extractProgramParams, generateNutritionPlan, validateProgram, EXERCISE_DATABASE };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// ── Règles précises par objectif et niveau ────────────────
const PROGRAM_RULES = {
  "prise de masse / hypertrophie": {
    debutant:       { sets:"3-4", reps:"8-12", rest:"60-90s", intensity:"60-70% RM", progression:"ajouter 2.5kg tous les 2 entraînements" },
    intermediaire:  { sets:"4-5", reps:"6-12", rest:"60-90s", intensity:"70-80% RM", progression:"periodisation ondulatoire (semaine lourde/légère)" },
    avance:         { sets:"4-6", reps:"6-15", rest:"60-90s", intensity:"70-85% RM", progression:"techniques avancées: drop sets, supersets, rest-pause" },
  },
  "perte de poids / seche": {
    debutant:       { sets:"3", reps:"12-15", rest:"30-45s", intensity:"50-60% RM", progression:"augmenter le volume avant la charge" },
    intermediaire:  { sets:"3-4", reps:"12-20", rest:"30-45s", intensity:"55-65% RM", progression:"circuits et supersets pour maintenir le cardio" },
    avance:         { sets:"4-5", reps:"15-20", rest:"20-30s", intensity:"55-70% RM", progression:"HIIT intégré, trisets, densité maximale" },
  },
  "force pure": {
    debutant:       { sets:"3", reps:"5", rest:"3-4min", intensity:"75-85% RM", progression:"ajouter 2.5-5kg par séance (débutant novice)" },
    intermediaire:  { sets:"4-5", reps:"3-5", rest:"3-5min", intensity:"80-90% RM", progression:"progression sur 3 semaines + 1 semaine de décharge" },
    avance:         { sets:"5-6", reps:"1-5", rest:"4-6min", intensity:"85-97.5% RM", progression:"périodisation linéaire / conjuguée avancée" },
  },
  "remise en forme generale / endurance": {
    debutant:       { sets:"2-3", reps:"12-15", rest:"45-60s", intensity:"45-55% RM", progression:"consolider la technique avant d'ajouter charge" },
    intermediaire:  { sets:"3", reps:"12-15", rest:"45s", intensity:"55-65% RM", progression:"ajouter complexité (unilatéral, instable)" },
    avance:         { sets:"3-4", reps:"15-20", rest:"30-45s", intensity:"60-70% RM", progression:"augmenter la densité et varier les modalités" },
  },
};

// ── Génération de programme ───────────────────────────────
const PROGRAM_SYSTEM = `Tu es un préparateur physique certifié, spécialiste en programmation sportive.
Tu crées des programmes de musculation RÉELLEMENT DIFFÉRENCIÉS selon l'objectif et le niveau,
en appliquant strictement les règles de la science de l'entraînement.

RÈGLE ABSOLUE : Le programme doit être concrètement différent selon l'objectif ET le niveau.
Ne jamais générer deux programmes similaires pour des objectifs différents.

STRUCTURE DES EXERCICES :
- Toujours indiquer le groupe musculaire (muscle_group) pour chaque exercice
- Utiliser les noms précis des machines ou mouvements
- Les séries/reps/repos doivent correspondre EXACTEMENT aux règles de l'objectif
- Adapter à la blessure/limitation si mentionnée

Réponds UNIQUEMENT avec un JSON valide sans texte avant/après ni balises markdown :
{
  "title": "Nom court et percutant",
  "summary": "2-3 phrases sur la logique du programme",
  "days": [
    {
      "day": "Jour 1",
      "focus": "Groupe musculaire / type de séance",
      "exercises": [
        {
          "name": "Nom précis",
          "muscle_group": "Poitrine / Dos / Épaules / Biceps / Triceps / Jambes / Abdos / Full body",
          "sets": 4,
          "reps": "8-12",
          "rest_seconds": 90,
          "notes": "Conseil technique court"
        }
      ]
    }
  ],
  "advice": ["Conseil 1", "Conseil 2", "Conseil 3"]
}`;

async function generateProgram(answers) {
  if (!process.env.GROQ_API_KEY)
    throw new Error("GROQ_API_KEY manquante — configure-la dans les variables d'environnement.");

  const rules = PROGRAM_RULES[answers.objectif]?.[answers.niveau] || {};
  const profile = answers.weight_kg
    ? `\nPROFIL PHYSIQUE : ${answers.weight_kg}kg, ${answers.height_cm}cm, ${answers.age} ans, ${answers.gender || "non précisé"}, activité quotidienne : ${answers.activity_level || "non précisé"}.`
    : "";

  const userPrompt = `${profile}
RÉPONSES DU QUESTIONNAIRE :
- Objectif : ${answers.objectif}
- Niveau : ${answers.niveau}
- Jours/semaine : ${answers.joursParSemaine}
- Durée max/séance : ${answers.dureeSeance}
- Matériel : ${answers.materiel}
- Blessures/limitations : ${answers.limitations || "aucune"}
${answers.feedback ? `- Retours sur l'ancien programme : ${answers.feedback}` : ""}

RÈGLES À APPLIQUER OBLIGATOIREMENT POUR CET OBJECTIF (${answers.objectif}) NIVEAU (${answers.niveau}) :
- Séries : ${rules.sets || "adapter"}
- Répétitions : ${rules.reps || "adapter"}
- Repos : ${rules.rest || "adapter"}
- Intensité : ${rules.intensity || "adapter"}
- Progression : ${rules.progression || "adapter"}

Génère le programme JSON maintenant.`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(),
      temperature: 0.55,
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
  catch { throw new Error("L'IA n'a pas renvoyé un JSON valide, réessaie."); }
  if (!program.days?.length) throw new Error("Programme incomplet, réessaie.");

  return program;
}

// ── Chat coach IA ─────────────────────────────────────────
const CHAT_SYSTEM = `Tu es un coach sportif bienveillant, précis et expert en musculation.
Tu connais le programme de l'utilisateur (fourni dans le contexte).
Tu réponds en français, de manière concise et utile (3-5 phrases max sauf si question complexe).
Si l'utilisateur se plaint d'un exercice ou veut changer son programme, dis-lui clairement
qu'il peut cliquer sur "Regénérer avec mes retours" pour en générer un nouveau adapté.
Ne jamais inventer des chiffres médicaux précis. Toujours conseiller un médecin pour les douleurs.`;

async function chatWithCoach(history, program) {
  if (!process.env.GROQ_API_KEY)
    throw new Error("GROQ_API_KEY manquante.");

  const programContext = program
    ? `\n\n[PROGRAMME ACTUEL DE L'UTILISATEUR]\nTitre: ${program.title}\nSommaire: ${program.summary}\nJours: ${(program.days||[]).map(d => `${d.day} (${d.focus}): ${(d.exercises||[]).map(e=>e.name).join(", ")}`).join(" | ")}`
    : "";

  const messages = [
    { role: "system", content: CHAT_SYSTEM + programContext },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: MODEL(), temperature: 0.7, max_tokens: 600, messages }),
  });

  if (!response.ok) throw new Error(`Erreur Groq chat (${response.status})`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Je n'ai pas pu répondre, réessaie.";
}

const DEBRIEF_SYSTEM = `Tu es un coach sportif expert qui analyse les séances de musculation.
Tu reçois les données d'une séance (exercices, poids, reps, comparaison avec avant).
Tu donnes un debriefing précis, bienveillant et constructif en français.

Structure ta réponse EXACTEMENT comme ça (utilise ces titres avec les emojis) :

✅ **Ce qui était bien**
(2-3 points positifs concrets basés sur les données)

⚠️ **Points à améliorer**
(1-2 points constructifs, jamais négatifs, toujours avec une solution)

💡 **Conseil pour la prochaine séance**
(1 conseil précis et actionnable)

🔄 **Récupération**
(1 conseil nutrition/sommeil/étirements adapté à la séance)

Sois direct, précis, encourage sans mentir. Si c'est une première séance, adapte ton analyse.
Maximum 200 mots au total.`;

async function debriefSession(sessionData) {
  if (!process.env.GROQ_API_KEY)
    throw new Error("GROQ_API_KEY manquante.");

  const { exercises, totalVolume, durationMins, prs, programFocus } = sessionData;

  const exerciseDetails = exercises.map(ex => {
    const delta = ex.previousWeight !== null
      ? `(${ex.weight > ex.previousWeight ? `+${ex.weight - ex.previousWeight}kg 🏆 PR` : ex.weight < ex.previousWeight ? `-${ex.previousWeight - ex.weight}kg` : `=même poids`})`
      : "(première fois)";
    return `- ${ex.name}: ${ex.weight}kg × ${ex.reps} reps ${delta}`;
  }).join("\n");

  const userPrompt = `Analyse cette séance et donne un debriefing :

SÉANCE : ${programFocus || "Entraînement"}
DURÉE : ${durationMins} minutes
VOLUME TOTAL : ${Math.round(totalVolume)} kg
RECORDS BATTUS : ${prs}

EXERCICES RÉALISÉS :
${exerciseDetails}

Donne ton analyse de coach maintenant.`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(),
      temperature: 0.65,
      max_tokens: 500,
      messages: [
        { role: "system", content: DEBRIEF_SYSTEM },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Erreur Groq debrief (${response.status})`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Je n'ai pas pu analyser ta séance.";
}

module.exports = { generateProgram, chatWithCoach, debriefSession };

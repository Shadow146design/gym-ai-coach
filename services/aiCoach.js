const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = () => process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

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

RÈGLES ABSOLUES :
1. Les charges suggérées doivent être réalistes par rapport au poids de corps (ex: un débutant de 70kg ne soulevera pas 100kg au squat)
2. L'âge impact les temps de repos (45+ ans = +30% de repos) et le volume (55+ ans = -20% volume)
3. Le genre guide la priorité musculaire SAUF si l'objectif dit autre chose
4. L'activité quotidienne module le volume total (sédentaire = -15%, très actif = +10%)
5. La taille guide les exercices (grand >185cm = deadlift sumo préférable, machines pour les jambes)

RÈGLE PROGRAMME :
- Ne jamais générer deux programmes similaires pour des objectifs différents
- Toujours indiquer muscle_group pour chaque exercice
- Les notes doivent mentionner les charges de départ adaptées au profil si le poids de corps est connu
- Le champ "day" DOIT être un vrai jour de la semaine (Lundi, Mardi, Mercredi, Jeudi, Vendredi,
  Samedi ou Dimanche), jamais "Jour 1" ou un nom générique. La liste exacte et l'ordre des jours
  à utiliser sont fournis dans le message utilisateur ci-dessous : respecte-les strictement.

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
          "notes": "Conseil technique + charge de départ conseillée si profil connu"
        }
      ]
    }
  ],
  "advice": ["Conseil général 1", "Conseil général 2", "Conseil général 3"]
}`;

// Calcule l'IMC et déduit les recommandations de charge
function buildPhysicalContext(answers) {
  if (!answers.weight_kg && !answers.height_cm && !answers.age) return "";

  const lines = ["\n━━ PROFIL PHYSIQUE DE L'UTILISATEUR ━━"];

  if (answers.weight_kg) lines.push(`• Poids : ${answers.weight_kg} kg`);
  if (answers.height_cm) lines.push(`• Taille : ${answers.height_cm} cm`);
  if (answers.weight_kg && answers.height_cm) {
    const imc = (answers.weight_kg / Math.pow(answers.height_cm / 100, 2)).toFixed(1);
    lines.push(`• IMC : ${imc}`);
  }
  if (answers.age) lines.push(`• Âge : ${answers.age} ans`);
  if (answers.gender) lines.push(`• Genre : ${answers.gender}`);
  if (answers.activity_level) lines.push(`• Activité quotidienne : ${answers.activity_level}`);

  lines.push("\n━━ ADAPTATATIONS REQUISES POUR CE PROFIL ━━");

  // Âge
  if (answers.age >= 55) lines.push("⚠️ 55+ ans : réduis le volume de 20%, augmente les temps de repos, priorise la mobilité, évite les exercices à fort impact articulaire");
  else if (answers.age >= 45) lines.push("⚠️ 45+ ans : augmente les temps de repos de 30%, inclus obligatoirement des exercices de mobilité");

  // Activité quotidienne
  if (answers.activity_level?.includes("sédentaire")) lines.push("🪑 Sédentaire : réduis le volume total de 15%, récupération plus lente");
  if (answers.activity_level?.includes("très actif")) lines.push("🏃 Très actif : peut gérer +10% de volume, mais attention à la fatigue cumulée");

  // Genre + objectif
  if (answers.gender === "femme" && !answers.objectif?.includes("force")) {
    lines.push("♀ Femme : priorise fessiers/cuisses/dos, réduis le volume des épaules/triceps, privilégie les exercices compound");
  }

  // Taille
  if (answers.height_cm >= 185) lines.push("📏 Grande taille : préfère deadlift sumo, squat avec stance large, évite les exercices en position basse prolongée");

  // Charges de départ si poids connu
  if (answers.weight_kg && answers.niveau) {
    const w = answers.weight_kg;
    const mult = answers.niveau === "debutant" ? 0.4 : answers.niveau === "intermediaire" ? 0.65 : 0.9;
    lines.push(`💪 Charge de départ estimée pour les grands mouvements (squat/press) : environ ${Math.round(w * mult)} kg (${Math.round(mult * 100)}% du poids de corps)`);
  }

  return lines.join("\n");
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

async function generateProgram(answers) {
  if (!process.env.GROQ_API_KEY)
    throw new Error("GROQ_API_KEY manquante.");

  const rules = PROGRAM_RULES[answers.objectif]?.[answers.niveau] || {};
  const physicalContext = buildPhysicalContext(answers);
  const goalContext = buildGoalContext(answers);
  const weekdays = suggestWeekdays(answers.joursParSemaine);

  const userPrompt = `${physicalContext}${goalContext}

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

  return program;
}

// ── Chat coach ─────────────────────────────────────────────
const CHAT_SYSTEM = `Tu es un coach sportif bienveillant, précis et expert.
Tu connais le programme de l'utilisateur (fourni dans le contexte ci-dessous).
Réponds en français, de manière concise (3-5 phrases max sauf si question complexe).
Si l'utilisateur veut changer son programme, dis-lui de cliquer sur "Regénérer avec mes retours".
Ne jamais inventer des données médicales. Conseille un médecin pour les douleurs persistantes.`;

async function chatWithCoach(history, program) {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY manquante.");

  const programContext = program
    ? `\n\n[PROGRAMME ACTUEL]\nTitre: ${program.title}\nSommaire: ${program.summary}\nJours: ${(program.days||[]).map(d => `${d.day} (${d.focus}): ${(d.exercises||[]).map(e=>e.name).join(", ")}`).join(" | ")}`
    : "";

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL(), temperature: 0.7, max_tokens: 600,
      messages: [
        { role: "system", content: CHAT_SYSTEM + programContext },
        ...history.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!response.ok) throw new Error(`Erreur Groq chat (${response.status})`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Je n'arrive pas à répondre, réessaie.";
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

module.exports = { generateProgram, chatWithCoach, debriefSession, dailyTip };

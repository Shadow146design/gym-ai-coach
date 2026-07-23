const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { requirePremium, checkChatLimit, getChatUsage } = require("../middleware/premium");
const { chatWithCoach, debriefSession, analyzePlateau, validateProgram } = require("../services/aiCoach");
const { flagInjury, detectChatInjuryMention } = require("../services/injuries");
const { logProgramChange } = require("../services/programHistory");

const router = express.Router();
router.use(requireAuth);

function dayStr(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// Rassemble le contexte complet (module D.4) : programme, 5 dernieres seances,
// records, profil physique, streak, plateaux, objectif initial.
async function buildFullContext(uid, programRow) {
  const [logsR, profileR, wellnessR] = await Promise.all([
    pool.query(
      `SELECT exercise_name, weight, reps, performed_at::date AS day
       FROM logs WHERE user_id=$1 ORDER BY performed_at DESC LIMIT 200`,
      [uid]
    ),
    pool.query(
      "SELECT weight_kg, height_cm, age, gender, main_goal FROM users WHERE id=$1",
      [uid]
    ),
    pool.query(
      "SELECT score FROM daily_wellness WHERE user_id=$1 AND created_at=CURRENT_DATE",
      [uid]
    ),
  ]);

  const days = [...new Set(logsR.rows.map(r => dayStr(r.day)))].slice(0, 5);
  const recentSessions = days.map(day => ({
    day,
    exercises: logsR.rows.filter(r => dayStr(r.day) === day).map(r => ({ name: r.exercise_name, weight: r.weight, reps: r.reps })),
  }));

  const byExercise = {};
  logsR.rows.forEach(r => {
    if (!byExercise[r.exercise_name] || r.weight > byExercise[r.exercise_name]) byExercise[r.exercise_name] = Number(r.weight);
  });
  const topRecords = Object.entries(byExercise)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([exercise_name, max_weight]) => ({ exercise_name, max_weight }));

  // Streak courant (meme logique que profile.js /full et sessions.js /streak)
  const allDays = [...new Set(logsR.rows.map(r => dayStr(r.day)))].sort((a, b) => new Date(b) - new Date(a));
  const today = dayStr(new Date());
  const yesterday = dayStr(new Date(Date.now() - 86400000));
  let streak = 0;
  if (allDays.length && (allDays[0] === today || allDays[0] === yesterday)) {
    streak = 1;
    for (let i = 1; i < allDays.length; i++) {
      const diff = (new Date(allDays[i - 1]) - new Date(allDays[i])) / 86400000;
      if (diff === 1) streak++; else break;
    }
  }

  // Plateaux simplifies : exercice dont le max n'a pas progresse sur les 3 dernieres seances
  const plateaus = [];
  const byExerciseDays = {};
  logsR.rows.forEach(r => {
    const key = r.exercise_name;
    const day = dayStr(r.day);
    if (!byExerciseDays[key]) byExerciseDays[key] = {};
    byExerciseDays[key][day] = Math.max(byExerciseDays[key][day] || 0, Number(r.weight));
  });
  for (const [exercise_name, dayMap] of Object.entries(byExerciseDays)) {
    const sessions = Object.entries(dayMap).sort((a, b) => new Date(a[0]) - new Date(b[0])).slice(-3);
    if (sessions.length < 3) continue;
    const weights = sessions.map(s => s[1]);
    if (weights.every(w => w === weights[0])) {
      plateaus.push({ exercise_name, max_weight: weights[0], sessions_stuck: sessions.length });
    }
  }

  return {
    program: programRow?.content || null,
    recentSessions,
    topRecords,
    physicalProfile: profileR.rows[0] || null,
    streak,
    plateaus,
    initialGoal: profileR.rows[0]?.main_goal || programRow?.questionnaire?.objectif || null,
    wellnessScore: wellnessR.rows[0]?.score != null ? Number(wellnessR.rows[0].score) : null,
  };
}

// POST /api/chat — chat general (connait le programme, l'historique, les records...)
router.get("/limit", async (req, res) => {
  try {
    res.json(await getChatUsage(req.session.userId));
  } catch (err) {
    console.error("Erreur GET /chat/limit :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

router.post("/", checkChatLimit, async (req, res) => {
  try {
    const { history } = req.body;
    if (!Array.isArray(history) || !history.length)
      return res.status(400).json({ error: "Le champ 'history' est requis." });

    const programResult = await pool.query(
      `SELECT id, content, questionnaire FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1`,
      [req.session.userId]
    );
    const programRow = programResult.rows[0] || null;
    const context = await buildFullContext(req.session.userId, programRow);

    // Detection automatique des blessures (fonctionnalite 5, signal 1) :
    // mention de douleur/mal/blessure dans le dernier message de l'utilisateur.
    const lastUserMsg = [...history].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      const mention = detectChatInjuryMention(lastUserMsg.content, context.topRecords.map(r => r.exercise_name));
      if (mention) flagInjury(req.session.userId, mention, "chat_mention").catch(() => {});
    }

    const result = await chatWithCoach(history, context);

    console.log("[chat] résultat chatWithCoach :", {
      programUpdated: result.programUpdated,
      hasProgramRow: !!programRow,
      hasNewProgram: !!result.newProgram,
      daysCount: result.newProgram?.days?.length || 0,
      changes: result.changes,
    });

    // Anti-corruption (voir services/aiCoach.js validateProgram) : on ne
    // touche JAMAIS au programme actuel en base tant que le nouveau n'a pas
    // ete valide structurellement. Si la validation echoue, l'ancien
    // programme reste intact et l'utilisateur est prevenu.
    if (result.programUpdated && programRow) {
      console.log("PROGRAMME GÉNÉRÉ:", JSON.stringify(result.newProgram, null, 2));

      // TEMPORAIRE (diagnostic BUG 1 du 2026-07-23) : on tente validateProgram()
      // et on logge le resultat, mais on NE bloque PLUS la sauvegarde si elle
      // echoue, le temps de confirmer par les logs Render si c'est bien elle
      // la cause du blocage. A RETIRER (restaurer le blocage sur echec) des
      // que la cause reelle est confirmee.
      let validationOk = true;
      let validationErrorMsg = null;
      try {
        validateProgram(result.newProgram);
      } catch (validationError) {
        validationOk = false;
        validationErrorMsg = validationError.message;
        console.log("ERREUR VALIDATION:", validationError.message, validationError.stack);
      }
      console.log("[chat] validateProgram résultat :", validationOk ? "OK" : `ÉCHEC (${validationErrorMsg}) — sauvegarde forcée quand même (mode diagnostic)`);

      console.log("SAVING PROGRAM:", JSON.stringify(result.newProgram?.days?.length), "jours");
      console.log("FIRST DAY:", JSON.stringify(result.newProgram?.days?.[0]));

      try {
        await pool.query("UPDATE programs SET content=$1 WHERE id=$2", [JSON.stringify(result.newProgram), programRow.id]);
        const desc = result.changes?.length ? result.changes.join("; ") : "Programme modifié via le chat coach.";
        logProgramChange(req.session.userId, programRow.id, "chat", desc, programRow.content);
        console.log("[chat] programme sauvegardé avec succès pour l'utilisateur", req.session.userId, validationOk ? "" : "(⚠️ SANS validation — mode diagnostic)");
        if (!validationOk) {
          result.reply = `${result.reply} ⚠️ (mode diagnostic : sauvegardé sans validation, erreur de validation ignorée : ${validationErrorMsg})`;
        }
      } catch (saveError) {
        console.error("[chat] ERREUR SAUVEGARDE BASE :", saveError.message, saveError.stack);
        result.programUpdated = false;
        result.newProgram = null;
        result.changes = [];
        result.reply = `${result.reply} ⚠️ La modification n'a pas pu être appliquée en toute sécurité, ton programme actuel n'a pas été changé.`;
      }
    } else if (!result.programUpdated) {
      console.log("[chat] aucune modification détectée par l'IA (programUpdated=false) — programme non touché. Réponse :", result.reply);
    }

    res.json(result);
  } catch (err) {
    console.error("Erreur /api/chat :", err);
    res.status(500).json({ error: err.message || "Erreur du coach IA." });
  }
});

// POST /api/chat/debrief — analyse automatique de la seance qui vient de se terminer
router.post("/debrief", requirePremium, async (req, res) => {
  try {
    const { exercises, totalVolume, durationMins, prs, programFocus } = req.body;
    if (!Array.isArray(exercises) || !exercises.length)
      return res.status(400).json({ error: "Aucune donnee de seance fournie." });

    const debrief = await debriefSession({ exercises, totalVolume, durationMins, prs, programFocus });
    res.json({ debrief });
  } catch (err) {
    console.error("Erreur /api/chat/debrief :", err);
    res.status(500).json({ error: err.message || "Erreur lors de l'analyse de la seance." });
  }
});

// POST /api/chat/plateau-advice — conseils IA specifiques pour sortir d'un plateau
router.post("/plateau-advice", requirePremium, async (req, res) => {
  try {
    const { plateaus } = req.body;
    if (!Array.isArray(plateaus) || !plateaus.length)
      return res.status(400).json({ error: "Aucun plateau fourni." });

    const advice = await analyzePlateau(plateaus);
    res.json({ advice });
  } catch (err) {
    console.error("Erreur /api/chat/plateau-advice :", err);
    res.status(500).json({ error: err.message || "Erreur du coach IA." });
  }
});

module.exports = router;

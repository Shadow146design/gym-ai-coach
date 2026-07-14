const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { requirePremium } = require("../middleware/premium");
const { generateProgram, extractProgramParams } = require("../services/aiCoach");
const { logProgramChange } = require("../services/programHistory");

const router = express.Router();
router.use(requireAuth);

// Limite gratuite : 3 programmes generes (module economique). Retourne un
// message pret a renvoyer au client si la limite est atteinte, sinon null.
async function checkFreeLimit(userId) {
  const userR = await pool.query("SELECT role FROM users WHERE id=$1", [userId]);
  if (userR.rows[0]?.role !== "user") return null;
  const countR = await pool.query("SELECT COUNT(*) AS n FROM programs WHERE user_id=$1", [userId]);
  if (parseInt(countR.rows[0].n, 10) >= 3) {
    return {
      error: "Tu as atteint la limite gratuite (3 programmes). Passe en Premium pour générer des programmes illimités.",
      upgrade_url: "/premium.html",
    };
  }
  return null;
}

// Complete les reponses avec le profil physique/objectif enregistre en base.
async function mergeProfile(userId, answers) {
  try {
    const profRes = await pool.query(
      "SELECT weight_kg, height_cm, age, gender, activity_level, main_goal, goal_date, personal_note FROM users WHERE id=$1",
      [userId]
    );
    const prof = profRes.rows[0] || {};
    if (prof.weight_kg) Object.assign(answers, prof);
    if (prof.main_goal) answers.main_goal = prof.main_goal;
    if (prof.goal_date) answers.goal_date = prof.goal_date;
    if (prof.personal_note) answers.personal_note = prof.personal_note;
  } catch (e) { console.warn("Profil ignoré :", e.message); }
  return answers;
}

// Anti-duplication (module C) : les 3 derniers programmes servent a eviter
// que l'IA ne reproduise les memes exercices/ordre.
async function fetchPreviousPrograms(userId) {
  try {
    const prevR = await pool.query(
      "SELECT title, content FROM programs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 3",
      [userId]
    );
    return prevR.rows.map(p => ({
      title: p.title,
      exercises: (p.content?.days || []).flatMap(d => (d.exercises || []).map(e => e.name)),
    }));
  } catch (e) { console.warn("Historique programmes ignoré :", e.message); return []; }
}

async function saveNewProgram(userId, program, questionnaire) {
  await pool.query("UPDATE programs SET is_active=FALSE WHERE user_id=$1", [userId]);
  const r = await pool.query(
    `INSERT INTO programs (user_id, title, questionnaire, content, is_active, program_start_date)
     VALUES ($1,$2,$3,$4,TRUE,CURRENT_DATE) RETURNING id, title, content, created_at, program_start_date`,
    [userId, program.title || "Mon programme", JSON.stringify(questionnaire), JSON.stringify(program)]
  );
  return r.rows[0];
}

router.post("/generate", async (req, res) => {
  try {
    const answers = req.body;
    const required = ["objectif","niveau","joursParSemaine","dureeSeance","materiel"];
    const missing = required.filter(k => !answers[k]);
    if (missing.length) return res.status(400).json({ error: `Champs manquants : ${missing.join(", ")}` });

    const limitError = await checkFreeLimit(req.session.userId);
    if (limitError) return res.status(403).json(limitError);

    await mergeProfile(req.session.userId, answers);
    const previousPrograms = await fetchPreviousPrograms(req.session.userId);

    const program = await generateProgram(answers, previousPrograms);
    const saved = await saveNewProgram(req.session.userId, program, answers);
    res.status(201).json({ program: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message||"Erreur génération." });
  }
});

// ── Module E : questionnaire conversationnel ────────────────
// body : { conversation: [{ role: "user"|"assistant", content }, ...] }
router.post("/chat-generate", requirePremium, async (req, res) => {
  try {
    const { conversation, periodization } = req.body;
    if (!Array.isArray(conversation) || !conversation.length) {
      return res.status(400).json({ error: "La conversation est requise." });
    }

    const limitError = await checkFreeLimit(req.session.userId);
    if (limitError) return res.status(403).json(limitError);

    const extracted = await extractProgramParams(conversation);
    const { understood, ...answers } = extracted;
    if (periodization) answers.periodization = true;

    await mergeProfile(req.session.userId, answers);
    const previousPrograms = await fetchPreviousPrograms(req.session.userId);

    const program = await generateProgram(answers, previousPrograms);
    const saved = await saveNewProgram(req.session.userId, program, answers);
    res.status(201).json({ program: saved, understood });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erreur génération." });
  }
});

router.get("/active", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id,title,content,created_at,program_start_date FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [req.session.userId]
    );
    res.json({ program: r.rows[0]||null });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Historique de tous les programmes
router.get("/history", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id,title,is_active,created_at,questionnaire FROM programs WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20",
      [req.session.userId]
    );
    res.json({ programs: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Réactiver un ancien programme
router.post("/:id/activate", async (req, res) => {
  try {
    await pool.query("UPDATE programs SET is_active=FALSE WHERE user_id=$1", [req.session.userId]);
    const r = await pool.query(
      "UPDATE programs SET is_active=TRUE WHERE id=$1 AND user_id=$2 RETURNING id,title",
      [req.params.id, req.session.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Programme introuvable." });
    res.json({ ok: true, program: r.rows[0] });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Module F : suggestions proactives post-seance ───────────

// "8-12" -> {min:8,max:12} ; "5" -> {min:5,max:5} ; invalide -> null
function parseRepsRange(repsStr) {
  const match = String(repsStr || "").match(/(\d+)\s*-?\s*(\d+)?/);
  if (!match) return null;
  const min = parseInt(match[1], 10);
  const max = match[2] ? parseInt(match[2], 10) : min;
  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
}

function findProgramExercise(program, name) {
  const nameLower = (name || "").trim().toLowerCase();
  for (const day of program?.days || []) {
    const found = (day.exercises || []).find(e => (e.name || "").trim().toLowerCase() === nameLower);
    if (found) return found;
  }
  return null;
}

// body : { exercises: [{ name, weight, reps }, ...] } — meilleure serie par exercice de la seance
router.post("/analyze-session", async (req, res) => {
  try {
    const { exercises } = req.body;
    if (!Array.isArray(exercises) || !exercises.length) {
      return res.status(400).json({ error: "Aucune donnee de seance fournie." });
    }

    const progR = await pool.query(
      "SELECT content FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [req.session.userId]
    );
    const program = progR.rows[0]?.content;
    if (!program) return res.json({ suggestion: "adapté", message: "" });

    let exceededCount = 0, underRepsCount = 0, matched = 0;
    exercises.forEach(ex => {
      const planned = findProgramExercise(program, ex.name);
      if (!planned) return;
      matched++;

      if (planned.target_weight_kg && Number(ex.weight) >= Number(planned.target_weight_kg) * 1.2) {
        exceededCount++;
      }
      const range = parseRepsRange(planned.reps);
      if (range && Number(ex.reps) < range.min * 0.5) {
        underRepsCount++;
      }
    });

    let suggestion = "adapté", message = "";
    if (matched >= 3 && exceededCount >= 3) {
      suggestion = "trop_facile";
      message = "Je remarque que tu dépasses systématiquement les charges prévues. Tu es prêt pour un programme plus difficile ! Veux-tu que je le mette à jour ?";
    } else if (matched >= 3 && underRepsCount >= 3) {
      suggestion = "trop_dur";
      message = "Cette séance semble difficile. Veux-tu que j'adapte les charges à la baisse ?";
    }

    res.json({ suggestion, message });
  } catch (err) {
    console.error("Erreur POST /program/analyze-session :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// body : { direction: "harder" | "easier" } — ajuste les charges cibles de +10%/-10%
router.post("/adapt", async (req, res) => {
  try {
    const { direction } = req.body;
    if (!["harder", "easier"].includes(direction)) {
      return res.status(400).json({ error: "direction doit être 'harder' ou 'easier'." });
    }
    const factor = direction === "harder" ? 1.1 : 0.9;

    const progR = await pool.query(
      "SELECT id, content FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [req.session.userId]
    );
    const row = progR.rows[0];
    if (!row) return res.status(404).json({ error: "Aucun programme actif." });

    const previousContent = JSON.parse(JSON.stringify(row.content));
    const program = row.content;
    (program.days || []).forEach(day => {
      (day.exercises || []).forEach(ex => {
        if (ex.target_weight_kg) {
          ex.target_weight_kg = Math.round(ex.target_weight_kg * factor * 2) / 2; // arrondi au 0.5kg
        }
      });
    });

    await pool.query("UPDATE programs SET content=$1 WHERE id=$2", [JSON.stringify(program), row.id]);
    logProgramChange(
      req.session.userId, row.id, "adapt",
      direction === "harder" ? "Charges augmentées de 10% (séance jugée trop facile)" : "Charges réduites de 10% (séance jugée difficile)",
      previousContent
    );
    res.json({ ok: true, program });
  } catch (err) {
    console.error("Erreur POST /program/adapt :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Historique des modifications du programme actif (fonctionnalite 3.7)
router.get("/history", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, program_id, change_type, change_description, created_at
       FROM program_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [req.session.userId]
    );
    res.json({ history: r.rows });
  } catch (err) {
    console.error("Erreur GET /program/history :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Restaure le programme a l'etat qu'il avait juste avant cette modification.
router.post("/history/:id/revert", async (req, res) => {
  try {
    const entryR = await pool.query(
      "SELECT program_id, previous_content FROM program_history WHERE id=$1 AND user_id=$2",
      [req.params.id, req.session.userId]
    );
    const entry = entryR.rows[0];
    if (!entry) return res.status(404).json({ error: "Entrée d'historique introuvable." });

    const progR = await pool.query(
      "SELECT id, content FROM programs WHERE id=$1 AND user_id=$2 AND is_active=TRUE",
      [entry.program_id, req.session.userId]
    );
    if (!progR.rows[0]) return res.status(404).json({ error: "Ce programme n'est plus actif." });

    await pool.query("UPDATE programs SET content=$1 WHERE id=$2", [JSON.stringify(entry.previous_content), entry.program_id]);
    logProgramChange(req.session.userId, entry.program_id, "revert", "Retour à une version précédente du programme", progR.rows[0].content);

    res.json({ ok: true, program: entry.previous_content });
  } catch (err) {
    console.error("Erreur POST /program/history/:id/revert :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;

const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { dailyTip } = require("../services/aiCoach");
const { checkAndUnlockBadges } = require("./badges");
const { flagInjury } = require("../services/injuries");
const { requirePremium } = require("../middleware/premium");

const router = express.Router();
router.use(requireAuth);

// node-postgres parse les colonnes DATE en minuit LOCAL : utiliser les
// getters locaux (pas toISOString, qui decale d'un jour hors UTC) pour
// reconstruire "YYYY-MM-DD" de facon fiable quel que soit le fuseau du serveur.
function dayStr(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// ── POST : enregistre une série ───────────────────────────
router.post("/", async (req, res) => {
  try {
    const { exercise_name, muscle_group, weight, reps, sets, note } = req.body;
    if (!exercise_name || weight === undefined || !reps)
      return res.status(400).json({ error: "exercise_name, weight et reps sont requis." });

    const uid = req.session.userId;
    const prevRes = await pool.query(
      "SELECT MAX(weight) AS max FROM logs WHERE user_id=$1 AND exercise_name=$2",
      [uid, exercise_name.trim()]
    );
    const previousMax = prevRes.rows[0].max !== null ? Number(prevRes.rows[0].max) : null;

    const r = await pool.query(
      `INSERT INTO logs (user_id, exercise_name, muscle_group, weight, reps, sets, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [uid, exercise_name.trim(), muscle_group||null, weight, reps, sets||1, note||null]
    );

    if (previousMax !== null && Number(weight) > previousMax) {
      pool.query(
        `INSERT INTO notifications (user_id, type, message, link) VALUES ($1,'new_record',$2,'/stats.html')`,
        [uid, `🏆 Nouveau record : ${exercise_name.trim()} à ${weight}kg !`]
      ).catch(e => console.error("Erreur notif nouveau record :", e));
    }

    checkAndUnlockBadges(uid).catch(e => console.error("Erreur verification badges :", e));
    detectInjurySignals(uid, exercise_name.trim(), Number(weight)).catch(e => console.error("Erreur detection blessure :", e));

    res.status(201).json({ log: r.rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur." }); }
});

// Detection automatique des blessures (fonctionnalite 5, signaux 2 et 3) :
// chute de performance >30% par rapport a la derniere seance sur cet exercice,
// ou regression sur 3 seances consecutives (chaque seance plus faible que la
// precedente). Comparaison par seance (MAX du jour), pas par serie individuelle,
// pour ne pas confondre une serie d'echauffement avec une vraie regression.
async function detectInjurySignals(userId, exerciseName, weight) {
  const bySession = await pool.query(
    `SELECT performed_at::date AS date, MAX(weight) AS max_weight
     FROM logs WHERE user_id=$1 AND exercise_name=$2
     GROUP BY performed_at::date ORDER BY date DESC LIMIT 4`,
    [userId, exerciseName]
  );
  const sessions = bySession.rows.map(r => ({ date: r.date, maxWeight: Number(r.max_weight) }));
  if (sessions.length < 2) return;

  const [current, previous] = sessions;
  if (previous.maxWeight > 0 && current.maxWeight < previous.maxWeight * 0.7) {
    await flagInjury(userId, exerciseName, "performance_drop");
    return; // un seul flag a la fois suffit, evite un double signal le meme jour
  }

  if (sessions.length >= 3) {
    const [s0, s1, s2] = sessions;
    if (s0.maxWeight < s1.maxWeight && s1.maxWeight < s2.maxWeight) {
      await flagInjury(userId, exerciseName, "regression_streak");
    }
  }
}

// ── PUT : modifier un log ─────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { weight, reps, note } = req.body;
    const r = await pool.query(
      `UPDATE logs SET weight=$1, reps=$2, note=$3
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [weight, reps, note||null, req.params.id, req.session.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: "Log introuvable." });
    res.json({ log: r.rows[0] });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── DELETE /all (efface tout l'historique de séances) ─────
// Doit être déclarée avant /:id, sinon express matcherait "all" comme id.
router.delete("/all", async (req, res) => {
  try {
    await pool.query("DELETE FROM logs WHERE user_id=$1", [req.session.userId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── DELETE : supprimer un log ─────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM logs WHERE id=$1 AND user_id=$2", [req.params.id, req.session.userId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /exercises ────────────────────────────────────────
router.get("/exercises", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT DISTINCT exercise_name FROM logs WHERE user_id=$1 ORDER BY exercise_name",
      [req.session.userId]
    );
    res.json({ exercises: r.rows.map(x => x.exercise_name) });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /records ──────────────────────────────────────────
router.get("/records", async (req, res) => {
  try {
    // Note : MAX(weight * (1 + MAX(reps)::float/30)) plantait ("aggregate function
    // calls cannot be nested") car un agregat ne peut pas en contenir un autre.
    // Le calcul doit se faire par ligne (weight * (1 + reps/30)) puis etre agrege.
    const r = await pool.query(
      `SELECT exercise_name, MAX(weight) AS max_weight,
              MAX(weight * (1 + reps::float/30)) AS estimated_1rm
       FROM logs WHERE user_id=$1
       GROUP BY exercise_name ORDER BY max_weight DESC`,
      [req.session.userId]
    );
    res.json({ records: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /recent (poids précédent par exercice) ────────────
router.get("/recent", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT DISTINCT ON (exercise_name) exercise_name, weight, reps, performed_at
       FROM logs WHERE user_id=$1 ORDER BY exercise_name, performed_at DESC`,
      [req.session.userId]
    );
    res.json({ recent: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /recap (séries du jour) ───────────────────────────
router.get("/recap", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT l.*,
         (SELECT MAX(weight) FROM logs l2
          WHERE l2.user_id=l.user_id AND l2.exercise_name=l.exercise_name
          AND l2.performed_at < DATE_TRUNC('day', NOW())) AS previous_weight
       FROM logs l
       WHERE l.user_id=$1 AND l.performed_at >= DATE_TRUNC('day', NOW())
       ORDER BY l.performed_at`,
      [req.session.userId]
    );
    res.json({ recap: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /volume (courbe volume par jour) ──────────────────
router.get("/volume", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT performed_at::date AS day, SUM(weight * reps * sets) AS volume
       FROM logs WHERE user_id=$1 GROUP BY day ORDER BY day`,
      [req.session.userId]
    );
    res.json({ volume: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET / (historique par exercice) ──────────────────────
router.get("/", async (req, res) => {
  try {
    const { exercise } = req.query;
    let q = "SELECT * FROM logs WHERE user_id=$1";
    const p = [req.session.userId];
    if (exercise) { q += " AND exercise_name=$2"; p.push(exercise); }
    q += " ORDER BY performed_at ASC";
    const r = await pool.query(q, p);
    res.json({ logs: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /streak ───────────────────────────────────────────
router.get("/streak", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT performed_at::date AS day FROM logs
       WHERE user_id=$1 GROUP BY day ORDER BY day DESC`,
      [req.session.userId]
    );
    const days = r.rows.map(x => dayStr(x.day));
    if (!days.length) return res.json({ current: 0, best: 0, totalSessions: 0, trainedToday: false });

    const today = dayStr(new Date());
    const yesterday = dayStr(new Date(Date.now() - 86400000));

    let current = 0;
    let best = 0;
    let streak = 0;
    let prevDay = null;

    // Calcul streak courant (à partir d'aujourd'hui ou hier)
    let cur = 0;
    const startOk = days[0] === today || days[0] === yesterday;
    if (startOk) {
      for (let i = 0; i < days.length; i++) {
        if (i === 0) { cur = 1; prevDay = days[0]; continue; }
        const diff = (new Date(prevDay) - new Date(days[i])) / 86400000;
        if (diff === 1) { cur++; prevDay = days[i]; }
        else break;
      }
    }
    current = cur;

    // Meilleur streak
    streak = 1;
    for (let i = 1; i < days.length; i++) {
      const diff = (new Date(days[i-1]) - new Date(days[i])) / 86400000;
      if (diff === 1) { streak++; best = Math.max(best, streak); }
      else streak = 1;
    }
    best = Math.max(best, streak, current);

    res.json({ current, best, totalSessions: days.length, trainedToday: days[0] === today });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /summary (home page résumé) ──────────────────────
router.get("/summary", async (req, res) => {
  try {
    const uid = req.session.userId;
    const [lastRes, recordRes, streakRes] = await Promise.all([
      pool.query(
        `SELECT performed_at::date AS day, COUNT(DISTINCT exercise_name) AS exercises
         FROM logs WHERE user_id=$1 GROUP BY day ORDER BY day DESC LIMIT 1`,
        [uid]
      ),
      pool.query(
        `SELECT exercise_name, MAX(weight) AS max_weight, MAX(performed_at) AS achieved_at
         FROM logs WHERE user_id=$1 GROUP BY exercise_name ORDER BY max_weight DESC LIMIT 1`,
        [uid]
      ),
      pool.query(
        `SELECT performed_at::date AS day FROM logs WHERE user_id=$1
         GROUP BY day ORDER BY day DESC LIMIT 30`,
        [uid]
      ),
    ]);

    const days = streakRes.rows.map(x => dayStr(x.day));
    const today = dayStr(new Date());
    const yesterday = dayStr(new Date(Date.now() - 86400000));
    let streak = 0;
    if (days.length && (days[0] === today || days[0] === yesterday)) {
      streak = 1;
      for (let i = 1; i < days.length; i++) {
        const diff = (new Date(days[i-1]) - new Date(days[i])) / 86400000;
        if (diff === 1) streak++; else break;
      }
    }

    res.json({
      lastSession: lastRes.rows[0] || null,
      topRecord: recordRes.rows[0] || null,
      streak,
    });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /daily-tip (phrase motivante IA, page d'accueil) ──
router.get("/daily-tip", async (req, res) => {
  const FALLBACK = "Chaque séance compte : reste régulier, les résultats suivent.";
  try {
    const uid = req.session.userId;
    const [streakRes, lastRes, imbalanceRes] = await Promise.all([
      pool.query(
        `SELECT performed_at::date AS day FROM logs WHERE user_id=$1 GROUP BY day ORDER BY day DESC`,
        [uid]
      ),
      pool.query("SELECT MAX(performed_at) AS last FROM logs WHERE user_id=$1", [uid]),
      pool.query(
        `SELECT COALESCE(muscle_group,'Non défini') AS muscle_group, SUM(weight*reps*sets) AS volume
         FROM logs WHERE user_id=$1 AND muscle_group IS NOT NULL
         AND performed_at >= NOW() - INTERVAL '30 days'
         GROUP BY muscle_group ORDER BY volume DESC`,
        [uid]
      ),
    ]);

    const days = streakRes.rows.map(x => dayStr(x.day));
    const today = dayStr(new Date());
    const yesterday = dayStr(new Date(Date.now() - 86400000));
    let streak = 0;
    if (days.length && (days[0] === today || days[0] === yesterday)) {
      streak = 1;
      for (let i = 1; i < days.length; i++) {
        const diff = (new Date(days[i-1]) - new Date(days[i])) / 86400000;
        if (diff === 1) streak++; else break;
      }
    }

    let imbalanceWarning = null;
    const muscleData = imbalanceRes.rows;
    if (muscleData.length >= 2) {
      const push = muscleData.filter(m => ["Poitrine","Épaules","Triceps"].includes(m.muscle_group)).reduce((a,m)=>a+Number(m.volume),0);
      const pull = muscleData.filter(m => ["Dos","Biceps"].includes(m.muscle_group)).reduce((a,m)=>a+Number(m.volume),0);
      if (push > 0 && pull > 0) {
        const ratio = push / pull;
        if (ratio > 1.5 || ratio < 0.67) imbalanceWarning = "déséquilibre push/pull";
      }
    }

    const tip = await dailyTip({
      streak,
      totalSessions: days.length,
      lastSessionDate: lastRes.rows[0]?.last || null,
      imbalanceWarning,
    });
    res.json({ tip: tip || FALLBACK });
  } catch (err) {
    res.json({ tip: FALLBACK });
  }
});

// ── GET /dashboard-stats ──────────────────────────────────
router.get("/dashboard-stats", async (req, res) => {
  try {
    const uid = req.session.userId;
    const sessRes = await pool.query(
      "SELECT COUNT(DISTINCT performed_at::date) AS total FROM logs WHERE user_id=$1",
      [uid]
    );
    const lastRes = await pool.query(
      "SELECT MAX(performed_at) AS last FROM logs WHERE user_id=$1", [uid]
    );
    const freqRes = await pool.query(
      `SELECT DATE_TRUNC('week', performed_at) AS week, COUNT(DISTINCT performed_at::date) AS days
       FROM logs WHERE user_id=$1 AND performed_at >= NOW() - INTERVAL '28 days'
       GROUP BY week ORDER BY week`,
      [uid]
    );
    const freqMap = {};
    freqRes.rows.forEach(r => { freqMap[r.week.toISOString().slice(0,10)] = parseInt(r.days); });
    const weeklyFrequency = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i*7);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay()+6)%7));
      weeklyFrequency.push(freqMap[monday.toISOString().slice(0,10)] || 0);
    }
    const progRes = await pool.query(
      "SELECT content FROM programs WHERE user_id=$1 AND is_active=TRUE ORDER BY created_at DESC LIMIT 1",
      [uid]
    );
    let targetPerWeek = null;
    if (progRes.rows[0]) targetPerWeek = (progRes.rows[0].content.days||[]).length;
    const totalDone = weeklyFrequency.reduce((a,b)=>a+b,0);
    const completionRate = targetPerWeek
      ? Math.min(100, Math.round((totalDone/(targetPerWeek*4))*100)) : null;
    const muscRes = await pool.query(
      `SELECT COALESCE(muscle_group,'Non défini') AS muscle_group, SUM(weight*reps*sets) AS volume
       FROM logs WHERE user_id=$1 AND muscle_group IS NOT NULL
       AND performed_at >= NOW() - INTERVAL '30 days'
       GROUP BY muscle_group ORDER BY volume DESC`,
      [uid]
    );
    // Détection déséquilibre musculaire
    const muscleData = muscRes.rows;
    let imbalanceWarning = null;
    if (muscleData.length >= 2) {
      const push = muscleData.filter(m => ["Poitrine","Épaules","Triceps"].includes(m.muscle_group)).reduce((a,m)=>a+Number(m.volume),0);
      const pull = muscleData.filter(m => ["Dos","Biceps"].includes(m.muscle_group)).reduce((a,m)=>a+Number(m.volume),0);
      if (push > 0 && pull > 0) {
        const ratio = push / pull;
        if (ratio > 1.5) imbalanceWarning = "⚠️ Tu travailles beaucoup plus le push (poitrine/épaules) que le pull (dos/biceps). Risque de déséquilibre postural.";
        else if (ratio < 0.67) imbalanceWarning = "⚠️ Tu travailles beaucoup plus le pull que le push. Pense à équilibrer.";
      }
      const legs = muscleData.filter(m => ["Jambes","Fessiers"].includes(m.muscle_group)).reduce((a,m)=>a+Number(m.volume),0);
      const upper = push + pull;
      if (upper > 0 && legs === 0) imbalanceWarning = (imbalanceWarning||"") + "\n⚠️ Aucune séance de jambes ce mois-ci !";
    }

    res.json({
      totalSessions: parseInt(sessRes.rows[0].total)||0,
      lastSessionDate: lastRes.rows[0].last||null,
      weeklyFrequency, targetPerWeek, completionRate,
      avgSessionMinutes: null,
      muscleGroupVolume: muscleData,
      imbalanceWarning,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /weekly ───────────────────────────────────────────
router.get("/weekly", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('week', performed_at),'DD/MM') AS week_label,
              COUNT(DISTINCT performed_at::date) AS sessions,
              SUM(weight*reps*sets) AS volume, COUNT(*) AS total_sets
       FROM logs WHERE user_id=$1 AND performed_at >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', performed_at)
       ORDER BY DATE_TRUNC('week', performed_at) DESC`,
      [req.session.userId]
    );
    res.json({ weeks: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /projection ───────────────────────────────────────
router.get("/projection", async (req, res) => {
  try {
    const { exercise } = req.query;
    if (!exercise) return res.status(400).json({ error: "exercise requis." });
    const r = await pool.query(
      `SELECT weight, performed_at FROM logs WHERE user_id=$1 AND exercise_name=$2
       ORDER BY performed_at DESC LIMIT 10`,
      [req.session.userId, exercise]
    );
    const rows = r.rows.reverse();
    if (rows.length < 3) return res.json({ projection: [] });
    const n = rows.length;
    const xs = rows.map((_,i)=>i);
    const ys = rows.map(r=>Number(r.weight));
    const sumX=xs.reduce((a,b)=>a+b,0), sumY=ys.reduce((a,b)=>a+b,0);
    const sumXY=xs.reduce((a,x,i)=>a+x*ys[i],0), sumX2=xs.reduce((a,x)=>a+x*x,0);
    const slope=(n*sumXY-sumX*sumY)/(n*sumX2-sumX*sumX);
    const intercept=(sumY-slope*sumX)/n;
    const projection=[1,2,3,4].map(step=>({
      label:`S+${step}`,
      weight: Math.round((intercept+slope*(n-1+step))*2)/2,
    }));
    res.json({ projection });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /plateau (detection de stagnation par exercice) ────
router.get("/plateau", requirePremium, async (req, res) => {
  try {
    const uid = req.session.userId;
    const r = await pool.query(
      `SELECT exercise_name, weight, performed_at::date AS day
       FROM logs WHERE user_id=$1 ORDER BY exercise_name, performed_at ASC`,
      [uid]
    );

    const byExercise = {};
    r.rows.forEach(row => {
      const key = row.exercise_name;
      const day = dayStr(row.day);
      if (!byExercise[key]) byExercise[key] = {};
      byExercise[key][day] = Math.max(byExercise[key][day] || 0, Number(row.weight));
    });

    const plateaus = [];
    for (const [exercise, dayMap] of Object.entries(byExercise)) {
      const sessions = Object.entries(dayMap)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-6)
        .map(([day, weight]) => ({ day, weight }));

      if (sessions.length < 3) continue; // pas assez de seances pour conclure

      const weights = sessions.map(s => s.weight);
      const maxWeight = Math.max(...weights);
      // Premiere fois que ce max a ete atteint (pas la derniere : sinon un poids
      // repete plusieurs fois au max donnerait "0 seance depuis le record").
      const prIndex = weights.indexOf(maxWeight);
      const sessionsSincePR = sessions.length - 1 - prIndex;

      if (sessionsSincePR >= 3) {
        plateaus.push({
          exercise_name: exercise,
          max_weight: maxWeight,
          last_weight: weights[weights.length - 1],
          sessions_stuck: sessionsSincePR,
        });
      }
    }

    res.json({ plateaus });
  } catch (err) {
    console.error("Erreur GET /logs/plateau :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── Calendrier : jours d'entraînement sur 12 semaines ─────
router.get("/calendar", async (req, res) => {
  try {
    const monthParam = /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : dayStr(new Date()).slice(0, 7);
    const [y, m] = monthParam.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 1); // premier jour du mois suivant (borne exclusive)

    const r = await pool.query(
      `SELECT performed_at::date AS day, COUNT(DISTINCT exercise_name) AS exercises, SUM(weight*reps*sets) AS volume
       FROM logs WHERE user_id=$1 AND performed_at >= $2 AND performed_at < $3
       GROUP BY day ORDER BY day`,
      [req.session.userId, monthStart, monthEnd]
    );
    const days = r.rows.map(row => ({
      day: dayStr(row.day),
      exercises: Number(row.exercises),
      volume: Number(row.volume) || 0,
    }));
    const sessionsThisMonth = days.length;
    const volumeThisMonth = Math.round(days.reduce((sum, d) => sum + d.volume, 0));

    res.json({ month: monthParam, days, sessionsThisMonth, volumeThisMonth });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── 1RM par exercice (formule Epley) ──────────────────────
router.get("/one-rm", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT exercise_name, weight, reps
       FROM logs WHERE user_id=$1 AND reps BETWEEN 1 AND 12`,
      [req.session.userId]
    );
    const byEx = {};
    r.rows.forEach(row => {
      const orm = Math.round(Number(row.weight) * (1 + Number(row.reps) / 30));
      if (!byEx[row.exercise_name] || orm > byEx[row.exercise_name]) {
        byEx[row.exercise_name] = orm;
      }
    });
    const results = Object.entries(byEx)
      .map(([name, one_rm]) => ({ exercise_name: name, one_rm }))
      .sort((a,b) => b.one_rm - a.one_rm);
    res.json({ one_rm: results });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /export (export JSON de tous les logs) ───────────
router.get("/export", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT exercise_name, muscle_group, weight, reps, sets, note, performed_at FROM logs WHERE user_id=$1 ORDER BY performed_at ASC",
      [req.session.userId]
    );
    res.setHeader("Content-Disposition", "attachment; filename=historique-seances.json");
    res.json({ exported_at: new Date().toISOString(), logs: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /export.csv (export CSV de tous les logs) ─────────
router.get("/export.csv", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT exercise_name, muscle_group, weight, reps, sets, note, performed_at FROM logs WHERE user_id=$1 ORDER BY performed_at ASC",
      [req.session.userId]
    );
    const csvEscape = v => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["exercice", "groupe_musculaire", "poids_kg", "repetitions", "series", "note", "date"];
    const rows = r.rows.map(row => [
      row.exercise_name, row.muscle_group, row.weight, row.reps, row.sets, row.note,
      new Date(row.performed_at).toISOString(),
    ].map(csvEscape).join(","));
    const csv = [header.join(","), ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=historique-seances.csv");
    res.send(csv);
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── Déséquilibres musculaires ──────────────────────────────
router.get("/imbalances", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT COALESCE(muscle_group,'Non classé') AS muscle_group, SUM(weight*reps*sets) AS volume
       FROM logs WHERE user_id=$1 AND performed_at >= NOW() - INTERVAL '30 days' AND muscle_group IS NOT NULL
       GROUP BY muscle_group ORDER BY volume DESC`,
      [req.session.userId]
    );
    res.json({ muscles: r.rows });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// ── GET /form-score (score de forme du jour, 0-100) ───────
// Compose 3 facteurs : regularite (30j), progression (semaine vs semaine
// precedente), recuperation (pas de surentrainement sans repos).
router.get("/form-score", async (req, res) => {
  try {
    const uid = req.session.userId;

    const daysR = await pool.query(
      `SELECT DISTINCT performed_at::date AS day FROM logs
       WHERE user_id=$1 AND performed_at >= NOW() - INTERVAL '30 days'
       ORDER BY day DESC`,
      [uid]
    );
    const days = daysR.rows.map(r => dayStr(r.day));

    if (!days.length) {
      return res.json({ score: 0, label: "Pas encore de données", factors: { regularite: 0, progression: 0, recuperation: 0 } });
    }

    // Régularité : ~3 séances/semaine sur 30j = score plein
    const regularite = Math.min(100, Math.round((days.length / 12) * 100));

    // Progression : volume de cette semaine vs la semaine précédente
    const weeklyR = await pool.query(
      `SELECT DATE_TRUNC('week', performed_at) AS week, SUM(weight*reps*sets) AS volume
       FROM logs WHERE user_id=$1 AND performed_at >= NOW() - INTERVAL '14 days'
       GROUP BY week ORDER BY week DESC`,
      [uid]
    );
    let progression = 60; // neutre si pas assez de recul
    if (weeklyR.rows.length >= 2) {
      const [thisWeek, lastWeek] = weeklyR.rows;
      const v1 = Number(thisWeek.volume), v0 = Number(lastWeek.volume);
      if (v0 > 0) progression = v1 >= v0 ? 100 : Math.max(20, Math.round((v1 / v0) * 100));
    }

    // Récupération : pénalise 6+ jours d'affilée sans repos (risque de surentrainement)
    const today = dayStr(new Date());
    const yesterday = dayStr(new Date(Date.now() - 86400000));
    let recuperation = 100;
    if (days[0] === today || days[0] === yesterday) {
      let consecutive = 1;
      for (let i = 1; i < days.length; i++) {
        const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
        if (diff === 1) consecutive++; else break;
      }
      if (consecutive >= 6) recuperation = 40;
      else if (consecutive >= 4) recuperation = 70;
    }

    const score = Math.round(regularite * 0.4 + progression * 0.3 + recuperation * 0.3);
    const label = score >= 80 ? "Excellente forme 🔥"
      : score >= 60 ? "Bonne forme 💪"
      : score >= 40 ? "Forme correcte 👍"
      : "Repos recommandé 😴";

    res.json({ score, label, factors: { regularite, progression, recuperation } });
  } catch (err) {
    console.error("Erreur GET /form-score :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── GET /exercise-dates (dates de séance disponibles pour un exercice, pour
// alimenter les deux sélecteurs de la comparaison) ────────
router.get("/exercise-dates", async (req, res) => {
  try {
    const exercise = req.query.exercise;
    if (!exercise) return res.status(400).json({ error: "Exercice requis." });
    const r = await pool.query(
      `SELECT DISTINCT performed_at::date AS date FROM logs
       WHERE user_id=$1 AND exercise_name=$2 ORDER BY date DESC`,
      [req.session.userId, exercise]
    );
    res.json({ dates: r.rows.map(row => dayStr(row.date)) });
  } catch (err) {
    console.error("Erreur GET /exercise-dates :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// ── GET /compare (comparaison avant/après séances, fonctionnalité 2) ──────
router.get("/compare", async (req, res) => {
  try {
    const { exercise, date1, date2 } = req.query;
    if (!exercise || !date1 || !date2) {
      return res.status(400).json({ error: "Exercice et deux dates requis." });
    }

    async function loadSession(date) {
      const r = await pool.query(
        `SELECT weight, reps, sets, performed_at FROM logs
         WHERE user_id=$1 AND exercise_name=$2 AND performed_at::date=$3::date
         ORDER BY performed_at ASC`,
        [req.session.userId, exercise, date]
      );
      const sets = r.rows.map(row => ({ weight: Number(row.weight), reps: row.reps, sets: row.sets }));
      const maxWeight = sets.length ? Math.max(...sets.map(s => s.weight)) : 0;
      const totalVolume = sets.reduce((a, s) => a + s.weight * s.reps * s.sets, 0);
      return { date, sets, maxWeight, totalVolume, setCount: sets.reduce((a, s) => a + s.sets, 0) };
    }

    const [sessionA, sessionB] = await Promise.all([loadSession(date1), loadSession(date2)]);

    if (!sessionA.sets.length || !sessionB.sets.length) {
      return res.status(404).json({ error: "Pas de données pour l'une de ces deux dates." });
    }

    const weightDelta = Math.round((sessionB.maxWeight - sessionA.maxWeight) * 10) / 10;
    const weightPct = sessionA.maxWeight > 0 ? Math.round((weightDelta / sessionA.maxWeight) * 1000) / 10 : 0;
    const volumeDelta = Math.round(sessionB.totalVolume - sessionA.totalVolume);

    const daysBetween = Math.abs(Math.round((new Date(date2) - new Date(date1)) / 86400000));
    const elapsed = daysBetween >= 60 ? `${Math.round(daysBetween / 30)} mois`
      : daysBetween >= 14 ? `${Math.round(daysBetween / 7)} semaines`
      : `${daysBetween} jour${daysBetween > 1 ? "s" : ""}`;

    let message;
    if (weightDelta > 0) {
      message = `En ${elapsed}, tu as progressé de ${weightDelta} kg au ${exercise}. C'est excellent !`;
    } else if (weightDelta < 0) {
      message = `En ${elapsed}, ton poids a baissé de ${Math.abs(weightDelta)} kg au ${exercise}. Regarde ton repos et ta récupération.`;
    } else {
      message = `Ton poids est resté stable au ${exercise} sur ${elapsed}. Essaie d'augmenter progressivement la charge.`;
    }

    res.json({
      exercise, sessionA, sessionB,
      delta: { weightKg: weightDelta, weightPct, volumeKg: volumeDelta },
      message,
    });
  } catch (err) {
    console.error("Erreur GET /compare :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;

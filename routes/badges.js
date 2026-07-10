const express = require("express");
const pool = require("../db/pool");
const { requireAuth } = require("../middleware/auth");
const { sendBadgeUnlockedEmail, sendCertificationEmail } = require("../services/email");

const router = express.Router();
router.use(requireAuth);

function dayStr(d) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function bestStreakFromDays(days) {
  if (!days.length) return 0;
  let best = 1, tmp = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]) - new Date(days[i])) / 86400000;
    if (diff === 1) { tmp++; best = Math.max(best, tmp); } else tmp = 1;
  }
  return best;
}

// Definition des badges (Module 2.2 de la roadmap). `metric` pointe vers une
// cle du resultat de computeMetrics() ; `manual` = pas de seuil automatique,
// debloque uniquement via une action explicite (ex: partage).
const BADGE_DEFS = [
  { id: "first_session",  icon: "🎯", title: "Première séance",      desc: "Logger ta première séance",           metric: "sessions",     target: 1 },
  { id: "streak_3",       icon: "🔥", title: "3 jours de suite",       desc: "Streak de 3 jours consécutifs",       metric: "bestStreak",   target: 3 },
  { id: "streak_7",       icon: "🔥", title: "Une semaine de suite",   desc: "Streak de 7 jours consécutifs",       metric: "bestStreak",   target: 7 },
  { id: "streak_30",      icon: "🔥", title: "Un mois de suite",       desc: "Streak de 30 jours consécutifs",      metric: "bestStreak",   target: 30 },
  { id: "sessions_10",    icon: "💪", title: "10 séances",             desc: "10 séances complétées",               metric: "sessions",     target: 10 },
  { id: "sessions_50",    icon: "🏋️", title: "50 séances",             desc: "50 séances complétées",               metric: "sessions",     target: 50 },
  { id: "sessions_100",   icon: "🏆", title: "100 séances",            desc: "100 séances complétées",              metric: "sessions",     target: 100 },
  { id: "first_pr",       icon: "⚡", title: "Premier record",         desc: "Premier record personnel",            metric: "prCount",      target: 1 },
  { id: "prs_10",         icon: "🎖️", title: "10 records",             desc: "10 records personnels",               metric: "prCount",      target: 10 },
  { id: "volume_1t",      icon: "💥", title: "1 tonne en une séance",  desc: "1000 kg soulevés en une séance",      metric: "maxDayVolume", target: 1000 },
  { id: "volume_10t",     icon: "🌍", title: "10 tonnes au total",     desc: "10 000 kg soulevés au total",         metric: "totalVolume",  target: 10000 },
  { id: "early_bird",     icon: "🌅", title: "Lève-tôt",               desc: "Une séance avant 7h du matin",        metric: "earlyBird",    target: 1 },
  { id: "night_owl",      icon: "🦉", title: "Oiseau de nuit",         desc: "Une séance après 22h",                metric: "nightOwl",     target: 1 },
  { id: "premium_member", icon: "⭐", title: "Membre Premium",         desc: "Passer à la formule Premium",         metric: "premium",      target: 1 },
  { id: "social_share",   icon: "📱", title: "Partage social",         desc: "Avoir partagé une séance",            metric: "share",        target: 1, manual: true },
  { id: "certified_athlete", icon: "🎓", title: "Athlète Certifié",    desc: "Programme 12 semaines complété, 100 séances, ou 1 an de streak", metric: "certification", target: 1, manual: true },
];

const CERTIFICATION_BADGE_ID = "certified_athlete";

async function computeMetrics(uid) {
  const [daysR, prR, volR, dayVolR, timeR, userR] = await Promise.all([
    pool.query("SELECT DISTINCT performed_at::date AS day FROM logs WHERE user_id=$1 ORDER BY day DESC", [uid]),
    // Une ligne compte comme "record" si son poids depasse le max de toutes les
    // series precedentes du meme exercice (la toute premiere serie ne compte pas).
    pool.query(
      `SELECT COUNT(*) AS n FROM (
         SELECT weight,
                MAX(weight) OVER (PARTITION BY exercise_name ORDER BY performed_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_max
         FROM logs WHERE user_id=$1
       ) t WHERE prev_max IS NOT NULL AND weight > prev_max`,
      [uid]
    ),
    pool.query("SELECT COALESCE(SUM(weight*reps*sets),0) AS total FROM logs WHERE user_id=$1", [uid]),
    pool.query(
      `SELECT COALESCE(MAX(day_vol),0) AS max_day FROM (
         SELECT SUM(weight*reps*sets) AS day_vol FROM logs WHERE user_id=$1 GROUP BY performed_at::date
       ) t`,
      [uid]
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM performed_at) < 7) AS early,
              COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM performed_at) >= 22) AS night
       FROM logs WHERE user_id=$1`,
      [uid]
    ),
    pool.query("SELECT role FROM users WHERE id=$1", [uid]),
  ]);

  const days = daysR.rows.map(r => dayStr(r.day));
  const role = userR.rows[0]?.role;

  return {
    sessions: days.length,
    bestStreak: bestStreakFromDays(days),
    prCount: parseInt(prR.rows[0].n, 10) || 0,
    totalVolume: Number(volR.rows[0].total) || 0,
    maxDayVolume: Number(dayVolR.rows[0].max_day) || 0,
    earlyBird: parseInt(timeR.rows[0].early, 10) > 0 ? 1 : 0,
    nightOwl: parseInt(timeR.rows[0].night, 10) > 0 ? 1 : 0,
    premium: (role === "premium" || role === "coach") ? 1 : 0,
  };
}

// Insere le badge s'il n'est pas deja debloque et notifie via le systeme
// de notifications in-app existant. Retourne true si c'est un nouveau deblocage.
async function unlockBadge(uid, badgeId) {
  const r = await pool.query(
    `INSERT INTO user_badges (user_id, badge_id) VALUES ($1,$2)
     ON CONFLICT (user_id, badge_id) DO NOTHING RETURNING id`,
    [uid, badgeId]
  );
  if (!r.rows.length) return false;

  const def = BADGE_DEFS.find(b => b.id === badgeId);
  const isCertification = badgeId === CERTIFICATION_BADGE_ID;

  await pool.query(
    `INSERT INTO notifications (user_id, type, message, link) VALUES ($1,'badge_unlocked',$2,'/profile.html')`,
    [uid, isCertification
      ? "🎓 Félicitations ! Tu es maintenant un Athlète Certifié Gym AI Coach !"
      : `${def?.icon || "🏅"} Badge débloqué : ${def?.title || badgeId} !`]
  ).catch(e => console.error("Erreur notif badge :", e));

  pool.query("SELECT email, name FROM users WHERE id=$1", [uid])
    .then(r => {
      if (!r.rows[0]) return;
      if (isCertification) return sendCertificationEmail(r.rows[0].email, r.rows[0].name);
      if (def) return sendBadgeUnlockedEmail(r.rows[0].email, r.rows[0].name, def.title, def.icon);
    })
    .catch(e => console.error("Erreur email badge :", e));

  return true;
}

// Un programme "termine" 12 semaines consecutives avec au moins le nombre de
// seances prevu par semaine (questionnaire.joursParSemaine) compte pour la
// certification. On regarde tous les programmes de l'utilisateur (pas
// seulement l'actif : un programme termine a pu etre remplace depuis).
async function checkProgram12WeeksCompletion(uid) {
  const progsR = await pool.query(
    "SELECT questionnaire, program_start_date FROM programs WHERE user_id=$1 AND program_start_date IS NOT NULL",
    [uid]
  );
  if (!progsR.rows.length) return false;

  const logsR = await pool.query("SELECT DISTINCT performed_at::date AS day FROM logs WHERE user_id=$1", [uid]);
  const loggedDays = new Set(logsR.rows.map(r => dayStr(r.day)));
  const now = new Date();

  for (const prog of progsR.rows) {
    const targetPerWeek = parseInt(prog.questionnaire?.joursParSemaine, 10) || 3;
    const start = new Date(prog.program_start_date);
    const twelveWeeksLater = new Date(start.getTime() + 12 * 7 * 86400000);
    if (twelveWeeksLater > now) continue; // 12 semaines pas encore ecoulees pour ce programme

    let allWeeksOk = true;
    for (let w = 0; w < 12 && allWeeksOk; w++) {
      const weekStart = new Date(start.getTime() + w * 7 * 86400000);
      let count = 0;
      for (let d = 0; d < 7; d++) {
        if (loggedDays.has(dayStr(new Date(weekStart.getTime() + d * 86400000)))) count++;
      }
      if (count < targetPerWeek) allWeeksOk = false;
    }
    if (allWeeksOk) return true;
  }
  return false;
}

// Verifie les 3 criteres de certification (fonctionnalite 7) et debloque le
// badge special s'il ne l'est pas deja. Retourne true si nouvellement debloque.
async function checkCertification(uid) {
  const already = await pool.query(
    "SELECT id FROM user_badges WHERE user_id=$1 AND badge_id=$2", [uid, CERTIFICATION_BADGE_ID]
  );
  if (already.rows.length) return false;

  const metrics = await computeMetrics(uid);
  const eligible = metrics.sessions >= 100
    || metrics.bestStreak >= 365
    || await checkProgram12WeeksCompletion(uid);

  if (!eligible) return false;
  return unlockBadge(uid, CERTIFICATION_BADGE_ID);
}

// A appeler apres toute action pertinente (nouveau log, abonnement, partage...).
// Retourne la liste des badge_id nouvellement debloques.
async function checkAndUnlockBadges(uid) {
  const [metrics, unlockedR] = await Promise.all([
    computeMetrics(uid),
    pool.query("SELECT badge_id FROM user_badges WHERE user_id=$1", [uid]),
  ]);
  const alreadyUnlocked = new Set(unlockedR.rows.map(r => r.badge_id));

  const newlyUnlocked = [];
  for (const b of BADGE_DEFS) {
    if (b.manual || alreadyUnlocked.has(b.id)) continue;
    if ((metrics[b.metric] ?? 0) >= b.target) {
      if (await unlockBadge(uid, b.id)) newlyUnlocked.push(b.id);
    }
  }

  if (!alreadyUnlocked.has(CERTIFICATION_BADGE_ID) && await checkCertification(uid)) {
    newlyUnlocked.push(CERTIFICATION_BADGE_ID);
  }

  return newlyUnlocked;
}

router.get("/", async (req, res) => {
  try {
    const uid = req.session.userId;
    const [metrics, unlockedR] = await Promise.all([
      computeMetrics(uid),
      pool.query("SELECT badge_id, unlocked_at FROM user_badges WHERE user_id=$1", [uid]),
    ]);
    const unlockedMap = new Map(unlockedR.rows.map(r => [r.badge_id, r.unlocked_at]));

    const badges = BADGE_DEFS.map(b => {
      const unlocked = unlockedMap.has(b.id);
      const current = unlocked ? b.target : Math.min(metrics[b.metric] ?? 0, b.target);
      return {
        id: b.id,
        icon: b.icon,
        title: b.title,
        desc: b.desc,
        current,
        target: b.target,
        unlocked,
        unlockedAt: unlocked ? unlockedMap.get(b.id) : null,
      };
    });

    res.json({ badges, unlockedCount: badges.filter(b => b.unlocked).length, total: badges.length });
  } catch (err) {
    console.error("Erreur GET /badges :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Declenche par le bouton de partage (carte Canvas sur stats.html) : le
// badge social_share n'a pas de metrique calculable, il se debloque a l'action.
router.post("/share", async (req, res) => {
  try {
    const unlocked = await unlockBadge(req.session.userId, "social_share");
    res.json({ ok: true, unlocked });
  } catch (err) { res.status(500).json({ error: "Erreur serveur." }); }
});

// Reponse selon le role : un admin recoit la liste complete des athletes
// certifies (pour admin.html) ; un utilisateur normal recoit uniquement son
// propre statut (utilise par la sidebar pour afficher le badge a cote du nom).
router.get("/certified", async (req, res) => {
  try {
    const uid = req.session.userId;
    const userR = await pool.query("SELECT role FROM users WHERE id=$1", [uid]);

    if (userR.rows[0]?.role === "admin") {
      const r = await pool.query(
        `SELECT u.id, u.name, u.email, ub.unlocked_at
         FROM user_badges ub JOIN users u ON u.id=ub.user_id
         WHERE ub.badge_id=$1 ORDER BY ub.unlocked_at DESC`,
        [CERTIFICATION_BADGE_ID]
      );
      return res.json({ certified: r.rows });
    }

    const ownR = await pool.query(
      "SELECT unlocked_at FROM user_badges WHERE user_id=$1 AND badge_id=$2",
      [uid, CERTIFICATION_BADGE_ID]
    );
    res.json({ certified: !!ownR.rows[0], certifiedAt: ownR.rows[0]?.unlocked_at || null });
  } catch (err) {
    console.error("Erreur GET /badges/certified :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

// Declenche manuellement la verification de certification (aussi appelee
// automatiquement apres chaque nouveau log via checkAndUnlockBadges).
router.post("/check-certification", async (req, res) => {
  try {
    const unlocked = await checkCertification(req.session.userId);
    res.json({ ok: true, unlocked });
  } catch (err) {
    console.error("Erreur POST /badges/check-certification :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
module.exports.checkAndUnlockBadges = checkAndUnlockBadges;

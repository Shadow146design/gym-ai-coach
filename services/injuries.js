// Detection automatique des blessures (fonctionnalite 5). Trois signaux :
// mention dans le chat ("douleur"/"mal"/"blessure"), chute de performance
// >30% en une seance, regression sur 3 seances consecutives. Chaque signal
// appelle flagInjury(), qui evite les doublons (un seul flag non resolu par
// user+exercice+type a la fois) et notifie l'utilisateur + son coach si assigne.
const pool = require("../db/pool");

const BODY_PARTS = [
  "dos", "épaule", "epaule", "genou", "coude", "poignet", "cheville", "hanche",
  "cou", "nuque", "lombaire", "ischio", "quadriceps", "biceps", "triceps",
  "pectoraux", "mollet", "abdo", "trapèze", "trapeze",
];

// Cherche une mention de douleur/blessure dans un message de chat et essaie
// d'identifier la zone concernee (nom d'exercice recent ou partie du corps),
// pour remplir exercise_name meme quand l'utilisateur ne cite pas un exercice
// precis ("j'ai mal au dos" plutot que "j'ai mal au Rowing barre").
function detectChatInjuryMention(text, recentExerciseNames = []) {
  const lower = String(text || "").toLowerCase();
  if (!/(douleur|\bmal\b|blessure)/.test(lower)) return null;

  const exerciseMatch = recentExerciseNames.find(name => lower.includes(name.toLowerCase()));
  if (exerciseMatch) return exerciseMatch;

  const bodyPart = BODY_PARTS.find(b => lower.includes(b));
  return bodyPart ? bodyPart.charAt(0).toUpperCase() + bodyPart.slice(1) : "Général";
}

async function flagInjury(userId, exerciseName, type) {
  try {
    const existing = await pool.query(
      "SELECT id FROM injury_flags WHERE user_id=$1 AND exercise_name=$2 AND type=$3 AND resolved_at IS NULL",
      [userId, exerciseName, type]
    );
    if (existing.rows.length) return; // deja signale, pas de doublon

    await pool.query(
      "INSERT INTO injury_flags (user_id, exercise_name, type) VALUES ($1,$2,$3)",
      [userId, exerciseName, type]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, type, message, link) VALUES ($1,'injury_flag',$2,'/dashboard.html')`,
      [userId, `⚠️ On a détecté une possible fatigue au ${exerciseName}. Veux-tu adapter ton programme ?`]
    );

    const assignmentR = await pool.query(
      "SELECT coach_id FROM coach_assignments WHERE client_id=$1 AND status='active'",
      [userId]
    );
    const coachId = assignmentR.rows[0]?.coach_id;
    if (coachId) {
      const clientR = await pool.query("SELECT name FROM users WHERE id=$1", [userId]);
      const clientName = clientR.rows[0]?.name || "Ton client";
      await pool.query(
        `INSERT INTO notifications (user_id, type, message, link) VALUES ($1,'injury_flag',$2,'/coach-dashboard.html')`,
        [coachId, `⚠️ ${clientName} montre des signes de fatigue/gêne au ${exerciseName}.`]
      );
    }
  } catch (e) {
    console.error("Erreur flagInjury :", e);
  }
}

module.exports = { flagInjury, detectChatInjuryMention };

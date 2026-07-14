const pool = require("../db/pool");

// Enregistre une modification de programme (fonctionnalite 3.7). previousContent
// doit etre un instantane du contenu AVANT la modification (pris avant toute
// mutation en place), pour permettre un retour en arriere fidele.
async function logProgramChange(userId, programId, changeType, description, previousContent) {
  try {
    await pool.query(
      `INSERT INTO program_history (user_id, program_id, change_type, change_description, previous_content)
       VALUES ($1,$2,$3,$4,$5)`,
      [userId, programId, changeType, description, JSON.stringify(previousContent)]
    );
  } catch (e) {
    console.error("Erreur logProgramChange :", e);
  }
}

module.exports = { logProgramChange };

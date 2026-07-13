require("dotenv").config();
const pool = require("../db/pool");
const { fetchWgerDemo } = require("../services/wgerDemo");
const { EXERCISE_DATABASE } = require("../services/aiCoach");
const EXERCISES = require("../public/js/exercises-data.js");

// Pre-remplit le cache exercise_demos avec tous les exercices connus de
// l'app (base generee par l'IA + bibliotheque publique), pour eviter le
// premier appel Wger (lent, ~1-2s) a la premiere ouverture de chaque
// exercice en prod. Idempotent : ne touche pas aux entrees deja en cache.
const names = new Set([
  ...Object.values(EXERCISE_DATABASE).flat(),
  ...EXERCISES.map(e => e.name),
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function seed() {
  console.log(`Seed de ${names.size} exercices...`);
  let found = 0, missed = 0, skipped = 0;

  for (const name of names) {
    const cacheKey = name.toLowerCase().trim();
    const existing = await pool.query("SELECT 1 FROM exercise_demos WHERE exercise_name=$1", [cacheKey]);
    if (existing.rows.length) { skipped++; continue; }

    const demo = await fetchWgerDemo(name);
    await pool.query(
      `INSERT INTO exercise_demos (exercise_name, image_url, description, muscles) VALUES ($1,$2,$3,$4)
       ON CONFLICT (exercise_name) DO UPDATE SET image_url=$2, description=$3, muscles=$4, cached_at=NOW()`,
      [cacheKey, demo?.imageUrl || null, demo?.description || null, demo?.muscles || []]
    );

    if (demo?.imageUrl) { found++; console.log(`  OK    ${name}`); }
    else { missed++; console.log(`  MISS  ${name}`); }

    await sleep(300); // reste courtois envers l'API publique Wger
  }

  console.log(`\nTermine : ${found} images trouvees, ${missed} manquantes, ${skipped} deja en cache.`);
  await pool.end();
}

seed().catch(e => { console.error("Erreur seed exercise_demos :", e); process.exit(1); });

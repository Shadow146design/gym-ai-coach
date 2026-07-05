// Bibliotheque d'exercices — donnees statiques (pas besoin de DB pour du contenu de reference)
const EXERCISES = [
  // ── Poitrine ──────────────────────────────────────────────
  { name: "Développé couché barre", muscle_group: "Poitrine", secondary: ["Épaules", "Triceps"], description: "Mouvement de base pour la masse et la force du haut du corps, allongé sur banc plat.", tip: "Rétracte les omoplates et garde les coudes à ~45° du buste pour protéger les épaules." },
  { name: "Développé incliné haltères", muscle_group: "Poitrine", secondary: ["Épaules"], description: "Cible le haut des pectoraux avec une plus grande amplitude qu'à la barre.", tip: "Incline le banc à 30-45° max : plus haut, ce sont surtout les épaules qui travaillent." },
  { name: "Développé décliné", muscle_group: "Poitrine", secondary: ["Triceps"], description: "Accentue le bas des pectoraux.", tip: "Bloque bien les pieds et descends la barre au niveau du bas de la poitrine." },
  { name: "Écarté couché haltères", muscle_group: "Poitrine", secondary: [], description: "Isolation en étirement des pectoraux.", tip: "Garde une légère flexion des coudes tout au long du mouvement pour protéger l'articulation." },
  { name: "Dips (pectoraux)", muscle_group: "Poitrine", secondary: ["Triceps", "Épaules"], description: "Exercice au poids du corps, buste penché en avant pour cibler la poitrine.", tip: "Penche le buste vers l'avant et descends jusqu'à un angle de coude de 90°." },
  { name: "Pompes", muscle_group: "Poitrine", secondary: ["Triceps", "Abdos"], description: "Grand classique au poids du corps, adaptable à tous les niveaux.", tip: "Garde le corps aligné (pas de dos cambré) et descends la poitrine près du sol." },
  { name: "Butterfly (pec deck)", muscle_group: "Poitrine", secondary: [], description: "Machine d'isolation, sécuritaire pour les débutants.", tip: "Ne verrouille pas les coudes en fin de mouvement, garde la tension musculaire." },

  // ── Dos ───────────────────────────────────────────────────
  { name: "Tractions pronation", muscle_group: "Dos", secondary: ["Biceps"], description: "Exercice au poids du corps pour la largeur du dos.", tip: "Tire avec les coudes, pas avec les mains, pour bien recruter le grand dorsal." },
  { name: "Tirage horizontal poulie basse", muscle_group: "Dos", secondary: ["Biceps"], description: "Cible l'épaisseur du dos en position assise.", tip: "Garde le buste droit et ramène les coudes le long du corps sans t'aider du dos." },
  { name: "Rowing barre buste penché", muscle_group: "Dos", secondary: ["Biceps", "Épaules"], description: "Mouvement polyarticulaire majeur pour la masse dorsale.", tip: "Garde le dos plat, buste à 45°, et tire la barre vers le nombril." },
  { name: "Tirage vertical poulie haute", muscle_group: "Dos", secondary: ["Biceps"], description: "Alternative aux tractions, charge ajustable.", tip: "Tire la barre vers le haut de la poitrine en gainant le buste, évite de te pencher en arrière." },
  { name: "Rowing haltère unilatéral", muscle_group: "Dos", secondary: ["Biceps"], description: "Rowing un bras appuyé sur un banc, bonne amplitude.", tip: "Garde le dos parallèle au sol et évite la rotation du buste." },
  { name: "Soulevé de terre", muscle_group: "Dos", secondary: ["Fessiers", "Jambes"], description: "Mouvement polyarticulaire complet, référence en force.", tip: "Garde le dos neutre (pas rond) et pousse le sol avec les jambes plutôt que de tirer avec le dos." },
  { name: "Tirage face à la poulie", muscle_group: "Dos", secondary: ["Épaules"], description: "Cible les trapèzes moyens et les rhomboïdes.", tip: "Tire la corde vers le visage en écartant les mains, coudes hauts." },

  // ── Épaules ───────────────────────────────────────────────
  { name: "Développé militaire barre", muscle_group: "Épaules", secondary: ["Triceps"], description: "Mouvement de base pour la force et la masse des épaules.", tip: "Gaine les abdos et évite de trop cambrer le bas du dos en poussant." },
  { name: "Développé haltères assis", muscle_group: "Épaules", secondary: ["Triceps"], description: "Variante plus confortable pour les épaules et les poignets.", tip: "Ne descends pas trop bas pour préserver les épaules, arrête au niveau des oreilles." },
  { name: "Élévations latérales", muscle_group: "Épaules", secondary: [], description: "Isolation du deltoïde latéral pour la largeur d'épaules.", tip: "Monte les bras jusqu'à l'horizontale max, coudes légèrement fléchis, sans élan." },
  { name: "Élévations frontales", muscle_group: "Épaules", secondary: [], description: "Cible le deltoïde antérieur.", tip: "Monte jusqu'à hauteur d'épaule, évite de balancer le corps." },
  { name: "Oiseau (élévations arrière)", muscle_group: "Épaules", secondary: ["Dos"], description: "Cible le deltoïde postérieur, souvent négligé.", tip: "Buste penché en avant, dos plat, écarte les bras comme des ailes." },
  { name: "Rowing menton", muscle_group: "Épaules", secondary: ["Dos"], description: "Cible les trapèzes et deltoïdes.", tip: "Monte la barre le long du corps, coudes toujours au-dessus des mains." },

  // ── Biceps ────────────────────────────────────────────────
  { name: "Curl barre droite", muscle_group: "Biceps", secondary: [], description: "Exercice de base pour la masse des biceps.", tip: "Garde les coudes fixes le long du corps, ne balance pas le dos." },
  { name: "Curl haltères alterné", muscle_group: "Biceps", secondary: [], description: "Permet de travailler chaque bras indépendamment.", tip: "Supine le poignet en montant pour maximiser la contraction du biceps." },
  { name: "Curl marteau", muscle_group: "Biceps", secondary: ["Avant-bras"], description: "Cible le biceps et le brachial, bonne prise neutre.", tip: "Garde le poignet neutre tout au long du mouvement, sans à-coups." },
  { name: "Curl pupitre (Scott)", muscle_group: "Biceps", secondary: [], description: "Isolation stricte, élimine la triche.", tip: "Ne verrouille pas complètement les coudes en bas pour garder la tension." },
  { name: "Curl câble poulie basse", muscle_group: "Biceps", secondary: [], description: "Tension constante sur tout le mouvement.", tip: "Recule légèrement pour garder une tension continue en haut du mouvement." },

  // ── Triceps ───────────────────────────────────────────────
  { name: "Développé couché prise serrée", muscle_group: "Triceps", secondary: ["Poitrine"], description: "Mouvement polyarticulaire pour la masse des triceps.", tip: "Garde les coudes proches du corps pendant toute la descente." },
  { name: "Extension triceps poulie haute", muscle_group: "Triceps", secondary: [], description: "Isolation classique à la corde ou à la barre.", tip: "Garde les coudes fixes contre le corps, seul l'avant-bras bouge." },
  { name: "Extension triceps nuque haltère", muscle_group: "Triceps", secondary: [], description: "Étirement complet du triceps au-dessus de la tête.", tip: "Garde les coudes proches de la tête, évite de les écarter." },
  { name: "Dips (triceps)", muscle_group: "Triceps", secondary: ["Poitrine", "Épaules"], description: "Buste droit pour cibler davantage les triceps.", tip: "Garde le buste vertical et les coudes proches du corps." },
  { name: "Kick-back haltère", muscle_group: "Triceps", secondary: [], description: "Isolation en fin de mouvement, buste penché.", tip: "Garde le bras parallèle au sol et n'utilise que l'avant-bras pour l'extension." },

  // ── Jambes ────────────────────────────────────────────────
  { name: "Squat barre", muscle_group: "Jambes", secondary: ["Fessiers", "Abdos"], description: "Roi des exercices jambes, polyarticulaire complet.", tip: "Descends jusqu'à ce que les hanches passent sous les genoux, genoux alignés avec les pieds." },
  { name: "Presse à cuisses", muscle_group: "Jambes", secondary: ["Fessiers"], description: "Alternative guidée au squat, charge élevée possible.", tip: "Ne verrouille jamais complètement les genoux en haut du mouvement." },
  { name: "Fentes avant haltères", muscle_group: "Jambes", secondary: ["Fessiers"], description: "Travail unilatéral, bon pour l'équilibre musculaire.", tip: "Garde le buste droit et le genou avant aligné avec la cheville." },
  { name: "Leg extension", muscle_group: "Jambes", secondary: [], description: "Isolation du quadriceps.", tip: "Contrôle la descente, ne laisse pas la charge retomber brutalement." },
  { name: "Leg curl allongé", muscle_group: "Jambes", secondary: [], description: "Isolation des ischio-jambiers.", tip: "Évite de décoller les hanches du banc pendant la flexion." },
  { name: "Fentes bulgares", muscle_group: "Jambes", secondary: ["Fessiers"], description: "Variante unilatérale avec pied arrière surélevé, très exigeante.", tip: "Garde le tibia avant le plus vertical possible en descendant." },
  { name: "Mollets debout", muscle_group: "Jambes", secondary: [], description: "Isolation des mollets (gastrocnémiens).", tip: "Monte le plus haut possible sur la pointe des pieds et marque une pause en haut." },

  // ── Fessiers ──────────────────────────────────────────────
  { name: "Hip thrust barre", muscle_group: "Fessiers", secondary: ["Jambes"], description: "Meilleur exercice d'isolation pour les fessiers.", tip: "Serre bien les fessiers en haut du mouvement et évite de trop cambrer le bas du dos." },
  { name: "Soulevé de terre roumain", muscle_group: "Fessiers", secondary: ["Jambes", "Dos"], description: "Cible fessiers et ischio-jambiers en étirement.", tip: "Garde les jambes presque tendues et pousse les hanches vers l'arrière." },
  { name: "Abduction hanche machine", muscle_group: "Fessiers", secondary: [], description: "Isolation du moyen fessier.", tip: "Garde le buste stable, évite de te pencher pour tricher." },
  { name: "Fentes marchées", muscle_group: "Fessiers", secondary: ["Jambes"], description: "Version dynamique des fentes, très complète.", tip: "Fais de grands pas et pousse principalement avec le talon avant." },
  { name: "Good morning", muscle_group: "Fessiers", secondary: ["Dos"], description: "Charnière de hanche à la barre, cible fessiers et lombaires.", tip: "Garde le dos plat et une légère flexion des genoux, hanches vers l'arrière." },

  // ── Abdos ─────────────────────────────────────────────────
  { name: "Crunch au sol", muscle_group: "Abdos", secondary: [], description: "Isolation basique des grands droits.", tip: "Ne tire pas sur la nuque, laisse les abdos faire le travail." },
  { name: "Relevé de jambes suspendu", muscle_group: "Abdos", secondary: [], description: "Cible le bas des abdominaux, exigeant.", tip: "Évite le balancement, contrôle la descente des jambes." },
  { name: "Planche (gainage)", muscle_group: "Abdos", secondary: ["Dos"], description: "Gainage statique complet du tronc.", tip: "Garde le corps aligné tête-bassin-talons, ne laisse pas les hanches tomber." },
  { name: "Russian twist", muscle_group: "Abdos", secondary: [], description: "Rotation du tronc, cible les obliques.", tip: "Garde le dos droit et fais tourner le buste plutôt que juste les bras." },
  { name: "Crunch câble à genoux", muscle_group: "Abdos", secondary: [], description: "Permet de charger progressivement le travail abdominal.", tip: "Arrondis le dos en descendant, ne tire pas avec les bras." },
  { name: "Roue abdominale (ab wheel)", muscle_group: "Abdos", secondary: ["Dos"], description: "Exercice avancé, très complet pour le gainage.", tip: "Garde les hanches basses et n'avance que ce que tu peux contrôler au retour." },

  // ── Full body ─────────────────────────────────────────────
  { name: "Burpees", muscle_group: "Full body", secondary: ["Abdos", "Jambes"], description: "Exercice cardio-musculation complet au poids du corps.", tip: "Garde un rythme soutenu mais contrôle la réception au sol pour protéger les poignets." },
  { name: "Kettlebell swing", muscle_group: "Full body", secondary: ["Fessiers", "Dos"], description: "Mouvement balistique de hanche, excellent pour le cardio et la puissance.", tip: "Le mouvement part des hanches, pas des bras ni du dos." },
  { name: "Thruster (squat + développé)", muscle_group: "Full body", secondary: ["Jambes", "Épaules"], description: "Combine squat et développé militaire en un seul mouvement fluide.", tip: "Utilise l'élan du squat pour enchaîner directement sur le développé." },
  { name: "Clean and press", muscle_group: "Full body", secondary: ["Dos", "Épaules"], description: "Mouvement olympique simplifié, très complet.", tip: "Technique avant charge : fais-toi accompagner au début pour apprendre le geste." },
  { name: "Développé couché avec dips (superset)", muscle_group: "Full body", secondary: ["Poitrine", "Triceps"], description: "Superset combinant deux mouvements de poussée.", tip: "Enchaîne sans repos entre les deux exercices pour maximiser la fatigue musculaire." },
];

if (typeof module !== "undefined") module.exports = EXERCISES;

# Gym AI Coach

Site full-stack qui genere un programme de musculation personnalise via IA
(questionnaire -> programme structure), et qui permet a chaque utilisateur de
logger ses series (poids x reps) pour suivre sa progression et ses records
personnels.

## Stack

- **Backend** : Node.js + Express
- **Base de donnees** : PostgreSQL (comptes, programmes, historique des series)
- **IA** : API Groq (gratuite, modele Llama 3.3 70B) pour generer les programmes
- **Frontend** : HTML/CSS/JS vanilla + Chart.js pour les graphes
- **Auth** : sessions stockees en base (bcryptjs pour les mots de passe)

---

## Mise en ligne sur Render (recommande — pareil que Galaxy Sinks)

### Etape 1 — Mettre le code sur GitHub

Dezippe d'abord le fichier `gym-ai-coach.zip` que je t'ai donne.

**En ligne (le plus simple si tu n'es pas a l'aise avec git) :**
1. Va sur github.com -> **New repository** -> nomme-le `gym-ai-coach` -> **Create repository**
2. Sur la page du repo vide, clique sur **"uploading an existing file"**
3. Glisse-depose tout le contenu du dossier dezippe (tous les fichiers et dossiers) -> **Commit changes**

**Au terminal (si tu preferes) :**
```bash
cd gym-ai-coach
git init
git add .
git commit -m "premier commit"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/gym-ai-coach.git
git push -u origin main
```

### Etape 2 — Creer la base de donnees

**Si Render te dit "cannot have more than one active free tier database"**
(normal si tu as deja une base gratuite pour Galaxy Sinks — Render n'autorise
qu'une seule base Postgres gratuite par compte), utilise **Neon**
(https://neon.tech) a la place. C'est aussi gratuit, sans CB, et c'est du
Postgres standard donc ca marche avec exactement le meme code :

1. Va sur https://neon.tech -> **Sign up** (avec GitHub par exemple)
2. Cree un projet, nomme-le `gym-ai-coach`
3. Sur le dashboard du projet, dans **Connection string**, copie l'URL
   complete (elle commence par `postgresql://...` et finit par
   `?sslmode=require`) — garde-la pour l'etape 4

**Sinon, si tu n'as pas encore de base gratuite sur Render :**

1. Sur render.com -> **New +** -> **PostgreSQL**
2. Donne-lui un nom (ex: `gym-ai-coach-db`) -> **Create Database**
3. Une fois creee, sur sa page, copie la valeur **Internal Database URL**
   (ca commence par `postgres://...`) — garde-la sous la main pour l'etape 4

### Etape 3 — Creer le Web Service

1. **New +** -> **Web Service**
2. Connecte ton repo GitHub `gym-ai-coach` (Render te demande d'autoriser
   l'acces si c'est la premiere fois)
3. **Build Command** : `npm install`
4. **Start Command** : `npm start`
5. Clique **Create Web Service**

Le premier deploiement va echouer, c'est normal : il manque encore les
variables d'environnement (etape suivante).

### Etape 4 — Ajouter les variables d'environnement

Sur la page du Web Service -> onglet **Environment** -> **Add Environment
Variable**, ajoute une par une :

| Cle | Valeur |
|---|---|
| `DATABASE_URL` | l'Internal Database URL copiee a l'etape 2 |
| `GROQ_API_KEY` | ta cle gratuite — cree-la sur https://console.groq.com/keys ("Create API Key") |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `SESSION_SECRET` | une longue chaine aleatoire (tape n'importe quoi de long) |
| `NODE_ENV` | `production` |

Clique **Save Changes** — ca relance un deploiement automatiquement.

### Etape 5 — Creer les tables dans la base

1. Sur la page du Web Service, en haut, ouvre l'onglet **Shell**
2. Tape :
   ```bash
   npm run db:init
   ```
3. Tu dois voir `Tables creees avec succes`

### Etape 6 — C'est en ligne

En haut de la page du Web Service, tu as une URL du type
`gym-ai-coach.onrender.com`. Clique dessus, le site est live. Cree un compte
et teste le questionnaire.

---

## En local (optionnel, pour tester avant de mettre en ligne)

Il faut avoir Node.js et PostgreSQL installes sur ton PC.

```bash
npm install
cp .env.example .env
```

Remplis `.env` avec ta `DATABASE_URL` locale et ta `GROQ_API_KEY`, puis :

```bash
npm run db:init   # cree les tables
npm start         # lance le serveur
```

Le site est sur http://localhost:3000

---

## Comment ca marche

- `POST /api/auth/register` / `/login` -> creation de compte / connexion
- `POST /api/program/generate` -> envoie les reponses du questionnaire a
  l'IA (service `services/aiCoach.js`), qui renvoie un JSON strict
  `{ title, summary, days: [...], advice: [...] }`, sauvegarde en base
- `GET /api/program/active` -> recupere le programme actif de l'utilisateur
- `POST /api/logs` -> enregistre une serie (exercice, poids, reps)
- `GET /api/logs?exercise=X` -> historique pour tracer la courbe de
  progression d'un exercice
- `GET /api/logs/records` -> poids max par exercice (records personnels)

## Pistes d'amelioration

- Ajouter un calendrier des seances passees
- Permettre d'editer/supprimer un log
- Ajouter des graphes de volume total par semaine (sets x reps x poids)
- Notifier quand un nouveau record est battu
- Connexion via Discord OAuth (tu as deja ce code cote Galaxy Sinks, reutilisable ici)

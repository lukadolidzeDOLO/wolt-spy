# 🕵️ Spy at Wolt — Support floor spy game

The classic spy party game (Spyfall-style), Wolt edition. One of you is the spy,
everyone else knows the secret location. Rooms with shareable codes, timed rounds,
voting, spy guess — and per-device secret cards so teammates sitting next to you
can't peek. Made for the Wolt Support floor. 💙

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind CSS v4
- **PostgreSQL** via **Drizzle ORM** (`src/db/schema.ts`)
- Multiplayer = client polling of a single GET endpoint + a POST action endpoint.
  No WebSockets or external services needed.

---

## ☁️ Deploying to Netlify

Netlify supports Next.js App Router, API routes and image optimization out of the
box (OpenNext adapter — zero config). You only need to provide the **database**.

### 1. Get a hosted PostgreSQL database

Netlify doesn't host databases. Use any Postgres provider that gives you a
public connection string — [Neon](https://neon.tech) is the easiest (free tier):

1. Create a project, copy the **pooled** connection string
   (it includes `sslmode=require`, which is required — e.g.
   `postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/dbname?sslmode=require`).
2. Supabase/Railway/Render also work. For serverless use the pooled/transaction
   connection string to avoid exhausting connections.

### 2. Create the tables in your hosted DB

From your machine, in this folder:

```bash
DATABASE_URL="<your hosted connection string>" npx drizzle-kit push
```

(`drizzle.config.ts` reads `DATABASE_URL` from the environment automatically.)

### 3. Push the code to GitHub

```bash
git init
git add .
git commit -m "Spy at Wolt"
git branch -M main
git remote add origin git@github.com:<you>/spy-at-wolt.git
git push -u origin main
```

### 4. Import the repo on Netlify

1. **Netlify dashboard → Add new site → Import an existing project** → pick your repo.
2. Build settings are auto-detected (Next.js): keep
   `build command: npm run build`, `publish directory: .next`.
3. **Site settings → Environment variables** — add:
   - `DATABASE_URL` = your hosted connection string **(required — the app fails
     to build without it)**
   - `NODE_VERSION` = `22`
   - (optional) `NETLIFY_NEXT_SKEW_PROTECTION` = `true` — keeps players' screens
     working if you deploy mid-game
4. **Deploy site.** You get `https://<your-site>.netlify.app` 🎉

### Alternative: Netlify CLI

```bash
npm i -g netlify-cli
netlify login
netlify init            # link this folder to a site
netlify env:set DATABASE_URL "<your connection string>"
netlify deploy --build --prod
```

---

## 🧪 Verify it works

After deploying:

- Visit `/` → create a room.
- Open the room link in a second tab (or phone) → join with a different name —
  this simulates your teammates.
- Start the mission, vote, finish a round.

Or check the API: `curl https://<your-site>.netlify.app/api/health`

## ⚠️ Things to know about serverless hosting

- **Cold starts:** after idle, the first request takes a few seconds. It's a
  party game — nobody notices.
- **Function timeout:** 10s free / 26s paid. All queries here are milliseconds.
- **Secrets:** never commit `.env` — only the Netlify dashboard holds
  `DATABASE_URL`.
- **Migrations:** run `DATABASE_URL=... npx drizzle-kit push` from your machine
  whenever you change `src/db/schema.ts` (there's no auto-migrate on deploy).

## 🎮 How to play

1. Host creates a room → 5-letter code + invite link.
2. Teammates join (min. 3 players) with a name + emoji avatar.
3. Everyone gets a secret location card — **except the spy** (tap to reveal;
   cards auto-hide between rounds).
4. Ask questions out loud, don't say the location. (5-min timer)
5. Vote for the suspected spy (90s timer). Abstain if clueless.
6. If the spy is caught, they get ONE guess at the location. Right = spy wins.
7. Confetti, snark, and a rematch. 🎊

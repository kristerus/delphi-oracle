# 🔮 Delphi Oracle

> An agentic AI future simulator that maps your possible futures as an interactive branching timeline.

Delphi Oracle analyzes your digital footprint and generates probability-weighted branching future timelines for any life decision — visualized as a stunning, explorable horizontal tree.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15.5 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + OKLCH color system |
| Auth | Better Auth (email/password + GitHub OAuth) |
| Database | Neon PostgreSQL + Drizzle ORM |
| Tree viz | React Flow (XyFlow) |
| AI | Claude / OpenAI (model-agnostic, BYOK) |
| Backend | Python FastAPI |
| Fonts | Geist Sans + Geist Mono |

---

## Project Structure

```
delphi-oracle/
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   │   ├── tree/          # FutureTree, FutureNode, BranchEdge
│   │   ├── profile/       # DataInputForm, DigitalFootprint
│   │   └── layout/        # Navbar, Sidebar, Footer
│   ├── lib/               # Core utilities
│   │   ├── auth.ts        # Better Auth config
│   │   ├── db/            # Drizzle schema + client
│   │   └── ai/            # Model-agnostic AI client
│   └── hooks/             # useOracle, useProfile
└── backend/               # FastAPI Python backend
    ├── agents/            # scraper, analyzer, simulator
    └── models/            # Pydantic schemas
```

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in your values
```

Required:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Random 32+ char secret (`openssl rand -base64 32`)
- `BETTER_AUTH_URL` — Your app URL
- At least one AI key: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`

Optional:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — for GitHub OAuth

### 3. Set up the database

```bash
# Push schema to Neon
npm run db:push

# Or generate and run migrations
npm run db:generate
npm run db:migrate
```

### 4. Run the development server

```bash
# Frontend
npm run dev

# Backend (separate terminal)
cd backend
pip install -r requirements.txt
python main.py
```

Open [http://localhost:3000](http://localhost:3000).

---

## Key Features

### 🌳 Interactive Future Tree
Navigate branching probability-weighted timelines with React Flow. Each node shows probability, timeframe, pros/cons, and key milestones.

### 🔍 Digital Footprint Scraping
The backend scraper agent finds your public professional presence across LinkedIn, GitHub, personal sites, and more — then an LLM extracts a structured profile.

### 🤖 Model-Agnostic AI
Bring your own Claude, GPT-4, or custom endpoint key. Keys are encrypted at rest. The oracle uses your key only during simulation.

### 🌿 Branch Extension
Click **Extend branch** on any future node to generate deeper sub-branches — going months or years further into that specific timeline.

---

## Database Schema

- **users** — Better Auth managed user accounts
- **profiles** — Extended profile data (bio, experience, skills, scraped data)
- **simulations** — Simulation sessions tied to a user
- **future_nodes** — Individual tree nodes with probability, description, details
- **api_keys** — Encrypted AI provider keys per user

---

## Backend API (FastAPI)

| Endpoint | Description |
|----------|------------|
| `GET /health` | Health check |
| `POST /scrape` | Web scrape a person's footprint |
| `POST /analyze` | Extract structured profile from raw text |
| `POST /simulate` | Generate future branches |
| `POST /extend` | Extend a branch deeper |

Run `python main.py` and visit `http://localhost:8000/docs` for interactive Swagger UI.

---

## Design System

- **Colors**: OKLCH color system — `void` (navy), `oracle` (gold), `nebula` (purple), `signal` (teal)
- **Typography**: Geist Sans (UI) + Geist Mono (code/numbers)
- **Cards**: Glassmorphism — `bg-void-800/70 backdrop-blur-xl`
- **Dark first**: All components designed dark-mode-first

---

## Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set environment variables in Vercel dashboard.

### Backend (Railway / Fly.io)

```bash
# Example with Railway
railway up
```

---

## License

MIT

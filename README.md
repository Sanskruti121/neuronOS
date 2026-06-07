# NeuronOS — AI-Powered Personal Operating System

> Your inbox, tasks, and GitHub activity — unified by AI.

## What it does

- **Email Intelligence**: Reads your Gmail, scores priority with AI (0–100), auto-creates tasks from action items
- **AI Command Bar (⌘K)**: Natural language interface — type "Summarize today" or "What's urgent?" for instant AI responses
- **Semantic Search**: Embeddings-based search across all emails and tasks using OpenAI text-embedding-3-small
- **Async Workflows**: Celery queue syncs Gmail every 15 minutes, sends Telegram alerts for high-priority emails
- **GitHub Integration**: Recent commits, open PRs, and coding stats on your dashboard

## Architecture

```
┌─────────────────────────────────────────────────────┐
│               Next.js 15 Frontend                    │
│         (Dashboard, Inbox, Tasks, Cmd+K)            │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│               FastAPI Backend                        │
│         (Auth, Gmail, Tasks, AI routes)             │
└────────┬──────────────────────────────┬─────────────┘
         │                              │
┌────────▼────────┐          ┌──────────▼──────────────┐
│   PostgreSQL    │          │  Celery Worker (Redis)   │
│   (SQLAlchemy)  │          │  - Gmail sync 15m        │
└─────────────────┘          │  - AI email processing   │
                             │  - Telegram alerts       │
                             │  - Daily digest 8 AM     │
                             └──────────┬───────────────┘
                                        │
                    ┌───────────────────▼──────────────┐
                    │  External APIs                   │
                    │  OpenAI GPT-4o-mini + embeddings │
                    │  Gmail API | GitHub API v3        │
                    │  Telegram Bot API                 │
                    └──────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Zustand, React Query |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic |
| AI | OpenAI GPT-4o-mini + text-embedding-3-small |
| Queue | Celery + Redis |
| Database | PostgreSQL |
| Deploy | Vercel (frontend) + Railway (backend) |

## AI Features

**Email Priority Scoring** — GPT-4o-mini scores each email 0–100 with a reason. 80+ = urgent (respond today), 60–79 = important (24h), 40–59 = normal, 0–39 = FYI.

**Task Extraction** — LLM extracts action items with a confidence score. Only tasks with confidence > 0.7 are saved, eliminating noise.

**Semantic Search** — Emails and tasks are embedded using text-embedding-3-small (1536 dimensions). At query time, cosine similarity ranks results by relevance. Production would use pgvector.

**Daily Digest** — Personalized morning briefing combining email stats, open tasks, and GitHub activity.

## Local Setup

```bash
# 1. Clone and set up backend
cd neuronos/backend
pip install -r requirements.txt
cp .env.example .env
# Fill in your API keys in .env

# 2. Start PostgreSQL and Redis (e.g. via Docker)
docker run -d -p 5432:5432 -e POSTGRES_DB=neuronos -e POSTGRES_PASSWORD=password postgres
docker run -d -p 6379:6379 redis

# 3. Start backend
uvicorn app.main:app --reload --port 8000

# 4. Start Celery worker (separate terminal)
celery -A app.celery_app worker --loglevel=info

# 5. Set up frontend
cd ../frontend
npm install
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev

# App: http://localhost:3000
# API docs: http://localhost:8000/docs
```

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /auth/google | Start Google OAuth flow |
| GET | /auth/me | Get current user |
| POST | /gmail/sync | Sync Gmail inbox + run AI |
| GET | /gmail/emails | List emails with AI analysis |
| GET | /tasks | List all tasks |
| POST | /tasks | Create task manually |
| PATCH | /tasks/{id} | Update task status |
| POST | /tasks/extract-from-email/{id} | AI task extraction |
| GET | /ai/daily-digest | Generate morning briefing |
| POST | /ai/command | AI Command Bar query |
| GET | /ai/search?q=query | Semantic search |
| GET | /github/activity | Recent commits + PRs |

---

Built in 3 days as a portfolio project demonstrating AI integration, async architecture, and real-world API design.

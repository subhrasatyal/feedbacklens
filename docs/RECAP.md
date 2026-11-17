# Recap: The Product Lab, so far

## Pitch (30 seconds)
The Product Lab helps a product manager go from a vague question ("Customers keep asking for an AI assistant. Should we build one?") to a decision brief backed by evidence. An AI agent investigates customer evidence, and the PM approves each action and makes the final call. So far I've built the foundation: a Python backend, a React frontend and a Postgres database.

## Architecture
```
Browser (React + Vite, :5173)
   │  fetch('/api/...')
   ▼
Vite dev proxy ──► FastAPI backend (:8000) ──► Postgres on Supabase
                      reads secrets from backend/.env
```
**Why this split:** the AI reasoning and the data live in the backend, and the UI only displays them. That lets the themed "lab" UI and a plain UI show the same investigation.

## What we built, step by step

### 1. Project skeleton (commit `fbda391`)
- **Backend:** a Python project managed by `uv`, using FastAPI. It has one route, `GET /api/health`, which returns `{"status": "ok"}`.
- **Frontend:** a Vite + React page (`App.jsx`) that calls `/api/health` when it loads and shows the result.
- **Dev proxy** (`vite.config.js`): requests to `/api/*` are forwarded to `localhost:8000`, so the frontend can use short relative URLs.
- **Root `.gitignore`:** keeps secrets (`.env`), virtual environments, `node_modules` and build output out of git.
- **Why:** this proves each layer can talk to the next before any real features exist.

### 2. Database table (commit `16fc760`, `backend/migrations/001_create_feedback.sql`)
A `feedback` table where each row is one piece of customer evidence:
- **Core fields:** `source_type` (interview / support_ticket / metric / document), `source_label` (a unique citation label like `INT-03`), `title`, `content`, customer name and segment, and `metadata` (JSONB).
- **AI fields:** `theme`, `sentiment`, `urgency` and `analyzed_at`. They start empty and the AI fills them in later.
- **Search:** `search_vector` is a column Postgres computes itself from title + content. A GIN index on it makes keyword search fast.
- **Row Level Security** is turned on, so Supabase's public API can't read the table. Our backend connects directly and isn't affected.
- **Why:** `source_label` exists so every finding the agent reports can cite its source. The product requires that the agent never make findings up.

### 3. Backend connected to the database (commit `355a652`)
- **`app/config.py`** is the only file that reads environment variables. It fails with a clear message if `DATABASE_URL` is missing.
- **`app/db/connection.py`** has `get_conn`, a FastAPI dependency. It opens one connection per request, commits if the request succeeds and rolls back if it fails.
- **`app/schemas/feedback.py`** has Pydantic models. `FeedbackCreate` is what a client can send; it deliberately leaves out the AI fields so nobody can fake them. `Feedback` is what the API returns.
- **`app/api/feedback.py`** has three endpoints:
  - `POST /api/feedback` adds a row. A duplicate label returns **409 Conflict**.
  - `GET /api/feedback?source_type=...` lists rows, newest first.
  - `GET /api/feedback/{id}` returns one row, or **404**.
- **`GET /api/health/db`** runs `select 1` against the database and returns **503** if it can't connect.
- **Why plain SQL with `%s` parameters, and no ORM:** it's simple to read, and parameters prevent SQL injection.

### 4. Local secrets file
- I created `backend/.env` from `.env.example`. It holds `DATABASE_URL`, which is the Supabase session-pooler string, and `ANTHROPIC_API_KEY`, which isn't used yet.
- I checked that git ignores it.
- **Status:** I still need to paste in the real values and check that `/api/health/db` says ok.

## Concepts to be ready to explain
| Term | One-liner |
|---|---|
| **API endpoint / route** | A URL plus method (GET/POST) that the backend answers |
| **Proxy** | The dev server forwards `/api` calls to the backend, so the browser only talks to one origin |
| **CORS** | A browser rule about which other sites may call your API. `main.py` allows `localhost:5173` as a backup to the proxy |
| **Migration** | A numbered SQL file that changes the database schema. Once it has been applied, you never edit it |
| **Pydantic schema** | Checks the shape of data coming in and going out of the API |
| **Dependency injection** (`Depends(get_conn)`) | FastAPI hands each endpoint what it needs, such as a database connection |
| **Transaction (commit/rollback)** | All of a request's changes are saved, or none are |
| **Parameterized query** | Values are passed separately from the SQL, which blocks injection attacks |
| **Environment variables / `.env`** | Secrets kept out of the code and out of git |
| **Full-text search / GIN index** | Postgres's built-in keyword search, made fast by an index |
| **Row Level Security** | Database rules about who can read which rows |

## Rebuild checklist (for a live demo)
```bash
# 1. Backend
uv init backend && cd backend
uv add fastapi "uvicorn[standard]" "psycopg[binary]" python-dotenv
# write app/main.py with GET /api/health
uv run uvicorn app.main:app --reload        # check http://localhost:8000/docs

# 2. Frontend
npm create vite@latest frontend -- --template react
cd frontend && npm install
# add the proxy to vite.config.js and fetch('/api/health') in App.jsx
npm run dev                                  # check http://localhost:5173

# 3. Database
# Supabase SQL editor: paste and run migrations/001_create_feedback.sql
# backend/.env: DATABASE_URL=<session pooler URI>

# 4. Backend ↔ DB
# config.py → db/connection.py (get_conn) → schemas/feedback.py → api/feedback.py
# check: GET /api/health/db, then POST a row and GET it back from /docs
```

## Likely interview questions
- **Why FastAPI?** It's fast to write, checks data types for you, and generates `/docs` automatically, which works well as a demo.
- **Why Supabase?** It's a hosted Postgres with a free tier, so there's no database server to manage.
- **Why keep AI fields read-only in the API?** So nobody can type in a result that looks like the AI analyzed it. This ties to the "never fabricate" rule.
- **What's next?** Sample case-study evidence (with a deliberate contradiction), then the five framework definitions, then the agent loop with PM approval steps.

# Recap: The Product Lab, so far

*Last updated: November 13, 2026. Covers branch `feature/frontend`.*

## Pitch (30 seconds)
The Product Lab helps a product manager go from a vague question ("Several customers have requested an AI assistant. Should we build one?") to a decision brief backed by evidence. The PM writes down the problem and drops customer evidence into a "specimen tray". An AI agent then diagnoses the problem and recommends a thinking framework, citing the evidence it read. The PM approves each step and makes the final call. The agent never claims anything the evidence doesn't show.

## Where things stand
| Station | What it does | Status |
|---|---|---|
| 1. Clipboard | Problem statement + specimen tray (evidence) | Built |
| 2. Planning station | Pick a framework, or let the agent recommend one | Built (mode B still being QA-tested) |
| 3. Hypothesis board | Form and edit hypotheses | Next |
| 4. Investigation | Agent runs tools with PM approval | Not started |
| 5. Results chamber | Decision brief + next experiment | Not started |

**Branches:** `main` has only the early skeleton. All current work is on `feature/frontend`, which will be merged into `main` through a pull request once QA is done.

## Architecture
```
Browser (React + TypeScript + Vite, :5173)
   │  fetch('/api/...')            (all calls live in src/api/)
   ▼
Vite dev proxy ──► FastAPI backend (:8000) ──► Postgres on Supabase
                      │                         (all SQL lives in app/db/)
                      └──► Claude API (agent, app/agent/)
                      reads secrets from backend/.env
```
**Core rule:** the agent's reasoning and the investigation data live in the backend, and the UI only displays saved state. That lets the same investigation work in a plain UI or a themed "lab" UI, and it stops the screen from showing progress that didn't happen.

## What we built, step by step

### 1. Project skeleton (`fbda391`)
- FastAPI backend managed by `uv`, with `GET /api/health`.
- Vite + React frontend that calls it.
- A dev proxy forwards `/api/*` to `:8000`, so the frontend uses relative URLs.
- One root `.gitignore` keeps `.env`, virtual environments and `node_modules` out of git.

### 2. Database foundation (`16fc760`, `355a652`)
- **Migration 001** creates the `feedback` table: one row per piece of evidence, with a citation label like `INT-03`, a full-text search column with a GIN index, and Row Level Security turned on.
- `app/config.py` is the only file that reads environment variables. `app/db/connection.py` has `get_conn`, which opens one connection per request, commits on success and rolls back on failure.
- `GET /api/health/db` checks that the backend can reach Supabase.

### 3. Frontend to TypeScript and a first feedback UI (Nov 2)
- Converted the frontend to TypeScript, so mistakes in data shapes are caught before the app runs.
- Built a feedback form, a list of cards and a theme filter. These were early experiments, later replaced by the investigation flow.

### 4. Investigations and the Clipboard: station 1 (`bab977c`, `d3fbae0`, `27e3e3f`)
- **Migration 002** adds an `investigations` table (question, requested by, decision deadline, what would change). Evidence is now linked to an investigation, and deleting an investigation deletes its evidence ("cascade").
- **Labels** (`INT-01`, `TKT-01`, `MET-01`, `DOC-01`, `OTH-01`) are assigned by the backend, unique within one investigation, and never reused. A label always points to the same evidence, which is what makes citations trustworthy.
- **Migration 003** adds `origin`, the Source column (Customer, Sales, Analytics…).
- **API** (`app/api/investigations.py`): create, list, get and edit investigations; add evidence (several at once), remove it, and turn its Use checkbox on or off.
- **UI:** a problem form and a specimen tray with a drop zone, file upload, "paste text" and an evidence table.

### 5. Restyle after the wireframe (`79c0f1e`)
- The design comes from my Claude Design artifact "The Product Lab — Wireframe", which has one board per station.
- Colours and type are CSS variables in `src/styles/tokens.css`.
- **App shell:** a 5-station step bar, plus a side panel showing the 9-step agent loop, an honest agent status and "Resume work".
- **Migration 004** adds `use_by_agent`: the tray's **Use** checkbox. The agent may only read evidence the PM has ticked. It also adds the Planning station's columns (`mode`, `framework_id`, `recommendation`).

### 6. Frameworks and the Planning station: station 2 (`8898c7c`)
- **Five frameworks**, one YAML file each in `app/frameworks/`: Jobs to Be Done, Five Whys, Assumption Mapping, Riskiest Assumption Test, and Steelman vs Strawman. Each one has: what it is, when to use it, when to avoid it, questions answered, required inputs, procedure, expected outputs and failure modes.
- The loader checks every file when the backend starts. A broken file stops the backend with a message naming the file.
- `pm_inputs.yaml` holds the shared extra questions a framework can ask the PM ("Before we start").
- **Migration 005** adds `framework_inputs`: the PM's answers, kept even when the PM switches framework.
- **Mode A ("I'll pick a framework"):** a library of 5 cards, then answer the questions, then Save approach.

### 7. The agent's framework recommendation: mode B (`02789f9`, `33c2408`)
- `POST /api/investigations/{id}/recommendation` makes **one Claude call with structured output**. The model must answer in an exact shape: evidence found, contradictions, diagnosis, recommended framework, why it fits, what it will uncover, assumptions, context gaps, confidence, runner-up, a "why not" for every other framework, and suggested answers.
- **Guardrails:** the agent only gets the evidence the PM ticked. Before saving, the backend rejects any answer that cites a label the agent wasn't given or names a framework that doesn't exist.
- **UI:** a recommendation card with Accept, "Use runner-up instead", "Ask why not another", Re-run, and a warning if the ticked evidence changed since the agent ran. Suggested answers are tagged "Suggested by the agent" until the PM edits or confirms them.

### 8. Demo case study: Tallyboard (`0f1ec60`)
- 12 made-up evidence files in `backend/data/case_study/`: 5 interviews, 4 support tickets, 2 metrics and 1 sales document.
- They're written with a known answer ("ground truth"):
  - The requests are really about *explaining why a metric changed and writing the weekly report*.
  - AI demand is concentrated in 2 big accounts.
  - Integrations cause more churn.
  - Nobody knows whether customers would pay.
- `scripts/seed_case_study.py` creates the investigation and adds the evidence **through the API**, so it gets the same validation and labels as a real upload. It's safe to re-run.

## Concepts to be ready to explain
| Term | One-liner |
|---|---|
| **API endpoint** | A URL plus method (GET/POST/PUT/PATCH/DELETE) that the backend answers |
| **Proxy / CORS** | The dev server forwards `/api` to the backend; CORS is the browser rule about which sites may call an API |
| **Migration** | A numbered SQL file that changes the schema. Once it has been applied, you never edit it |
| **Foreign key / cascade delete** | Evidence points to its investigation; deleting the investigation removes its evidence |
| **Pydantic schema** | Checks the shape of data in and out of the API, including the LLM's answer |
| **Structured output** | The LLM must answer in an exact JSON shape, so the app can check it and display it reliably |
| **Guardrail** | Code that checks the agent's answer (for example, cited labels must exist) before trusting it |
| **Dependency injection** (`Depends(get_conn)`) | FastAPI hands each endpoint its database connection |
| **Transaction** | All of a request's changes are saved, or none are |
| **Parameterized query** | Values are sent separately from the SQL, which blocks injection attacks |
| **Environment variables / `.env`** | Secrets kept out of code and out of git |
| **URL encoding** | Special characters in a URL written as `%xx`; an `@` in a password must be `%40` |
| **TypeScript** | JavaScript with types, so shape mistakes show up before running |
| **Design tokens** | Colours and sizes stored once as CSS variables and reused everywhere |
| **Seed data / idempotent** | Prepared sample data; a script that is safe to run many times |
| **Branch / pull request** | A separate line of work; a PR is how it gets reviewed and merged into `main` |

## Rebuild checklist (for a live demo)
```bash
# 1. Backend
uv init backend && cd backend
uv add fastapi "uvicorn[standard]" "psycopg[binary]" python-dotenv anthropic pyyaml
uv run uvicorn app.main:app --reload          # http://localhost:8000/docs

# 2. Frontend
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install && npm run dev      # http://localhost:5173
# add the /api proxy to vite.config.ts

# 3. Database (Supabase SQL editor): run migrations 001 → 005 in order
# backend/.env:
#   DATABASE_URL=<Supabase "Session pooler" URI, password with letters/numbers only>
#   ANTHROPIC_API_KEY=<from console.anthropic.com>

# 4. Build order
# config.py → db/connection.py → schemas/ → db/investigations.py → api/investigations.py
# → frameworks/*.yaml + loader → agent/recommend_framework.py → frontend stations

# 5. Demo data (backend running)
cd backend && uv run python scripts/seed_case_study.py
```

## Problems we hit (good interview stories)
- **Password with an `@` broke the database URL.** The `@` was read as the end of the password. Fix: a password with only letters and numbers (or encode `@` as `%40`).
- **"Site can't be reached".** The backend simply wasn't running. A local server only answers while its terminal process is running.
- **Duplicate seed data.** My first loader trusted a uniqueness rule that, on the live database, only applies *within an investigation*. Rows with no investigation slipped through twice. Fix: delete the duplicates carefully (checked the count before committing), then load the data as a proper investigation through the API.
- **Working from the wrong branch.** A fresh clone only showed `main`, while the real work was on `feature/frontend`. Lesson: check `git branch -a` before deciding where you are.

## Likely interview questions
- **Why FastAPI and Supabase?** FastAPI is fast to write, validates data and generates `/docs`. Supabase is a hosted Postgres with a free tier, so there's no server to manage.
- **How do you stop the AI from making things up?** It only receives the evidence the PM ticked. It must answer in a fixed structure that separates evidence, interpretation, assumptions and gaps. The backend rejects citations to evidence it wasn't given. The UI only shows saved state.
- **Why does the PM approve things?** The agent recommends and the PM decides. Every suggestion can be accepted, swapped or edited.
- **Why a known-answer case study?** It lets me check whether the agent finds the contradictions and the gap, instead of just saying "yes, build it".
- **What's next?** Finish QA of mode B on the Tallyboard data, then station 3 (the Hypothesis board) from its wireframe board, then the investigation tools, then the decision brief.

# Recap: The Product Lab, so far

*Last updated: November 17, 2026 (v1 complete end to end, after the decision brief). Covers branch `feature/frontend`.*

## Pitch (30 seconds)
The Product Lab helps a product manager go from a vague question ("Several customers have requested an AI assistant. Should we build one?") to a decision brief backed by evidence. The PM writes down the problem and drops customer evidence into a "specimen tray". An AI agent then diagnoses the problem, recommends a thinking framework, drafts a testable hypothesis, and (once the PM approves) tests it against the evidence, returning a verdict, sourced findings and a next experiment. Finally it writes a decision brief that answers the original question, and the PM records the final call. The PM approves each step. The agent never claims anything the evidence doesn't show.

## Where things stand
| Station | What it does | Status |
|---|---|---|
| 1. Clipboard | Problem statement + specimen tray (evidence) | Built |
| 2. Planning station | Pick a framework (or let the agent recommend one), then form the hypothesis | Built and QA'd |
| 3. Investigation | One approved run tests the hypothesis; the PM approves the next experiment | Built and QA'd (changes planned after v1) |
| 4. Results chamber | Decision brief: agent recommendation + PM's recorded decision | Built and QA'd |

**v1 works end to end** (Nov 17): blank clipboard → evidence → framework → hypothesis → investigation → approved experiment → decision brief → PM decision. Next: my list of UX changes, then merge into `main`.

Two scope cuts, both recorded in the PRD's decision log (§16):
- **Nov 13:** the separate "Hypothesis board" station became a card at the end of the Planning station.
- **Nov 17:** the Investigation station became one approved run instead of a multi-test tool loop.
- **Nov 17:** the decision brief deferred "Compare runs" (Run A vs Run B side by side), the lab/plain toggle and file export.

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

### 9. The hypothesis card (`7404104`, `41ca546`, `c53095b`, + H4)
**Why:** the investigation needs a target. "Should we build an AI assistant?" can't be tested; a hypothesis like *"customers asking for an AI assistant mostly need to explain why a metric changed"* can. The decision brief also has to show the hypothesis with supporting and contradicting evidence.

**Product decision:** the wireframe had a full Hypothesis board (separate station, evidence columns, version history). I asked "does it still provide value if I cut it?" The answer: the *hypothesis* is essential, the *separate board* isn't. So I kept a card inside the Planning station, about half the work, and moved faster towards the investigation.

- **H1: storage and API.** Migration 006 adds `hypothesis` (JSONB, the current one) and `rejected_hypotheses` (a JSONB list with my reasons) to `investigations`. Endpoints: write/edit, accept, reject (reason required). Versions count rejected ones too, so a redraft is "v2".
- **H2: the agent drafts it.** One structured-output Claude call (`draft_hypothesis.py`) using the chosen framework, my answers, only the ticked evidence, and every rejected hypothesis **with my reason**. Guardrail: it can only cite evidence it was given. The first draft bundled three claims, so I tightened the prompt to "one claim, about 40 words" and the redraft responded to my rejection reason.
- **Refactor:** the Claude call and its friendly error messages moved into one shared helper (`ask_structured`), used by both the recommendation and the hypothesis. I re-ran the recommendation afterwards to prove nothing changed.
- **H3: the card.** Draft or write my own; edit; Accept (or "Save and accept" if edited); Reject and redraft (asks why); Based on labels; a fold-out of rejected versions; a warning if the framework changed since. The step bar went from 5 stations to 4.
- **H4: honest status.** The side panel's loop shows Form hypothesis as Next / Drafting / Draft v2 / You accepted v2, worked out only from saved state.

**Result on Tallyboard:** *"When a key metric moves, customers across many accounts (not just Northwind and Crestline) are trying to quickly explain why it changed, with traceable numbers, so they can answer leadership. 'AI assistant' requests are mostly a proxy for this job."* Based on INT-01, INT-03, INT-05, MET-01, MET-02, TKT-03.

### 10. The Investigation station: station 3 (`49b30f1`, `c7602a5`, `3c76227`, `eedde03`)
**Goal of the step:** check the accepted hypothesis against the evidence, so "what we believe" becomes "what the evidence shows". It hands three things to the decision brief: findings with sources, a verdict with confidence, and a next experiment with a success metric.

**Product decision (the interview story):** the wireframe showed an agent proposing several tests, each approved, each running search tools, then reassessing. I asked: *"the agent already read the evidence to recommend the framework; doesn't another search-and-compare layer repeat that?"* It did. So the MVP is:
- **One approved run.** The PM clicks Run investigation (that click is the approval). One Claude call reads every checked source and applies the framework's **procedure** to the one claim in the hypothesis. Planning chose the lens; Investigation uses it.
- **An approvable next experiment**, so the demo still shows the agent proposing and the PM deciding.
- **Cut:** a document-search tool (12 files fit in one call), several tests per round, Modify scope. **Trade-off:** the demo shows less step-by-step "agent at work".
- **Concept: workflow vs agent.** In a *workflow*, my code decides the steps and the AI does the thinking inside them; in an *agent*, the AI decides its own steps. I chose a workflow with an approval gate, because approval and honesty were hard requirements.
- Updated in order: the wireframe (I wrote the prompt for Claude Design), then the PRD (v0.4, new decision log), then CLAUDE.md. Then code.

- **I1: the run.** Migration 007 adds `investigation_run`, `next_experiment` and `rejected_experiments` (JSONB on `investigations`, like the hypothesis). `run_investigation.py` sends one high-effort structured call: the problem, the framework (with procedure and expected outputs), the hypothesis and its "would challenge it if", the earlier diagnosis, and only the ticked evidence. The answer: verdict (holds / partly holds / doesn't hold), confidence, reason, and findings in five kinds: **supports, contradicts, interpretation, assumption, missing**. Guardrails: no unknown labels; supports and contradicts must cite a source. **Our code** records the sources read, the model and the seconds taken, so the activity log can't overstate what happened. First findings were 60+ words; I tightened the prompt to about 35.
- **I2: the next experiment.** Draft, edit, approve, reject with a reason (same pattern as the hypothesis). A redraft is a quick, medium-effort call that reads the run's **findings**, not the 12 raw files, so it doesn't change findings I already reviewed. When I rejected "8 interviews" with "we can't book interviews in two weeks", it switched to existing data. When I rejected that as too long, it came back as one 39-word check. Both prompts now cap the experiment at about 60 words and one metric.
- **I3: the screen.** The hypothesis under test; a Run card (a spinner only while the real request waits, no fake percentage; then an activity log); the verdict; findings grouped by kind with the wireframe's borders (solid = evidence, dotted = interpretation, dashed = assumption or gap); empty groups say "No contradicting evidence found"; a warning if the hypothesis, framework or ticked sources changed since the run; the experiment card. The station only opens once the hypothesis is accepted. The side panel loop fills in steps 4 to 9 and a "Still unanswered" card lists the missing findings.

**Result on Tallyboard (API test):** *Partly holds, low confidence.* The writing pain is real, but its clearest evidence comes from Northwind and Crestline, the two accounts behind 9 of 14 AI requests, and smaller accounts say their time goes on *finding* data. It caught the concentrated demand (as a contradiction), the "explain why a metric moved" job (as an interpretation) and the trust concern. It did not raise willingness to pay, because the hypothesis was about the job, not pricing; the decision brief should cover it.

**PM QA (Nov 17, in the app):** a fresh investigation from a blank clipboard through to an approved experiment, with no errors: 12 files uploaded, agent recommended JTBD, hypothesis drafted and accepted, run in 35 s (partly holds, medium confidence; 2 supports, 3 contradicts, 2 interpretations, 1 missing), experiment approved. The flow works end to end; I noted UX changes to make once v1 (through the decision brief) is complete.

### 11. The decision brief: station 4 (`65274cd`, `1f2cad2`, `57ca5fa`)
**Goal of the step:** one readable brief that answers the original question, with everything traceable.

**Key insight (the interview story):** almost everything the PRD asks the brief to contain was *already saved and approved by me*: problem, framework and rationale, hypothesis, verdict, findings, approved experiment. Only one thing was missing: **the recommendation**. The investigation's *verdict* answers "does the hypothesis hold?"; the *recommendation* answers "what should we do?". They're different questions, so the brief needs exactly one new agent call, and everything else is layout.

**Wireframe first:** I listed what had to change on the Results board (cut the lab/plain toggle, Export and Compare runs; add Generate brief, "Your decision", an Interpretation box, Sources cited, an out-of-date warning; replace placeholder copy and the old "3 approved tests" side panel). I gave Claude Design a prompt, checked the result, then updated the PRD (§5 Step 5, decision log).

- **R1: backend.** Migration 008 adds `decision_brief` (the agent's recommendation) and `pm_decision` (my call). `write_brief.py` is one medium-effort call that reads the hypothesis, verdict, findings and approved experiment, **not the raw evidence**, so it can't drift from what I reviewed. Guardrail: it may only cite labels the findings already cite. The brief stores which run and experiment version it was written from, so the screen can tell when it's out of date. `PUT /decision`: follow or differ; **a note is required when I overrule the agent**. Regenerating clears my decision, because that decision answered the old recommendation. The reasoning came back at 81 words; I capped it at about 60.
- **R2: screen.** Opens only after the experiment is approved. Generate brief (spinner only while the real request waits); the recommendation card with a confidence bar and its reason, "What would change this", Regenerate, the out-of-date warning, "Your decision" and links back to stations 2 and 3; problem and framework cards; hypothesis with verdict; the evidence grid (supporting, contradicting, interpretation, assumptions and gaps); the approved experiment; **Sources cited** with the real titles; **Copy brief** as plain text. The side panel's "What I did" is built from counts our backend recorded.

**Result on my fresh "AI chatbot" investigation:** *"Don't build a general AI chatbot or clear Q1 for it yet. Run the concierge test first, then decide whether to build a narrower traceable change breakdown that extends 'Explain this change'."* Medium confidence: a handful of interviews, and the jobs behind 4 of the 6 AI requests are unknown.

**PM QA (Nov 17, in the app):** generated the brief, tried to save "Decide differently" without a note (blocked), saved a decision, regenerated (decision cleared), saved again. All requests succeeded.

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
| **Falsifiable hypothesis** | A belief stated so evidence could prove it wrong; hence the "Would challenge it if…" box |
| **Refactoring** | Restructuring code without changing what it does, then re-running the old feature to prove it |
| **Deriving state from props** | The card resets its text boxes when a new version arrives from the backend |
| **Status codes** | 200 worked, 400 makes no sense right now, 409 conflicts with what exists, 422 invalid data |
| **Workflow vs agent** | A workflow: my code fixes the steps and the AI thinks inside them. An agent: the AI picks its own steps and tools |
| **Human-in-the-loop / approval gate** | Nothing meaningful runs until the PM clicks; the click is recorded as the approval |
| **Effort level** | How much the model deliberates: high for the investigation, medium for quick drafts |
| **Stale result** | Saved output that no longer matches its inputs (for example after unticking a source); the UI warns instead of pretending it's current |
| **Decision log** | Dated record of scope cuts and why, kept in the PRD |
| **Verdict vs recommendation** | The verdict judges the hypothesis; the recommendation answers the original business question |
| **Single source of truth** | The brief re-reads saved, approved data instead of copying it, so it can't disagree with the stations |
| **Provenance** | Recording what an output was made from (run time, experiment version) so you can tell when it's out of date |

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

# 3. Database (Supabase SQL editor): run migrations 001 → 008 in order
# backend/.env:
#   DATABASE_URL=<Supabase "Session pooler" URI, password with letters/numbers only>
#   ANTHROPIC_API_KEY=<from console.anthropic.com>

# 4. Build order
# config.py → db/connection.py → schemas/ → db/investigations.py → api/investigations.py
# → frameworks/*.yaml + loader → agent/claude_client.py (ask_structured)
# → agent/recommend_framework.py → agent/draft_hypothesis.py
# → agent/run_investigation.py → agent/redraft_experiment.py → agent/write_brief.py
# → frontend stations 1 → 4

# 5. Demo data (backend running)
cd backend && uv run python scripts/seed_case_study.py
```

## Problems we hit (good interview stories)
- **Password with an `@` broke the database URL.** The `@` was read as the end of the password. Fix: a password with only letters and numbers (or encode `@` as `%40`).
- **"Site can't be reached".** The backend simply wasn't running. A local server only answers while its terminal process is running.
- **Duplicate seed data.** My first loader trusted a uniqueness rule that, on the live database, only applies *within an investigation*. Rows with no investigation slipped through twice. Fix: delete the duplicates carefully (checked the count before committing), then load the data as a proper investigation through the API.
- **Scope cut mid-build.** The wireframe had a separate Hypothesis board. I asked what would be lost by cutting it, kept the essential part (the hypothesis) and dropped the rest. That's an MVP trade-off, explained in terms of what the downstream stations need.
- **Second scope cut, by questioning overlap.** The wireframe's Investigation had a multi-test tool loop. I noticed it repeated what the Planning step had already done with the same evidence, and cut it to one approved run plus an approvable experiment. I updated the wireframe, PRD and CLAUDE.md before writing code, so design, requirements and build stayed in sync.
- **Long AI output.** Findings and experiments came back too long to scan. Fix: explicit length limits in the prompt, checked by re-running and counting words.
- **Spotting that most of the brief already existed.** Instead of asking the AI to write a whole report (slow, and it could contradict what I approved), I assembled the brief from saved data and asked the AI for the one missing judgment.
- **Working from the wrong branch.** A fresh clone only showed `main`, while the real work was on `feature/frontend`. Lesson: check `git branch -a` before deciding where you are.

## Likely interview questions
- **Why FastAPI and Supabase?** FastAPI is fast to write, validates data and generates `/docs`. Supabase is a hosted Postgres with a free tier, so there's no server to manage.
- **How do you stop the AI from making things up?** It only receives the evidence the PM ticked. It must answer in a fixed structure that separates evidence, interpretation, assumptions and gaps. The backend rejects citations to evidence it wasn't given. The UI only shows saved state.
- **Why does the PM approve things?** The agent recommends and the PM decides. Every suggestion can be accepted, swapped or edited.
- **Why a known-answer case study?** It lets me check whether the agent finds the contradictions and the gap, instead of just saying "yes, build it".
- **Why does rejecting need a reason?** The agent reads it before redrafting, so each version gets better, and the history shows how the thinking changed.
- **Why not a real autonomous agent with tools?** With 12 short files, a search tool adds complexity without value, and pausing an autonomous loop for approval is hard. A workflow with an approval gate keeps the PM in control and keeps every step honest. Search comes back if the evidence grows too large for one call.
- **How do you know the activity log is true?** The backend records what it gave the agent and how long the call took. The agent never reports its own progress.
- **Why doesn't the AI write the whole brief?** Everything except the recommendation was already approved by the PM. Re-generating it would be slower and could contradict what the PM signed off. So the brief reads saved data, and the AI writes only the recommendation, citing only labels the findings already cite.
- **What if the PM disagrees with the agent?** They choose "Decide differently" and must say why. The brief records the PM's call next to the agent's recommendation.
- **What's next?** UX changes from my own end-to-end testing, then merging `feature/frontend` into `main` and deploying on Render. Later: Compare runs, the lab theme and tests.

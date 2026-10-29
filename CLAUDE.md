# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About me
I'm learning to code to become and AI PM. After each change, explain what you did and why in plain language, and name any new concept. Prefer simple, readable code over clever code.

## Project
Feedbacklens. See `docs/PRD.md` for requirements.
Stack: React (vite) in /frontend, fastAPI (Python,uv) in /backend, Postgres on Supabase, deploy on Render.

## Rules
- Never commit secrets. Secrets live in .env files, which are gitignored.
- Work in small steps; stop after each step so I can test it.

## Project status

Skeleton only: the backend has one route, `GET /api/health`, and the frontend is a page that calls it. There is no database, agent or lab UI yet, and no tests.

## Commands

Run each in its own terminal:

```bash
# Backend (FastAPI on :8000; API docs at /docs)
cd backend && uv run uvicorn app.main:app --reload
cd backend && uv add <package>           # add a Python dependency

# Frontend (Vite dev server on :5173)
cd frontend && npm run dev
cd frontend && npm run build             # production build to dist/
cd frontend && npm run lint
```

In development the Vite dev server forwards `/api/*` to `localhost:8000` (`frontend/vite.config.js`), so frontend code calls relative `/api/...` URLs. Backend secrets go in `backend/.env`; see `backend/.env.example`.

`docs/PRD.md` is the source of truth for scope and behavior. Read it before making product or architecture decisions.

## Folder structure

Create each folder when a feature first needs it.

- `backend/app/api/`: HTTP routes only. They hand work to the agent and contain no reasoning logic.
- `backend/app/schemas/`: Pydantic models (Hypothesis, Finding, EvidenceRef, DecisionBrief, InvestigationState). LLM structured outputs must match these.
- `backend/app/agent/`: the investigation loop, prompts and Claude client.
- `backend/app/tools/`: document search, evidence analysis and experiment proposal. They run over `backend/data/case_study/`.
- `backend/app/frameworks/`: one data file per framework, plus a loader.
- `backend/app/db/`: all Postgres/Supabase access. No SQL anywhere else.
- `frontend/src/api/`: all `fetch` calls to the backend.
- `frontend/src/hooks/`: shared state, e.g. `useInvestigation`. Both views use it.
- `frontend/src/views/`: `LabView` (themed) and `ClassicView` (plain). They show the same data.
- `frontend/src/components/shared/`: unthemed pieces both views use, including DecisionBrief.
- `frontend/src/components/lab/`: the six lab stations.
- `frontend/src/styles/`: theme colour tokens.

A single root `.gitignore` covers both apps.

## Backend conventions

- Database access uses plain SQL through psycopg 3. There is no ORM. Endpoints get a connection from the `get_conn` dependency (`app/db/connection.py`), which commits when the request succeeds and rolls back when it fails. Always pass values as `%s` parameters, never as formatted strings.
- Schema changes go in a new numbered file in `backend/migrations/`, applied by hand in the Supabase SQL editor. Never edit a migration that has already been applied.
- `app/config.py` is the only place that reads environment variables.
- `GET /api/health/db` checks that the backend can reach Supabase.

## What is being built

The Product Lab is a hackathon MVP: an agentic workspace that helps a product manager at an early-stage B2B SaaS company move from a vague product question to an evidence-backed decision brief. The UI is themed as a retro-futuristic science lab. The agent investigates; the PM approves actions and makes the final call.

Demo scenario (used for both demo runs): "Several customers have requested an AI assistant. Should we build one?" Run A has the PM pick Jobs to Be Done manually. Run B has the agent recommend a framework, surface a contradiction or gap, and propose a next experiment for approval.

## Planned architecture (from PRD §12)

- **Frontend:** React (Vite), with a component-based lab interface.
- **Backend:** Python + FastAPI.
- **LLM:** a model with structured outputs and tool calling.
- **Framework engine:** five curated frameworks stored as structured data: Steelman vs Strawman, Jobs to Be Done, Five Whys, Assumption Mapping, and Riskiest Assumption Test. Each definition has: when to use, when not to use, questions answered, required inputs, procedure, expected outputs, and failure modes.
- **Tools:** document search, basic evidence analysis, and experiment proposal generation. All of them run over one prepared case study and its sample evidence. There are no live integrations.
- **Investigation state (persisted):** problem, framework, hypotheses (current and previous), evidence references, approved actions, findings, and decision brief.

**Core architectural rule:** keep agent reasoning and investigation state separate from the themed UI. The same investigation must work through a plain, conventional interface and produce the same output. A readable decision brief must always be available outside the lab theme.

### Agent loop

Diagnose → Recommend framework → Form hypothesis → Identify evidence gaps → Propose investigation → **Request PM approval** → Execute tools → Reassess → Recommend next step.

### Lab component → function mapping

| Lab element | Function |
|---|---|
| Clipboard | Problem statement; start or resume an investigation |
| Specimen tray | Uploaded evidence and which sources the agent can use |
| Experiment-planning station | Manual or agent-recommended framework, rationale, hypothesis, and accept/change controls |
| Investigation apparatus | Real tool activity, open questions, and approval controls |
| Hypothesis board | Current and past hypotheses with supporting and contradicting evidence |
| Results chamber | Decision brief, next experiment, and traceability |

## Non-negotiable behavior constraints

- Never fabricate progress or findings. UI activity and animation must reflect real tool calls and state changes. The agent must never claim it searched, measured, or verified something it didn't.
- Material findings carry source references back to the supplied evidence.
- Outputs keep four things separate: evidence found, interpretation, unverified assumptions, and missing information.
- Surface contradictory evidence instead of cherry-picking support.
- Require PM approval before meaningful actions. Hypotheses are editable or rejectable by the PM.
- Framework recommendations need a problem-specific rationale, and the agent must say when context is insufficient.
- Decision brief contents: problem framing, framework and rationale, hypothesis, supporting and contradicting evidence, assumptions and gaps, recommendation with confidence, and next experiment with a success metric.
- Visual style: mint, pink, cream, and deep-purple accents, polished rather than childish. Do not copy Powerpuff Girls characters, sets, logos, or artwork. Every interactive lab object must do something meaningful, so no purely decorative interactions.

## Out of scope for the MVP

Live external integrations, multi-agent orchestration, a framework marketplace, collaboration and permissions, a 3D lab, and animations that don't communicate state.

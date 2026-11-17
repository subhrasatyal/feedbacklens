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

- **Design source:** the PM's wireframe is the Claude Design artifact "The Product Lab — Wireframe" (one board per station: `Main`, `Planning`, `Hypothesis`, `Investigation`, `Results`). Build each station to match it; read it with the artifacts tools when starting a station. Exception: the `Hypothesis` board was cut for the MVP (see Stations). The `Investigation` board was redrawn on 2026-11-17 for the simplified MVP (see Stations and `docs/PRD.md` §16), and every board's step bar now shows 4 stations. Two wireframe details not to copy: the Running state's 40% progress bar (the app can't measure progress inside one agent call, so show an indeterminate "Reading N checked sources…" instead) and the `SAL-02` label (labels come from the backend: INT/TKT/MET/DOC/OTH). The `Results` board still describes the old multi-test flow; revisit it when planning station 4.
- **Stations:** each investigation moves through 4 stations, in order: 1 Clipboard (problem + specimen tray), 2 Planning station (choose approach, then form the hypothesis), 3 Investigation, 4 Results chamber. The wireframe's separate Hypothesis board was cut for a more linear MVP (PM decision, 2026-11-13); the hypothesis is a card at the end of the Planning station. Station 3 was simplified for the MVP (PM decision, 2026-11-17): one approved run, not a tool loop. The station shows the accepted hypothesis and what the run will do; the PM clicks Run investigation (that click is the approval); one agent call reads all checked sources and applies the saved framework's `procedure` and `expected_outputs` to test the hypothesis; it returns a verdict (holds / partly holds / doesn't hold, with confidence and reason), findings (supports / contradicts / interpretation / assumption / missing, with labels) and a next experiment with a success metric, which the PM approves, edits, or rejects with a reason (the agent redrafts). The activity shown is only what really ran (sources read, procedure applied, time). Document search, several tests per round and Modify scope are deferred. Why: Planning already reviewed the evidence, and 12 files fit in one call. They're listed in `frontend/src/components/shared/stations.ts` (with `built` flags) alongside the PRD's 9-step agent loop. The PM may cut stations later; there are no themes.
- **Database:** migrations 001–007 are applied. `investigations` holds the problem fields plus, for the Planning station, `mode` ('pick'/'recommend'), `framework_id`, `framework_inputs` (jsonb: the PM's answers to the framework's questions, keyed by question id) and `recommendation` (jsonb: the agent's latest recommendation, shaped like `Recommendation` in `app/schemas/planning.py`), `hypothesis` (jsonb: the current hypothesis or null, shaped like `Hypothesis` in `app/schemas/hypothesis.py`: statement, challenge_if, based_on labels, rationale, status draft/accepted, written_by agent/pm, framework_id, version) and `rejected_hypotheses` (jsonb list, oldest first, each with the PM's `reason`). Versions count every hypothesis in the investigation, rejected ones included. For station 3 (migration 007): `investigation_run` (jsonb: the latest run, shaped like `InvestigationRun` in `app/schemas/investigation_run.py`: verdict holds/partly_holds/does_not_hold, confidence, verdict_reason, verdict_refs, findings with kind supports/contradicts/interpretation/assumption/missing and evidence_refs, plus what really ran: sources_read labels, framework_id, hypothesis_version, model, duration_seconds, ran_at), `next_experiment` (jsonb: title, experiment, why, success_metric, status proposed/approved, written_by, version) and `rejected_experiments` (jsonb list, oldest first, with the PM's `reason`). Experiment versions count every experiment, rejected ones included. Evidence lives in the `feedback` table, linked by `investigation_id` (cascade delete), with `source_type` one of interview/support_ticket/metric/document/other (`source_type_other` names an "other" type), `origin` (the Source, free text; null only on rows from before migration 003) and `use_by_agent` (the tray's Use checkbox; only checked evidence may be given to the agent). Citation labels (`INT-01`, `TKT-01`, `MET-01`, `DOC-01`, `OTH-01`) are assigned by the backend, unique per investigation, and never reused. The old AI columns (`theme`, `sentiment`, `urgency`, `analyzed_at`) are unused leftovers.
- **Demo case study:** "Tallyboard" (made-up company), 12 evidence files in `backend/data/case_study/` (5 interviews, 4 tickets, 2 metrics, 1 sales doc; see its README). They are written so a good investigation finds the request is really "explain why a metric changed / write the weekly report", that AI demand is concentrated in two big accounts, that integrations cause more churn, and that willingness to pay is unknown. `backend/scripts/seed_case_study.py` (backend must be running) creates the investigation "Several customers have requested an AI assistant. Should we build one?" through the API and adds the files to its tray; it does nothing if that investigation already exists.
- **Backend:** `GET /api/health`, `GET /api/health/db`, and the investigation routes in `app/api/investigations.py`: create/list/get (with evidence)/`PUT` (edit the problem) investigations, add evidence (a list in one request), `PATCH` evidence (Use on/off), delete evidence, and `PUT /{id}/approach` (save mode + framework + answers; 422 if a required answer is missing). `POST /{id}/recommendation` runs the agent (mode B) and saves the result (400 if no source is checked, 503 without an API key, 502 if the agent fails). Hypothesis: `POST /{id}/hypothesis/draft` runs the agent (400 without a saved approach or a checked source, 409 if a hypothesis already exists: reject it first), `PUT /{id}/hypothesis` writes or edits it (any edit makes it a draft written by the PM), `POST /{id}/hypothesis/accept` (400 if none) and `POST /{id}/hypothesis/reject` (reason required; moves it to the rejected list). `POST /{id}/investigation/run` is the PM's Run investigation click (400 unless the hypothesis is accepted and a source is checked; 503/502 for agent errors); it saves the run and a new proposed next experiment, replacing earlier ones (re-running counts the experiment version up). Next experiment (all 400 without a run): `POST /{id}/next-experiment/draft` has the agent redraft one (409 if one exists; 400 unless one was rejected, because the first proposal comes from the run), `PUT /{id}/next-experiment` writes or edits it (any edit makes it proposed, written by the PM; an unchanged edit saves nothing), `POST /{id}/next-experiment/approve` and `POST /{id}/next-experiment/reject` (reason required). `GET /api/frameworks` (`app/api/frameworks.py`) lists the frameworks. All SQL is in `app/db/investigations.py`.
- **Agent:** `app/agent/claude_client.py` makes the client (model `claude-opus-5-5`) and has `ask_structured` (one `beta.messages.parse` call with `fallbacks: "default"`, turning API errors into short `AgentError` messages) and `evidence_text`. `app/agent/recommend_framework.py` sends one structured-output call (effort high) with the problem, the frameworks and only the checked evidence. The answer keeps evidence found, contradictions, diagnosis, assumptions and context gaps apart, and includes confidence, runner-up, a why-not for every other framework and suggested answers to `agent_can_suggest` questions. `_check` rejects unknown frameworks, a bad runner-up, missing why-nots and cited labels the agent wasn't given. `app/agent/draft_hypothesis.py` (effort medium, about 10 s) drafts one testable hypothesis (one claim, about 40 words, plus what would challenge it) from the problem and answers, the saved framework, the earlier diagnosis if any, only the checked evidence, and every rejected hypothesis with its reason; it rejects cited labels it wasn't given. `app/agent/run_investigation.py` (effort high, about 30 s) tests the accepted hypothesis: it gets the problem, the saved framework (its procedure and expected outputs are the method), the hypothesis with its challenge_if, the earlier diagnosis and only the checked evidence; it returns a verdict, 4–8 short findings and one next experiment with a success metric; `_check` rejects unknown labels and supports/contradicts findings without labels. `app/agent/redraft_experiment.py` (effort medium, about 15 s) proposes a new next experiment after a rejection, from the problem, the hypothesis, the run's verdict and findings (not the raw evidence) and every rejected experiment with its reason. Both prompts keep the experiment to about 60 words with one success metric and threshold. `framework_text` and `diagnosis_text` (in `draft_hypothesis.py`) are shared helpers. The `ANTHROPIC_API_KEY` is set in `backend/.env`.
- **Frameworks:** one YAML file per framework in `app/frameworks/` (approved by the PM), plus `pm_inputs.yaml`, the shared questions a framework can ask the PM before starting (each with `agent_can_suggest`). Each framework lists its questions in `pm_inputs` with `required`. The loader in `app/frameworks/__init__.py` validates them into the `Framework` model (`app/schemas/planning.py`) when the backend starts; a broken file stops it with a message naming the file.
- **Frontend:** styled after the wireframe. Colours, type and sizes are CSS variables in `src/styles/tokens.css` (imported by `index.css`); component styles are in `App.css`. `views/ClassicView.tsx` renders `AppShell` (header with a case tag, `StationNav` step bar, side panel) around the current station. `StationNav` only opens built stations; Planning also needs a saved problem and at least one checked source; Investigation also needs an accepted hypothesis (if it stops being openable, the view falls back to Planning). `AgentPanel` (side panel) shows the 9-step loop, an agent message worked out only from saved state, and "Resume work" (recent investigations + "New investigation"). Station 1 is `ClipboardStation`: `ProblemForm` (creates, then edits) and `SpecimenTray` (drop zone + Browse in `FileUpload`, each file staged until it has a Source and a Type; "Or paste text" in `PasteEvidence`; `EvidenceTable` with Use (saved) | Label | Source | Type | Size (words) | Status (Available/Excluded) | Remove, and an "N of M available to agent" tag), then a "Next: choose approach" button. Dropdowns use `SelectWithOther`; choice lists are in `components/shared/evidenceOptions.ts`. Type is set at upload and not editable, because the label prefix comes from it. Station 2 is `PlanningStation`: mode radio ("I'll pick a framework" / "Recommend one for me"), `FrameworkLibrary` (5 cards with Select), and "Before we start" (`ApproachQuestions`) with Save approach. Answers are shared by question id, so they carry over between frameworks. Mode B shows a Diagnose and recommend button, then `RecommendationCard` (wireframe layout: name, confidence, runner-up, diagnosis / why it fits / what it will uncover, context gaps, a fold-out of evidence, contradictions and assumptions with labels, Accept, Use runner-up instead, Ask why not another (stored reasons), Re-run, and a warning when the checked sources changed since it ran). Accept or runner-up selects the framework and pre-fills the agent's suggested answers (never over the PM's text), tagged "Suggested by the agent" until edited; Save approach confirms them. The library tags the agent's pick "Recommended". Once an approach is saved, `HypothesisCard` appears at the end of the station: Draft hypothesis or Write my own; a draft shows editable Hypothesis and "Would challenge it if…" boxes, Based on labels with the agent's rationale, and tags (version, Untested proposition / Accepted by you, who wrote it); Accept (Save and accept if edited), Save edits, Reject and redraft (a reason is required, then the agent redrafts); an accepted one is read-only with Edit; a fold-out lists previously rejected versions with reasons; a warning shows if the saved framework changed since it was made. Once the hypothesis is accepted, a "Next: run the investigation" button opens station 3. Station 3 is `InvestigationStation`: the hypothesis under test (read-only), a Run card (Ready text naming the checked sources and framework, then a spinner and "Reading N checked sources…" only while the real request waits, then an activity log of what really ran: sources read, procedure applied to hypothesis vN, seconds, model, time; Re-run replaces the findings and experiment; a warning when the hypothesis, framework or checked sources changed since the run), the verdict card, and Findings in five groups (supports, contradicts, interpretation, assumption, missing; empty groups say so) with label tags and the wireframe's border styles. `ExperimentCard` (same pattern as the hypothesis card) shows the next experiment's title, experiment, why and success metric with tags (version, Proposal / Approved by you, who wrote it): Approve, Edit (Save and approve / Save edits / Cancel), Reject and redraft (reason required, then the agent redrafts), Draft a new one / Write my own when there is none, a fold-out of rejected versions, and a disabled "Next: decision brief" once approved (station 4 isn't built). Verdict names are in `stations.ts`. Frameworks come from the `useFrameworks` hook; `useInvestigation` has `requestRecommendation`, `draftHypothesis`, `saveHypothesis`, `acceptHypothesis`, `rejectHypothesis`, `runInvestigation`, `draftExperiment`, `saveExperiment`, `approveExperiment`, `rejectExperiment` and `recommending` / `drafting` / `running` / `redrafting` flags. The side panel loop is derived from saved state and those flags: Diagnose is Now / Done / Skipped, Recommend framework says Suggests / You accepted / You picked, Form hypothesis says Next / Drafting / Draft vN / You accepted vN; Propose investigation and Request approval follow the accepted hypothesis and the run; Identify evidence gaps, Execute tools and Reassess change together (they happen in one run: Running, then gap count / sources read / verdict); Recommend next step says Proposal vN / You approved vN / Rejected / Redrafting. A "Still unanswered" card lists the run's missing findings. Data comes from the `useInvestigation` hook, which keeps the open investigation and station in the URL (`?id=…&station=planning`) and calls `src/api/investigations.ts`.
- **Next:** build station 3 (Investigation MVP, see Stations), one step at a time: **I1 done** (2026-11-17; on Tallyboard: partly holds, low confidence, found the 2-account concentration, the explain-the-change job and the trust concern; ~30 s): migration 007 (jsonb columns on `investigations` for the run result and the next experiment), `app/agent/run_investigation.py` (reuse `ask_structured`, `evidence_text`, `problem_text`; reject cited labels the agent wasn't given) and `POST /{id}/investigation/run` (400 without an accepted hypothesis or a checked source), testable in `/docs`; **I2 done** (2026-11-17) next-experiment approve / edit / reject-and-redraft endpoints; **I3 done** (2026-11-17) the Investigation screen and side panel loop, matching the redrawn `Investigation` board; **I4** docs, recap and a full Tallyboard QA run. The hypothesis card (build steps H1–H4) was QA'd by the PM on 2026-11-13: draft → accept on Tallyboard. Build step 3b (mode B) passed PM QA on 2026-11-13 using the Tallyboard investigation: the agent recommended Jobs to Be Done (runner-up Assumption Mapping) and found every planted signal (solution-vs-job, concentrated AI demand, integrations churn, unknown willingness to pay, Crestline's security blocker).
- **Not built yet:** station 4 (Results chamber, decision brief), the lab theme and tests.

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

In development the Vite dev server forwards `/api/*` to `localhost:8000` (`frontend/vite.config.ts`), so frontend code calls relative `/api/...` URLs. Backend secrets go in `backend/.env`; see `backend/.env.example`.

`docs/PRD.md` is the source of truth for scope and behavior. Read it before making product or architecture decisions.

## Folder structure

Create each folder when a feature first needs it.

- `backend/app/api/`: HTTP routes only. They hand work to the agent and contain no reasoning logic.
- `backend/app/schemas/`: Pydantic models (Hypothesis, Finding, EvidenceRef, DecisionBrief, InvestigationState). LLM structured outputs must match these.
- `backend/app/agent/`: the investigation loop, prompts and Claude client.
- `backend/app/tools/`: document search, evidence analysis and experiment proposal. They run over `backend/data/case_study/`. Not created yet: for the MVP, document search is deferred and analysis happens in one agent call (`app/agent/`).
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

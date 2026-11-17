-- 007_investigation_run.sql
-- The Investigation station (station 3): one approved run, then a next experiment.
--
-- investigation_run: the latest run's result, or null before the PM runs it.
--   Shaped like InvestigationRun in app/schemas/investigation_run.py:
--   verdict, confidence, reason, findings (with evidence labels), and what really ran
--   (sources read, framework, hypothesis version, model, seconds taken).
-- next_experiment: the experiment the agent proposed (or the PM edited / approved), or null.
-- rejected_experiments: every next experiment the PM rejected, oldest first, each with the
--   PM's reason, so the agent can avoid repeating them when it redrafts.

alter table investigations
    add column investigation_run    jsonb,
    add column next_experiment      jsonb,
    add column rejected_experiments jsonb not null default '[]'::jsonb;

-- 006_hypothesis.sql
-- The hypothesis card at the bottom of the Planning station.
--
-- hypothesis: the current hypothesis (one per investigation), or null before one is drafted.
--   Shaped like Hypothesis in app/schemas/hypothesis.py, e.g.
--   {"statement": "...", "challenge_if": "...", "based_on": ["INT-01"], "status": "draft", ...}
-- rejected_hypotheses: every hypothesis the PM rejected, oldest first, each with the PM's reason.
--   Kept so the agent can avoid repeating them and the PM can see how their thinking changed.

alter table investigations
    add column hypothesis          jsonb,
    add column rejected_hypotheses jsonb not null default '[]'::jsonb;

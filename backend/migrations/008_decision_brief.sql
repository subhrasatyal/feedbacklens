-- 008_decision_brief.sql
-- The Results chamber (station 4): the decision brief.
--
-- decision_brief: the agent's recommendation, or null before the PM clicks Generate brief.
--   Shaped like DecisionBrief in app/schemas/brief.py: headline recommendation, reasoning,
--   evidence labels, confidence and its reason, what would change it, and a note of which
--   investigation run and experiment version it was written from (to spot an out-of-date brief).
--   Everything else in the brief is read from columns that already exist.
-- pm_decision: the PM's final call on that recommendation (follow / differ, with a note), or null.
--   Cleared whenever the brief is regenerated, because it answered the old recommendation.

alter table investigations
    add column decision_brief jsonb,
    add column pm_decision    jsonb;

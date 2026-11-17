-- 005_framework_inputs.sql
-- The PM's answers to a framework's extra questions (see backend/app/frameworks/pm_inputs.yaml),
-- keyed by question id, e.g. {"proposed_direction": "Build an assistant for the weekly report"}.
-- Answers are kept when the PM switches framework, so shared questions aren't asked twice.

alter table investigations
    add column framework_inputs jsonb not null default '{}'::jsonb;

-- 004_planning.sql
-- Specimen tray "Use" checkbox, plus what the Planning station (station 2) saves.
-- Wrapped in begin/commit so it applies completely or not at all.

begin;

-- Use: whether the agent may read this evidence. New and existing evidence starts included.
alter table feedback
    add column use_by_agent boolean not null default true;

-- Planning station: how the framework was chosen, which one, and the agent's
-- latest recommendation (kept as JSON exactly as the agent returned it).
alter table investigations
    add column mode           text check (mode in ('pick', 'recommend')),
    add column framework_id   text,           -- one of the ids in backend/app/frameworks/
    add column recommendation jsonb;

commit;

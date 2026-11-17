-- 002_create_investigations.sql
-- An investigation is one product problem or decision plus the evidence the PM
-- supplies for it (lifecycle step 1: the Clipboard). Evidence lives in the
-- existing feedback table, now linked to an investigation.
--
-- Wrapped in begin/commit so it applies completely or not at all.

begin;

create table investigations (
    id                 uuid primary key default gen_random_uuid(),
    question           text not null check (btrim(question) <> ''),      -- what to investigate
    requested_by       text not null check (btrim(requested_by) <> ''),  -- who is asking
    decision_deadline  date not null,
    what_would_change  text,                 -- optional: what knowing the answer would change
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

-- Blocks Supabase's public API from reading this table; our backend is unaffected.
alter table investigations enable row level security;

-- Link each piece of evidence to its investigation. Deleting an investigation
-- deletes its evidence too. Older rows without an investigation stay as they are.
alter table feedback
    add column investigation_id  uuid references investigations (id) on delete cascade,
    add column source_type_other text;   -- the PM's own name for the type, when it is 'other'

-- Allow 'other' as an evidence type, and require a name when it is used.
alter table feedback drop constraint feedback_source_type_check;
alter table feedback add constraint feedback_source_type_check
    check (source_type in ('interview', 'support_ticket', 'metric', 'document', 'other'));
alter table feedback add constraint feedback_source_type_other_check
    check (source_type <> 'other' or btrim(coalesce(source_type_other, '')) <> '');

-- Citation labels (INT-01, ...) only need to be unique within one investigation.
-- This constraint also works as an index for looking up an investigation's evidence.
alter table feedback drop constraint feedback_source_label_key;
alter table feedback add constraint feedback_investigation_label_key
    unique (investigation_id, source_label);

commit;

-- 001_create_feedback.sql
-- One row per piece of customer evidence (interview, support ticket, metric, document)
-- that the agent can search and cite.

create table feedback (
    id               uuid primary key default gen_random_uuid(),
    source_type      text not null
                     check (source_type in ('interview', 'support_ticket', 'metric', 'document')),
    source_label     text not null unique,   -- short citation label shown in briefs, e.g. 'INT-03'
    title            text not null,
    content          text not null,          -- the full text the agent reads and quotes
    customer_name    text,                   -- null when not tied to one customer (e.g. a metric)
    customer_segment text,                   -- e.g. 'SMB', 'mid-market'
    is_sample        boolean not null default true,
    metadata         jsonb not null default '{}'::jsonb,
    occurred_at      timestamptz,            -- when the interview/ticket happened, if known
    created_at       timestamptz not null default now(),

    -- AI analysis: empty (null) on insert, filled in later by the AI.
    theme            text,                   -- e.g. 'workflow automation', 'onboarding'
    sentiment        text
                     check (sentiment in ('positive', 'neutral', 'negative', 'mixed')),
    urgency          text
                     check (urgency in ('low', 'medium', 'high', 'critical')),
    analyzed_at      timestamptz,            -- when the AI filled in the three fields above

    -- Pre-computed search index over title + content, kept up to date by Postgres.
    search_vector    tsvector generated always as (
                         to_tsvector('english', title || ' ' || content)
                     ) stored
);

create index feedback_search_idx on feedback using gin (search_vector);
create index feedback_source_type_idx on feedback (source_type);

-- Blocks Supabase's public API from reading this table; our backend is unaffected.
alter table feedback enable row level security;

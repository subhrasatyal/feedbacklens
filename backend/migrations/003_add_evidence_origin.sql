-- 003_add_evidence_origin.sql
-- Where a piece of evidence came from (its "source" in the specimen tray),
-- e.g. 'Customer', 'Sales', 'Analytics', or a name the PM typed.
-- Older rows have none, so the column allows null; the backend requires it on new evidence.

alter table feedback
    add column origin text check (origin is null or btrim(origin) <> '');

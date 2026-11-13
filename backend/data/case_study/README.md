# Case study: Tallyboard

Sample evidence for the demo question: **"Several customers have requested an AI assistant. Should we build one?"**

All companies, people and numbers here are made up.

## The company
Tallyboard is a B2B SaaS tool for building reporting dashboards. About 420 customer accounts use it, mostly small (SMB) and mid-market operations and finance teams. In March 2026 it launched "Smart Suggestions", which highlights unusual changes in a dashboard.

## Loading it
`backend/scripts/seed_case_study.py` creates the investigation and adds every file below to its specimen tray. See the script for how to run it.

## File format
Each evidence file starts with a header between `---` lines. The evidence text comes after the header.

```
---
source_type: interview          # interview | support_ticket | metric | document
origin: Customer                # the Source column in the specimen tray
source_label: INT-01            # the label the backend should assign (checked when loading)
title: ...
customer_name: ...              # leave out if not about one customer
customer_segment: SMB           # SMB | mid-market
occurred_at: 2026-08-14
---
Evidence text...
```

The database has no columns for customer, segment or date, so the loader adds them to the top of the evidence text.

This README is not evidence and is not loaded.

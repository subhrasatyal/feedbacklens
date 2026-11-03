"""All SQL for investigations and their evidence (stored in the feedback table)."""

from uuid import UUID

from psycopg import Connection

from app.schemas.investigation import EvidenceCreate, InvestigationInput

INVESTIGATION_COLUMNS = """
    id, question, requested_by, decision_deadline, what_would_change, created_at, updated_at
"""

EVIDENCE_COLUMNS = """
    id, investigation_id, source_label, origin, source_type, source_type_other,
    title, content, use_by_agent, created_at
"""

# Citation label prefix per evidence type: the first interview is INT-01, and so on.
LABEL_PREFIXES = {
    "interview": "INT",
    "support_ticket": "TKT",
    "metric": "MET",
    "document": "DOC",
    "other": "OTH",
}


def create_investigation(conn: Connection, data: InvestigationInput) -> dict:
    return conn.execute(
        f"""
        insert into investigations (question, requested_by, decision_deadline, what_would_change)
        values (%s, %s, %s, %s)
        returning {INVESTIGATION_COLUMNS}
        """,
        (data.question, data.requested_by, data.decision_deadline, data.what_would_change),
    ).fetchone()


def list_investigations(conn: Connection) -> list[dict]:
    """All investigations, most recently changed first."""
    return conn.execute(
        f"select {INVESTIGATION_COLUMNS} from investigations order by updated_at desc"
    ).fetchall()


def get_investigation(conn: Connection, investigation_id: UUID) -> dict | None:
    return conn.execute(
        f"select {INVESTIGATION_COLUMNS} from investigations where id = %s",
        (investigation_id,),
    ).fetchone()


def update_investigation(
    conn: Connection, investigation_id: UUID, data: InvestigationInput
) -> dict | None:
    return conn.execute(
        f"""
        update investigations
        set question = %s, requested_by = %s, decision_deadline = %s,
            what_would_change = %s, updated_at = now()
        where id = %s
        returning {INVESTIGATION_COLUMNS}
        """,
        (
            data.question,
            data.requested_by,
            data.decision_deadline,
            data.what_would_change,
            investigation_id,
        ),
    ).fetchone()


def list_evidence(conn: Connection, investigation_id: UUID) -> list[dict]:
    """An investigation's evidence, in the order it was added."""
    return conn.execute(
        f"""
        select {EVIDENCE_COLUMNS} from feedback
        where investigation_id = %s
        order by created_at, source_label
        """,
        (investigation_id,),
    ).fetchall()


def add_evidence(
    conn: Connection, investigation_id: UUID, items: list[EvidenceCreate]
) -> list[dict]:
    """Save several pieces of evidence, giving each the next free label for its type."""
    # Lock this investigation until the request finishes, so two uploads at the
    # same moment can't hand out the same label.
    conn.execute("select id from investigations where id = %s for update", (investigation_id,))

    # Find the next number for each prefix. Numbers of removed evidence are never
    # reused, so a label always points to the same piece of evidence.
    next_number: dict[str, int] = {}
    existing = conn.execute(
        "select source_label from feedback where investigation_id = %s", (investigation_id,)
    ).fetchall()
    for row in existing:
        prefix, _, number = row["source_label"].partition("-")
        if number.isdigit():
            next_number[prefix] = max(next_number.get(prefix, 1), int(number) + 1)

    saved = []
    for item in items:
        prefix = LABEL_PREFIXES[item.source_type]
        number = next_number.get(prefix, 1)
        next_number[prefix] = number + 1
        saved.append(
            conn.execute(
                f"""
                insert into feedback (investigation_id, source_label, origin, source_type,
                                      source_type_other, title, content)
                values (%s, %s, %s, %s, %s, %s, %s)
                returning {EVIDENCE_COLUMNS}
                """,
                (
                    investigation_id,
                    f"{prefix}-{number:02d}",
                    item.origin,
                    item.source_type,
                    item.source_type_other,
                    item.title,
                    item.content,
                ),
            ).fetchone()
        )

    _touch(conn, investigation_id)
    return saved


def set_evidence_use(
    conn: Connection, investigation_id: UUID, evidence_id: UUID, use_by_agent: bool
) -> dict | None:
    """Tick or untick Use. Returns None if the evidence isn't in this investigation."""
    row = conn.execute(
        f"""
        update feedback set use_by_agent = %s
        where id = %s and investigation_id = %s
        returning {EVIDENCE_COLUMNS}
        """,
        (use_by_agent, evidence_id, investigation_id),
    ).fetchone()
    if row is not None:
        _touch(conn, investigation_id)
    return row


def delete_evidence(conn: Connection, investigation_id: UUID, evidence_id: UUID) -> bool:
    """Remove one piece of evidence. Returns False if it wasn't in this investigation."""
    row = conn.execute(
        "delete from feedback where id = %s and investigation_id = %s returning id",
        (evidence_id, investigation_id),
    ).fetchone()
    if row is None:
        return False
    _touch(conn, investigation_id)
    return True


def _touch(conn: Connection, investigation_id: UUID) -> None:
    """Mark the investigation as just changed, so it rises to the top of the list."""
    conn.execute(
        "update investigations set updated_at = now() where id = %s", (investigation_id,)
    )

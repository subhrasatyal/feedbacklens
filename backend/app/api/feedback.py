"""Endpoints for saving and reading feedback."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg import Connection
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb

from app.db.connection import get_conn
from app.schemas.feedback import Feedback, FeedbackCreate, SourceType

router = APIRouter(prefix="/api/feedback", tags=["feedback"])

# Columns returned by every query, so all endpoints give back the same shape.
# search_vector is left out: it's only used inside the database.
COLUMNS = """
    id, source_type, source_label, title, content, customer_name, customer_segment,
    is_sample, metadata, occurred_at, created_at,
    theme, sentiment, urgency, analyzed_at
"""


@router.post("", response_model=Feedback, status_code=status.HTTP_201_CREATED)
def create_feedback(item: FeedbackCreate, conn: Connection = Depends(get_conn)):
    """Add one piece of feedback. AI fields start empty."""
    try:
        row = conn.execute(
            f"""
            insert into feedback (source_type, source_label, title, content, customer_name,
                                  customer_segment, is_sample, metadata, occurred_at)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            returning {COLUMNS}
            """,
            (
                item.source_type,
                item.source_label,
                item.title,
                item.content,
                item.customer_name,
                item.customer_segment,
                item.is_sample,
                Jsonb(item.metadata),
                item.occurred_at,
            ),
        ).fetchone()
    except UniqueViolation:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"source_label '{item.source_label}' is already used",
        )
    return row


@router.get("", response_model=list[Feedback])
def list_feedback(source_type: SourceType | None = None, conn: Connection = Depends(get_conn)):
    """List feedback, newest first. Optionally filter by source type."""
    if source_type:
        return conn.execute(
            f"select {COLUMNS} from feedback where source_type = %s order by created_at desc",
            (source_type,),
        ).fetchall()
    return conn.execute(f"select {COLUMNS} from feedback order by created_at desc").fetchall()


@router.get("/{feedback_id}", response_model=Feedback)
def get_feedback(feedback_id: UUID, conn: Connection = Depends(get_conn)):
    """Get one piece of feedback by its id."""
    row = conn.execute(
        f"select {COLUMNS} from feedback where id = %s", (feedback_id,)
    ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feedback not found")
    return row

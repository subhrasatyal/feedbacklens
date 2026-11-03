"""Endpoints for the Clipboard: an investigation's problem and its specimen tray."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from psycopg import Connection

from app.db import investigations as db
from app.db.connection import get_conn
from app.schemas.investigation import (
    Evidence,
    EvidenceCreate,
    EvidenceUseUpdate,
    Investigation,
    InvestigationDetail,
    InvestigationInput,
)

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


def _get_or_404(conn: Connection, investigation_id: UUID) -> dict:
    investigation = db.get_investigation(conn, investigation_id)
    if investigation is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Investigation not found")
    return investigation


@router.post("", response_model=Investigation, status_code=status.HTTP_201_CREATED)
def create_investigation(data: InvestigationInput, conn: Connection = Depends(get_conn)):
    """Start an investigation from a problem or decision."""
    return db.create_investigation(conn, data)


@router.get("", response_model=list[Investigation])
def list_investigations(conn: Connection = Depends(get_conn)):
    """All investigations, most recently changed first (for resuming one)."""
    return db.list_investigations(conn)


@router.get("/{investigation_id}", response_model=InvestigationDetail)
def get_investigation(investigation_id: UUID, conn: Connection = Depends(get_conn)):
    """One investigation with all of its evidence."""
    investigation = _get_or_404(conn, investigation_id)
    return {**investigation, "evidence": db.list_evidence(conn, investigation_id)}


@router.put("/{investigation_id}", response_model=Investigation)
def update_investigation(
    investigation_id: UUID, data: InvestigationInput, conn: Connection = Depends(get_conn)
):
    """Edit the problem or decision."""
    updated = db.update_investigation(conn, investigation_id, data)
    if updated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Investigation not found")
    return updated


@router.post(
    "/{investigation_id}/evidence",
    response_model=list[Evidence],
    status_code=status.HTTP_201_CREATED,
)
def add_evidence(
    investigation_id: UUID,
    items: Annotated[list[EvidenceCreate], Body(min_length=1)],
    conn: Connection = Depends(get_conn),
):
    """Add one or more pieces of evidence to the specimen tray."""
    _get_or_404(conn, investigation_id)
    return db.add_evidence(conn, investigation_id, items)


@router.patch("/{investigation_id}/evidence/{evidence_id}", response_model=Evidence)
def set_evidence_use(
    investigation_id: UUID,
    evidence_id: UUID,
    data: EvidenceUseUpdate,
    conn: Connection = Depends(get_conn),
):
    """Tick or untick Use: whether the agent may read this evidence."""
    updated = db.set_evidence_use(conn, investigation_id, evidence_id, data.use_by_agent)
    if updated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence not found")
    return updated


@router.delete(
    "/{investigation_id}/evidence/{evidence_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_evidence(
    investigation_id: UUID, evidence_id: UUID, conn: Connection = Depends(get_conn)
):
    """Remove one piece of evidence from the specimen tray."""
    if not db.delete_evidence(conn, investigation_id, evidence_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

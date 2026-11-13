"""Endpoints for an investigation: its problem, specimen tray, approach and recommendation."""

from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from psycopg import Connection

from app.agent.claude_client import AgentError, AgentNotConfigured
from app.agent.draft_hypothesis import draft_hypothesis
from app.agent.recommend_framework import recommend_framework
from app.db import investigations as db
from app.db.connection import get_conn
from app.frameworks import FRAMEWORKS, PM_QUESTIONS, missing_required_answers
from app.schemas.investigation import (
    Evidence,
    EvidenceCreate,
    EvidenceUseUpdate,
    Investigation,
    InvestigationDetail,
    InvestigationInput,
)
from app.schemas.hypothesis import HypothesisEdit, RejectInput
from app.schemas.planning import ApproachInput, Recommendation

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


@router.put("/{investigation_id}/approach", response_model=Investigation)
def save_approach(
    investigation_id: UUID, data: ApproachInput, conn: Connection = Depends(get_conn)
):
    """Save the Planning station's choice: mode, framework, and answers to its questions."""
    if data.framework_id not in FRAMEWORKS:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unknown framework")
    unknown = [qid for qid in data.framework_inputs if qid not in PM_QUESTIONS]
    if unknown:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown question: {', '.join(unknown)}"
        )
    missing = missing_required_answers(data.framework_id, data.framework_inputs)
    if missing:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, f"Please answer: {' / '.join(missing)}"
        )

    # Store trimmed answers, dropping blank ones.
    answers = {qid: text.strip() for qid, text in data.framework_inputs.items() if text.strip()}
    saved = db.save_approach(conn, investigation_id, data.mode, data.framework_id, answers)
    if saved is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Investigation not found")
    return saved


@router.post("/{investigation_id}/recommendation", response_model=Recommendation)
def create_recommendation(investigation_id: UUID, conn: Connection = Depends(get_conn)):
    """Mode B: the agent reads the checked evidence and recommends a framework. Takes up to a few minutes."""
    investigation = _get_or_404(conn, investigation_id)
    evidence = [item for item in db.list_evidence(conn, investigation_id) if item["use_by_agent"]]
    if not evidence:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Tick Use for at least one source so the agent has something to read."
        )
    try:
        recommendation = recommend_framework(investigation, evidence)
    except AgentNotConfigured as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    except AgentError as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(error)) from error

    db.save_recommendation(conn, investigation_id, recommendation.model_dump(mode="json"))
    return recommendation


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _next_version(investigation: dict) -> int:
    """Versions count every hypothesis in the investigation, rejected ones included."""
    versions = [h["version"] for h in investigation["rejected_hypotheses"]]
    if investigation["hypothesis"]:
        versions.append(investigation["hypothesis"]["version"])
    return max(versions, default=0) + 1


@router.post("/{investigation_id}/hypothesis/draft", response_model=Investigation)
def create_hypothesis_draft(investigation_id: UUID, conn: Connection = Depends(get_conn)):
    """The agent drafts a hypothesis from the saved approach and the checked evidence. Takes up to a minute."""
    investigation = _get_or_404(conn, investigation_id)
    if investigation["framework_id"] is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Save an approach before drafting a hypothesis.")
    if investigation["hypothesis"] is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "There is already a hypothesis. Reject it (with a reason) to get a new draft.",
        )
    evidence = [item for item in db.list_evidence(conn, investigation_id) if item["use_by_agent"]]
    if not evidence:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Tick Use for at least one source so the agent has something to read."
        )

    try:
        draft = draft_hypothesis(investigation, evidence)
    except AgentNotConfigured as error:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(error)) from error
    except AgentError as error:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(error)) from error

    hypothesis = {
        "statement": draft.statement,
        "challenge_if": draft.challenge_if,
        "based_on": sorted(set(draft.based_on)),
        "rationale": draft.rationale,
        "status": "draft",
        "written_by": "agent",
        "framework_id": investigation["framework_id"],
        "version": _next_version(investigation),
        "created_at": _now(),
        "updated_at": _now(),
    }
    return db.save_hypothesis(conn, investigation_id, hypothesis)


@router.put("/{investigation_id}/hypothesis", response_model=Investigation)
def save_hypothesis(
    investigation_id: UUID, data: HypothesisEdit, conn: Connection = Depends(get_conn)
):
    """Write a hypothesis or edit the current one. Any edit makes it a draft again."""
    investigation = _get_or_404(conn, investigation_id)
    current = investigation["hypothesis"]

    if current is None:
        # The PM is writing their own from scratch.
        hypothesis = {
            "based_on": [],
            "rationale": None,
            "framework_id": investigation["framework_id"],
            "version": _next_version(investigation),
            "created_at": _now(),
        }
    else:
        hypothesis = dict(current)
        unchanged = (
            data.statement == current["statement"]
            and data.challenge_if == current["challenge_if"]
        )
        if unchanged:
            return investigation  # nothing to save

    hypothesis.update(
        statement=data.statement,
        challenge_if=data.challenge_if,
        status="draft",
        written_by="pm",
        updated_at=_now(),
    )
    return db.save_hypothesis(conn, investigation_id, hypothesis)


@router.post("/{investigation_id}/hypothesis/accept", response_model=Investigation)
def accept_hypothesis(investigation_id: UUID, conn: Connection = Depends(get_conn)):
    """The PM signs off the current hypothesis as the one to investigate."""
    investigation = _get_or_404(conn, investigation_id)
    if investigation["hypothesis"] is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "There is no hypothesis to accept yet.")
    hypothesis = {**investigation["hypothesis"], "status": "accepted", "updated_at": _now()}
    return db.save_hypothesis(conn, investigation_id, hypothesis)


@router.post("/{investigation_id}/hypothesis/reject", response_model=Investigation)
def reject_hypothesis(
    investigation_id: UUID, data: RejectInput, conn: Connection = Depends(get_conn)
):
    """Move the current hypothesis to the rejected list, with the PM's reason."""
    investigation = _get_or_404(conn, investigation_id)
    if investigation["hypothesis"] is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "There is no hypothesis to reject.")
    rejected = {**investigation["hypothesis"], "reason": data.reason, "rejected_at": _now()}
    return db.reject_hypothesis(conn, investigation_id, rejected)


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

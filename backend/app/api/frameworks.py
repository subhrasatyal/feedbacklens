"""Endpoint for the framework library."""

from fastapi import APIRouter

from app.frameworks import FRAMEWORKS
from app.schemas.planning import Framework

router = APIRouter(prefix="/api/frameworks", tags=["frameworks"])


@router.get("", response_model=list[Framework])
def list_frameworks():
    """All framework definitions, in display order, each with its PM questions."""
    return list(FRAMEWORKS.values())

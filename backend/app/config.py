"""Settings read from environment variables (and backend/.env during development)."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in."
    )

# Needed only when the agent is asked to do something. Without it the rest of the
# app still works, and agent requests get a clear "no API key" message.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Production only: the shared password for the whole app. When it's not set (your
# laptop), the app is open, so local development works as before.
APP_PASSWORD = os.getenv("APP_PASSWORD") or None

# Where the built frontend (npm run build) lives. If the folder exists, FastAPI serves
# the screens too, so one server and one web address handle everything in production.
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", Path(__file__).parents[2] / "frontend" / "dist"))

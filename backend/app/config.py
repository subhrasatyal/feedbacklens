"""Settings read from environment variables (and backend/.env during development)."""

import os

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

"""Settings read from environment variables (and backend/.env during development)."""

import os

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in."
    )

import psycopg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api import feedback
from app.config import DATABASE_URL

app = FastAPI(title="The Product Lab API")

# Allow the Vite dev server (a different origin) to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(feedback.router)


@app.get("/api/health")
def health():
    """Simple check that the backend is running."""
    return {"status": "ok"}


@app.get("/api/health/db")
def health_db():
    """Check that the backend can reach the database."""
    try:
        with psycopg.connect(DATABASE_URL, connect_timeout=5) as conn:
            conn.execute("select 1")
    except psycopg.OperationalError as error:
        raise HTTPException(503, f"Database unreachable: {error}")
    return {"database": "ok"}

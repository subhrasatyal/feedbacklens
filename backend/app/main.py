import base64
import secrets

import psycopg
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.api import frameworks, investigations
from app.config import APP_PASSWORD, DATABASE_URL, FRONTEND_DIST

app = FastAPI(title="The Product Lab API")

# Allow the Vite dev server (a different origin) to call this API from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# The host's health check must work without the password, so it can tell the app is up.
OPEN_PATHS = {"/api/health"}


def _password_ok(header: str | None) -> bool:
    """Check a browser's Basic Auth header. Any user name works; only the password counts."""
    if not header or not header.startswith("Basic "):
        return False
    try:
        _user, _, password = base64.b64decode(header[6:]).decode().partition(":")
    except (ValueError, UnicodeDecodeError):
        return False
    # compare_digest takes the same time whatever the input, so timing can't leak the password.
    return secrets.compare_digest(password.encode(), APP_PASSWORD.encode())


@app.middleware("http")
async def require_password(request: Request, call_next):
    """In production (APP_PASSWORD set), every page and API call needs the shared password.

    The browser shows its own sign-in box once, then sends the password with every request.
    On your laptop APP_PASSWORD isn't set, so this does nothing.
    """
    if APP_PASSWORD and request.url.path not in OPEN_PATHS:
        if not _password_ok(request.headers.get("authorization")):
            return Response(
                "Password required",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="The Product Lab"'},
            )
    return await call_next(request)


app.include_router(investigations.router)
app.include_router(frameworks.router)


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


# Production: serve the built screens from the same server, so the frontend's relative
# /api/... calls reach this API with no proxy. Skipped on your laptop until you run
# `npm run build` (Vite's dev server serves the screens there).
if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str):
        """A file from the build if it exists (e.g. favicon.svg), otherwise the app's page."""
        if path.startswith("api/"):
            raise HTTPException(404, "Not found")  # an unknown API address, not a page
        file = (FRONTEND_DIST / path).resolve()
        if path and file.is_file() and file.is_relative_to(FRONTEND_DIST.resolve()):
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")

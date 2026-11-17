# The recipe Render (or any Docker host) follows to build The Product Lab.
# Two stages: Node builds the screens, then a slim Python image runs FastAPI, which
# serves those screens and the API from one web address.

# --- Stage 1: build the React frontend into static files (frontend/dist) ---
FROM node:24-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: the Python server that runs in production ---
FROM python:3.12-slim
# uv installs the exact package versions from uv.lock.
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /usr/local/bin/uv
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev
COPY backend/ ./
# Only the built files are copied over, not Node or the frontend's source.
COPY --from=frontend /app/frontend/dist /app/frontend/dist
ENV FRONTEND_DIST=/app/frontend/dist

# Render tells the app which port to listen on through $PORT.
CMD ["sh", "-c", "uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

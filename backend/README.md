# Backend

FastAPI + SQLModel backend for the Nebula resources app. Runs locally with
[uv](https://docs.astral.sh/uv/) — no Docker required.

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) installed
  (it manages the Python version and virtual environment for you — you don't
  need to install Python or create a venv yourself).

## Setup

From this `backend/` directory:

```bash
uv sync
```

This creates `.venv`, installs Python 3.11, and installs all dependencies.

## Run the database migrations

```bash
uv run alembic upgrade head
```

This creates/updates `local.db`, a SQLite file used for local development.
You only need to re-run this when a new migration is added.

## Start the server

```bash
uv run uvicorn main:app --reload --port 8010
```

The API is now running at http://localhost:8010. Check it with:

```bash
curl http://localhost:8010/health
```

Port 8010 is used here because 8000/8001 are occupied by another project on
this machine — pick whatever free port works for you and update
`VITE_API_URL` in `frontend/.env` to match (it currently points at 8010).

## Environment variables (optional)

The app works with zero configuration — it falls back to SQLite and an
`admin` password. To customize, export these before running the server:

| Variable          | Default                   | Purpose                                  |
|--------------------|---------------------------|-------------------------------------------|
| `DATABASE_URL`      | `sqlite:///./local.db`    | Use a Postgres URL instead of SQLite      |
| `ADMIN_PASSWORD`    | `admin`                   | Password for deleting resources           |
| `COHERE_API_KEY`    | *(none)*                  | Required for the `/chat` endpoint to work |

Example:

```bash
COHERE_API_KEY=your-key uv run uvicorn main:app --reload --port 8010
```

## Run the tests

```bash
uv run pytest
```

Tests use an in-memory SQLite database and don't touch `local.db`.

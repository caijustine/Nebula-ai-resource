# Nebula — AI Resource Sharing Platform

A web app for a class to submit and browse helpful resource links, with a Cohere-powered AI chat assistant that can answer questions about the submitted resources. No accounts or login required.

## Stack

- **Frontend** — React 19, TypeScript, Vite, Tailwind CSS, React Router, Framer Motion
- **Backend** — FastAPI, SQLModel, Alembic (migrations); SQLite locally, PostgreSQL in production
- **AI chat** — Cohere (OpenAI-compatible API), streamed to the client over Server-Sent Events
- **Local dev** — backend runs directly via [uv](https://docs.astral.sh/uv/), no Docker required

## Features

- Submit a resource (title, URL, description, category, tags, submitter name) with validation
- Browse and filter all submitted resources
- Admin-only delete, gated by a password header (`X-Admin-Password`)
- `/chat` endpoint: ask the AI assistant questions about the resources in the database; it streams its answer back token by token

## Running locally

**Backend** (from `backend/`) — see [`backend/README.md`](backend/README.md) for full details:

```bash
uv sync
uv run alembic upgrade head
uv run uvicorn main:app --reload --port 8000
```

No `.env` needed by default — it falls back to a local SQLite file
(`backend/local.db`) and an `admin` password. Set `COHERE_API_KEY` as an
environment variable if you want the `/chat` endpoint to work.

**Frontend** (from `frontend/`):

```bash
npm install
npm run dev
```

Set `VITE_API_URL` in `frontend/.env` if the backend isn't running on
`http://localhost:8000` (e.g. that port is taken by something else).

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Backend health check: http://localhost:8000/health

## Project structure

```
backend/
  main.py       # FastAPI routes
  models.py     # Resource + chat request/response schemas (SQLModel)
  database.py   # DB session setup
  chat.py       # builds the system prompt for the AI assistant
  alembic/      # database migrations
frontend/
  src/pages/    # FeedPage, SubmitPage, AdminPage
  src/components/  # ChatPanel, CategoryFilter, etc.
```

## API

| Method | Path | Description |
|---|---|---|
| GET | `/resources` | List all resources, newest first |
| POST | `/resources` | Create a resource |
| DELETE | `/resources/{id}` | Delete a resource (requires `X-Admin-Password` header) |
| POST | `/admin/verify` | Check whether a password is the admin password |
| POST | `/chat` | Streaming AI chat about the current resources |
| GET | `/health` | Liveness check |

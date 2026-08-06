# Nebula — AI Resource Sharing Platform

A web app for a class to submit and browse helpful resource links, with a Cohere-powered AI chat assistant that can answer questions about the submitted resources. No accounts or login required.

## Stack

- **Frontend** — React 19, TypeScript, Vite, Tailwind CSS, React Router, Framer Motion
- **Backend** — FastAPI, SQLModel, PostgreSQL, Alembic (migrations)
- **AI chat** — Cohere (OpenAI-compatible API), streamed to the client over Server-Sent Events
- **Infra** — Docker Compose (`db`, `backend`, `frontend` services)

## Features

- Submit a resource (title, URL, description, category, tags, submitter name) with validation
- Browse and filter all submitted resources
- Admin-only delete, gated by a password header (`X-Admin-Password`)
- `/chat` endpoint: ask the AI assistant questions about the resources in the database; it streams its answer back token by token

## Running locally

```bash
cp .env.example .env   # fill in POSTGRES_*, ADMIN_PASSWORD, COHERE_API_KEY, DATABASE_URL, VITE_API_URL
docker compose up
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Backend health check: http://localhost:8000/health

Editing `.env` requires `docker compose down && docker compose up` to take effect — Docker only reads it at container startup.

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
docker-compose.yml
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

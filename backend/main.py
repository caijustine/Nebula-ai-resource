# ─── main.py — FastAPI application (the "C" in MVC) ──────────────────────────
# This is the heart of the backend. It defines every URL endpoint (route) that
# the frontend can call, and what to do when each one is hit.
#
# FastAPI is a Python web framework — it listens for HTTP requests and runs
# the matching function. HTTP requests have a METHOD (GET, POST, DELETE, etc.)
# and a PATH (/resources, /health, etc.). Together they define what action to take:
#
#   GET  /resources        → fetch all resources from the database
#   POST /resources        → save a new resource to the database
#   DELETE /resources/{id} → remove a specific resource (admin only)
#   POST /admin/verify     → check if an admin password is correct
#   GET  /health           → confirm the server is running

import json
import os
import re
from contextlib import asynccontextmanager
from typing import List

from anthropic import Anthropic
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from chat import build_system_prompt
from database import get_session
from models import Resource, ResourceCreate, ResourceRead, ChatRequest

# ── Config ────────────────────────────────────────────────────────────────────
# Read the admin password from the environment. If it's not set, default to "admin".
# In production (and in our .env file) this should be a strong secret.
# IMPORTANT: changing .env requires `docker compose down && docker compose up`
# to take effect — Docker reads .env only at container startup, not on page refresh.
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin")

# A regular expression (regex) pattern to validate URLs.
# ^https?:// means "must start with http:// or https://"
# .+ means "followed by at least one character"
URL_PATTERN = re.compile(r"^https?://.+")

# The Claude model used for chat responses.
# Extracted here so it's easy to update in one place if the model changes.
_CHAT_MODEL = "claude-haiku-4-5-20251001"

# ── Anthropic client ──────────────────────────────────────────────────────────
# Created once and reused across requests (a "singleton").
# Using a module-level client avoids opening a new HTTP connection on every
# chat request. _anthropic_client starts as None and is created on the first
# chat request (lazy initialization), so startup doesn't fail if the key is unset.
_anthropic_client: "Anthropic | None" = None


def _get_anthropic_client() -> "Anthropic":
    """Returns the shared Anthropic client, creating it on first use."""
    global _anthropic_client
    if _anthropic_client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="ANTHROPIC_API_KEY not configured — add it to .env and restart Docker",
            )
        _anthropic_client = Anthropic(api_key=api_key)
    return _anthropic_client


# ── Lifespan ──────────────────────────────────────────────────────────────────
# The lifespan context manager runs code at server startup (before `yield`)
# and shutdown (after `yield`). We use it for setup/cleanup tasks.
# Currently empty — database setup is handled by Alembic in start.sh.
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield   # everything before this runs on startup; after runs on shutdown


# ── App instance ──────────────────────────────────────────────────────────────
# FastAPI() creates the application object. All routes are registered on this object
# using decorators like @app.get(), @app.post(), etc.
app = FastAPI(lifespan=lifespan)


# ── CORS middleware ────────────────────────────────────────────────────────────
# CORS = Cross-Origin Resource Sharing. By default, browsers BLOCK requests from
# one domain to another (e.g. localhost:5173 → localhost:8000) as a security measure.
# This middleware tells the browser "yes, it's okay for the frontend to call this API."
# allow_origins=["*"] means ANY origin is allowed — fine for development,
# but in production you'd restrict this to your specific frontend URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ──────────────────────────────────────────────────────────────
# A simple endpoint Docker uses to check if the backend is ready.
# The docker-compose.yml healthcheck calls this URL every 5 seconds.
# If it returns 200 OK, Docker marks the container as "healthy".
@app.get("/health")
def health():
    return {"status": "ok"}


# ── GET /resources — Fetch all resources ──────────────────────────────────────
# response_model=List[ResourceRead] tells FastAPI to format the response as a
# JSON array of ResourceRead objects (automatically converts Python objects to JSON).
#
# `session: Session = Depends(get_session)` is dependency injection:
# FastAPI calls get_session() for us and passes the result as `session`.
# This gives us a database connection that's automatically cleaned up after the request.
#
# select(Resource) is like SQL: SELECT * FROM resource
# .order_by(Resource.created_at.desc()) adds: ORDER BY created_at DESC
# .all() executes the query and returns all matching rows as a Python list.
@app.get("/resources", response_model=List[ResourceRead])
def get_resources(session: Session = Depends(get_session)):
    return session.exec(
        select(Resource).order_by(Resource.created_at.desc())
    ).all()


# ── POST /resources — Create a new resource ───────────────────────────────────
# FastAPI automatically parses the JSON request body into a `ResourceCreate` object.
# If required fields are missing, it returns 422 before this function even runs.
# status_code=201 means "Created" — the standard HTTP response for a successful POST.
#
# We do additional validation that Pydantic can't handle (blank strings, URL format).
# HTTPException raises an HTTP error response and stops the function immediately.
#
# data.model_dump() converts the Pydantic object to a plain Python dict.
# Resource(**dict) unpacks the dict as keyword arguments to create a Resource instance.
# session.add() → session.commit() → session.refresh() is the standard
# "save to database and get the saved version back" pattern in SQLAlchemy.
@app.post("/resources", response_model=ResourceRead, status_code=201)
def create_resource(data: ResourceCreate, session: Session = Depends(get_session)):
    # Extra validation: Pydantic allows non-empty strings, but "   " (spaces) is useless
    if not data.title.strip():
        raise HTTPException(status_code=422, detail="Title cannot be empty")
    # Check URL format with our regex pattern
    if not URL_PATTERN.match(data.url):
        raise HTTPException(
            status_code=422,
            detail="URL must start with http:// or https://",
        )
    resource = Resource(**data.model_dump())
    session.add(resource)      # stage the new row (not saved yet)
    session.commit()           # write it to the database permanently
    session.refresh(resource)  # reload from DB to get the auto-assigned id and created_at
    return resource


# ── DELETE /resources/{resource_id} — Delete a resource (admin only) ──────────
# {resource_id} in the path is a path parameter — FastAPI extracts the number from
# the URL and passes it as the `resource_id` argument.
# Example: DELETE /resources/42 → resource_id = 42
#
# x_admin_password: str = Header(...) reads the `X-Admin-Password` HTTP header.
# FastAPI converts header names to lowercase with underscores (X-Admin-Password → x_admin_password).
# The `...` means this header is required — requests without it get a 422 error.
#
# HTTP 403 Forbidden = "I know who you are, but you don't have permission."
# HTTP 404 Not Found = "That resource doesn't exist."
# HTTP 204 No Content = "Success, but there's nothing to return." (standard for DELETE)
@app.delete("/resources/{resource_id}", status_code=204)
def delete_resource(
    resource_id: int,
    x_admin_password: str = Header(...),
    session: Session = Depends(get_session),
):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    resource = session.get(Resource, resource_id)   # look up by primary key
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    session.delete(resource)
    session.commit()


# ── POST /admin/verify — Check if a password is valid ─────────────────────────
# Called by the AdminPage when you type your password. Returns 200 if correct,
# 403 if wrong. This way the frontend can confirm credentials without needing
# to perform an actual destructive action first.
@app.post("/admin/verify", status_code=200)
def verify_admin(x_admin_password: str = Header(...)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"status": "ok"}


# ── POST /chat — Streaming AI assistant ───────────────────────────────────────
# This endpoint powers the Nebula AI chat assistant.
#
# How streaming works:
#   1. We call Anthropic's API with the conversation history + system prompt
#   2. Instead of waiting for the full response, Anthropic sends it in small chunks
#   3. We immediately forward each chunk to the frontend using Server-Sent Events (SSE)
#   4. SSE is a simple text format: each event is "data: <content>\n\n"
#   5. The frontend reads these events one-by-one and appends text to the message
#
# json.dumps() safely encodes each chunk — this handles newlines and special
# characters so the SSE format isn't accidentally broken.
@app.post("/chat")
def chat_stream(request: ChatRequest, session: Session = Depends(get_session)):
    client = _get_anthropic_client()  # raises 500 if API key not configured

    # Fetch resources eagerly here (outside generate()) because the database
    # session may be closed by the time the generator runs.
    resources = session.exec(select(Resource)).all()
    system_prompt = build_system_prompt(list(resources))

    def generate():
        # This is a generator function — `yield` sends one chunk at a time.
        # FastAPI's StreamingResponse calls next() on this generator repeatedly
        # until it's exhausted, sending each yielded string to the browser immediately.
        try:
            with client.messages.stream(
                model=_CHAT_MODEL,
                max_tokens=1024,
                system=system_prompt,
                messages=[
                    {"role": m.role, "content": m.content}
                    for m in request.messages
                ],
            ) as stream:
                for text in stream.text_stream:
                    if text:
                        yield f"data: {json.dumps(text)}\n\n"
            yield f"data: {json.dumps('[DONE]')}\n\n"
        except Exception as e:
            # NOTE: because the HTTP 200 header has already been sent at this point,
            # we cannot change the status code to 5xx here. The frontend must
            # check for [ERROR] frames in the SSE body — checking only the HTTP
            # status code is not sufficient for detecting mid-stream failures.
            yield f"data: {json.dumps(f'[ERROR] {str(e)}')}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

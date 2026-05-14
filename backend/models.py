# ─── models.py — Data shapes (the "M" in MVC) ────────────────────────────────
# This file defines what a "resource" looks like — what fields it has,
# what type each field is, and which fields are required vs optional.
#
# We define THREE classes for one concept (Resource), each serving a different role:
#
#   Resource       → the actual database table (has id, created_at)
#   ResourceCreate → what the frontend sends when submitting a new resource (no id yet)
#   ResourceRead   → what the API sends back to the frontend (includes id & created_at)
#
# Why three? Because the data you RECEIVE from a user is different from what you
# STORE in the database, which is different from what you RETURN to the client.
# This separation prevents bugs like users setting their own id or timestamp.
#
# SQLModel is a library that combines two tools:
#   - SQLAlchemy: talks to the database (reads/writes rows)
#   - Pydantic: validates data types (ensures title is a string, not a number, etc.)

from datetime import datetime, timezone
from typing import List, Literal, Optional
from sqlmodel import Field, SQLModel


# ── Resource (database table) ──────────────────────────────────────────────────
# `table=True` tells SQLModel to create a real PostgreSQL table from this class.
# Each class attribute becomes a column in the table.
#
# Field() lets us add extra rules to a column:
#   primary_key=True → this column uniquely identifies each row (auto-increments)
#   max_length=100   → PostgreSQL will reject strings longer than 100 characters
#   default=None     → the column is nullable (can be empty)
#
# Optional[str] means the field can be either a string OR None (null in the database).
# A plain `str` (no Optional) means the field is REQUIRED — the database won't accept null.
class Resource(SQLModel, table=True):
    """The actual database table. Each field is a column in PostgreSQL."""

    # id starts as None in Python, but PostgreSQL auto-assigns an integer when saved
    id: Optional[int] = Field(default=None, primary_key=True)

    # Required fields — saving a resource without these raises an error
    title: str = Field(max_length=100)
    url: str

    # Optional fields — these columns can be NULL in the database
    description: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None)
    tags: Optional[str] = Field(default=None)
    submitter_name: Optional[str] = Field(default=None)

    # default_factory runs a function to produce the default value.
    # lambda: datetime.now(timezone.utc) calls datetime.now() at the moment
    # the resource is created, not when the class is defined. timezone.utc
    # ensures the timestamp is stored in UTC (universal time) regardless of
    # where the server is physically located.
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


# ── ResourceCreate (what the frontend sends) ──────────────────────────────────
# No `table=True` — this is NOT a database table, just a validation schema.
# When a POST request arrives at /resources, FastAPI automatically parses the
# JSON body into a ResourceCreate object. If any required field is missing or
# the wrong type, FastAPI returns a 422 error before our code even runs.
class ResourceCreate(SQLModel):
    """Shape of the JSON body the frontend sends when creating a resource."""
    title: str           # required
    url: str             # required
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    submitter_name: Optional[str] = None
    # Notice: no `id` or `created_at` — users can't set those themselves


# ── ResourceRead (what the API sends back) ────────────────────────────────────
# The `response_model` on our GET and POST routes tells FastAPI to use this
# class to serialize (convert to JSON) whatever we return from the route function.
# It includes `id` and `created_at` because by the time we're responding,
# the database has assigned those values.
class ResourceRead(SQLModel):
    """Shape of the JSON the API returns when reading a resource."""
    id: int
    title: str
    url: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    submitter_name: Optional[str] = None
    created_at: datetime


# ── Chat request models ────────────────────────────────────────────────────────
# These two classes define the shape of the JSON body for POST /chat.
# They are NOT database tables (no `table=True`) — just validation schemas.
#
# ChatMessageRequest represents one message in the conversation history:
#   role: either "user" (the human) or "assistant" (Claude's previous replies)
#   content: the actual text of that message
#
# ChatRequest wraps a list of those messages — the full conversation so far.
# The frontend sends the entire history on every request so Claude has context
# for what was said earlier in the conversation.
class ChatMessageRequest(SQLModel):
    """One message in a conversation — either from the user or the assistant."""
    role: Literal["user", "assistant"]  # only these two values are valid
    content: str  # the message text


class ChatRequest(SQLModel):
    """The full conversation history sent to POST /chat."""
    messages: List[ChatMessageRequest]

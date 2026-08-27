# ─── database.py — Database connection setup ──────────────────────────────────
# This file has one job: connect our Python app to PostgreSQL and hand out
# "sessions" to route handlers that need to read or write data.
#
# Think of it like this:
#   - The DATABASE_URL is the address of the database server
#   - The engine is the permanent connection to that address (opened once at startup)
#   - A session is a temporary workspace for one request — open it, do work, close it

import os
from sqlmodel import create_engine, Session, SQLModel

# ── Database URL ──────────────────────────────────────────────────────────────
# os.environ.get() reads an environment variable. If DATABASE_URL is set
# (e.g. in our .env file, for Postgres), use that. Otherwise fall back to a
# local SQLite file — handy for running tests or the backend locally.
#
# PostgreSQL URL format: postgresql://username:password@host:port/database_name
# SQLite URL format:     sqlite:///./filename.db  (3 slashes = relative path)
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./local.db")

# ── Engine ────────────────────────────────────────────────────────────────────
# create_engine() opens the connection to the database. This happens ONCE when
# the server starts, not on every request — maintaining a persistent connection
# is much faster than opening a new one for each request.
#
# echo=True makes SQLAlchemy print every SQL query it runs to the terminal.
# This is great for learning — you can see exactly what SQL gets generated
# from your Python code. Turn it off in production to reduce log noise.
engine = create_engine(DATABASE_URL, echo=True)


# ── Session provider (dependency) ─────────────────────────────────────────────
# FastAPI uses "dependency injection" — instead of calling get_session() yourself,
# you declare it as a parameter and FastAPI calls it for you and passes the result.
# (See how it's used in main.py: `session: Session = Depends(get_session)`)
#
# `yield` turns this into a "generator" — code before yield runs before the request,
# code after yield runs after. This guarantees the session is always closed, even
# if an error occurs mid-request (like a try/finally block).
def get_session():
    """Yields one database session per request, then closes it automatically."""
    with Session(engine) as session:
        yield session


# ── Table creator (used by tests only) ────────────────────────────────────────
# This function creates all database tables defined in models.py.
# In production, Alembic handles this (via `alembic upgrade head`, see README.md).
# We keep this function here because tests use it to set up a fresh in-memory database.
def create_tables():
    """Creates all tables defined in models.py if they don't exist yet."""
    SQLModel.metadata.create_all(engine)

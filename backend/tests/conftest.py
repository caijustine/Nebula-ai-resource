# ─── conftest.py — Test setup and shared fixtures ────────────────────────────
# pytest looks for a file named `conftest.py` automatically — no import needed.
# This file defines "fixtures": reusable setup functions that tests can request
# by name. If a test function has a parameter called `client`, pytest finds the
# `client` fixture here and runs it, passing the result in.
#
# Why do we need special setup for tests?
# We don't want tests writing to our real PostgreSQL database. Instead, we use
# an in-memory SQLite database — it exists only for the duration of one test,
# then disappears. This means tests are isolated (one test can't affect another)
# and fast (no network or disk I/O).

import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from main import app
from database import get_session


# ── Session fixture ───────────────────────────────────────────────────────────
# @pytest.fixture makes this function a fixture. `name="session"` is what tests
# use to request it. `yield` makes it a generator — setup runs before yield,
# teardown runs after.
#
# "sqlite://" (with no path after it) creates an in-memory database that lives
# only in RAM and is destroyed when the connection closes.
# StaticPool ensures all connections share the same in-memory database instance
# (by default, each new connection gets a fresh empty database — not what we want).
@pytest.fixture(name="session")
def session_fixture():
    """Creates a fresh in-memory SQLite database for each test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)  # create tables in the test database
    with Session(engine) as session:
        yield session   # hand the session to the test
    SQLModel.metadata.drop_all(engine)   # wipe everything after the test finishes


# ── Client fixture ────────────────────────────────────────────────────────────
# TestClient wraps our FastAPI app so we can call endpoints without running a real server.
# It sends fake HTTP requests directly to the app in the same Python process.
#
# The tricky part: our app routes use `Depends(get_session)` to get a database session.
# We need to swap that out with our test session (not the real PostgreSQL connection).
# `app.dependency_overrides` is FastAPI's built-in mechanism for replacing dependencies
# in tests — we tell it "whenever get_session is requested, use override_get_session instead."
@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Creates a test HTTP client wired to the in-memory test database."""
    def override_get_session():
        return session  # return our test session instead of a real database session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()  # reset after the test so nothing leaks between tests

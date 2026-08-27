# Nebula AI Resource Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack AI resource-sharing platform with a dark galaxy aesthetic, FastAPI + PostgreSQL backend, and animated React frontend.

**Architecture:** Monorepo with `/frontend` (React/TS/Tailwind/Framer Motion) and `/backend` (FastAPI/SQLModel/Alembic/PostgreSQL) running in Docker containers orchestrated by Docker Compose. The frontend fetches and mutates resources via a REST API. Admin deletion is protected by a password sent as a request header.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Framer Motion, React Router v6, React Hot Toast, Python 3.11, FastAPI, SQLModel, Alembic, PostgreSQL 15, Docker, Docker Compose.

---

## File Map

```
ai-resources/
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── start.sh                    ← runs migrations then starts server
│   ├── database.py                 ← engine + session + create_tables()
│   ├── models.py                   ← Resource table + Pydantic schemas
│   ├── main.py                     ← FastAPI app + all 5 routes
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py                  ← configured to read DATABASE_URL
│   │   └── versions/
│   │       └── 001_create_resources.py
│   └── tests/
│       ├── conftest.py             ← in-memory SQLite test fixtures
│       └── test_resources.py       ← TDD tests for all endpoints
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── types/
        │   └── resource.ts         ← Resource interface + CATEGORIES constant
        ├── api/
        │   └── resources.ts        ← all fetch() calls to the backend
        └── components/
            ├── ParticleField.tsx   ← canvas star-field background
            ├── Navbar.tsx          ← fixed top nav with scroll blur
            ├── ResourceCard.tsx    ← animated card with category glow
            ├── SkeletonCard.tsx    ← loading placeholder
            ├── CategoryFilter.tsx  ← pill filter row
            ├── SearchBar.tsx       ← search input
            ├── pages/
            │   ├── FeedPage.tsx    ← home: hero + filters + grid
            │   ├── SubmitPage.tsx  ← glassmorphism form
            │   └── AdminPage.tsx   ← password gate + delete controls
```

---

## Task 1: Repository scaffold and root config

**Beginner note:** `.gitignore` tells Git which files to never track. `.env.example` is a safe template that shows teammates which secret variables they need — without revealing the actual values.

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`

- [ ] **Step 1: Create the project root folder and move into it**

```bash
mkdir ai-resources && cd ai-resources
git init
```

- [ ] **Step 2: Create `.gitignore`**

```
# secrets — never commit these
.env

# Python
__pycache__/
*.pyc
.pytest_cache/
*.egg-info/

# Node
node_modules/
dist/

# Docker volumes
postgres_data/
```

- [ ] **Step 3: Create `.env.example`**

```bash
# Copy this file to .env and fill in your own values
# Never commit .env to git

POSTGRES_USER=nebula
POSTGRES_PASSWORD=change_me
POSTGRES_DB=nebula_db
DATABASE_URL=postgresql://nebula:change_me@db:5432/nebula_db

ADMIN_PASSWORD=change_me_too

VITE_API_URL=http://localhost:8000
```

- [ ] **Step 4: Create `docker-compose.yml`**

**Beginner note:** This file is the master "recipe" that tells Docker how to start all three containers (database, backend, frontend) together. `depends_on` makes sure the database is healthy before the backend tries to connect to it.

```yaml
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: ${VITE_API_URL}
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

- [ ] **Step 5: Create `.env` from the example and fill in values**

```bash
cp .env.example .env
```

Open `.env` and replace every `change_me` with real values (any passwords you choose — this is just for local dev).

- [ ] **Step 6: Commit**

```bash
git add .gitignore .env.example docker-compose.yml
git commit -m "chore: initialize repo with Docker Compose config"
```

---

## Task 2: Backend project setup

**Beginner note:** `requirements.txt` is Python's way of listing all the packages the project needs — like a shopping list. `pip install -r requirements.txt` buys everything on the list. The Dockerfile packages this all into a container image.

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/Dockerfile`
- Create: `backend/start.sh`

- [ ] **Step 1: Create `backend/requirements.txt`**

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlmodel==0.0.19
alembic==1.13.1
psycopg2-binary==2.9.9
python-dotenv==1.0.1
httpx==0.27.0
pytest==8.2.0
pytest-asyncio==0.23.6
```

- [ ] **Step 2: Create `backend/Dockerfile`**

**Beginner note:** A Dockerfile is a recipe for building a container image. Each line is a step: start from Python 3.11, set the working directory, install dependencies, copy the code in.

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x start.sh

CMD ["./start.sh"]
```

- [ ] **Step 3: Create `backend/start.sh`**

**Beginner note:** This shell script runs when the container starts. It first applies any database migrations (schema changes), then starts the web server. Running migrations before the server ensures the database tables always exist before any requests arrive.

```bash
#!/bin/bash
set -e
echo "Applying database migrations..."
alembic upgrade head
echo "Starting FastAPI server..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- [ ] **Step 4: Commit**

```bash
git add backend/
git commit -m "chore: add backend Dockerfile and dependencies"
```

---

## Task 3: Backend database connection and data model

**Beginner note:** `database.py` creates the connection to PostgreSQL. `models.py` defines the shape of the data — what columns the `resources` table will have. SQLModel lets us write this as a Python class, which is easier to read than raw SQL.

**Files:**
- Create: `backend/database.py`
- Create: `backend/models.py`

- [ ] **Step 1: Create `backend/database.py`**

```python
import os
from sqlmodel import create_engine, Session, SQLModel

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./local.db")

# echo=True prints every SQL query to the terminal — useful for learning
engine = create_engine(DATABASE_URL, echo=True)


def get_session():
    """Yields a database session for use in route handlers."""
    with Session(engine) as session:
        yield session


def create_tables():
    """Creates all tables defined in models.py if they don't exist yet."""
    SQLModel.metadata.create_all(engine)
```

- [ ] **Step 2: Create `backend/models.py`**

```python
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


class Resource(SQLModel, table=True):
    """The actual database table. Each field becomes a column."""
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(max_length=100)
    url: str
    description: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None)
    tags: Optional[str] = Field(default=None)
    submitter_name: Optional[str] = Field(default=None)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class ResourceCreate(SQLModel):
    """Shape of the JSON body when creating a resource (no id or timestamp)."""
    title: str
    url: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    submitter_name: Optional[str] = None


class ResourceRead(SQLModel):
    """Shape of the JSON response when reading a resource."""
    id: int
    title: str
    url: str
    description: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    submitter_name: Optional[str] = None
    created_at: datetime
```

- [ ] **Step 3: Commit**

```bash
git add backend/database.py backend/models.py
git commit -m "feat: add database connection and Resource model"
```

---

## Task 4: Backend API routes (TDD — write tests first)

**Beginner note:** TDD means "Test-Driven Development." You write the tests *before* the real code. This sounds backwards, but it forces you to think clearly about what the code should do. We use an in-memory SQLite database for tests so they run instantly without Docker.

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/test_resources.py`
- Create: `backend/main.py`

- [ ] **Step 1: Create `backend/tests/__init__.py`** (empty file)

```bash
mkdir -p backend/tests && touch backend/tests/__init__.py
```

- [ ] **Step 2: Create `backend/tests/conftest.py`**

**Beginner note:** `conftest.py` is a special pytest file that defines reusable setup code called "fixtures." Here we create a fresh in-memory database and a test HTTP client for each test, so tests don't interfere with each other.

```python
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from main import app
from database import get_session


@pytest.fixture(name="session")
def session_fixture():
    """Creates a fresh in-memory SQLite database for each test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Creates a test HTTP client wired to the test database."""
    def override_get_session():
        return session

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
```

- [ ] **Step 3: Create `backend/tests/test_resources.py`** (the tests — before main.py exists)

```python
def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_resources_returns_empty_list(client):
    response = client.get("/resources")
    assert response.status_code == 200
    assert response.json() == []


def test_create_resource_minimal(client):
    response = client.post("/resources", json={
        "title": "OpenAI Docs",
        "url": "https://platform.openai.com/docs",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "OpenAI Docs"
    assert data["url"] == "https://platform.openai.com/docs"
    assert data["id"] is not None
    assert data["created_at"] is not None


def test_create_resource_all_fields(client):
    response = client.post("/resources", json={
        "title": "Andrej Karpathy's Zero to Hero",
        "url": "https://youtube.com/karpathy",
        "description": "Best neural net course on YouTube",
        "category": "Videos",
        "tags": "ml, neural-nets, free",
        "submitter_name": "Alex",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "Videos"
    assert data["submitter_name"] == "Alex"


def test_create_resource_rejects_blank_title(client):
    response = client.post("/resources", json={
        "title": "   ",
        "url": "https://example.com",
    })
    assert response.status_code == 422


def test_create_resource_rejects_invalid_url(client):
    response = client.post("/resources", json={
        "title": "Test",
        "url": "not-a-url",
    })
    assert response.status_code == 422


def test_create_resource_rejects_url_without_scheme(client):
    response = client.post("/resources", json={
        "title": "Test",
        "url": "example.com",
    })
    assert response.status_code == 422


def test_resources_sorted_newest_first(client):
    client.post("/resources", json={"title": "First", "url": "https://first.com"})
    client.post("/resources", json={"title": "Second", "url": "https://second.com"})
    response = client.get("/resources")
    data = response.json()
    assert data[0]["title"] == "Second"
    assert data[1]["title"] == "First"


def test_delete_resource_with_correct_password(client):
    create_resp = client.post("/resources", json={
        "title": "To Delete",
        "url": "https://delete.me",
    })
    resource_id = create_resp.json()["id"]
    delete_resp = client.delete(
        f"/resources/{resource_id}",
        headers={"x-admin-password": "admin"},
    )
    assert delete_resp.status_code == 204
    # Confirm it's gone
    list_resp = client.get("/resources")
    assert all(r["id"] != resource_id for r in list_resp.json())


def test_delete_resource_with_wrong_password(client):
    create_resp = client.post("/resources", json={
        "title": "Keep Me",
        "url": "https://keep.me",
    })
    resource_id = create_resp.json()["id"]
    delete_resp = client.delete(
        f"/resources/{resource_id}",
        headers={"x-admin-password": "wrong"},
    )
    assert delete_resp.status_code == 403


def test_delete_nonexistent_resource(client):
    response = client.delete(
        "/resources/99999",
        headers={"x-admin-password": "admin"},
    )
    assert response.status_code == 404


def test_verify_admin_correct_password(client):
    response = client.post(
        "/admin/verify",
        headers={"x-admin-password": "admin"},
    )
    assert response.status_code == 200


def test_verify_admin_wrong_password(client):
    response = client.post(
        "/admin/verify",
        headers={"x-admin-password": "wrong"},
    )
    assert response.status_code == 403
```

- [ ] **Step 4: Run tests — expect them to fail (no main.py yet)**

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

Expected output: `ImportError: No module named 'main'` or similar. This is correct — we haven't written `main.py` yet.

- [ ] **Step 5: Create `backend/main.py`**

```python
import os
import re
from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import create_tables, get_session
from models import Resource, ResourceCreate, ResourceRead

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin")
URL_PATTERN = re.compile(r"^https?://.+")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/resources", response_model=List[ResourceRead])
def get_resources(session: Session = Depends(get_session)):
    return session.exec(
        select(Resource).order_by(Resource.created_at.desc())
    ).all()


@app.post("/resources", response_model=ResourceRead, status_code=201)
def create_resource(data: ResourceCreate, session: Session = Depends(get_session)):
    if not data.title.strip():
        raise HTTPException(status_code=422, detail="Title cannot be empty")
    if not URL_PATTERN.match(data.url):
        raise HTTPException(
            status_code=422,
            detail="URL must start with http:// or https://",
        )
    resource = Resource(**data.model_dump())
    session.add(resource)
    session.commit()
    session.refresh(resource)
    return resource


@app.delete("/resources/{resource_id}", status_code=204)
def delete_resource(
    resource_id: int,
    x_admin_password: str = Header(...),
    session: Session = Depends(get_session),
):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    resource = session.get(Resource, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    session.delete(resource)
    session.commit()


@app.post("/admin/verify", status_code=200)
def verify_admin(x_admin_password: str = Header(...)):
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")
    return {"status": "ok"}
```

- [ ] **Step 6: Run tests — expect them all to pass**

```bash
pytest tests/ -v
```

Expected output: all 13 tests show `PASSED`. If any fail, read the error message carefully — it will point to the exact line that's wrong.

- [ ] **Step 7: Commit**

```bash
git add backend/tests/ backend/main.py
git commit -m "feat: add FastAPI routes with full test coverage"
```

---

## Task 5: Configure Alembic for database migrations

**Beginner note:** Alembic tracks changes to your database schema over time — like Git, but for your database structure. The first migration creates the `resources` table. In the future, if you need to add a column, you'd create a new migration instead of modifying the database by hand.

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/001_create_resources.py`

- [ ] **Step 1: Initialize Alembic inside the backend folder**

```bash
cd backend
alembic init alembic
```

This creates `alembic.ini` and the `alembic/` directory with template files.

- [ ] **Step 2: Edit `backend/alembic.ini` — remove the hardcoded URL**

Find the line that says `sqlalchemy.url = ...` and change it to:

```ini
sqlalchemy.url =
```

We leave it blank because `alembic/env.py` will read the URL from the environment variable instead.

- [ ] **Step 3: Replace `backend/alembic/env.py` with this**

```python
import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

# Add the backend folder to Python's path so we can import our models
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models import Resource  # noqa: F401 — import registers the table

config = context.config

# Read DATABASE_URL from the environment and inject it into Alembic's config
config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 4: Create `backend/alembic/versions/001_create_resources.py`**

**Beginner note:** `upgrade()` runs when you apply the migration (moving forward). `downgrade()` reverses it (going back). Alembic calls these automatically.

```python
"""create resources table

Revision ID: 001
Revises:
Create Date: 2026-05-12
"""

import sqlalchemy as sa
from alembic import op

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "resource",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("tags", sa.String(), nullable=True),
        sa.Column("submitter_name", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("resource")
```

- [ ] **Step 5: Commit**

```bash
git add backend/alembic.ini backend/alembic/
git commit -m "feat: configure Alembic with initial resources migration"
```

---

## Task 6: Frontend scaffolding

**Beginner note:** Vite is a tool that sets up a React project instantly and provides a fast local development server with hot reload (the browser updates as you save files). Tailwind CSS is a library of pre-written CSS classes you apply directly in your JSX.

**Files:**
- Create: `frontend/` (via Vite)
- Create: `frontend/Dockerfile`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/vite.config.ts`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Scaffold the React app with Vite**

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

- [ ] **Step 2: Install frontend dependencies**

```bash
npm install framer-motion react-router-dom react-hot-toast
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p --ts
```

- [ ] **Step 3: Replace `frontend/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Replace `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})
```

- [ ] **Step 5: Replace `frontend/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #05050f;
  color: white;
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
```

- [ ] **Step 6: Replace `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nebula — AI Resources</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `frontend/Dockerfile`**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 8: Delete the Vite boilerplate files**

```bash
rm -f frontend/src/App.css frontend/src/assets/react.svg public/vite.svg
```

- [ ] **Step 9: Verify the dev server starts**

```bash
cd frontend
npm run dev
```

Expected: browser opens at `http://localhost:5173`. Stop the server with `Ctrl+C`.

- [ ] **Step 10: Commit**

```bash
cd ..
git add frontend/
git commit -m "chore: scaffold React/Vite/Tailwind frontend"
```

---

## Task 7: Frontend types and API layer

**Beginner note:** `types/resource.ts` defines the shape of a resource in TypeScript — it's like a contract. Any code that handles resource data has to match this shape or TypeScript will warn you. `api/resources.ts` contains all the `fetch()` calls that talk to the backend. Keeping them in one file means if the API URL changes, you only update one place.

**Files:**
- Create: `frontend/src/types/resource.ts`
- Create: `frontend/src/api/resources.ts`

- [ ] **Step 1: Create `frontend/src/types/resource.ts`**

```typescript
export interface Resource {
  id: number
  title: string
  url: string
  description: string | null
  category: string | null
  tags: string | null
  submitter_name: string | null
  created_at: string
}

export interface ResourceCreate {
  title: string
  url: string
  description?: string
  category?: string
  tags?: string
  submitter_name?: string
}

export const CATEGORIES = [
  'Tools',
  'Articles',
  'Videos',
  'Courses',
  'Research Papers',
  'Tutorials',
  'Datasets',
  'Models',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]
```

- [ ] **Step 2: Create `frontend/src/api/resources.ts`**

```typescript
import type { Resource, ResourceCreate } from '../types/resource'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchResources(): Promise<Resource[]> {
  const res = await fetch(`${API_URL}/resources`)
  if (!res.ok) throw new Error('Failed to fetch resources')
  return res.json()
}

export async function createResource(data: ResourceCreate): Promise<Resource> {
  const res = await fetch(`${API_URL}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).detail ?? 'Failed to create resource')
  }
  return res.json()
}

export async function deleteResource(id: number, adminPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/resources/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': adminPassword },
  })
  if (!res.ok) throw new Error('Failed to delete resource')
}

export async function verifyAdmin(password: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/admin/verify`, {
    method: 'POST',
    headers: { 'x-admin-password': password },
  })
  return res.ok
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/ frontend/src/api/
git commit -m "feat: add TypeScript types and API client"
```

---

## Task 8: ParticleField and Navbar components

**Files:**
- Create: `frontend/src/components/ParticleField.tsx`
- Create: `frontend/src/components/Navbar.tsx`

- [ ] **Step 1: Create `frontend/src/components/ParticleField.tsx`**

**Beginner note:** This component draws 120 tiny dots on an HTML `<canvas>` element and slowly drifts them around to create a starfield effect. `requestAnimationFrame` is the browser's built-in animation loop — it runs about 60 times per second.

```tsx
import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
}

export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    const particles: Particle[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const init = () => {
      particles.length = 0
      for (let i = 0; i < 120; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.3,
          speedX: (Math.random() - 0.5) * 0.15,
          speedY: (Math.random() - 0.5) * 0.15,
          opacity: Math.random() * 0.5 + 0.15,
        })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(148, 163, 255, ${p.opacity})`
        ctx.fill()
        p.x += p.speedX
        p.y += p.speedY
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
      })
      animationId = requestAnimationFrame(draw)
    }

    resize()
    init()
    draw()

    const handleResize = () => {
      resize()
      init()
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.45 }}
    />
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/Navbar.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? 'bg-black/40 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      }`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <Link to="/" className="flex items-center gap-2 group">
        <span className="text-blue-400 text-xl group-hover:text-blue-300 transition-colors">✦</span>
        <span className="text-white font-semibold tracking-tight text-lg">nebula</span>
      </Link>

      <motion.button
        onClick={() => navigate('/submit')}
        className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-medium hover:bg-blue-500/20 hover:border-blue-400/60 transition-all"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
      >
        Submit Resource
      </motion.button>
    </motion.nav>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ParticleField.tsx frontend/src/components/Navbar.tsx
git commit -m "feat: add ParticleField starfield and Navbar"
```

---

## Task 9: Resource display components

**Files:**
- Create: `frontend/src/components/SkeletonCard.tsx`
- Create: `frontend/src/components/ResourceCard.tsx`
- Create: `frontend/src/components/CategoryFilter.tsx`
- Create: `frontend/src/components/SearchBar.tsx`

- [ ] **Step 1: Create `frontend/src/components/SkeletonCard.tsx`**

**Beginner note:** A skeleton card is a placeholder that shows while real data is loading. The `animate-pulse` Tailwind class creates the soft fading animation.

```tsx
export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 animate-pulse">
      <div className="h-4 bg-white/10 rounded-lg w-3/4 mb-3" />
      <div className="h-3 bg-white/[0.07] rounded w-full mb-2" />
      <div className="h-3 bg-white/[0.07] rounded w-2/3 mb-5" />
      <div className="flex gap-2">
        <div className="h-5 bg-white/10 rounded-full w-16" />
        <div className="h-5 bg-white/10 rounded-full w-12" />
      </div>
      <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
        <div className="h-3 bg-white/[0.07] rounded w-24" />
        <div className="h-6 bg-white/10 rounded-lg w-14" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/components/ResourceCard.tsx`**

```tsx
import { motion } from 'framer-motion'
import type { Resource } from '../types/resource'

const CATEGORY_STYLES: Record<string, { border: string; badge: string }> = {
  Tools: { border: 'border-blue-500/30 hover:border-blue-400/50', badge: 'bg-blue-500/15 text-blue-300' },
  Articles: { border: 'border-purple-500/30 hover:border-purple-400/50', badge: 'bg-purple-500/15 text-purple-300' },
  Videos: { border: 'border-pink-500/30 hover:border-pink-400/50', badge: 'bg-pink-500/15 text-pink-300' },
  Courses: { border: 'border-cyan-500/30 hover:border-cyan-400/50', badge: 'bg-cyan-500/15 text-cyan-300' },
  'Research Papers': { border: 'border-indigo-500/30 hover:border-indigo-400/50', badge: 'bg-indigo-500/15 text-indigo-300' },
  Tutorials: { border: 'border-green-500/30 hover:border-green-400/50', badge: 'bg-green-500/15 text-green-300' },
  Datasets: { border: 'border-orange-500/30 hover:border-orange-400/50', badge: 'bg-orange-500/15 text-orange-300' },
  Models: { border: 'border-violet-500/30 hover:border-violet-400/50', badge: 'bg-violet-500/15 text-violet-300' },
  Other: { border: 'border-slate-500/30 hover:border-slate-400/50', badge: 'bg-slate-500/15 text-slate-300' },
}

const DEFAULT_STYLES = { border: 'border-white/10 hover:border-white/20', badge: 'bg-white/10 text-white/50' }

interface Props {
  resource: Resource
  onDelete?: (id: number) => void
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ResourceCard({ resource, onDelete }: Props) {
  const styles = resource.category
    ? (CATEGORY_STYLES[resource.category] ?? DEFAULT_STYLES)
    : DEFAULT_STYLES

  const tags = resource.tags
    ? resource.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : []

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      className={`group relative rounded-2xl border ${styles.border} bg-white/[0.03] backdrop-blur-sm p-5 flex flex-col gap-3 transition-all duration-200`}
    >
      {/* shimmer overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 flex-1">
          {resource.title}
        </h3>
        {resource.category && (
          <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
            {resource.category}
          </span>
        )}
      </div>

      {resource.description && (
        <p className="text-white/45 text-sm leading-relaxed line-clamp-3">
          {resource.description}
        </p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] text-white/35 border border-white/[0.07]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.05]">
        <p className="text-xs text-white/25">
          {resource.submitter_name && (
            <span className="text-white/40">{resource.submitter_name} · </span>
          )}
          {formatDate(resource.created_at)}
        </p>

        <div className="flex items-center gap-2">
          {onDelete && (
            <motion.button
              onClick={() => onDelete(resource.id)}
              className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-400/40 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Delete
            </motion.button>
          )}
          <motion.a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-white/60 hover:bg-white/[0.12] hover:text-white transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Visit →
          </motion.a>
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create `frontend/src/components/CategoryFilter.tsx`**

```tsx
import { motion } from 'framer-motion'
import { CATEGORIES } from '../types/resource'

interface Props {
  selected: string
  onChange: (category: string) => void
}

export function CategoryFilter({ selected, onChange }: Props) {
  const all = ['All', ...CATEGORIES]

  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {all.map((cat) => (
        <motion.button
          key={cat}
          onClick={() => onChange(cat)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            selected === cat
              ? 'bg-blue-500/20 border-blue-400/60 text-blue-300 shadow-sm shadow-blue-500/20'
              : 'bg-white/[0.04] border-white/10 text-white/45 hover:bg-white/[0.08] hover:text-white/70'
          }`}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
        >
          {cat}
        </motion.button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/src/components/SearchBar.tsx`**

```tsx
import { motion } from 'framer-motion'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <motion.div
      className="relative w-full max-w-xl"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-base select-none">
        ⌕
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title, description, or tags..."
        className="w-full bg-white/[0.05] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.07] transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors text-sm"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add resource card, skeleton, category filter, search bar"
```

---

## Task 10: Feed Page

**Files:**
- Create: `frontend/src/pages/FeedPage.tsx`

- [ ] **Step 1: Create `frontend/src/pages/FeedPage.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchResources } from '../api/resources'
import { CategoryFilter } from '../components/CategoryFilter'
import { ResourceCard } from '../components/ResourceCard'
import { SearchBar } from '../components/SearchBar'
import { SkeletonCard } from '../components/SkeletonCard'
import type { Resource } from '../types/resource'

export function FeedPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    fetchResources()
      .then(setResources)
      .catch(() => setError('Could not load resources. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return resources.filter((r) => {
      const matchesCategory = category === 'All' || r.category === category
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.tags ?? '').toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [resources, search, category])

  return (
    <div className="min-h-screen bg-[#05050f] relative z-10">
      {/* Hero */}
      <div className="relative pt-36 pb-16 px-6 text-center">
        <div className="absolute inset-0 bg-gradient-radial from-blue-950/30 via-transparent to-transparent pointer-events-none" />
        <motion.h1
          className="relative text-5xl md:text-6xl font-bold text-white tracking-tight mb-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Discover{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
            AI Resources
          </span>
        </motion.h1>
        <motion.p
          className="relative text-white/35 text-base mb-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Community-curated tools, articles, and courses for the AI age
        </motion.p>
        <div className="relative flex justify-center">
          <SearchBar value={search} onChange={setSearch} />
        </div>
      </div>

      {/* Category filter */}
      <div className="px-6 pb-10">
        <CategoryFilter selected={category} onChange={setCategory} />
      </div>

      {/* Resource grid */}
      <div className="px-6 pb-32 max-w-6xl mx-auto">
        {error && (
          <div className="text-center py-20 text-red-400/60 text-sm">{error}</div>
        )}

        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <motion.div
            className="text-center py-28"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-white/15 text-5xl mb-4">✦</p>
            <p className="text-white/35 text-base">No resources found</p>
            <p className="text-white/20 text-sm mt-1">
              {resources.length === 0
                ? 'Be the first to submit one'
                : 'Try a different search or category'}
            </p>
          </motion.div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            <AnimatePresence>
              {filtered.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/FeedPage.tsx
git commit -m "feat: add Feed page with search, filter, and animated grid"
```

---

## Task 11: Submit Page

**Files:**
- Create: `frontend/src/pages/SubmitPage.tsx`

- [ ] **Step 1: Create `frontend/src/pages/SubmitPage.tsx`**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { createResource } from '../api/resources'
import { CATEGORIES } from '../types/resource'

interface FormState {
  title: string
  url: string
  description: string
  category: string
  tags: string
  submitter_name: string
}

interface Errors {
  title?: string
  url?: string
}

const URL_RE = /^https?:\/\/.+/

const INITIAL: FormState = {
  title: '', url: '', description: '', category: '', tags: '', submitter_name: '',
}

export function SubmitPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [field]: e.target.value }))

  const validateField = (field: keyof Errors, value: string): string | undefined => {
    if (field === 'title') return !value.trim() ? 'Title is required' : undefined
    if (field === 'url') return !URL_RE.test(value) ? 'Must start with http:// or https://' : undefined
  }

  const handleBlur = (field: keyof Errors) => {
    const msg = validateField(field, form[field])
    setErrors((p) => ({ ...p, [field]: msg }))
  }

  const validate = (): boolean => {
    const next: Errors = {
      title: validateField('title', form.title),
      url: validateField('url', form.url),
    }
    setErrors(next)
    return !next.title && !next.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await createResource({
        title: form.title.trim(),
        url: form.url.trim(),
        description: form.description.trim() || undefined,
        category: form.category || undefined,
        tags: form.tags.trim() || undefined,
        submitter_name: form.submitter_name.trim() || undefined,
      })
      toast.success('Resource added to the cosmos ✦')
      navigate('/')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const fieldClass = (error?: string) =>
    `bg-white/[0.05] border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-all w-full ${
      error
        ? 'border-red-500/50 focus:border-red-400/70 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
        : 'border-white/10 focus:border-blue-500/50 focus:shadow-[0_0_12px_rgba(59,130,246,0.15)]'
    }`

  return (
    <div className="min-h-screen bg-[#05050f] relative z-10 flex items-center justify-center px-6 py-28">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Share a Resource</h1>
          <p className="text-white/35 text-sm">Add something valuable to the cosmos</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl rounded-2xl p-7 flex flex-col gap-5"
        >
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Title <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              onBlur={() => handleBlur('title')}
              placeholder="e.g. Andrej Karpathy's Neural Networks Zero to Hero"
              className={fieldClass(errors.title)}
            />
            {errors.title && (
              <motion.p
                className="text-red-400 text-xs"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {errors.title}
              </motion.p>
            )}
          </div>

          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              URL <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              value={form.url}
              onChange={set('url')}
              onBlur={() => handleBlur('url')}
              placeholder="https://..."
              className={fieldClass(errors.url)}
            />
            {errors.url && (
              <motion.p
                className="text-red-400 text-xs"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {errors.url}
              </motion.p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="What makes this resource valuable?"
              className="bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all resize-none"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Category
            </label>
            <select
              value={form.category}
              onChange={set('category')}
              className="bg-[#0a0a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Tags
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={set('tags')}
              placeholder="llm, free, beginner (comma-separated)"
              className={fieldClass()}
            />
          </div>

          {/* Submitter name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Your Name
            </label>
            <input
              type="text"
              value={form.submitter_name}
              onChange={set('submitter_name')}
              placeholder="Optional"
              className={fieldClass()}
            />
          </div>

          {/* Submit button */}
          <motion.button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full py-3 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-medium text-sm hover:bg-blue-500/25 hover:border-blue-400/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: submitting ? 1 : 1.02 }}
            whileTap={{ scale: submitting ? 1 : 0.98 }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              'Add to the Cosmos ✦'
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/SubmitPage.tsx
git commit -m "feat: add Submit page with validation and animated form"
```

---

## Task 12: Admin Page

**Files:**
- Create: `frontend/src/pages/AdminPage.tsx`

- [ ] **Step 1: Create `frontend/src/pages/AdminPage.tsx`**

```tsx
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { deleteResource, fetchResources, verifyAdmin } from '../api/resources'
import { ResourceCard } from '../components/ResourceCard'
import { SkeletonCard } from '../components/SkeletonCard'
import type { Resource } from '../types/resource'

export function AdminPage() {
  const [password, setPassword] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setVerifying(true)
    setAuthError(false)
    const ok = await verifyAdmin(password)
    setVerifying(false)
    if (ok) {
      setAdminPassword(password)
      setAuthed(true)
      setLoading(true)
      fetchResources()
        .then(setResources)
        .finally(() => setLoading(false))
    } else {
      setAuthError(true)
      setPassword('')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteResource(id, adminPassword)
      setResources((prev) => prev.filter((r) => r.id !== id))
      toast.success('Resource removed')
    } catch {
      toast.error('Failed to delete resource')
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#05050f] relative z-10 flex items-center justify-center px-6">
        <motion.form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl rounded-2xl p-8 flex flex-col gap-5"
          animate={authError ? { x: [0, -12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="text-center">
            <p className="text-white/20 text-3xl mb-3">⬡</p>
            <h1 className="text-white font-semibold text-lg">Admin Access</h1>
            <p className="text-white/30 text-xs mt-1">Enter your admin password to continue</p>
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className={`bg-white/[0.05] border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-all ${
              authError
                ? 'border-red-500/50 focus:border-red-400/70'
                : 'border-white/10 focus:border-blue-500/50'
            }`}
          />

          {authError && (
            <motion.p
              className="text-red-400 text-xs text-center -mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Incorrect password
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={verifying || !password}
            className="py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white/60 text-sm hover:bg-white/[0.09] hover:text-white/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {verifying ? 'Verifying...' : 'Enter'}
          </motion.button>
        </motion.form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05050f] relative z-10 px-6 pt-28 pb-32">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Manage Resources</h1>
          <span className="text-xs text-white/25">{resources.length} total</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <p className="text-white/30 text-center py-20">No resources yet.</p>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            <AnimatePresence>
              {resources.map((r) => (
                <ResourceCard key={r.id} resource={r} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/AdminPage.tsx
git commit -m "feat: add Admin page with password gate and delete controls"
```

---

## Task 13: App entry point and router

**Beginner note:** `App.tsx` is the root component that wraps everything. React Router reads the URL and renders the right page. `main.tsx` is where the entire React app gets attached to the `<div id="root">` in `index.html`.

**Files:**
- Create: `frontend/src/App.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Create `frontend/src/App.tsx`**

```tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { ParticleField } from './components/ParticleField'
import { FeedPage } from './pages/FeedPage'
import { SubmitPage } from './pages/SubmitPage'
import { AdminPage } from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <ParticleField />
      <Navbar />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f0f1e',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Replace `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx
git commit -m "feat: wire up React Router with all three pages"
```

---

## Task 14: Full integration smoke test with Docker

**Beginner note:** Now we run everything together for the first time. `docker compose up --build` builds all three container images and starts them. It might take a few minutes the first time — Docker is downloading base images and installing packages inside containers.

- [ ] **Step 1: Start all containers**

```bash
docker compose up --build
```

Watch the terminal. You should see logs from three services: `db`, `backend`, and `frontend`. Wait until you see `Application startup complete.` from the backend and `ready in ...ms` from the frontend.

- [ ] **Step 2: Verify the backend is healthy**

Open a new terminal tab and run:

```bash
curl http://localhost:8000/health
```

Expected response: `{"status":"ok"}`

- [ ] **Step 3: Test creating a resource via curl**

```bash
curl -X POST http://localhost:8000/resources \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Resource","url":"https://example.com","category":"Tools"}'
```

Expected: JSON response with an `id` and `created_at` field.

- [ ] **Step 4: Verify the frontend loads**

Open `http://localhost:5173` in your browser. You should see:
- The starfield particle background
- The "nebula" navbar at the top
- The "Discover AI Resources" hero
- The test resource you just submitted via curl

- [ ] **Step 5: Test the submit form**

1. Click "Submit Resource" in the nav
2. Leave the title blank and click submit — you should see the red error message appear
3. Enter a title like "My First Resource" and URL "https://anthropic.com"
4. Fill in optional fields if you like
5. Click "Add to the Cosmos ✦" — you should see a spinner, then a toast notification, then be redirected to the feed where your new card appears

- [ ] **Step 6: Test the admin page**

1. Navigate to `http://localhost:5173/admin`
2. Enter the wrong password — the form should shake and show "Incorrect password"
3. Enter the correct password from your `.env` file — you should see the resource list
4. Click Delete on a resource — it should disappear with an exit animation

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: integration verified — all three services running"
```

---

## Self-Review Notes

After writing this plan, checked against the spec:

- ✅ Resource submission form with all required/optional fields
- ✅ URL validation (regex `^https?://.+`) in both backend (422) and frontend (inline error)
- ✅ Form validation with inline error display and blur-triggered feedback
- ✅ Resource listing page with card grid
- ✅ Clickable external links opening in new tab (`target="_blank" rel="noopener noreferrer"`)
- ✅ Newest resources first (backend `ORDER BY created_at DESC`)
- ✅ Category filtering (client-side)
- ✅ Search functionality across title, description, tags (client-side)
- ✅ Animated cards (Framer Motion — stagger, hover lift, shimmer, exit)
- ✅ Loading skeleton states
- ✅ Toast notifications (react-hot-toast)
- ✅ Admin password gate with shake animation
- ✅ Delete endpoint protected by `x-admin-password` header
- ✅ Galaxy/dark/glassmorphism aesthetic throughout
- ✅ ParticleField starfield background
- ✅ Responsive design (grid: 1 col mobile → 2 tablet → 3 desktop)
- ✅ Docker Compose with db/backend/frontend containers
- ✅ Alembic configured for schema migrations
- ✅ All 13 backend tests written with TDD approach
- ✅ `.env` / `.env.example` pattern for secrets

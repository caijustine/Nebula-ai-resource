# AI Resource Platform — Design Spec

**Date:** 2026-05-12
**Project:** Nebula — AI Resource Sharing Platform
**Author:** cjschirm27@gmail.com

---

## Overview

A full-stack web application where students can submit, browse, search, and filter AI-related resources (articles, tools, videos, papers, etc.). The platform has a premium dark, galaxy-inspired aesthetic — think deep space, nebula gradients, glassmorphism, and fluid animations. Resources are shared across all users via a PostgreSQL database. A hidden admin page allows authorized removal of invalid posts.

---

## Aesthetic & Design Language

- **Theme:** Dark mode only. Deep space / galaxy / cloud feel.
- **Colors:** Near-black backgrounds (`#05050f`), deep navy, rich purples, electric cyan, soft blue glows
- **Effects:** Glassmorphism cards (frosted glass with blur), nebula gradient glows, animated particle/star field in the background, category-colored card borders
- **Typography:** Premium sans-serif (e.g. Inter or Geist), generous spacing, large cinematic headings
- **Motion:** Framer Motion throughout — card hover lifts, page transitions, staggered list entrances, spinner on submit, toast slide-in
- **Inspiration:** OpenAI, Linear, Vercel, Stripe

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React + TypeScript | UI framework with type safety |
| Tailwind CSS | Utility-first styling |
| Framer Motion | Animations and transitions |
| React Router v6 | Multi-page navigation |
| React Hot Toast | Toast notifications |

### Backend
| Tool | Purpose |
|---|---|
| Python 3.11 | Language |
| FastAPI | Web framework — handles incoming requests |
| SQLModel | Defines database tables as Python classes |
| Alembic | Tracks and applies database schema changes |
| PostgreSQL 15 | Relational database — stores all resources |

### Infrastructure
| Tool | Purpose |
|---|---|
| Docker | Packages frontend, backend, and database into isolated containers |
| Docker Compose | Starts all three containers together with one command |
| Railway | Cloud hosting platform for deployment |

---

## Project Structure

```
ai-resources/
├── docker-compose.yml          ← orchestrates all containers
├── .env                        ← secret config (never commit this)
├── .env.example                ← safe template showing what vars are needed
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx            ← app entry point
│       ├── App.tsx             ← router setup
│       ├── api/
│       │   └── resources.ts    ← all fetch calls to the backend
│       ├── components/
│       │   ├── Navbar.tsx
│       │   ├── ResourceCard.tsx
│       │   ├── CategoryFilter.tsx
│       │   ├── SearchBar.tsx
│       │   ├── SkeletonCard.tsx
│       │   ├── ParticleField.tsx
│       │   └── Toast.tsx
│       ├── pages/
│       │   ├── FeedPage.tsx
│       │   ├── SubmitPage.tsx
│       │   └── AdminPage.tsx
│       └── types/
│           └── resource.ts     ← shared TypeScript types
│
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    ├── main.py                 ← FastAPI app + all routes
    ├── models.py               ← SQLModel table definitions
    ├── database.py             ← database connection setup
    └── alembic/
        ├── env.py
        └── versions/           ← migration history files
```

---

## Pages

### 1. Feed Page — `/`

The home page. Where everyone browses resources.

**Layout (top to bottom):**
1. `<Navbar>` — logo left, "Submit Resource" button right, frosted glass background
2. Hero section — large heading ("Discover AI Resources"), subheading, centered `<SearchBar>`
3. `<CategoryFilter>` — horizontal scrollable row of pill/chip buttons
4. Resource grid — 3 columns on desktop, 2 on tablet, 1 on mobile
5. `<ResourceCard>` × N — staggered entrance animation on load
6. Empty state — animated message when no resources match filters
7. `<ParticleField>` — subtle floating star/dot field rendered behind everything

**Behavior:**
- On page load: fetch all resources from `GET /resources`, show skeleton cards while loading
- Search filters by title, description, and tags (client-side, no extra API call)
- Category filter chips narrow results; "All" resets filter
- Both search and category filter can be active simultaneously
- Resources sorted newest first (guaranteed by backend)

---

### 2. Submit Page — `/submit`

A centered form on a dark glassmorphism panel.

**Fields (in order):**
| Field | Type | Required | Notes |
|---|---|---|---|
| Title | Text input | Yes | Max 100 characters |
| URL | URL input | Yes | Must start with `http://` or `https://` |
| Description | Textarea | No | Max 500 characters |
| Category | Dropdown | No | See predefined list below |
| Tags | Text input | No | Comma-separated, e.g. `llm, free, beginner` |
| Your Name | Text input | No | Displayed on card |

**Predefined Categories:**
`Tools` · `Articles` · `Videos` · `Courses` · `Research Papers` · `Tutorials` · `Datasets` · `Models` · `Other`

**Behavior:**
- Inline validation: red glow + error message appears on blur (when you leave a field)
- URL validated with regex — must be a real URL format
- Submit button shows spinner while `POST /resources` is in flight
- On success: toast notification ("Resource added to the cosmos ✦"), form resets, user navigates to feed
- On error: toast with error message, form stays filled so user doesn't lose their work

---

### 3. Admin Page — `/admin`

A protected page for removing invalid resources.

**Access flow:**
1. User navigates to `/admin`
2. A centered password input is shown — no indication this page exists elsewhere in the UI
3. User enters the admin password (stored in `.env` as `ADMIN_PASSWORD`)
4. If correct: resource list appears with a red "Delete" button on each card
5. If wrong: shake animation + "Incorrect password" message
6. Delete button triggers `DELETE /resources/{id}`, resource disappears with exit animation

**Security note:** This is a simple password check suitable for a class project. It is not production-grade authentication, but it prevents casual misuse.

---

## Data Model

### `resources` table

```python
class Resource(SQLModel, table=True):
    id:             int       # auto-assigned, unique identifier
    title:          str       # required
    url:            str       # required, validated as URL
    description:    str | None  # optional
    category:       str | None  # optional, one of predefined values
    tags:           str | None  # optional, comma-separated string
    submitter_name: str | None  # optional
    created_at:     datetime  # auto-set on creation, used for sorting
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/resources` | None | Returns all resources, ordered by `created_at` descending |
| `POST` | `/resources` | None | Creates a new resource |
| `DELETE` | `/resources/{id}` | Admin password header | Deletes resource by ID |
| `POST` | `/admin/verify` | Admin password body | Verifies the admin password — returns 200 or 403 |
| `GET` | `/health` | None | Returns `{"status": "ok"}` — used by Railway to check app is alive |

**Admin auth mechanism:**
1. When the admin enters their password and hits "Login", the frontend calls `POST /admin/verify` with the password.
2. If the backend returns 200, the frontend stores the password in React state (in memory — cleared on page refresh) and shows the resource list with delete buttons.
3. If the backend returns 403, the frontend shows a shake animation and "Incorrect password" message.
4. Every `DELETE /resources/{id}` call includes the stored password as an `X-Admin-Password` header. The backend validates it again on each delete.
5. If React state is cleared (page refresh), the admin must log in again.

---

## Docker Setup

**What Docker does here:** Instead of manually installing Python, PostgreSQL, and Node.js on your machine (which breaks easily and differs between computers), Docker creates three isolated containers:

| Container | What runs inside | Port |
|---|---|---|
| `db` | PostgreSQL database | 5432 |
| `backend` | FastAPI Python server | 8000 |
| `frontend` | React dev server (Vite) | 5173 |

`docker-compose.yml` wires them together, sets environment variables, and ensures the database starts before the backend tries to connect.

---

## Environment Variables

Stored in `.env` at the project root (never committed to git):

```
# Database
POSTGRES_USER=nebula
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=nebula_db
DATABASE_URL=postgresql://nebula:your_db_password@db:5432/nebula_db

# Admin
ADMIN_PASSWORD=your_secret_admin_password

# Frontend
VITE_API_URL=http://localhost:8000
```

---

## Animations & Interactions Summary

| Element | Animation |
|---|---|
| Page load | Staggered fade-up on resource cards |
| Resource card hover | Lift (`y: -8`), glow intensifies, shimmer sweep |
| Category pill hover | Scale up, color shift |
| Submit button hover | Glow pulse |
| Submit button loading | Spinner replaces text |
| Form field focus | Cyan border glow |
| Toast notification | Slide in from top-right, auto-dismiss |
| Admin wrong password | Horizontal shake |
| Resource delete | Fade + scale exit animation |
| Particle field | Slow continuous drift |
| Navbar on scroll | Blur/opacity transition |

---

## Deployment (Railway)

Railway is a hosting platform — it runs your containers in the cloud so anyone on the internet can visit your site.

You will create three Railway services from the same repo:
1. **PostgreSQL** — Railway has a built-in PostgreSQL plugin
2. **Backend** — points to `/backend`, uses the `Dockerfile` there
3. **Frontend** — points to `/frontend`, uses the `Dockerfile` there

Environment variables are set in the Railway dashboard (not in a file).

---

## Out of Scope

- User accounts or login
- Upvoting / comments
- Email notifications
- Resource editing (only submission and deletion)
- Rate limiting (acceptable for class project scale)

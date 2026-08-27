"""create resources table

─── What is Alembic? ────────────────────────────────────────────────────────────
Alembic is a "database migration tool" — think of it as Git, but for your
database schema (the structure of your tables, columns, and types).

When you change models.py (add a column, rename something, change a type),
you create a new migration file that describes that change. Alembic tracks which
migrations have run and applies only the new ones. This means:

  - Your database schema stays in sync with your code as the project evolves
  - You can roll back changes (downgrade) if something breaks
  - Every developer on the team gets the same database structure

Each migration file has:
  - upgrade()   → run this to apply the change (forward in time)
  - downgrade() → run this to undo the change (backward in time)

`alembic upgrade head` applies ALL pending migrations up to "head" (latest).
`alembic downgrade -1` would undo the most recent migration.

Revision ID: 001
Revises: (nothing — this is the very first migration)
Create Date: 2026-05-12
"""

import sqlalchemy as sa
from alembic import op

# Metadata Alembic uses internally to chain migrations together
revision = "001"
down_revision = None   # None means this is the first migration (no parent)
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create the `resource` table in the database."""
    # op.create_table() generates and runs a CREATE TABLE SQL statement.
    # This is equivalent to:
    #   CREATE TABLE resource (
    #       id SERIAL PRIMARY KEY,
    #       title VARCHAR(100) NOT NULL,
    #       ...
    #   );
    op.create_table(
        "resource",   # the actual table name in PostgreSQL (lowercase)
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=100), nullable=False),  # required
        sa.Column("url", sa.String(), nullable=False),              # required
        sa.Column("description", sa.String(length=500), nullable=True),  # optional
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("tags", sa.String(), nullable=True),
        sa.Column("submitter_name", sa.String(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            # server_default=sa.func.now() means PostgreSQL itself sets this value
            # to the current timestamp when a row is inserted — even if Python
            # doesn't provide it. This is a safety net.
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    """Drop the `resource` table — undoes upgrade()."""
    # If you run `alembic downgrade -1`, this removes the entire table.
    # Use with caution — this deletes ALL your data.
    op.drop_table("resource")

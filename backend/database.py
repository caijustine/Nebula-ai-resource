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

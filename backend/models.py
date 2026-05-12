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

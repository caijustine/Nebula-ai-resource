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

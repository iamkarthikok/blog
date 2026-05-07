import re
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .db import get_connection, init_db
from .seed import file_order_for_slug, seed


def extract_sections(content: str) -> list[dict]:
    """Split markdown into H2-rooted sections, returning {label, length} per section."""
    sections: list[dict] = []
    current: Optional[dict] = None
    for line in content.split("\n"):
        match = re.match(r"^##\s+(.+)$", line)
        if match:
            if current is not None:
                sections.append(current)
            current = {"label": match.group(1).strip(), "length": 0}
        elif current is not None:
            current["length"] += len(line) + 1
    if current is not None:
        sections.append(current)
    return sections


def parse_tags(raw: Optional[str]) -> list[str]:
    if not raw:
        return []
    return [t.strip() for t in raw.split(",") if t.strip()]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    seed()
    yield


app = FastAPI(title="blog", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Section(BaseModel):
    label: str
    length: int


class PostListItem(BaseModel):
    slug: str
    title: str
    summary: Optional[str] = None
    doc_type: Optional[str] = None
    tags: list[str] = []
    published_at: str
    sections: list[Section]


class Post(BaseModel):
    slug: str
    title: str
    summary: Optional[str] = None
    content: str
    doc_type: Optional[str] = None
    tags: list[str] = []
    published_at: str
    updated_at: str


@app.get("/api/posts", response_model=list[PostListItem])
def list_posts() -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT slug, title, summary, content, doc_type, tags, published_at "
        "FROM posts"
    ).fetchall()
    conn.close()
    items: list[dict] = []
    for row in rows:
        data = dict(row)
        data["sections"] = extract_sections(data.pop("content"))
        data["tags"] = parse_tags(data.get("tags"))
        items.append(data)
    # Order by the leading number on each markdown filename, so the frontend
    # list matches `content/` (000-…, 001-…, 002-…). No DB schema change.
    order = file_order_for_slug()
    items.sort(key=lambda p: (order.get(p["slug"], 9999), p["slug"]))
    return items


@app.get("/api/posts/{slug}", response_model=Post)
def get_post(slug: str) -> dict:
    conn = get_connection()
    row = conn.execute(
        "SELECT slug, title, summary, content, doc_type, tags, published_at, updated_at "
        "FROM posts WHERE slug = ?",
        (slug,),
    ).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Post not found")
    data = dict(row)
    data["tags"] = parse_tags(data.get("tags"))
    return data


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}

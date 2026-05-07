"""Sync markdown files in `content/` into the SQLite database."""

import re
from pathlib import Path

from .db import get_connection, init_db

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"

FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)\Z", re.DOTALL)
FILE_ORDER_RE = re.compile(r"^(\d+)")


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    match = FRONTMATTER_RE.match(text)
    if not match:
        return {}, text
    fm_block, body = match.groups()
    meta: dict[str, str] = {}
    for line in fm_block.split("\n"):
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip()
    return meta, body.lstrip("\n")


def seed() -> int:
    init_db()
    conn = get_connection()
    count = 0
    known_slugs: set[str] = set()
    for path in sorted(CONTENT_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)
        slug = meta.get("slug") or path.stem
        known_slugs.add(slug)
        title = meta.get("title", path.stem)
        summary = meta.get("summary", "")
        published_at = meta.get("date", "")
        doc_type = meta.get("type", "")
        tags = meta.get("tags", "")
        conn.execute(
            """
            INSERT INTO posts (slug, title, summary, content, doc_type, tags, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET
                title=excluded.title,
                summary=excluded.summary,
                content=excluded.content,
                doc_type=excluded.doc_type,
                tags=excluded.tags,
                published_at=excluded.published_at,
                updated_at=datetime('now')
            """,
            (slug, title, summary, body, doc_type, tags, published_at),
        )
        count += 1

    # Drop rows whose slug isn't represented by a current markdown file —
    # keeps the seed idempotent across renames and deletions.
    if known_slugs:
        placeholders = ",".join("?" for _ in known_slugs)
        conn.execute(
            f"DELETE FROM posts WHERE slug NOT IN ({placeholders})",
            tuple(known_slugs),
        )
    conn.commit()
    conn.close()
    return count


def file_order_for_slug() -> dict[str, int]:
    """Map slug → leading number on the markdown filename.

    Used at query time to sort posts so the frontend list mirrors the order
    of files in `content/` (000-…, 001-…, 002-…). Files without a numeric
    prefix get a high default so they fall to the end.
    """
    out: dict[str, int] = {}
    for path in CONTENT_DIR.glob("*.md"):
        match = FILE_ORDER_RE.match(path.stem)
        if not match:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        meta, _ = parse_frontmatter(text)
        slug = meta.get("slug") or path.stem
        out[slug] = int(match.group(1))
    return out


if __name__ == "__main__":
    n = seed()
    print(f"Seeded {n} posts from {CONTENT_DIR}")

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "blog.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    conn = get_connection()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            summary TEXT,
            content TEXT NOT NULL,
            doc_type TEXT,
            tags TEXT,
            published_at TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
        CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published_at DESC);
        """
    )

    # Forward-compatible migration for DBs that were created before doc_type/tags existed.
    existing_cols = {row["name"] for row in conn.execute("PRAGMA table_info(posts)").fetchall()}
    if "doc_type" not in existing_cols:
        conn.execute("ALTER TABLE posts ADD COLUMN doc_type TEXT")
    if "tags" not in existing_cols:
        conn.execute("ALTER TABLE posts ADD COLUMN tags TEXT")

    conn.commit()
    conn.close()

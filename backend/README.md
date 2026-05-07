# Backend

FastAPI + SQLite content service.

## Dev

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The DB initializes and seeds from `content/*.md` on every startup
(idempotent upsert by slug).

## Adding a post

Drop a markdown file in `content/`:

```md
---
slug: my-post
title: My Post
date: 2026-05-01
summary: A short description.
---

## First section

Body text.

## Second section

More body text.
```

Restart the server (or hit `--reload` saves) to pick up the new file.

## Endpoints

- `GET /api/posts` — list all posts with metadata + section structure
- `GET /api/posts/{slug}` — one post with full markdown content
- `GET /api/health` — liveness check

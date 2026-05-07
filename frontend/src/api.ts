export type Section = {
  label: string
  length: number
}

export type PostListItem = {
  slug: string
  title: string
  summary: string | null
  doc_type: string | null
  tags: string[]
  published_at: string
  sections: Section[]
}

export type Post = {
  slug: string
  title: string
  summary: string | null
  content: string
  doc_type: string | null
  tags: string[]
  published_at: string
  updated_at: string
}

const RAW_FILES = import.meta.glob('./content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
const FILE_ORDER_RE = /^(\d+)/

type Parsed = {
  meta: Record<string, string>
  body: string
  order: number
}

function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const match = FRONTMATTER_RE.exec(text)
  if (!match) return { meta: {}, body: text }
  const [, fmBlock, body] = match
  const meta: Record<string, string> = {}
  for (const line of fmBlock.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    meta[key] = value
  }
  return { meta, body: body.replace(/^\n+/, '') }
}

function parseTags(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((t) => t.trim()).filter(Boolean)
}

function extractSections(content: string): Section[] {
  const sections: Section[] = []
  let current: Section | null = null
  for (const line of content.split('\n')) {
    const m = /^##\s+(.+)$/.exec(line)
    if (m) {
      if (current) sections.push(current)
      current = { label: m[1].trim(), length: 0 }
    } else if (current) {
      current.length += line.length + 1
    }
  }
  if (current) sections.push(current)
  return sections
}

const PARSED: Parsed[] = Object.entries(RAW_FILES)
  .map(([path, text]) => {
    const stem = (path.split('/').pop() ?? path).replace(/\.md$/, '')
    const orderMatch = FILE_ORDER_RE.exec(stem)
    const order = orderMatch ? Number(orderMatch[1]) : 9999
    const { meta, body } = parseFrontmatter(text)
    if (!meta.slug) meta.slug = stem
    if (!meta.title) meta.title = stem
    return { meta, body, order }
  })
  .sort((a, b) => a.order - b.order || a.meta.slug.localeCompare(b.meta.slug))

export async function listPosts(): Promise<PostListItem[]> {
  return PARSED.map(({ meta, body }) => ({
    slug: meta.slug,
    title: meta.title,
    summary: meta.summary || null,
    doc_type: meta.type || null,
    tags: parseTags(meta.tags),
    published_at: meta.date || '',
    sections: extractSections(body),
  }))
}

export async function getPost(slug: string): Promise<Post> {
  const found = PARSED.find((p) => p.meta.slug === slug)
  if (!found) throw new Error(`GET /posts/${slug} → 404`)
  const { meta, body } = found
  return {
    slug: meta.slug,
    title: meta.title,
    summary: meta.summary || null,
    content: body,
    doc_type: meta.type || null,
    tags: parseTags(meta.tags),
    published_at: meta.date || '',
    updated_at: meta.date || '',
  }
}

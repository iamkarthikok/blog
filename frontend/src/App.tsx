import { useEffect, useRef, useState } from 'react'
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
} from 'framer-motion'
import './App.css'
import { UI, Status } from './components/UI/UI'
import { Viewer } from './components/Viewer/Viewer'
import { Specimen } from './components/Specimen/Specimen'
import { ContactCard } from './components/ContactCard/ContactCard'
import { LiquidShader } from './components/LiquidShader/LiquidShader'
import { PseudoPlatform } from './components/Interactive/PseudoPlatform'
import { ExcelDemoProvider } from './components/Interactive/ExcelDemo'
import { listPosts, getPost, type PostListItem, type Post } from './api'

/**
 * Posts that take over the surface entirely instead of rendering inside the
 * markdown viewer. Selecting one of these slugs slides into a self-contained
 * experience — the viewer, doc title, and corner chrome stay out of the way.
 */
const PLATFORM_POSTS = new Set(['pseudo-platform'])

type ListState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; posts: PostListItem[] }

const EASE = [0.65, 0, 0.35, 1] as const

const DOC_SECTION_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: EASE,
      staggerChildren: 0.07,
      delayChildren: 0.32,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.28, ease: EASE },
  },
}

const DOC_TITLE_VARIANTS = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: EASE },
  },
}

function App() {
  const [listState, setListState] = useState<ListState>({ kind: 'loading' })
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [activePost, setActivePost] = useState<Post | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const pullY = useMotionValue(0)

  // The URL never changes when a doc opens — selection is pure state. To make
  // the browser back button (and trackpad back-swipe) feel right, we push a
  // single history entry on first open and let popstate clear it. Switching
  // between docs reuses the same entry, so back always lands on the rack.
  const pushedRef = useRef(false)

  const openDoc = (slug: string) => {
    if (!pushedRef.current) {
      window.history.pushState({ doc: true }, '')
      pushedRef.current = true
    }
    setActiveSlug(slug)
  }

  const closeDoc = () => {
    if (pushedRef.current) {
      window.history.back()
    } else {
      setActiveSlug(null)
    }
  }

  useEffect(() => {
    const onPop = () => {
      pushedRef.current = false
      setActiveSlug(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    let cancelled = false
    listPosts()
      .then((posts) => {
        if (!cancelled) setListState({ kind: 'ready', posts })
      })
      .catch((err) => {
        if (!cancelled) {
          setListState({ kind: 'error', message: String(err.message ?? err) })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!activeSlug) {
      setActivePost(null)
      return
    }
    let cancelled = false
    getPost(activeSlug)
      .then((post) => {
        if (!cancelled) setActivePost(post)
      })
      .catch(() => {
        if (!cancelled) setActivePost(null)
      })
    return () => {
      cancelled = true
    }
  }, [activeSlug])

  useEffect(() => {
    if (!activeSlug) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDoc()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeSlug])

  // White-canvas takeover for the pseudo-platform post: hide the shader,
  // swap the page background to white. Toggled via a body class so plain CSS
  // transitions handle the cross-fade without touching framer state.
  useEffect(() => {
    if (activeSlug !== 'pseudo-platform') return
    document.body.classList.add('is-platform-mode')
    return () => document.body.classList.remove('is-platform-mode')
  }, [activeSlug])

  // Wheel-overscroll at top with rubber-band visual: hard scroll up to unlock
  useEffect(() => {
    if (!activeSlug) return

    let events: { t: number; dy: number }[] = []
    let raf = 0
    let cancelled = false

    const WINDOW = 220 // ms
    const PULL_THRESHOLD = 360 // total |deltaY| in the window to trigger unlock
    const VISUAL_MAX = 36 // px of upward stretch at saturation

    const totalInWindow = (now: number) => {
      events = events.filter((e) => now - e.t < WINDOW)
      return events.reduce((s, x) => s + x.dy, 0)
    }

    // Smooth interpolation toward target offset (rubber-band feel)
    const tick = () => {
      if (cancelled) return
      const total = totalInWindow(Date.now())
      const ratio = Math.min(1, total / PULL_THRESHOLD)
      const target = -ratio * VISUAL_MAX
      const current = pullY.get()
      pullY.set(current + (target - current) * 0.2)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onWheel = (e: WheelEvent) => {
      if (window.scrollY > 4) {
        events = []
        return
      }
      if (e.deltaY < 0) {
        events.push({ t: Date.now(), dy: Math.abs(e.deltaY) })
        const total = totalInWindow(Date.now())
        if (total >= PULL_THRESHOLD) {
          events = []
          closeDoc()
        }
      }
    }

    window.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener('wheel', onWheel)
      // Decisive release — no overshoot, slightly relaxed timing
      animate(pullY, 0, { duration: 0.42, ease: [0.32, 0.72, 0, 1] })
    }
  }, [activeSlug, pullY])

  // Seamless scroll: down to doc when selected, back up to rack when deselected.
  // Skip when already near the relevant edge (e.g. overscroll-unlock leaves us at top).
  // When switching directly between posts, AnimatePresence mode="wait" only mounts
  // the new section after the old one finishes exiting (~280ms), so we poll until
  // the target element shows up rather than firing once on a fixed delay.
  useEffect(() => {
    const ready = !!activePost && activePost.slug === activeSlug
    let target: string | null = null
    if (activeSlug && ready) {
      target = PLATFORM_POSTS.has(activeSlug) ? '.platform-section' : '.doc-section'
    } else if (!activeSlug && window.scrollY > 80) {
      target = '.rack-section'
    }
    if (!target) return

    let cancelled = false
    let timeoutId: number | undefined

    const tryScroll = (attempt: number) => {
      if (cancelled) return
      const el = document.querySelector(target!)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      // ~12 polls × 80ms ≈ 1s — enough for the AnimatePresence exit + mount cycle.
      if (attempt >= 12) return
      timeoutId = window.setTimeout(() => tryScroll(attempt + 1), 80)
    }

    timeoutId = window.setTimeout(() => tryScroll(0), 220)

    return () => {
      cancelled = true
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [activeSlug, activePost])


  if (listState.kind === 'loading') return <Status kind="loading" />
  if (listState.kind === 'error')
    return <Status kind="error" message={listState.message} />

  const posts = listState.posts
  const activeMeta = activeSlug
    ? posts.find((p) => p.slug === activeSlug) ?? null
    : null
  const showingDoc = !!activeMeta
  const hasFullPost = !!activePost && activePost.slug === activeSlug
  const isPlatform = !!activeSlug && PLATFORM_POSTS.has(activeSlug)

  return (
    <ExcelDemoProvider>
      <LiquidShader />

      <AnimatePresence>
        {hasFullPost && !contactOpen && !isPlatform && (
          <Specimen key={activePost!.slug} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contactOpen && (
          <ContactCard onClose={() => setContactOpen(false)} />
        )}
      </AnimatePresence>

      <UI
        dimmed={contactOpen}
        topLeft={
          isPlatform ? null : showingDoc ? (
            <button
              type="button"
              onClick={closeDoc}
              className="frame__brand"
              aria-label="Return to index"
            >
              karthik
            </button>
          ) : (
            <span className="frame__brand">karthik</span>
          )
        }
        topRight={null}
        bottomLeft={
          isPlatform ? null : showingDoc ? (
            <span className="frame__stack">
              <span className="frame__line">
                <span className="muted">type</span>
                <span className="frame__sep" aria-hidden="true">·</span>
                <span className="frame__plain">
                  {activeMeta!.doc_type || 'untyped'}
                </span>
              </span>
              <span className="frame__line">
                <span className="muted">tags</span>
                <span className="frame__sep" aria-hidden="true">·</span>
                {activeMeta!.tags.length > 0 ? (
                  <span className="frame__plain">
                    {activeMeta!.tags.join(', ')}
                  </span>
                ) : (
                  <span className="muted">none</span>
                )}
              </span>
            </span>
          ) : (
            <>
              <span className="muted">documents</span>
              <span className="frame__sep" aria-hidden="true">·</span>
              <span>{String(posts.length).padStart(3, '0')}</span>
            </>
          )
        }
        bottomRight={
          isPlatform ? null : (
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="frame__link frame__link--button"
            >
              contact
            </button>
          )
        }
      >
        <div className="page">
          <section className="rack-section">
            <motion.div style={{ y: pullY }} className="rack-pull">
              <List
                posts={posts}
                activeSlug={activeSlug}
                onSelect={(slug) =>
                  activeSlug === slug ? closeDoc() : openDoc(slug)
                }
              />
            </motion.div>
          </section>

          <AnimatePresence mode="wait">
            {activeSlug && hasFullPost && !isPlatform && (
              <motion.section
                key={activePost!.slug}
                className="doc-section"
                variants={DOC_SECTION_VARIANTS}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.h1
                  className="doc-title"
                  variants={DOC_TITLE_VARIANTS}
                >
                  {activePost!.title}
                </motion.h1>
                <Viewer post={activePost!} />
              </motion.section>
            )}
            {activeSlug && hasFullPost && isPlatform && (
              <motion.section
                key={`platform:${activePost!.slug}`}
                className="platform-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.32, ease: EASE } }}
                exit={{ opacity: 0, transition: { duration: 0.2, ease: EASE } }}
              >
                <PseudoPlatform onReturn={closeDoc} />
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </UI>
    </ExcelDemoProvider>
  )
}

type ListProps = {
  posts: PostListItem[]
  activeSlug: string | null
  onSelect: (slug: string) => void
}

function List({ posts, activeSlug, onSelect }: ListProps) {
  const listRef = useRef<HTMLOListElement>(null)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const updateEdges = () => {
    const el = listRef.current
    if (!el) return
    setCanScrollUp(el.scrollTop > 4)
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [posts])

  return (
    <div className="list-stack">
      <div
        className={`list-stack__edge ${canScrollUp ? 'is-on' : ''}`}
        aria-hidden="true"
      />
      <ol ref={listRef} className="list" onScroll={updateEdges}>
        {posts.map((p) => (
          <ListItem
            key={p.slug}
            post={p}
            isSelected={activeSlug === p.slug}
            onClick={() => onSelect(p.slug)}
          />
        ))}
      </ol>
      <div
        className={`list-stack__edge ${canScrollDown ? 'is-on' : ''}`}
        aria-hidden="true"
      />
    </div>
  )
}

type ListItemProps = {
  post: PostListItem
  isSelected: boolean
  onClick: () => void
}

function ListItem({ post, isSelected, onClick }: ListItemProps) {
  return (
    <li className="list__item">
      <motion.button
        type="button"
        className={`list__row ${isSelected ? 'is-selected' : ''}`}
        onClick={onClick}
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.26 }}
      >
        <span className="list__title">
          <AnimatePresence>
            {isSelected && (
              <motion.span
                key="bl"
                className="list__bracket"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.42, ease: EASE }}
              >
                「
              </motion.span>
            )}
          </AnimatePresence>
          {post.title}
          <AnimatePresence>
            {isSelected && (
              <motion.span
                key="br"
                className="list__bracket"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.42, ease: EASE }}
              >
                」
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>
    </li>
  )
}

export default App

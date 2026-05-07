import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import './Specimen.css'

export function Specimen() {
  const [progress, setProgress] = useState(0)
  const [docReached, setDocReached] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight
      const viewH = window.innerHeight
      const max = Math.max(1, total - viewH)
      setProgress(Math.max(0, Math.min(1, window.scrollY / max)))

      const docSection = document.querySelector<HTMLElement>('.doc-section')
      if (!docSection) {
        setDocReached(false)
        return
      }
      const docAbsTop = docSection.getBoundingClientRect().top + window.scrollY
      const fold = viewH * 0.3
      setDocReached(window.scrollY + fold >= docAbsTop)
    }

    const id = requestAnimationFrame(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const onJump = () => {
    const docSection = document.querySelector<HTMLElement>('.doc-section')
    if (docSection)
      docSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.aside
      className="spec"
      aria-label="Page navigation"
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      transition={{ duration: 0.42, ease: [0.65, 0, 0.35, 1] }}
    >
      <div className="spec__rail">
        <div
          className="spec__fill"
          style={{ height: `${progress * 100}%` }}
          aria-hidden="true"
        />
        <button
          type="button"
          className={`spec__mark ${
            docReached ? 'is-active is-passed' : ''
          }`}
          style={{ top: '100%' }}
          onClick={onJump}
          aria-label="document"
        >
          <span className="spec__cap" aria-hidden="true" />
        </button>
      </div>
    </motion.aside>
  )
}

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import './ContactCard.css'

type Props = {
  onClose: () => void
}

const EASE = [0.65, 0, 0.35, 1] as const

const ENTRIES: { label: string; value: string; href: string }[] = [
  {
    label: 'email',
    value: 'uppalurikarthik@gmail.com',
    href: 'mailto:uppalurikarthik@gmail.com',
  },
  {
    label: 'linkedin',
    value: 'karthik-uppaluri-4948a023',
    href: 'https://www.linkedin.com/in/karthik-uppaluri-4948a023',
  },
]

export function ContactCard({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <motion.div
        className="contact-backdrop"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: EASE }}
        aria-hidden="true"
      />
      <div className="contact-card-wrap">
        <motion.aside
          className="contact-card"
          role="dialog"
          aria-label="Contact"
          initial={{ opacity: 0, y: 8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.985 }}
          transition={{ duration: 0.42, ease: EASE }}
          onClick={(e) => e.stopPropagation()}
        >
        <header className="contact-card__head">
          <span className="muted">contact</span>
          <span className="contact-card__sep" aria-hidden="true">·</span>
          <span>karthik</span>
        </header>
        <ul className="contact-card__list">
          {ENTRIES.map((e) => (
            <li key={e.label} className="contact-card__row">
              <span className="contact-card__label">{e.label}</span>
              <a
                className="contact-card__link"
                href={e.href}
                target={e.href.startsWith('mailto:') ? undefined : '_blank'}
                rel={e.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
              >
                {e.value}
              </a>
            </li>
          ))}
        </ul>
        <footer className="contact-card__foot muted">
          press esc or click anywhere to close
        </footer>
        </motion.aside>
      </div>
    </>
  )
}

import { useState, type ReactNode } from 'react'
import './SourcePreviews.css'

/* ==================================================================
   Source-specific previews — small mocks of the originating tool's
   chrome, so a reader can recognize the source at a glance. Shared
   between the pseudo-platform and the multi-source extraction demo.
   ================================================================== */

export function SheetsPreview({
  filename,
  sheets,
}: {
  filename: string
  sheets: { name: string; headers: string[]; rows: string[][] }[]
}) {
  const [active, setActive] = useState(0)
  const sheet = sheets[active]
  return (
    <div className="srcpv srcpv--sheets">
      <div className="srcpv__chrome">
        <span className="srcpv__chrome-icon srcpv__chrome-icon--sheets">▦</span>
        <span className="srcpv__chrome-title">{filename}</span>
      </div>
      <div className="srcpv__sheet">
        <table>
          <thead>
            <tr>
              <th className="srcpv__sheet-rownum" aria-hidden="true"></th>
              {sheet.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, i) => (
              <tr key={i}>
                <td className="srcpv__sheet-rownum">{i + 1}</td>
                {row.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="srcpv__sheet-tabs" role="tablist">
        {sheets.map((s, i) => (
          <button
            key={s.name}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`srcpv__sheet-tab ${i === active ? 'is-on' : ''}`}
            onClick={() => setActive(i)}
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export function DocsPreview({
  filename,
  body,
}: {
  filename: string
  body: ReactNode
}) {
  return (
    <div className="srcpv srcpv--docs">
      <div className="srcpv__chrome">
        <span className="srcpv__chrome-icon srcpv__chrome-icon--docs">▤</span>
        <span className="srcpv__chrome-title">{filename}</span>
      </div>
      <div className="srcpv__page">
        <div className="srcpv__page-paper">{body}</div>
      </div>
    </div>
  )
}

export type ChatMessage = { who: string; when: string; text: string }

export function TeamsPreview({
  channel,
  messages,
}: {
  channel: string
  messages: ChatMessage[]
}) {
  return (
    <div className="srcpv srcpv--teams">
      <div className="srcpv__chrome">
        <span className="srcpv__chrome-icon srcpv__chrome-icon--teams">▢</span>
        <span className="srcpv__chrome-title">{channel}</span>
      </div>
      <ol className="srcpv__chat">
        {messages.map((m, i) => (
          <li key={i} className="srcpv__chat-row">
            <span className="srcpv__chat-avatar" aria-hidden="true">
              {m.who.slice(0, 1).toLowerCase()}
            </span>
            <div className="srcpv__chat-body">
              <div className="srcpv__chat-head">
                <span className="srcpv__chat-who">{m.who}</span>
                <span className="srcpv__chat-when">{m.when}</span>
              </div>
              <div className="srcpv__chat-text">{m.text}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export type JiraComment = { who: string; when: string; text: string }

export function JiraPreview({
  ticketKey,
  status,
  title,
  fields,
  description,
  comments,
}: {
  ticketKey: string
  status: 'To Do' | 'In Progress' | 'Done'
  title: string
  fields: { label: string; value: string }[]
  description: string
  comments: JiraComment[]
}) {
  const statusClass =
    status === 'In Progress'
      ? 'is-progress'
      : status === 'Done'
        ? 'is-done'
        : 'is-todo'
  return (
    <div className="srcpv srcpv--jira">
      <div className="srcpv__chrome">
        <span className="srcpv__chrome-icon srcpv__chrome-icon--jira">◆</span>
        <span className="srcpv__chrome-title">{ticketKey}</span>
        <span className={`srcpv__jira-status ${statusClass}`}>{status}</span>
      </div>
      <div className="srcpv__jira">
        <h3 className="srcpv__jira-title">{title}</h3>
        <dl className="srcpv__jira-fields">
          {fields.map((f) => (
            <div key={f.label} className="srcpv__jira-field">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="srcpv__jira-section">
          <div className="srcpv__jira-section-label">Description</div>
          <p>{description}</p>
        </div>
        <div className="srcpv__jira-section">
          <div className="srcpv__jira-section-label">
            Comments · {comments.length}
          </div>
          {comments.map((c, i) => (
            <div key={i} className="srcpv__jira-comment">
              <div className="srcpv__jira-comment-head">
                <span>{c.who}</span>
                <span>{c.when}</span>
              </div>
              <div>{c.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ConfluencePreview({
  space,
  parentTitle,
  title,
  body,
  meta,
}: {
  space: string
  parentTitle?: string
  title: string
  body: ReactNode
  meta?: { author: string; updated: string }
}) {
  return (
    <div className="srcpv srcpv--confluence">
      <div className="srcpv__chrome">
        <span className="srcpv__chrome-icon srcpv__chrome-icon--confluence">
          ≡
        </span>
        <span className="srcpv__chrome-title">
          <span className="srcpv__confluence-crumb">{space}</span>
          {parentTitle && (
            <>
              <span className="srcpv__confluence-sep" aria-hidden="true">›</span>
              <span className="srcpv__confluence-crumb">{parentTitle}</span>
            </>
          )}
          <span className="srcpv__confluence-sep" aria-hidden="true">›</span>
          <span className="srcpv__confluence-here">{title}</span>
        </span>
      </div>
      <div className="srcpv__confluence">
        <h3 className="srcpv__confluence-title">{title}</h3>
        {meta && (
          <div className="srcpv__confluence-meta">
            Created by {meta.author} · Last updated {meta.updated}
          </div>
        )}
        <div className="srcpv__confluence-body">{body}</div>
      </div>
    </div>
  )
}

export function LocalPreview({
  filename,
  raw,
}: {
  filename: string
  raw: string
}) {
  return (
    <div className="srcpv srcpv--local">
      <div className="srcpv__chrome">
        <span className="srcpv__chrome-icon srcpv__chrome-icon--local">•</span>
        <span className="srcpv__chrome-title">{filename}</span>
      </div>
      <pre className="srcpv__local">
        <code>{raw}</code>
      </pre>
    </div>
  )
}

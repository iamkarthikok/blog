import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DocsPreview,
  JiraPreview,
  LocalPreview,
  SheetsPreview,
  TeamsPreview,
} from './SourcePreviews'
import {
  RULES,
  runRuleFile,
  scoreOf,
  tierOf,
  type DocIssue,
  type RuleFile,
  type RuleResult,
} from './rules'
import './PseudoPlatform.css'

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 22, mass: 0.9 }
const SOFT_SPRING = { type: 'spring' as const, stiffness: 260, damping: 24 }

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const popVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: SPRING },
}

const sidePopVariants = {
  hidden: { opacity: 0, x: -14, scale: 0.96 },
  visible: { opacity: 1, x: 0, scale: 1, transition: SOFT_SPRING },
}

/* ==================================================================
   Source taxonomy
   ================================================================== */

type Source = 'google-sheets' | 'google-docs' | 'teams' | 'jira' | 'local'

const SOURCE_META: Record<Source, { label: string; color: string }> = {
  'google-sheets': { label: 'Google Sheets', color: '#0f9d58' },
  'google-docs': { label: 'Google Docs', color: '#4285f4' },
  teams: { label: 'Microsoft Teams', color: '#5059c9' },
  jira: { label: 'JIRA', color: '#0052cc' },
  local: { label: 'Local', color: '#6b6b6b' },
}

/* ==================================================================
   Document set — invented to fit the platform brief, not pulled from
   the previous posts directly (they share a research-data flavor).
   ================================================================== */

type PlatformDoc = {
  id: string
  title: string
  source: Source
  updated: string
  preview: ReactNode
  markdown: string
  /** id of the RuleFile in RULES that was applied at parse time. */
  rulesApplied: string
}

/** Run the doc's applied rule file against its markdown. */
function evaluateDoc(doc: PlatformDoc): RuleResult {
  const rule = RULES.find((r) => r.id === doc.rulesApplied)
  if (!rule) return { passed: 0, total: 0, issues: [] }
  return runRuleFile(rule, doc.markdown)
}

/** Score a doc by running its applied rule file against its markdown. */
function docScore(doc: PlatformDoc): number {
  return scoreOf(evaluateDoc(doc))
}

const COHORT_MARKDOWN = `# Cohort definition

## Cohort
| member_id | age_band | region |
| --------- | -------- | ------ |
| M-1042    | 35–44    | NE     |
| M-1099    | 45–54    | SW     |
| M-1167    | 55–64    | MW     |
| M-1208    | 35–44    | NE     |
| M-1241    | 45–54    | NE     |

## Criteria
- Continuous enrollment ≥ 12 months
- Age 35–64 at index
- No prior diagnosis of condition X
- At least one inpatient claim in lookback
`

const PROTOCOL_MARKDOWN = `# Protocol v3

## Background
A retrospective cohort study evaluating the association between early initiation of therapy and 12-month all-cause hospitalization in a US-claims population.

## Endpoints
**Primary** — all-cause hospitalization within 12 months of index.

**Secondary** — total cost of care; medication adherence (PDC ≥ 80%).

## Methods
Patients are identified between 2022-01-01 and 2024-12-31 using closed claims. Index is the first dispensed therapy. A 12-month lookback ensures continuous enrollment. Outcomes are ascertained from inpatient and outpatient claims.
`

const TEAMS_MARKDOWN = `# #data-pipeline

**Alice** · 9:02
claims/Q2 backfill failed at row 4M — paid_amount cast.

**Bob** · 9:04
looking. expecting precision issue from the new partner feed.

**Alice** · 9:06
yep — two new providers landed 4-decimal precision.

**Bob** · 9:09
patching the cast to numeric(18, 4). re-running.

**pipeline** · 9:42
✓ claims/Q2 finished — 41,208,330 rows.
`

const JIRA_MARKDOWN = `# DATA-1142 · Backfill claims Q2

**Status:** In Progress
**Assignee:** Bob
**Reporter:** Alice
**Due:** 2026-05-12

## Description
Run the Q2 claims backfill against the new mapping. Coordinate with the partner team on the paid_amount precision change before kicking off.

## Comments
**Alice** · 38m ago
Schema is locked. Safe to start.

**Bob** · 14m ago
First chunk landed. Watching memory on the worker.
`

const TEAM_CAPACITY_MARKDOWN = `# Team capacity

## People
| name  | role     | capacity |
| ----- | -------- | -------- |
| Alice | lead     | 32       |
| Bob   | engineer | 32       |
| Cara  | engineer | 24       |
| Dev   | designer | 16       |

## Cycles
| cycle | start      | end        | theme           |
| ----- | ---------- | ---------- | --------------- |
| C-12  | 2026-04-21 | 2026-05-04 | latency budget  |
| C-13  | 2026-05-05 | 2026-05-18 | onboarding lift |
| C-14  | 2026-05-19 | 2026-06-01 | observability   |
`

const PROVIDER_DIR_MARKDOWN = `# Provider directory

## Stewards
| Owner | Role     |
| ----- | -------- |
| Alice | lead     |
| Bob   | engineer |
| Cara  | analyst  |
| Dev   |          |

## Mappings
| Table     | Name      | Raw      | Type   |
| --------- | --------- | -------- | ------ |
| providers | npi       | NPI      | string |
| providers | specialty | SPCLTY   | enum   |
| providers | name      | PROV_NM  |        |
| providers | tin       | TIN      | string |
| providers | state     | state_raw| string |
`

const README_RAW = `# karthik / data-dictionary

A small library that turns workbook-shaped reference data into machine-readable markdown.

## Install
\`\`\`
pip install data-dictionary
\`\`\`

## Usage
\`\`\`python
from data_dictionary import load
spec = load("workbook.xlsx")
print(spec.to_markdown())
\`\`\`

## Why
A single source of truth that downstream consumers — docs, decks, QC — can all read.
`

const DOCS: PlatformDoc[] = [
  {
    id: 'cohort',
    title: 'Cohort definition',
    source: 'google-sheets',
    updated: '14m',
    preview: (
      <SheetsPreview
        filename="cohort-2026-q2"
        sheets={[
          {
            name: 'Cohort',
            headers: ['member_id', 'age_band', 'region'],
            rows: [
              ['M-1042', '35–44', 'NE'],
              ['M-1099', '45–54', 'SW'],
              ['M-1167', '55–64', 'MW'],
              ['M-1208', '35–44', 'NE'],
              ['M-1241', '45–54', 'NE'],
            ],
          },
          {
            name: 'Criteria',
            headers: ['name', 'op', 'value'],
            rows: [
              ['enrollment_months', '>=', '12'],
              ['age_at_index', 'between', '35-64'],
              ['prior_dx_x', '=', 'false'],
              ['inpatient_in_lookback', '>=', '1'],
            ],
          },
        ]}
      />
    ),
    markdown: COHORT_MARKDOWN,
    rulesApplied: 'client1',
  },
  {
    id: 'team-capacity',
    title: 'Team capacity',
    source: 'google-sheets',
    updated: '4h',
    preview: (
      <SheetsPreview
        filename="team-capacity-2026"
        sheets={[
          {
            name: 'People',
            headers: ['name', 'role', 'capacity'],
            rows: [
              ['Alice', 'lead', '32'],
              ['Bob', 'engineer', '32'],
              ['Cara', 'engineer', '24'],
              ['Dev', 'designer', '16'],
            ],
          },
          {
            name: 'Cycles',
            headers: ['cycle', 'start', 'end', 'theme'],
            rows: [
              ['C-12', '2026-04-21', '2026-05-04', 'latency budget'],
              ['C-13', '2026-05-05', '2026-05-18', 'onboarding lift'],
              ['C-14', '2026-05-19', '2026-06-01', 'observability'],
            ],
          },
        ]}
      />
    ),
    markdown: TEAM_CAPACITY_MARKDOWN,
    rulesApplied: 'client2',
  },
  {
    id: 'provider-dir',
    title: 'Provider directory',
    source: 'google-sheets',
    updated: '1d',
    preview: (
      <SheetsPreview
        filename="providers-q2"
        sheets={[
          {
            name: 'Stewards',
            headers: ['Owner', 'Role'],
            rows: [
              ['Alice', 'lead'],
              ['Bob', 'engineer'],
              ['Cara', 'analyst'],
              ['Dev', ''],
            ],
          },
          {
            name: 'Mappings',
            headers: ['Table', 'Name', 'Raw', 'Type'],
            rows: [
              ['providers', 'npi', 'NPI', 'string'],
              ['providers', 'specialty', 'SPCLTY', 'enum'],
              ['providers', 'name', 'PROV_NM', ''],
              ['providers', 'tin', 'TIN', 'string'],
              ['providers', 'state', 'state_raw', 'string'],
            ],
          },
        ]}
      />
    ),
    markdown: PROVIDER_DIR_MARKDOWN,
    rulesApplied: 'client1',
  },
  {
    id: 'protocol',
    title: 'Protocol v3',
    source: 'google-docs',
    updated: '2h',
    preview: (
      <DocsPreview
        filename="Protocol — v3 (draft)"
        body={
          <>
            <h1>Protocol v3</h1>
            <h2>Background</h2>
            <p>
              A retrospective cohort study evaluating the association between
              early initiation of therapy and 12-month all-cause hospitalization
              in a US-claims population.
            </p>
            <h2>Endpoints</h2>
            <p>
              <strong>Primary</strong> — all-cause hospitalization within 12
              months of index.
            </p>
            <p>
              <strong>Secondary</strong> — total cost of care; medication
              adherence (PDC ≥ 80%).
            </p>
            <h2>Methods</h2>
            <p>
              Patients are identified between 2022-01-01 and 2024-12-31 using
              closed claims. Index is the first dispensed therapy. A 12-month
              lookback ensures continuous enrollment.
            </p>
          </>
        }
      />
    ),
    markdown: PROTOCOL_MARKDOWN,
    rulesApplied: 'gdocs',
  },
  {
    id: 'teams',
    title: 'Pipeline incident',
    source: 'teams',
    updated: '1m',
    preview: (
      <TeamsPreview
        channel="#data-pipeline"
        messages={[
          { who: 'Alice', when: '9:02', text: 'claims/Q2 backfill failed at row 4M — paid_amount cast.' },
          { who: 'Bob', when: '9:04', text: 'looking. expecting precision issue from the new partner feed.' },
          { who: 'Alice', when: '9:06', text: 'yep — two new providers landed 4-decimal precision.' },
          { who: 'Bob', when: '9:09', text: 'patching the cast to numeric(18, 4). re-running.' },
          { who: 'pipeline', when: '9:42', text: '✓ claims/Q2 finished — 41,208,330 rows.' },
        ]}
      />
    ),
    markdown: TEAMS_MARKDOWN,
    rulesApplied: 'teams',
  },
  {
    id: 'jira',
    title: 'DATA-1142',
    source: 'jira',
    updated: '38m',
    preview: (
      <JiraPreview
        ticketKey="DATA-1142"
        status="In Progress"
        title="Backfill claims Q2"
        fields={[
          { label: 'Assignee', value: 'Bob' },
          { label: 'Reporter', value: 'Alice' },
          { label: 'Due', value: '2026-05-12' },
        ]}
        description="Run the Q2 claims backfill against the new mapping. Coordinate with the partner team on the paid_amount precision change before kicking off."
        comments={[
          { who: 'Alice', when: '38m ago', text: 'Schema is locked. Safe to start.' },
          { who: 'Bob', when: '14m ago', text: 'First chunk landed. Watching memory on the worker.' },
        ]}
      />
    ),
    markdown: JIRA_MARKDOWN,
    rulesApplied: 'jira',
  },
  {
    id: 'readme',
    title: 'README.md',
    source: 'local',
    updated: '3d',
    preview: <LocalPreview filename="~/code/data-dictionary/README.md" raw={README_RAW} />,
    markdown: README_RAW,
    rulesApplied: 'local',
  },
]



/* ==================================================================
   Detail views — one per selection kind
   ================================================================== */

function DocumentDetail({ doc }: { doc: PlatformDoc }) {
  const rule = RULES.find((r) => r.id === doc.rulesApplied)
  const evaluation = useMemo(() => evaluateDoc(doc), [doc])
  const score = scoreOf(evaluation)
  const tier = tierOf(score)

  const lines = useMemo(() => doc.markdown.split('\n'), [doc.markdown])
  const issuesByLine = useMemo(() => {
    const map = new Map<number, DocIssue[]>()
    for (const issue of evaluation.issues) {
      const list = map.get(issue.line) ?? []
      list.push(issue)
      map.set(issue.line, list)
    }
    return map
  }, [evaluation.issues])

  return (
    <>
      <header className="pplat__doc-head">
        <h2 className="pplat__doc-title">{doc.title}</h2>
        <div className="pplat__doc-meta-row">
          <span className="pplat__doc-meta-pill">
            <span
              className="pplat__doc-meta-dot"
              style={{ background: SOURCE_META[doc.source].color }}
              aria-hidden="true"
            />
            {SOURCE_META[doc.source].label}
          </span>
          <span className="pplat__doc-meta-pill">updated {doc.updated}</span>
          {rule && (
            <span
              className={`pplat__doc-score-pill pplat__doc-score-pill--${tier}`}
            >
              <span className="pplat__doc-score-pill-rules">
                {rule.filename}
              </span>
              <span className="pplat__doc-score-pill-sep" aria-hidden="true">
                ·
              </span>
              <span className="pplat__doc-score-pill-count">
                {evaluation.passed}/{evaluation.total}
              </span>
              <span className="pplat__doc-score-pill-num">{score}</span>
            </span>
          )}
        </div>
      </header>

      <div className="pplat__pair">
        <div className="pplat__pane">
          <div className="pplat__pane-label">Source</div>
          <div className="pplat__pane-body">{doc.preview}</div>
        </div>
        <div className="pplat__pane">
          <div className="pplat__pane-label">
            Markdown
            {evaluation.issues.length > 0 && (
              <span className="pplat__pane-label-count">
                {evaluation.issues.length} suggestion
                {evaluation.issues.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <div className="pplat__pane-body pplat__pane-body--md">
            <div
              className="pplat__pane-raw"
              role="region"
              aria-label="markdown with inline suggestions"
            >
              {lines.map((text, i) => {
                const issues = issuesByLine.get(i)
                const hasIssues = !!issues && issues.length > 0
                return (
                  <div
                    key={i}
                    className={`pplat__pane-raw-line ${
                      hasIssues ? 'is-issue' : ''
                    }`}
                  >
                    <span className="pplat__pane-raw-text">
                      {text || ' '}
                    </span>
                    {hasIssues &&
                      issues!.map((iss, j) => (
                        <div key={j} className="pplat__pane-raw-issue">
                          <span className="pplat__pane-raw-issue-reason">
                            ↳ {iss.reason}
                          </span>
                          <span className="pplat__pane-raw-issue-fix">
                            <span className="pplat__pane-raw-issue-fix-label">
                              fix
                            </span>{' '}
                            {iss.suggestion}
                          </span>
                        </div>
                      ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function RuleDetail({ rule }: { rule: RuleFile }) {
  return (
    <>
      <header className="pplat__doc-head">
        <h2 className="pplat__doc-title">{rule.filename}</h2>
        <div className="pplat__doc-meta-row">
          <span
            className={`pplat__doc-meta-pill pplat__status pplat__status--${rule.status}`}
          >
            {rule.status}
          </span>
          <span className="pplat__doc-meta-pill">
            {rule.checks.length} checks
          </span>
          <span className="pplat__doc-meta-pill">updated {rule.updated}</span>
        </div>
        <p className="pplat__doc-summary">{rule.summary}</p>
      </header>

      <div className="pplat__checks">
        {rule.checks.map((check) => (
          <article key={check.id} className="pplat__check">
            <div className="pplat__check-head">
              <span className="pplat__check-name">{check.name}</span>
              <span className="pplat__check-tag">check</span>
            </div>
            <p className="pplat__check-desc">{check.description}</p>
            <div className="pplat__check-cases">
              <div className="pplat__check-cases-head">
                <span>input</span>
                <span>result</span>
              </div>
              {check.cases.map((c, i) => (
                <div key={i} className="pplat__check-case">
                  <code className="pplat__check-case-input">{c.input}</code>
                  <span
                    className={`pplat__check-case-result is-${c.result}`}
                  >
                    <span aria-hidden="true">
                      {c.result === 'pass' ? '✓' : '✗'}
                    </span>
                    <span>{c.result}</span>
                    {c.reason && (
                      <span className="pplat__check-case-reason">
                        · {c.reason}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

/* ==================================================================
   Sidebar collapsible section
   ================================================================== */

function PlatformHealth({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  const scores = DOCS.map(docScore)
  const aggregate = Math.round(
    scores.reduce((sum, s) => sum + s, 0) / scores.length,
  )
  const aboveThreshold = scores.filter((s) => s >= 70).length
  const tier = tierOf(aggregate)
  return (
    <button
      type="button"
      className={`pplat__health pplat__health--${tier} ${
        active ? 'is-on' : ''
      }`}
      onClick={onClick}
      aria-pressed={active}
    >
      <div className="pplat__health-num">{aggregate}</div>
      <div className="pplat__health-text">
        <div className="pplat__health-label">Platform health</div>
        <div className="pplat__health-sub">
          {aboveThreshold} of {scores.length} docs above 70 · click to open
        </div>
      </div>
    </button>
  )
}

/* ==================================================================
   Dashboard — "no document selected" overview view
   ================================================================== */

const dashSpring = { type: 'spring' as const, stiffness: 280, damping: 24 }

const dashContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

const dashTile = {
  hidden: { opacity: 0, y: 16, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: dashSpring },
}

function Dashboard({
  onSelectDoc,
}: {
  onSelectDoc: (id: string) => void
}) {
  const stats = useMemo(() => {
    const evals = DOCS.map((d) => ({ doc: d, eval: evaluateDoc(d) }))
    const scores = evals.map(({ eval: e }) => scoreOf(e))
    const aggregate = scores.length
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0
    const totalPassed = evals.reduce((s, { eval: e }) => s + e.passed, 0)
    const totalChecks = evals.reduce((s, { eval: e }) => s + e.total, 0)
    const totalSuggestions = evals.reduce(
      (s, { eval: e }) => s + e.issues.length,
      0,
    )
    return {
      aggregate,
      docs: DOCS.length,
      totalPassed,
      totalChecks,
      totalSuggestions,
    }
  }, [])

  const bySource = useMemo(() => {
    const groups = new Map<Source, { count: number; sum: number }>()
    for (const d of DOCS) {
      const g = groups.get(d.source) ?? { count: 0, sum: 0 }
      g.count += 1
      g.sum += docScore(d)
      groups.set(d.source, g)
    }
    return Array.from(groups.entries())
      .map(([source, { count, sum }]) => ({
        source,
        count,
        avg: Math.round(sum / count),
      }))
      .sort((a, b) => b.count - a.count)
  }, [])

  const aggregateTier = tierOf(stats.aggregate)

  return (
    <motion.div
      className="pplat__dash"
      variants={dashContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.header className="pplat__doc-head" variants={dashTile}>
        <h2 className="pplat__doc-title">Platform overview</h2>
        <div className="pplat__doc-meta-row">
          <span className="pplat__doc-meta-pill">
            {stats.docs} document{stats.docs === 1 ? '' : 's'}
          </span>
          <span className="pplat__doc-meta-pill">
            {RULES.length} rule files
          </span>
          <span className="pplat__doc-meta-pill">last scored 2m</span>
        </div>
      </motion.header>

      <motion.div className="pplat__dash-tiles" variants={dashContainer}>
        <DashTile
          big={stats.aggregate}
          label="Platform health"
          tier={aggregateTier}
          sub={`mean of ${stats.docs} document scores`}
        />
        <DashTile
          big={stats.docs}
          label="Documents"
          sub="ingested across all sources"
        />
        <DashTile
          big={`${stats.totalPassed}/${stats.totalChecks}`}
          label="Rules passing"
          sub="across the active rule files"
        />
        <DashTile
          big={stats.totalSuggestions}
          label="Open suggestions"
          tier={stats.totalSuggestions === 0 ? 'good' : 'low'}
          sub={
            stats.totalSuggestions === 0
              ? 'nothing to address'
              : 'inline fixes ready to apply'
          }
        />
      </motion.div>

      <motion.section className="pplat__dash-section" variants={dashTile}>
        <h3 className="pplat__dash-section-title">By source</h3>
        <ul className="pplat__dash-by-source">
          {bySource.map(({ source, count, avg }) => {
            const meta = SOURCE_META[source]
            const tier = tierOf(avg)
            const pct = avg
            return (
              <motion.li
                key={source}
                className="pplat__dash-source-row"
                variants={dashTile}
              >
                <span
                  className="pplat__dash-source-dot"
                  style={{ background: meta.color }}
                  aria-hidden="true"
                />
                <span className="pplat__dash-source-label">{meta.label}</span>
                <span className="pplat__dash-source-count">
                  {count} doc{count === 1 ? '' : 's'}
                </span>
                <span className="pplat__dash-source-bar" aria-hidden="true">
                  <motion.span
                    className={`pplat__dash-source-bar-fill pplat__dash-source-bar-fill--${tier}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{
                      ...dashSpring,
                      delay: 0.18,
                    }}
                  />
                </span>
                <span
                  className={`pplat__dash-source-avg pplat__dash-source-avg--${tier}`}
                >
                  {avg}
                </span>
              </motion.li>
            )
          })}
        </ul>
      </motion.section>

      <motion.section className="pplat__dash-section" variants={dashTile}>
        <h3 className="pplat__dash-section-title">Documents</h3>
        <motion.ul className="pplat__dash-grid" variants={dashContainer}>
          {DOCS.map((doc) => {
            const e = evaluateDoc(doc)
            const score = scoreOf(e)
            const tier = tierOf(score)
            const meta = SOURCE_META[doc.source]
            return (
              <motion.li
                key={doc.id}
                variants={dashTile}
                className="pplat__dash-card-wrap"
              >
                <button
                  type="button"
                  className="pplat__dash-card"
                  onClick={() => onSelectDoc(doc.id)}
                >
                  <div className="pplat__dash-card-head">
                    <span className="pplat__dash-card-source">
                      <span
                        className="pplat__dash-card-dot"
                        style={{ background: meta.color }}
                        aria-hidden="true"
                      />
                      {meta.label}
                    </span>
                    <span className="pplat__dash-card-time">{doc.updated}</span>
                  </div>
                  <h4 className="pplat__dash-card-title">{doc.title}</h4>
                  <div className="pplat__dash-card-foot">
                    <span
                      className={`pplat__dash-card-score pplat__dash-card-score--${tier}`}
                    >
                      {score}
                    </span>
                    <span className="pplat__dash-card-count">
                      {e.passed}/{e.total} pass
                    </span>
                    {e.issues.length > 0 && (
                      <span className="pplat__dash-card-issues">
                        {e.issues.length} suggestion
                        {e.issues.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </button>
              </motion.li>
            )
          })}
        </motion.ul>
      </motion.section>
    </motion.div>
  )
}

function DashTile({
  big,
  label,
  sub,
  tier,
}: {
  big: number | string
  label: string
  sub?: string
  tier?: 'good' | 'ok' | 'low'
}) {
  return (
    <motion.div
      className={`pplat__dash-tile ${tier ? `pplat__dash-tile--${tier}` : ''}`}
      variants={dashTile}
    >
      <motion.div
        key={String(big)}
        className="pplat__dash-tile-num"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={dashSpring}
      >
        {big}
      </motion.div>
      <div className="pplat__dash-tile-label">{label}</div>
      {sub && <div className="pplat__dash-tile-sub">{sub}</div>}
    </motion.div>
  )
}

function SidebarSection({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className={`pplat__nav-section ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="pplat__nav-section-head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="pplat__nav-section-chevron" aria-hidden="true">
          ▾
        </span>
        <span className="pplat__nav-section-label">{label}</span>
        <span className="pplat__nav-section-count">{count}</span>
      </button>
      <div className="pplat__nav-collapse">
        <div className="pplat__nav-collapse-inner">{children}</div>
      </div>
    </div>
  )
}

/* ==================================================================
   Platform shell
   ================================================================== */

type PseudoPlatformProps = {
  /**
   * Optional handler wired to the platform's KARTHIK brand. When provided,
   * the brand becomes a button that surfaces a "return to rack" action so
   * the platform can stand on its own without relying on outside chrome.
   */
  onReturn?: () => void
}

type Selection =
  | { kind: 'overview' }
  | { kind: 'document'; id: string }
  | { kind: 'rule'; id: string }

export function PseudoPlatform({ onReturn }: PseudoPlatformProps = {}) {
  const [selection, setSelection] = useState<Selection>({ kind: 'overview' })
  const [docsOpen, setDocsOpen] = useState(true)
  const [rulesOpen, setRulesOpen] = useState(true)

  const activeDoc =
    selection.kind === 'document'
      ? DOCS.find((d) => d.id === selection.id) ?? null
      : null
  const activeRule =
    selection.kind === 'rule'
      ? RULES.find((r) => r.id === selection.id) ?? null
      : null

  const brandInner = (
    <>
      <span className="pplat__brand-dot" aria-hidden="true" />
      <span className="pplat__brand-name">KARTHIK</span>
    </>
  )

  return (
    <motion.div
      className="pplat"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.header className="pplat__header" variants={popVariants}>
        {onReturn ? (
          <button
            type="button"
            className="pplat__brand pplat__brand--button"
            onClick={onReturn}
            aria-label="Return to document list"
          >
            {brandInner}
          </button>
        ) : (
          <div className="pplat__brand">{brandInner}</div>
        )}
        <div className="pplat__search" aria-hidden="true">
          <span className="pplat__search-glyph">⌕</span>
          <span className="pplat__search-text">
            Search documents, rules, and sources
          </span>
          <span className="pplat__kbd">⌘K</span>
        </div>
        <div className="pplat__user">
          <span className="pplat__user-name">karthik</span>
          <span className="pplat__avatar" aria-hidden="true">k</span>
        </div>
      </motion.header>

      <div className="pplat__body">
        <motion.aside className="pplat__nav" variants={sidePopVariants}>
          <PlatformHealth
            active={selection.kind === 'overview'}
            onClick={() => setSelection({ kind: 'overview' })}
          />
          <SidebarSection
            label="Documents"
            count={DOCS.length}
            open={docsOpen}
            onToggle={() => setDocsOpen((v) => !v)}
          >
            {DOCS.map((doc) => {
              const meta = SOURCE_META[doc.source]
              const on =
                selection.kind === 'document' && selection.id === doc.id
              const score = docScore(doc)
              const tier = tierOf(score)
              return (
                <button
                  key={doc.id}
                  type="button"
                  className={`pplat__doc-item ${on ? 'is-on' : ''}`}
                  onClick={() =>
                    setSelection({ kind: 'document', id: doc.id })
                  }
                >
                  <span className="pplat__doc-item-row">
                    <span className="pplat__doc-item-title">{doc.title}</span>
                    <span
                      className={`pplat__doc-item-score pplat__doc-item-score--${tier}`}
                    >
                      {score}
                    </span>
                  </span>
                  <span className="pplat__doc-item-meta">
                    <span className="pplat__doc-item-time">{doc.updated}</span>
                    <span className="pplat__doc-item-sep" aria-hidden="true">·</span>
                    <span className="pplat__doc-item-source">
                      <span
                        className="pplat__doc-item-dot"
                        style={{ background: meta.color }}
                        aria-hidden="true"
                      />
                      {meta.label}
                    </span>
                  </span>
                </button>
              )
            })}
          </SidebarSection>

          <SidebarSection
            label="Rules"
            count={RULES.length}
            open={rulesOpen}
            onToggle={() => setRulesOpen((v) => !v)}
          >
            {RULES.map((rule) => {
              const on =
                selection.kind === 'rule' && selection.id === rule.id
              return (
                <button
                  key={rule.id}
                  type="button"
                  className={`pplat__doc-item ${on ? 'is-on' : ''}`}
                  onClick={() =>
                    setSelection({ kind: 'rule', id: rule.id })
                  }
                >
                  <span className="pplat__doc-item-title">{rule.filename}</span>
                  <span className="pplat__doc-item-meta">
                    <span className="pplat__doc-item-time">{rule.updated}</span>
                    <span className="pplat__doc-item-sep" aria-hidden="true">·</span>
                    <span>{rule.checks.length} checks</span>
                  </span>
                </button>
              )
            })}
          </SidebarSection>
        </motion.aside>

        <motion.main className="pplat__main" variants={popVariants}>
          <AnimatePresence mode="wait">
            <motion.section
              key={
                selection.kind === 'overview'
                  ? 'overview'
                  : `${selection.kind}:${selection.id}`
              }
              className="pplat__doc"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: SPRING }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
            >
              {selection.kind === 'overview' && (
                <Dashboard
                  onSelectDoc={(id) =>
                    setSelection({ kind: 'document', id })
                  }
                />
              )}
              {activeDoc && <DocumentDetail doc={activeDoc} />}
              {activeRule && <RuleDetail rule={activeRule} />}
            </motion.section>
          </AnimatePresence>
        </motion.main>
      </div>
    </motion.div>
  )
}

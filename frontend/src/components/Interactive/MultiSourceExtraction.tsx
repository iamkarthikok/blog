import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ConfluencePreview,
  DocsPreview,
  JiraPreview,
  LocalPreview,
  SheetsPreview,
  TeamsPreview,
} from './SourcePreviews'
import './MultiSourceExtraction.css'

const SPRING = { type: 'spring' as const, stiffness: 320, damping: 24, mass: 0.9 }

type SourceId =
  | 'sheets'
  | 'docs'
  | 'teams'
  | 'jira'
  | 'confluence'
  | 'local'

type SourceItem = {
  id: SourceId
  label: string
  color: string
  preview: ReactNode
  markdown: string
}

const SHEETS_MD = `# Team capacity

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

const DOCS_MD = `# Choosing a feature flag system

## Background
We have flags scattered across env vars, hardcoded constants, and a few \`if user_id ==\` checks. We need one mechanism, runtime-toggleable, with audit history.

## Options
- **OpenFeature + LaunchDarkly** — managed, but expensive at our scale.
- **Self-host Unleash** — open source, more ops cost.
- **In-house thin layer** — fastest to ship, slowest to maintain.

## Decision
Adopt **Unleash**. Acceptable ops cost; we already self-host Postgres. Migrate the existing flags over the next two cycles.
`

const TEAMS_MD = `# #ops · Friday deploy

**Alice** · 2:14
heads up — pushing the cohort-builder change at 3:00.

**Bob** · 2:18
ack. I'll be on call. anything risky?

**Alice** · 2:19
new join on members → claims. dry-run looked clean.

**oncall** · 3:02
deploy green. error rate flat. 200 OK.
`

const JIRA_MD = `# INFRA-218 · Worker process crashes under sustained load

**Status:** To Do
**Assignee:** Bob
**Reporter:** Cara
**Severity:** Sev-2

## Description
Under sustained ingest load (>4M rows/min), the worker process is OOM-killed roughly every 90 minutes. Memory grows unbounded; no obvious leak in the application path. Suspect the new partner feed's larger row size is interacting badly with our batch buffer.

## Comments
**Cara** · 1d ago
Saw this twice last night. Heap dump attached.

**Bob** · 14h ago
Profile points at the row buffer holding refs after flush. Looking.
`

const CONFLUENCE_MD = `# Onboarding · Data Pipeline team

> **Welcome.** Read this in order. Most things will not make sense the first time, that's fine.

## Week 1
- Get cluster access (ask Alice).
- Run the pipeline locally end-to-end on the sample dataset.
- Read the architecture doc in this space.

## Week 2
- Pair with Bob on a small ticket.
- Open one PR. Doesn't have to be large.

## Conventions we care about
- Every PR is reviewed by at least one person on the team.
- Migrations are reversible by default.
- If a check is worth running once, it's worth running on every commit.

*Last updated by Alice · 3 days ago.*
`

const LOCAL_MD = `# RUNBOOK.md

A short reference for the Q2 backfill cluster. The rest of the docs live on Confluence — this file is what lives next to the code.

## Daily checks
1. \`bin/check_lag\` — ingest lag should be under 10 minutes.
2. \`bin/check_disk\` — workers should be under 70% utilization.
3. Eyeball the Grafana board for outliers.

## When the worker crashes
1. \`kubectl logs -l app=ingest --tail=400\`
2. Check INFRA-218 for the current memory hypothesis.
3. If sustained, fall back to the smaller batch size in \`config.yaml\`.

*Local-only. Don't link from external docs.*
`

const SOURCES: SourceItem[] = [
  {
    id: 'sheets',
    label: 'Google Sheets',
    color: '#0f9d58',
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
    markdown: SHEETS_MD,
  },
  {
    id: 'docs',
    label: 'Google Docs',
    color: '#4285f4',
    preview: (
      <DocsPreview
        filename="ADR — Feature flags"
        body={
          <>
            <h1>Choosing a feature flag system</h1>
            <h2>Background</h2>
            <p>
              We have flags scattered across env vars, hardcoded constants,
              and a few <strong>if user_id ==</strong> checks. We need one
              mechanism, runtime-toggleable, with audit history.
            </p>
            <h2>Options</h2>
            <ul>
              <li>
                <strong>OpenFeature + LaunchDarkly</strong> — managed, but
                expensive at our scale.
              </li>
              <li>
                <strong>Self-host Unleash</strong> — open source, more ops
                cost.
              </li>
              <li>
                <strong>In-house thin layer</strong> — fastest to ship,
                slowest to maintain.
              </li>
            </ul>
            <h2>Decision</h2>
            <p>
              Adopt <strong>Unleash</strong>. Acceptable ops cost; we already
              self-host Postgres. Migrate the existing flags over the next
              two cycles.
            </p>
          </>
        }
      />
    ),
    markdown: DOCS_MD,
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    color: '#5059c9',
    preview: (
      <TeamsPreview
        channel="#ops"
        messages={[
          { who: 'Alice', when: '2:14', text: 'heads up — pushing the cohort-builder change at 3:00.' },
          { who: 'Bob', when: '2:18', text: "ack. I'll be on call. anything risky?" },
          { who: 'Alice', when: '2:19', text: 'new join on members → claims. dry-run looked clean.' },
          { who: 'oncall', when: '3:02', text: 'deploy green. error rate flat. 200 OK.' },
        ]}
      />
    ),
    markdown: TEAMS_MD,
  },
  {
    id: 'jira',
    label: 'JIRA',
    color: '#0052cc',
    preview: (
      <JiraPreview
        ticketKey="INFRA-218"
        status="To Do"
        title="Worker process crashes under sustained load"
        fields={[
          { label: 'Assignee', value: 'Bob' },
          { label: 'Reporter', value: 'Cara' },
          { label: 'Severity', value: 'Sev-2' },
        ]}
        description="Under sustained ingest load (>4M rows/min), the worker process is OOM-killed roughly every 90 minutes. Memory grows unbounded; no obvious leak in the application path."
        comments={[
          { who: 'Cara', when: '1d ago', text: 'Saw this twice last night. Heap dump attached.' },
          { who: 'Bob', when: '14h ago', text: 'Profile points at the row buffer holding refs after flush. Looking.' },
        ]}
      />
    ),
    markdown: JIRA_MD,
  },
  {
    id: 'confluence',
    label: 'Confluence',
    color: '#2684ff',
    preview: (
      <ConfluencePreview
        space="Engineering"
        parentTitle="Onboarding"
        title="Data Pipeline team"
        meta={{ author: 'Alice', updated: '3 days ago' }}
        body={
          <>
            <div className="srcpv__confluence-callout">
              <strong>Welcome.</strong> Read this in order. Most things will
              not make sense the first time, that's fine.
            </div>
            <h2>Week 1</h2>
            <ul>
              <li>Get cluster access (ask Alice).</li>
              <li>Run the pipeline locally end-to-end on the sample dataset.</li>
              <li>Read the architecture doc in this space.</li>
            </ul>
            <h2>Week 2</h2>
            <ul>
              <li>Pair with Bob on a small ticket.</li>
              <li>Open one PR. Doesn't have to be large.</li>
            </ul>
            <h2>Conventions we care about</h2>
            <ul>
              <li>Every PR is reviewed by at least one person on the team.</li>
              <li>Migrations are reversible by default.</li>
              <li>
                If a check is worth running once, it's worth running on every
                commit.
              </li>
            </ul>
          </>
        }
      />
    ),
    markdown: CONFLUENCE_MD,
  },
  {
    id: 'local',
    label: 'Local',
    color: '#6b6b6b',
    preview: (
      <LocalPreview filename="~/code/ingest/RUNBOOK.md" raw={LOCAL_MD} />
    ),
    markdown: LOCAL_MD,
  },
]

export function MultiSourceExtraction() {
  const [selectedId, setSelectedId] = useState<SourceId>('sheets')
  const active = SOURCES.find((s) => s.id === selectedId) ?? SOURCES[0]

  return (
    <div className="msrc">
      <div className="msrc__head">
        <span className="msrc__caption">demo · multi-source extraction</span>
      </div>

      <div className="msrc__tabs" role="tablist">
        {SOURCES.map((s) => {
          const on = s.id === selectedId
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`msrc__tab ${on ? 'is-on' : ''}`}
              onClick={() => setSelectedId(s.id)}
              style={
                on
                  ? ({
                      ['--msrc-tab-accent' as string]: s.color,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <span
                className="msrc__tab-dot"
                style={{ background: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </button>
          )
        })}
      </div>

      <div className="msrc__pair">
        <div className="msrc__pane">
          <div className="msrc__pane-label">Source</div>
          <div className="msrc__pane-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={`src:${active.id}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: SPRING }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
              >
                {active.preview}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="msrc__pane">
          <div className="msrc__pane-label">Markdown</div>
          <div className="msrc__pane-body msrc__pane-body--md">
            <AnimatePresence mode="wait">
              <motion.pre
                key={`md:${active.id}`}
                className="msrc__pane-raw"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: SPRING }}
                exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
              >
                <code>{active.markdown}</code>
              </motion.pre>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

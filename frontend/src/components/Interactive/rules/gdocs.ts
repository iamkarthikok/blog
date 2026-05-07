import type { CheckFailure, RuleFile } from './engine'

export const gdocs: RuleFile = {
  id: 'gdocs',
  filename: 'gdocs.rule',
  summary:
    'Structure and metadata checks on Google Docs ingested into the index.',
  updated: '3d',
  status: 'draft',
  checks: [
    {
      id: 'gdocs-has-title',
      name: 'doc.has_title',
      description:
        'Doc starts with a top-level heading (H1). Without it the search index has nothing to feature.',
      suggestion: 'Add a `# Title` line at the top of the doc.',
      cases: [
        { input: '"# Choosing a feature flag system"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'no H1' },
      ],
      match: (lines) => {
        if (lines.some((l) => /^#\s/.test(l))) return []
        return [
          {
            line: 0,
            reason: 'No top-level heading found.',
          },
        ]
      },
    },
    {
      id: 'gdocs-heading-case',
      name: 'heading.sentence_case',
      description: 'Section headings use sentence case, not all-caps shouting.',
      suggestion: 'Use sentence case — only the first letter of the heading is capitalized.',
      cases: [
        { input: '"## Background"', result: 'pass' },
        { input: '"## BACKGROUND"', result: 'fail', reason: 'all caps' },
      ],
      match: (lines) => {
        const out: CheckFailure[] = []
        for (let i = 0; i < lines.length; i++) {
          const m = lines[i].match(/^##\s+(.+?)\s*$/)
          if (!m) continue
          const heading = m[1]
          if (
            heading.length >= 4 &&
            heading === heading.toUpperCase() &&
            /[A-Z]/.test(heading)
          ) {
            const recased =
              heading.charAt(0) + heading.slice(1).toLowerCase()
            out.push({
              line: i,
              reason: `Heading \`${heading}\` is in ALL CAPS — sentence case expected.`,
              suggestion: `Rewrite as \`${recased}\`.`,
            })
          }
        }
        return out
      },
    },
    {
      id: 'gdocs-has-author',
      name: 'doc.has_author',
      description:
        'Doc metadata declares an author — needed to attribute the source when the markdown is republished.',
      suggestion: 'Declare an author in the doc metadata.',
      cases: [
        { input: '{ author: "Alice" }', result: 'pass' },
        { input: '{}', result: 'fail', reason: 'author missing' },
      ],
    },
    {
      id: 'gdocs-has-last-edited',
      name: 'doc.has_last_edited',
      description:
        'Doc shows a last-edited timestamp. Stale unattributed edits get rejected at re-ingest.',
      suggestion: 'Add a `*Last edited <date> by <author>*` line under the H1.',
      cases: [
        { input: '"3 days ago"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'no last-edited' },
      ],
      match: (lines) => {
        if (lines.some((l) => /last (edited|updated)/i.test(l))) return []
        return [
          {
            line: 0,
            reason: 'Doc has no last-edited timestamp.',
          },
        ]
      },
    },
    {
      id: 'gdocs-links-resolve',
      name: 'links.resolve',
      description:
        'Every embedded link returns 200 at parse time — broken links in source docs propagate as broken markdown.',
      suggestion: 'Verify each link resolves; replace any that 404.',
      cases: [
        { input: '"/docs/cohort"', result: 'pass' },
        {
          input: '"/docs/missing"',
          result: 'fail',
          reason: '404 — not found',
        },
      ],
    },
  ],
}

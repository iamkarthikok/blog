import type { RuleFile } from './engine'

export const jira: RuleFile = {
  id: 'jira',
  filename: 'jira.rule',
  summary:
    'Format and metadata checks on JIRA tickets pulled into the index.',
  updated: '6h',
  status: 'active',
  checks: [
    {
      id: 'jira-key-format',
      name: 'key.format',
      description:
        'JIRA keys match PROJECT-### where PROJECT is uppercase letters and ### is one or more digits.',
      suggestion:
        'Use uppercase project letters, a dash, and digits (e.g. `DATA-1142`).',
      cases: [
        { input: '"DATA-1142"', result: 'pass' },
        { input: '"data-1142"', result: 'fail', reason: 'lowercase project' },
        { input: '"DATA1142"', result: 'fail', reason: 'missing "-"' },
      ],
      match: (lines) => {
        const titleIdx = lines.findIndex((l) => /^#\s/.test(l))
        if (titleIdx < 0) return []
        const title = lines[titleIdx]
        const m = title.match(/\b([A-Za-z]+-?\d+)\b/)
        if (!m) return []
        if (/^[A-Z]+-\d+$/.test(m[1])) return []
        return [
          {
            line: titleIdx,
            reason: `Title key \`${m[1]}\` doesn't match PROJECT-###.`,
          },
        ]
      },
    },
    {
      id: 'jira-status-allowlist',
      name: 'status.in_allowlist',
      description:
        'status is one of: To Do, In Progress, Blocked, Done. Custom statuses break the cross-project board.',
      suggestion: 'Pick one of: To Do, In Progress, Blocked, Done.',
      cases: [
        { input: '"In Progress"', result: 'pass' },
        { input: '"Almost Done"', result: 'fail', reason: 'not in allowlist' },
      ],
    },
    {
      id: 'jira-active-has-assignee',
      name: 'active.has_assignee',
      description:
        'Tickets that are In Progress must have an assignee — orphaned in-progress work is the most common cause of dropped tickets.',
      suggestion: 'Assign the in-progress ticket to a person.',
      cases: [
        {
          input: '{ status: "In Progress", assignee: "Bob" }',
          result: 'pass',
        },
        {
          input: '{ status: "In Progress", assignee: "" }',
          result: 'fail',
          reason: 'unassigned',
        },
      ],
    },
    {
      id: 'jira-description-min-length',
      name: 'description.min_length',
      description:
        'Description is at least 40 characters. Short descriptions force readers to ask the assignee for context.',
      suggestion: 'Expand the description to at least 40 characters.',
      cases: [
        {
          input: '"Run the Q2 claims backfill against the new mapping…"',
          result: 'pass',
        },
        { input: '"fix the bug"', result: 'fail', reason: '11 chars (min 40)' },
      ],
    },
    {
      id: 'jira-in-progress-has-due',
      name: 'in_progress.has_due_date',
      description:
        'Tickets in progress declare a due date so they can be sorted on the upcoming-work board.',
      suggestion: 'Add a due date for the in-progress ticket.',
      cases: [
        {
          input: '{ status: "In Progress", due: "2026-05-12" }',
          result: 'pass',
        },
        {
          input: '{ status: "In Progress", due: "" }',
          result: 'fail',
          reason: 'no due date',
        },
      ],
    },
  ],
}

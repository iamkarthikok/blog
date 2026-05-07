import type { CheckFailure, RuleFile } from './engine'
import { matchCanonicalChars, matchTableCellsFilled } from './matchers'

export const client1: RuleFile = {
  id: 'client1',
  filename: 'Client1.rules',
  summary:
    'Workbook QC for Client 1 — strict typing on the schema, ISO dates on the change log, every note has a source. Lifted directly from the rules-on-a-sheet doc.',
  updated: '1d',
  status: 'active',
  checks: [
    {
      id: 'owner-name-set',
      name: 'owner_name.set',
      description: 'Every row in the Owners sheet has a name.',
      suggestion: 'Provide an owner name in the first column.',
      cases: [
        { input: '"Alice"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'owner empty' },
      ],
    },
    {
      id: 'role-set',
      name: 'role.set',
      description: 'Every owner has a role.',
      suggestion: 'Assign the owner a role.',
      cases: [
        { input: '"lead"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'role empty' },
      ],
    },
    {
      id: 'role-enum',
      name: 'role.in_allowlist',
      description:
        'role is one of the recognized values: lead, engineer, manager, designer.',
      suggestion: 'Use one of: lead, engineer, manager, designer.',
      cases: [
        { input: '"engineer"', result: 'pass' },
        { input: '"consultant"', result: 'fail', reason: 'not in allowlist' },
      ],
    },
    {
      id: 'schema-type-set',
      name: 'schema_type.set',
      description: 'Every column in the Schema sheet declares a type.',
      suggestion: 'Declare a type for the column.',
      cases: [
        { input: '"string"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'type missing' },
      ],
    },
    {
      id: 'schema-type-enum',
      name: 'schema_type.in_allowlist',
      description:
        'type is one of: string, integer, decimal, date, enum, boolean.',
      suggestion: 'Use one of: string, integer, decimal, date, enum, boolean.',
      cases: [
        { input: '"date"', result: 'pass' },
        { input: '"timestamp"', result: 'fail', reason: 'unknown type' },
      ],
    },
    {
      id: 'note-date-set',
      name: 'note_date.set',
      description: 'Every change-log note has a date.',
      suggestion: 'Add a date to the note.',
      cases: [
        { input: '"2026-04-01"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'date missing' },
      ],
    },
    {
      id: 'note-date-iso',
      name: 'note_date.iso',
      description:
        'Note dates are formatted YYYY-MM-DD. Mixed formats break ordering downstream.',
      suggestion: 'Convert the date to ISO format (YYYY-MM-DD).',
      cases: [
        { input: '"2026-04-01"', result: 'pass' },
        { input: '"04/01/2026"', result: 'fail', reason: 'not YYYY-MM-DD' },
        { input: '"2026/04/29"', result: 'fail', reason: 'wrong separator' },
      ],
      match: (lines) => {
        const out: CheckFailure[] = []
        const re = /\b(\d{1,4}\/\d{1,2}\/\d{1,4})\b/g
        for (let i = 0; i < lines.length; i++) {
          let m
          while ((m = re.exec(lines[i])) !== null) {
            out.push({
              line: i,
              reason: `Date \`${m[0]}\` uses slashes; Client1 expects ISO YYYY-MM-DD.`,
            })
          }
        }
        return out
      },
    },
    {
      id: 'note-source-set',
      name: 'note_source.set',
      description:
        'Every note attributes its source — partner, internal, or named external.',
      suggestion: 'Attribute the note to a source (partner / internal / external).',
      cases: [
        { input: '"partner"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'source empty' },
      ],
    },
    {
      id: 'note-min-length',
      name: 'note.min_length',
      description:
        'Note text is at least 10 characters. One-word notes carry no context.',
      suggestion: 'Expand the note to at least 10 characters with real context.',
      cases: [
        { input: '"Service date column renamed"', result: 'pass' },
        { input: '"short"', result: 'fail', reason: '5 chars (min 10)' },
      ],
    },
    {
      id: 'text-canonical-chars',
      name: 'text.canonical_chars',
      description:
        'Free text uses standard ASCII punctuation — no en-dashes, em-dashes, or smart quotes. Downstream tooling chokes on them.',
      suggestion: 'Replace with plain ASCII (hyphen `-`, straight quotes).',
      cases: [
        { input: '"35-44"', result: 'pass' },
        { input: '"35–44"', result: 'fail', reason: 'en-dash' },
        { input: '"It\'s fine"', result: 'pass' },
      ],
      match: matchCanonicalChars,
    },
    {
      id: 'table-cells-filled',
      name: 'table.cells_filled',
      description:
        'Every cell in a markdown data row carries a value. Empty cells leave downstream consumers with no signal.',
      suggestion: 'Fill every column or drop the row.',
      cases: [
        { input: '`| Alice | lead |`', result: 'pass' },
        { input: '`| Dev   |      |`', result: 'fail', reason: 'role empty' },
      ],
      match: matchTableCellsFilled,
    },
  ],
}

import type { CheckFailure, RuleFile } from './engine'
import {
  isTableSeparator,
  matchCanonicalChars,
  matchTableCellsFilled,
} from './matchers'

export const client2: RuleFile = {
  id: 'client2',
  filename: 'Client2.rules',
  summary:
    'Workbook QC for Client 2 — clean raw mappings, US dates, no duplicate columns. Lifted from the rules-on-a-sheet doc.',
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
      id: 'schema-raw-set',
      name: 'schema_raw.set',
      description:
        'Every Schema row has a raw mapping to the partner feed column.',
      suggestion: 'Map the column to its partner-feed identifier.',
      cases: [
        { input: '"CLM_ID"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'raw missing' },
      ],
    },
    {
      id: 'schema-raw-uppercase',
      name: 'schema_raw.uppercase',
      description:
        'Raw mappings are A–Z, 0–9, and underscores only. Lowercase is a smell — partner feeds are SQL-style identifiers.',
      suggestion: 'Rename the raw mapping to uppercase letters and underscores.',
      cases: [
        { input: '"PROC_CD"', result: 'pass' },
        { input: '"npi_raw"', result: 'fail', reason: 'lowercase' },
      ],
    },
    {
      id: 'schema-unique-cols',
      name: 'schema.unique_columns',
      description: '(table, name) pairs are unique across the Schema sheet.',
      suggestion: 'Rename one of the duplicates so (table, name) is unique.',
      cases: [
        { input: '(claims, claim_id)', result: 'pass' },
        {
          input: '(claims, cpt_code) ×2',
          result: 'fail',
          reason: 'duplicate column',
        },
      ],
    },
    {
      id: 'note-date-set',
      name: 'note_date.set',
      description: 'Every change-log note has a date.',
      suggestion: 'Add a date to the note.',
      cases: [
        { input: '"04/08/2026"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'date missing' },
      ],
    },
    {
      id: 'note-date-us',
      name: 'note_date.us',
      description:
        'Note dates are MM/DD/YYYY. The receiving team localizes downstream.',
      suggestion: 'Convert the date to MM/DD/YYYY.',
      cases: [
        { input: '"04/08/2026"', result: 'pass' },
        { input: '"2026-04-08"', result: 'fail', reason: 'not MM/DD/YYYY' },
      ],
      match: (lines) => {
        const out: CheckFailure[] = []
        const re = /\b\d{4}-\d{2}-\d{2}\b/
        for (let i = 0; i < lines.length; i++) {
          if (isTableSeparator(lines[i])) continue
          if (re.test(lines[i])) {
            out.push({
              line: i,
              reason: 'Line contains an ISO date; Client2 expects MM/DD/YYYY.',
            })
          }
        }
        return out
      },
    },
    {
      id: 'note-text-set',
      name: 'note.has_text',
      description: 'Every note has body text — not just metadata.',
      suggestion: 'Add body text to the note.',
      cases: [
        { input: '"Provider specialty added late"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'note text empty' },
      ],
    },
    {
      id: 'text-canonical-chars',
      name: 'text.canonical_chars',
      description:
        'Free text uses standard ASCII punctuation — no en-dashes or smart quotes.',
      suggestion: 'Replace with plain ASCII (hyphen `-`, straight quotes).',
      cases: [
        { input: '"35-44"', result: 'pass' },
        { input: '"35–44"', result: 'fail', reason: 'en-dash' },
      ],
      match: matchCanonicalChars,
    },
    {
      id: 'table-cells-filled',
      name: 'table.cells_filled',
      description: 'Every cell in a markdown data row carries a value.',
      suggestion: 'Fill every column or drop the row.',
      cases: [
        { input: '`| C-12 | 2026-04-21 | latency |`', result: 'pass' },
        { input: '`| Dev   |          |`', result: 'fail', reason: 'cell empty' },
      ],
      match: matchTableCellsFilled,
    },
  ],
}

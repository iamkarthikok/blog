import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './ExcelDemo.css'

/* ==================================================================
   Data model — multiple editable sheets in a single workbook
   ================================================================== */

type Sheet = {
  id: string
  name: string
  headers: string[]
  rows: string[][]
}

type ExcelData = {
  sheets: Sheet[]
}

type ContextValue = {
  data: ExcelData
  setCell: (sheetId: string, row: number, col: number, value: string) => void
  // The report owns the rule-file selector — picking one switches activeSetId.
  activeSetId: string
  setActiveSet: (id: string) => void
}

const SEED: ExcelData = {
  sheets: [
    {
      id: 'owners',
      name: 'Owners',
      headers: ['Owner', 'Role'],
      rows: [
        ['Alice', 'lead'],
        ['Bob', 'engineer'],
        ['Cara', ''],
        ['Dev', 'consultant'],
        ['Erin', 'designer'],
        ['', 'manager'],
      ],
    },
    {
      id: 'schema',
      name: 'Schema',
      headers: ['Table', 'Name', 'Raw', 'Type'],
      rows: [
        ['claims', 'claim_id', 'CLM_ID', 'string'],
        ['claims', 'member_id', 'MBR_ID', 'string'],
        ['claims', 'service_date', 'DOS', 'date'],
        ['claims', 'paid_amount', 'PD_AMT', 'decimal'],
        ['claims', 'cpt_code', 'PROC_CD', 'string'],
        ['claims', 'icd10_code', 'DX_CD', 'string'],
        ['claims', 'cpt_code', 'PROC_CD2', 'string'],
        ['members', 'member_id', 'MBR_ID', 'string'],
        ['members', 'birth_year', 'BIRTH_YR', 'integer'],
        ['members', 'gender', 'GNDR', 'enum'],
        ['providers', 'npi', 'npi_raw', 'string'],
        ['providers', 'specialty', 'SPCLTY', ''],
        ['providers', 'tin', '', 'string'],
      ],
    },
    {
      id: 'notes',
      name: 'Notes',
      headers: ['Date', 'Type', 'Source', 'Note'],
      rows: [
        [
          '2026-04-01',
          'mapping',
          'partner',
          'Service date column renamed in Q1 source',
        ],
        [
          '04/08/2026',
          'caveat',
          'internal',
          'Member IDs are pseudonymized at intake',
        ],
        [
          '2026-04-15',
          'fix',
          '',
          'Paid amount precision changed to 2dp',
        ],
        [
          '',
          'caveat',
          'internal',
          'Provider specialty was added late and lacks type info',
        ],
        [
          '2026-04-22',
          '',
          'internal',
          'Some claims have null ICD codes (~3%)',
        ],
        ['2026/04/29', 'todo', 'partner', 'short'],
        ['2026-05-02', 'mapping', 'partner', ''],
        [
          '05/06/2026',
          'fix',
          'partner',
          'Paid amount precision standardized across feeds',
        ],
      ],
    },
  ],
}

const ExcelDemoContext = createContext<ContextValue | null>(null)

export function ExcelDemoProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ExcelData>(SEED)
  const [activeSetId, setActiveSet] = useState<string>('client1')

  const setCell = (
    sheetId: string,
    row: number,
    col: number,
    value: string,
  ) => {
    setData((prev) => ({
      ...prev,
      sheets: prev.sheets.map((s) =>
        s.id !== sheetId
          ? s
          : {
              ...s,
              rows: s.rows.map((r, ri) =>
                ri !== row
                  ? r
                  : r.map((c, ci) => (ci === col ? value : c)),
              ),
            },
      ),
    }))
  }

  const value = useMemo(
    () => ({
      data,
      setCell,
      activeSetId,
      setActiveSet,
    }),
    [data, activeSetId],
  )

  return (
    <ExcelDemoContext.Provider value={value}>
      {children}
    </ExcelDemoContext.Provider>
  )
}

function useExcelDemo() {
  const ctx = useContext(ExcelDemoContext)
  if (!ctx)
    throw new Error('ExcelDemo components must be inside <ExcelDemoProvider>')
  return ctx
}

function colLetter(i: number): string {
  return String.fromCharCode(65 + i)
}

function findColIn(sheet: Sheet, name: string): number {
  return sheet.headers.findIndex((h) => h.toLowerCase() === name.toLowerCase())
}

function findSheet(data: ExcelData, id: string): Sheet | undefined {
  return data.sheets.find((s) => s.id === id)
}

/* ==================================================================
   Spreadsheet — Sheets-styled multi-sheet editable workbook
   ================================================================== */

type ActiveCell = { sheetId: string; row: number; col: number } | null

const MENU_ITEMS = [
  'File',
  'Edit',
  'View',
  'Insert',
  'Format',
  'Data',
  'Tools',
]

export function ExcelSpreadsheet() {
  const { data, setCell } = useExcelDemo()
  const [activeSheetId, setActiveSheetId] = useState<string>('owners')
  const [activeCell, setActiveCell] = useState<ActiveCell>({
    sheetId: 'owners',
    row: 0,
    col: 0,
  })

  const activeSheet = findSheet(data, activeSheetId) ?? data.sheets[0]

  const onActive = activeCell?.sheetId === activeSheet.id
  const cellRef = onActive
    ? `${colLetter(activeCell!.col)}${activeCell!.row + 2}`
    : ''
  const cellValue = onActive
    ? (activeSheet.rows[activeCell!.row]?.[activeCell!.col] ?? '')
    : ''

  const switchSheet = (id: string) => {
    setActiveSheetId(id)
    setActiveCell({ sheetId: id, row: 0, col: 0 })
  }

  const onFormulaChange = (value: string) => {
    if (onActive) {
      setCell(activeCell!.sheetId, activeCell!.row, activeCell!.col, value)
    }
  }

  return (
    <div className="exd">
      <div className="exd__head">
        <span className="exd__title">demo · spreadsheet</span>
        <span className="exd__hint">click any cell to edit</span>
      </div>
      <div className="gsheet">
        <div className="gsheet__title-bar">
          <span className="gsheet__doc-name">data-dictionary</span>
          <span className="gsheet__doc-sub">— rwe claims</span>
        </div>
        <div className="gsheet__menu" aria-hidden="true">
          {MENU_ITEMS.map((m) => (
            <span key={m} className="gsheet__menu-item">
              {m}
            </span>
          ))}
        </div>
        <div className="gsheet__formula">
          <span className="gsheet__cellref">{cellRef || '—'}</span>
          <span className="gsheet__fx" aria-hidden="true">
            fx
          </span>
          <input
            className="gsheet__formula-input"
            type="text"
            value={cellValue}
            onChange={(e) => onFormulaChange(e.target.value)}
            disabled={!onActive}
            spellCheck={false}
            aria-label="Cell content"
          />
        </div>
        <div className="gsheet__sheet">
          <EditableSheet
            sheet={activeSheet}
            activeCell={onActive ? activeCell : null}
            onSelect={(row, col) =>
              setActiveCell({ sheetId: activeSheet.id, row, col })
            }
            onSetCell={(row, col, value) =>
              setCell(activeSheet.id, row, col, value)
            }
          />
        </div>
        <div className="gsheet__tabs" role="tablist">
          <button
            className="gsheet__tab-add"
            type="button"
            aria-label="Add sheet (visual only)"
            tabIndex={-1}
          >
            +
          </button>
          {data.sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={activeSheetId === s.id}
              className={`gsheet__tab ${
                activeSheetId === s.id ? 'is-active' : ''
              }`}
              onClick={() => switchSheet(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ColLetters({ count }: { count: number }) {
  return (
    <tr>
      <th className="gsheet-grid__corner" />
      {Array.from({ length: count }).map((_, i) => (
        <th key={i} className="gsheet-grid__colhead">
          {colLetter(i)}
        </th>
      ))}
    </tr>
  )
}

function EditableSheet({
  sheet,
  activeCell,
  onSelect,
  onSetCell,
}: {
  sheet: Sheet
  activeCell: ActiveCell
  onSelect: (row: number, col: number) => void
  onSetCell: (row: number, col: number, value: string) => void
}) {
  return (
    <table className="gsheet-grid">
      <thead>
        <ColLetters count={sheet.headers.length} />
        <tr>
          <th className="gsheet-grid__rowhead">1</th>
          {sheet.headers.map((h, i) => (
            <td
              key={i}
              className="gsheet-grid__cell gsheet-grid__cell--head"
            >
              {h}
            </td>
          ))}
        </tr>
      </thead>
      <tbody>
        {sheet.rows.map((row, ri) => (
          <tr key={ri}>
            <th className="gsheet-grid__rowhead">{ri + 2}</th>
            {row.map((cell, ci) => {
              const isActive =
                activeCell?.row === ri && activeCell?.col === ci
              return (
                <td
                  key={ci}
                  className={`gsheet-grid__cell ${isActive ? 'is-active' : ''}`}
                >
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => onSetCell(ri, ci, e.target.value)}
                    onFocus={() => onSelect(ri, ci)}
                    spellCheck={false}
                    aria-label={`${sheet.headers[ci]} for row ${ri + 1}`}
                  />
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ==================================================================
   Markdown output — one section per sheet
   ================================================================== */

function tableMarkdown(headers: string[], rows: string[][]): string {
  const widths = headers.map((h, i) => {
    let max = h.length
    for (const row of rows) {
      const len = (row[i] ?? '').length
      if (len > max) max = len
    }
    return Math.max(3, max)
  })
  const pad = (s: string, w: number) => s + ' '.repeat(Math.max(0, w - s.length))

  const lines: string[] = []
  lines.push(
    '| ' + headers.map((h, i) => pad(h, widths[i])).join(' | ') + ' |',
  )
  lines.push('| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |')
  for (const row of rows) {
    const cells = row.map((c, i) =>
      pad((c ?? '').trim() === '' ? ' '.repeat(widths[i]) : c, widths[i]),
    )
    lines.push('| ' + cells.join(' | ') + ' |')
  }
  return lines.join('\n')
}

function toMarkdown(data: ExcelData): string {
  const sections: string[] = []
  for (const sheet of data.sheets) {
    sections.push(`## ${sheet.name}`, '')
    sections.push(tableMarkdown(sheet.headers, sheet.rows))
    sections.push('')
  }
  return sections.join('\n').trimEnd()
}

export function ExcelMarkdown() {
  const { data } = useExcelDemo()
  const md = useMemo(() => toMarkdown(data), [data])

  return (
    <div className="exd">
      <div className="exd__head">
        <span className="exd__title">demo · markdown output</span>
        <span className="exd__live">
          <span className="exd__live-dot" aria-hidden="true" />
          live
        </span>
      </div>
      <pre className="exd-md">{md}</pre>
    </div>
  )
}

/* ==================================================================
   Rules — each rule targets a specific sheet
   ================================================================== */

type RuleResult = {
  passed: boolean
  failures: { reason: string; rowIndex?: number }[]
}

type RuleParam = {
  min: number
  max: number
  default: number
  step?: number
}

type Rule = {
  id: string
  sheetId: string
  describe: (paramValue?: number) => string
  param?: RuleParam
  check: (sheet: Sheet, paramValue?: number) => RuleResult
}

type RuleSet = {
  id: string
  name: string
  description: string
  ruleIds: string[]
}

const VALID_TYPES = new Set([
  'string',
  'integer',
  'decimal',
  'date',
  'enum',
  'boolean',
])
const VALID_NOTE_TYPES = new Set(['mapping', 'caveat', 'fix', 'todo'])
const VALID_ROLES = new Set(['lead', 'engineer', 'manager', 'designer'])

function rowName(sheet: Sheet, ri: number): string {
  // Try first column as a label; fall back to the spreadsheet row number.
  const v = (sheet.rows[ri]?.[0] ?? '').trim()
  return v || `row ${ri + 2}`
}

const ALL_RULES: Record<string, Rule> = {
  /* ---------- owners.rule ---------- */
  'owner-name-set': {
    id: 'owner-name-set',
    sheetId: 'owners',
    describe: () => 'Every row has an owner name',
    check: (sheet) => {
      const col = findColIn(sheet, 'owner')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: row[col] ?? '' }))
        .filter((r) => r.value.trim() === '')
        .map((r) => ({ rowIndex: r.ri, reason: `Row ${r.ri + 2} has no owner name` }))
      return { passed: failures.length === 0, failures }
    },
  },
  'role-set': {
    id: 'role-set',
    sheetId: 'owners',
    describe: () => 'Every owner has a role',
    check: (sheet) => {
      const col = findColIn(sheet, 'role')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: row[col] ?? '' }))
        .filter((r) => r.value.trim() === '')
        .map((r) => ({ rowIndex: r.ri, reason: `${rowName(sheet, r.ri)} has no role` }))
      return { passed: failures.length === 0, failures }
    },
  },
  'role-enum': {
    id: 'role-enum',
    sheetId: 'owners',
    describe: () => 'Role is one of: lead, engineer, manager, designer',
    check: (sheet) => {
      const col = findColIn(sheet, 'role')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({
          ri,
          value: (row[col] ?? '').toLowerCase().trim(),
        }))
        .filter((r) => r.value !== '' && !VALID_ROLES.has(r.value))
        .map((r) => ({
          rowIndex: r.ri,
          reason: `${rowName(sheet, r.ri)}: "${r.value}" is not a recognized role`,
        }))
      return { passed: failures.length === 0, failures }
    },
  },

  /* ---------- schema.rule ---------- */
  'schema-type-set': {
    id: 'schema-type-set',
    sheetId: 'schema',
    describe: () => 'Every column has a type',
    check: (sheet) => {
      const col = findColIn(sheet, 'type')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: row[col] ?? '' }))
        .filter((r) => r.value.trim() === '')
        .map((r) => ({ rowIndex: r.ri, reason: `${rowName(sheet, r.ri)} has no type` }))
      return { passed: failures.length === 0, failures }
    },
  },
  'schema-type-enum': {
    id: 'schema-type-enum',
    sheetId: 'schema',
    describe: () =>
      'Type is one of: string, integer, decimal, date, enum, boolean',
    check: (sheet) => {
      const col = findColIn(sheet, 'type')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({
          ri,
          value: (row[col] ?? '').toLowerCase().trim(),
        }))
        .filter((r) => r.value !== '' && !VALID_TYPES.has(r.value))
        .map((r) => ({
          rowIndex: r.ri,
          reason: `${rowName(sheet, r.ri)}: "${r.value}" is not a recognized type`,
        }))
      return { passed: failures.length === 0, failures }
    },
  },
  'schema-raw-set': {
    id: 'schema-raw-set',
    sheetId: 'schema',
    describe: () => 'Every column has a raw mapping',
    check: (sheet) => {
      const col = findColIn(sheet, 'raw')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: row[col] ?? '' }))
        .filter((r) => r.value.trim() === '')
        .map((r) => ({
          rowIndex: r.ri,
          reason: `${rowName(sheet, r.ri)} has no raw mapping`,
        }))
      return { passed: failures.length === 0, failures }
    },
  },
  'schema-raw-format': {
    id: 'schema-raw-format',
    sheetId: 'schema',
    describe: () => 'Raw mappings are uppercase (A–Z, 0–9, _)',
    check: (sheet) => {
      const col = findColIn(sheet, 'raw')
      if (col < 0) return { passed: true, failures: [] }
      const re = /^[A-Z0-9_]+$/
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: (row[col] ?? '').trim() }))
        .filter((r) => r.value !== '' && !re.test(r.value))
        .map((r) => ({
          rowIndex: r.ri,
          reason: `${rowName(sheet, r.ri)}: "${r.value}" is not all-caps`,
        }))
      return { passed: failures.length === 0, failures }
    },
  },
  'schema-unique-cols': {
    id: 'schema-unique-cols',
    sheetId: 'schema',
    describe: () => '(Table, Name) pairs are unique',
    check: (sheet) => {
      const tcol = findColIn(sheet, 'table')
      const ncol = findColIn(sheet, 'name')
      if (tcol < 0 || ncol < 0) return { passed: true, failures: [] }
      const seen = new Map<string, number[]>()
      sheet.rows.forEach((row, ri) => {
        const t = (row[tcol] ?? '').trim()
        const n = (row[ncol] ?? '').trim()
        if (!t || !n) return
        const key = `${t}.${n}`
        if (!seen.has(key)) seen.set(key, [])
        seen.get(key)!.push(ri)
      })
      const failures: { reason: string; rowIndex?: number }[] = []
      for (const [key, rows] of seen) {
        if (rows.length > 1) {
          for (const ri of rows) {
            const others = rows
              .filter((r) => r !== ri)
              .map((r) => r + 2)
              .join(', ')
            failures.push({
              rowIndex: ri,
              reason: `Duplicate (${key}) — also row${
                rows.length > 2 ? 's' : ''
              } ${others}`,
            })
          }
        }
      }
      return { passed: failures.length === 0, failures }
    },
  },

  /* ---------- notes.rule ---------- */
  'note-date-set': {
    id: 'note-date-set',
    sheetId: 'notes',
    describe: () => 'Every note has a date',
    check: (sheet) => {
      const col = findColIn(sheet, 'date')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: row[col] ?? '' }))
        .filter((r) => r.value.trim() === '')
        .map((r) => ({ rowIndex: r.ri, reason: `Row ${r.ri + 2} has no date` }))
      return { passed: failures.length === 0, failures }
    },
  },
  'note-date-format': {
    id: 'note-date-format',
    sheetId: 'notes',
    describe: () => 'Dates are in YYYY-MM-DD format',
    check: (sheet) => {
      const col = findColIn(sheet, 'date')
      if (col < 0) return { passed: true, failures: [] }
      const re = /^\d{4}-\d{2}-\d{2}$/
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: (row[col] ?? '').trim() }))
        .filter((r) => r.value !== '' && !re.test(r.value))
        .map((r) => ({
          rowIndex: r.ri,
          reason: `Row ${r.ri + 2}: "${r.value}" is not YYYY-MM-DD`,
        }))
      return { passed: failures.length === 0, failures }
    },
  },
  'note-date-us': {
    id: 'note-date-us',
    sheetId: 'notes',
    describe: () => 'Dates are in MM/DD/YYYY format',
    check: (sheet) => {
      const col = findColIn(sheet, 'date')
      if (col < 0) return { passed: true, failures: [] }
      const re = /^\d{2}\/\d{2}\/\d{4}$/
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: (row[col] ?? '').trim() }))
        .filter((r) => r.value !== '' && !re.test(r.value))
        .map((r) => ({
          rowIndex: r.ri,
          reason: `Row ${r.ri + 2}: "${r.value}" is not MM/DD/YYYY`,
        }))
      return { passed: failures.length === 0, failures }
    },
  },
  'note-type-enum': {
    id: 'note-type-enum',
    sheetId: 'notes',
    describe: () => 'Type is one of: mapping, caveat, fix, todo',
    check: (sheet) => {
      const col = findColIn(sheet, 'type')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({
          ri,
          value: (row[col] ?? '').toLowerCase().trim(),
        }))
        .filter((r) => !VALID_NOTE_TYPES.has(r.value))
        .map((r) => ({
          rowIndex: r.ri,
          reason:
            r.value === ''
              ? `Row ${r.ri + 2} has no type`
              : `Row ${r.ri + 2}: "${r.value}" is not a recognized type`,
        }))
      return { passed: failures.length === 0, failures }
    },
  },
  'note-source-set': {
    id: 'note-source-set',
    sheetId: 'notes',
    describe: () => 'Every note has a source',
    check: (sheet) => {
      const col = findColIn(sheet, 'source')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: row[col] ?? '' }))
        .filter((r) => r.value.trim() === '')
        .map((r) => ({ rowIndex: r.ri, reason: `Row ${r.ri + 2} has no source` }))
      return { passed: failures.length === 0, failures }
    },
  },
  'note-text-set': {
    id: 'note-text-set',
    sheetId: 'notes',
    describe: () => 'Every note has text',
    check: (sheet) => {
      const col = findColIn(sheet, 'note')
      if (col < 0) return { passed: true, failures: [] }
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: row[col] ?? '' }))
        .filter((r) => r.value.trim() === '')
        .map((r) => ({ rowIndex: r.ri, reason: `Row ${r.ri + 2} has no note text` }))
      return { passed: failures.length === 0, failures }
    },
  },
  'note-min-length': {
    id: 'note-min-length',
    sheetId: 'notes',
    describe: (n) => `Note text is at least ${n ?? 10} characters`,
    param: { min: 0, max: 80, default: 10, step: 1 },
    check: (sheet, n) => {
      const col = findColIn(sheet, 'note')
      if (col < 0) return { passed: true, failures: [] }
      const minN = n ?? 0
      const failures = sheet.rows
        .map((row, ri) => ({ ri, value: (row[col] ?? '').trim() }))
        .filter((r) => r.value.length > 0 && r.value.length < minN)
        .map((r) => ({
          rowIndex: r.ri,
          reason: `Row ${r.ri + 2}: note is ${r.value.length} chars (min ${minN})`,
        }))
      return { passed: failures.length === 0, failures }
    },
  },
}

const RULE_SETS: RuleSet[] = [
  {
    id: 'client1',
    name: 'Client1.rules',
    description: 'ISO dates, complete typing, sourced notes.',
    ruleIds: [
      'owner-name-set',
      'role-set',
      'role-enum',
      'schema-type-set',
      'schema-type-enum',
      'note-date-set',
      'note-date-format',
      'note-source-set',
      'note-min-length',
    ],
  },
  {
    id: 'client2',
    name: 'Client2.rules',
    description: 'US dates, clean raw mappings, no duplicate columns.',
    ruleIds: [
      'owner-name-set',
      'schema-raw-set',
      'schema-raw-format',
      'schema-unique-cols',
      'note-date-set',
      'note-date-us',
      'note-text-set',
    ],
  },
]

/* ==================================================================
   Live report — rule-file selector + active rule list + annotated
   markdown. The rule-file dropdown lives here (was a separate QC
   parser block). Same line-by-line builder as the .md output so
   the report is the artifact, annotated.
   ================================================================== */

type ReportLine = {
  text: string
  sheetId?: string
  rowIndex?: number
  reasons?: string[]
}

function buildReportLines(
  data: ExcelData,
  issuesByRow: Map<string, string[]>,
): ReportLine[] {
  const lines: ReportLine[] = []
  for (const sheet of data.sheets) {
    lines.push({ text: `## ${sheet.name}` })
    lines.push({ text: '' })

    const widths = sheet.headers.map((h, i) => {
      let max = h.length
      for (const row of sheet.rows) {
        const len = (row[i] ?? '').length
        if (len > max) max = len
      }
      return Math.max(3, max)
    })
    const pad = (s: string, w: number) =>
      s + ' '.repeat(Math.max(0, w - s.length))

    lines.push({
      text:
        '| ' +
        sheet.headers.map((h, i) => pad(h, widths[i])).join(' | ') +
        ' |',
    })
    lines.push({
      text: '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |',
    })

    for (let ri = 0; ri < sheet.rows.length; ri++) {
      const row = sheet.rows[ri]
      const cells = row.map((c, i) =>
        pad(
          (c ?? '').trim() === '' ? ' '.repeat(widths[i]) : c,
          widths[i],
        ),
      )
      const text = '| ' + cells.join(' | ') + ' |'
      const key = `${sheet.id}:${ri}`
      const reasons = issuesByRow.get(key)
      lines.push({ text, sheetId: sheet.id, rowIndex: ri, reasons })
    }
    lines.push({ text: '' })
  }
  return lines
}

export function ExcelReport() {
  const { data, activeSetId, setActiveSet } = useExcelDemo()

  const activeSet =
    RULE_SETS.find((s) => s.id === activeSetId) ?? RULE_SETS[0]

  const checks = useMemo(() => {
    return activeSet.ruleIds
      .map((ruleId) => {
        const rule = ALL_RULES[ruleId]
        if (!rule) return null
        const sheet = findSheet(data, rule.sheetId)
        if (!sheet) return null
        const result = rule.check(sheet, rule.param?.default)
        return { rule, result }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
  }, [data, activeSet])

  const issuesByRow = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const { rule, result } of checks) {
      for (const f of result.failures) {
        if (f.rowIndex === undefined) continue
        const key = `${rule.sheetId}:${f.rowIndex}`
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(f.reason)
      }
    }
    return map
  }, [checks])

  const lines = useMemo(
    () => buildReportLines(data, issuesByRow),
    [data, issuesByRow],
  )

  const passing = checks.filter((c) => c.result.passed).length
  const total = checks.length
  const issuesFound = total - passing
  const totalPct = total > 0 ? Math.round((passing / total) * 100) : 100
  const allClean = total > 0 && issuesFound === 0
  const empty = total === 0

  return (
    <div className="exd">
      <div className="exd__head">
        <span className="exd__title">demo · live report</span>
        <span className="exd__count">
          {empty ? '— no rules' : `${passing} / ${total} pass · ${totalPct}%`}
        </span>
      </div>
      <div className="exd-report">
        <div className="exd-report__set-row">
          <label className="exd-report__set-label">
            <span>rules</span>
            <select
              className="exd-report__set-select"
              value={activeSetId}
              onChange={(e) => setActiveSet(e.target.value)}
            >
              {RULE_SETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <span className="exd-report__set-desc">{activeSet.description}</span>
        </div>

        <div className="exd-report__rule-list">
          <span className="exd-report__rule-list-label">applying</span>
          <span className="exd-report__rule-list-items">
            {activeSet.ruleIds.map((id, i) => (
              <span key={id} className="exd-report__rule-item">
                <code>{id}</code>
                {i < activeSet.ruleIds.length - 1 && ', '}
              </span>
            ))}
          </span>
        </div>

        <div
          className={`exd-report__banner ${
            empty ? 'is-empty' : allClean ? 'is-clean' : 'is-issues'
          }`}
          role="status"
          aria-live="polite"
        >
          <span className="exd-report__banner-icon" aria-hidden="true">
            {empty ? '–' : allClean ? '✓' : '!'}
          </span>
          <div className="exd-report__banner-text">
            <span className="exd-report__banner-headline">
              {empty
                ? 'No rules in active file'
                : allClean
                  ? 'All checks passed'
                  : `${issuesFound} issue${
                      issuesFound === 1 ? '' : 's'
                    } found`}
            </span>
            <span className="exd-report__banner-sub">
              running {activeSet.name} · {passing} of {total} rules passing
            </span>
          </div>
          <div className="exd-report__banner-pct">{totalPct}%</div>
        </div>

        <div className="exd-report__md" role="region" aria-label="annotated markdown">
          {lines.map((line, i) => {
            const hasIssues = !!line.reasons && line.reasons.length > 0
            return (
              <div
                key={i}
                className={`exd-report__md-line ${hasIssues ? 'is-issue' : ''}`}
              >
                <span className="exd-report__md-text">
                  {line.text || ' '}
                </span>
                {hasIssues && (
                  <ul
                    className="exd-report__md-reasons"
                    aria-label="issues on this row"
                  >
                    {line.reasons!.map((r, j) => (
                      <li key={j}>↳ {r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ==================================================================
   Slideshow — a presentation built from the same workbook
   ================================================================== */

type SchemaColumn = { name: string; raw: string; type: string }
type TypeBreakdown = { type: string; count: number }
type OwnerEntry = { name: string; role: string }

type Slide =
  | {
      type: 'title'
      eyebrow: string
      headline: string
      sub: string
      tags: string[]
      typeDistribution: TypeBreakdown[]
    }
  | {
      type: 'owners'
      step: number
      total: number
      named: OwnerEntry[]
      totalRows: number
    }
  | {
      type: 'concept'
      step: number
      total: number
      sample: { table: string; name: string; raw: string; type: string }
    }
  | {
      type: 'tables'
      step: number
      total: number
      tables: {
        name: string
        columnCount: number
        description: string
        typeBreakdown: TypeBreakdown[]
        complete: number
      }[]
    }
  | {
      type: 'table'
      step: number
      total: number
      tableName: string
      description: string
      columns: SchemaColumn[]
      typeBreakdown: TypeBreakdown[]
      complete: number
    }

const TABLE_DESCRIPTIONS: Record<string, string> = {
  claims: 'Billed encounters — one row per claim line.',
  members: 'Patient enrollment — one row per covered life.',
  providers: 'Billing entities — one row per practitioner.',
}

function computeTypeBreakdown(columns: SchemaColumn[]): TypeBreakdown[] {
  const counts = new Map<string, number>()
  for (const c of columns) {
    if (!c.type) continue
    counts.set(c.type, (counts.get(c.type) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
}

function countComplete(columns: SchemaColumn[]): number {
  // A "complete" column has all three pieces — name, raw, type.
  return columns.filter((c) => c.name && c.raw && c.type).length
}

function buildSlides(data: ExcelData): Slide[] {
  const schema = findSheet(data, 'schema')
  const owners = findSheet(data, 'owners')

  const tCol = schema ? findColIn(schema, 'table') : -1
  const nCol = schema ? findColIn(schema, 'name') : -1
  const rCol = schema ? findColIn(schema, 'raw') : -1
  const typeCol = schema ? findColIn(schema, 'type') : -1

  const grouped = new Map<string, SchemaColumn[]>()
  const allColumns: SchemaColumn[] = []
  if (schema && tCol >= 0) {
    for (const row of schema.rows) {
      const t = (row[tCol] ?? '').trim()
      if (!t) continue
      const col: SchemaColumn = {
        name: (row[nCol] ?? '').trim(),
        raw: (row[rCol] ?? '').trim(),
        type: (row[typeCol] ?? '').trim(),
      }
      if (!grouped.has(t)) grouped.set(t, [])
      grouped.get(t)!.push(col)
      allColumns.push(col)
    }
  }
  const tables = Array.from(grouped.entries())
  const overallTypeDist = computeTypeBreakdown(allColumns)

  // Owners — every named contributor on the dictionary, pulled live.
  const ownerCol = owners ? findColIn(owners, 'owner') : -1
  const roleCol = owners ? findColIn(owners, 'role') : -1
  const named: OwnerEntry[] = owners
    ? owners.rows
        .map((r) => ({
          name: (r[ownerCol] ?? '').trim(),
          role: (r[roleCol] ?? '').trim(),
        }))
        .filter((o) => o.name !== '')
    : []
  const totalOwnerRows = owners?.rows.length ?? 0

  // Pick a clean sample row from claims for the concept slide.
  const firstRow = schema?.rows[0]
  const sample = firstRow
    ? {
        table: (firstRow[tCol] ?? 'claims').trim() || 'claims',
        name: (firstRow[nCol] ?? 'claim_id').trim() || 'claim_id',
        raw: (firstRow[rCol] ?? 'CLM_ID').trim() || 'CLM_ID',
        type: (firstRow[typeCol] ?? 'string').trim() || 'string',
      }
    : { table: 'claims', name: 'claim_id', raw: 'CLM_ID', type: 'string' }

  const totalCols = allColumns.length

  const slides: Slide[] = [
    {
      type: 'title',
      eyebrow: 'data dictionary · q2 2026',
      headline: 'Understanding the schema',
      sub: 'A short walkthrough of the workbook — who maintains it, what a row looks like, and what lives in each table.',
      tags: [
        `${totalCols} columns`,
        `${tables.length} table${tables.length === 1 ? '' : 's'}`,
        `${named.length} owner${named.length === 1 ? '' : 's'}`,
      ],
      typeDistribution: overallTypeDist,
    },
    {
      type: 'owners',
      step: 0,
      total: 0,
      named,
      totalRows: totalOwnerRows,
    },
    { type: 'concept', step: 0, total: 0, sample },
    {
      type: 'tables',
      step: 0,
      total: 0,
      tables: tables.map(([name, cols]) => ({
        name,
        columnCount: cols.length,
        description: TABLE_DESCRIPTIONS[name] ?? '—',
        typeBreakdown: computeTypeBreakdown(cols),
        complete: countComplete(cols),
      })),
    },
    ...tables.map(
      ([tableName, columns]): Slide => ({
        type: 'table',
        step: 0,
        total: 0,
        tableName,
        description: TABLE_DESCRIPTIONS[tableName] ?? '',
        columns,
        typeBreakdown: computeTypeBreakdown(columns),
        complete: countComplete(columns),
      }),
    ),
  ]

  // Stamp step/total on every non-title slide so eyebrows can show "step 02 of 06".
  const nonTitle = slides.filter((s) => s.type !== 'title')
  let i = 0
  for (const s of slides) {
    if (s.type !== 'title') {
      i += 1
      s.step = i
      s.total = nonTitle.length
    }
  }

  return slides
}

export function ExcelSlideshow() {
  const { data } = useExcelDemo()
  const [slideIdx, setSlideIdx] = useState(0)

  const slides = useMemo(() => buildSlides(data), [data])

  // Clamp if slides change underfoot (unlikely but defensive)
  useEffect(() => {
    if (slideIdx >= slides.length) setSlideIdx(slides.length - 1)
  }, [slides.length, slideIdx])

  // Keyboard navigation — arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when the user is typing in an input/textarea
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') {
        setSlideIdx((i) => Math.min(slides.length - 1, i + 1))
      } else if (e.key === 'ArrowLeft') {
        setSlideIdx((i) => Math.max(0, i - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  const goPrev = () => setSlideIdx((i) => Math.max(0, i - 1))
  const goNext = () =>
    setSlideIdx((i) => Math.min(slides.length - 1, i + 1))

  return (
    <div className="exd">
      <div className="exd__head">
        <span className="exd__title">demo · slideshow</span>
        <span className="exd__head-meta">
          <span className="exd__live" aria-label="Live data from the workbook">
            <span className="exd__live-dot" aria-hidden="true" />
            live
          </span>
          <span className="exd__count">
            {slideIdx + 1} / {slides.length}
          </span>
        </span>
      </div>
      <div className="slide-deck">
        <div className="slide-deck__chrome">
          <div className="slide-deck__chrome-brand">
            <span className="slide-deck__chrome-icon" aria-hidden="true">
              ▣
            </span>
            <span className="slide-deck__chrome-name">
              Understanding the schema
            </span>
            <span className="slide-deck__chrome-folder">— Drive</span>
          </div>
          <div className="slide-deck__chrome-menu" aria-hidden="true">
            <span>File</span>
            <span>Edit</span>
            <span>View</span>
            <span>Insert</span>
            <span>Slide</span>
            <span>Format</span>
          </div>
          <button
            type="button"
            className="slide-deck__chrome-present"
            aria-label="Present (visual only)"
            tabIndex={-1}
          >
            <span aria-hidden="true">▶</span> Present
          </button>
        </div>
        <div className="slide-deck__toolbar" aria-hidden="true">
          <span className="slide-deck__tool">↶</span>
          <span className="slide-deck__tool">↷</span>
          <span className="slide-deck__tool-sep" />
          <span className="slide-deck__tool">+</span>
          <span className="slide-deck__tool">Aa</span>
          <span className="slide-deck__tool">▢</span>
          <span className="slide-deck__tool">○</span>
          <span className="slide-deck__tool">／</span>
          <span className="slide-deck__tool-sep" />
          <span className="slide-deck__tool">⤡</span>
        </div>
        <div className="slide-deck__stage">
          <div className="slide-deck__canvas">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIdx}
                className="slide-deck__slide-wrap"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.34, ease: [0.65, 0, 0.35, 1] }}
              >
                <SlideRenderer slide={slides[slideIdx]} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <div className="slide-deck__controls">
          <button
            type="button"
            className="slide-deck__btn"
            onClick={goPrev}
            disabled={slideIdx === 0}
          >
            ← Prev
          </button>
          <span className="slide-deck__counter">
            {slideIdx + 1} of {slides.length}
          </span>
          <div className="slide-deck__dots" role="tablist">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === slideIdx}
                className={`slide-deck__dot ${
                  i === slideIdx ? 'is-active' : ''
                }`}
                onClick={() => setSlideIdx(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            className="slide-deck__btn"
            onClick={goNext}
            disabled={slideIdx === slides.length - 1}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

function SlideRenderer({ slide }: { slide: Slide }) {
  switch (slide.type) {
    case 'title':
      return (
        <div className="slide slide--title">
          <span className="slide__eyebrow">{slide.eyebrow}</span>
          <h2 className="slide__headline">{slide.headline}</h2>
          <p className="slide__sub">{slide.sub}</p>
          <div className="slide__tags">
            {slide.tags.map((t, i) => (
              <span key={i} className="slide__tag">
                {t}
              </span>
            ))}
          </div>
          {slide.typeDistribution.length > 0 && (
            <TypeBar items={slide.typeDistribution} />
          )}
        </div>
      )
    case 'owners':
      return <OwnersSlide {...slide} />
    case 'concept':
      return <ConceptSlide {...slide} />
    case 'tables':
      return <TablesOverviewSlide {...slide} />
    case 'table':
      return <TableSlide {...slide} />
  }
}

function TypeBar({ items }: { items: TypeBreakdown[] }) {
  const total = items.reduce((sum, x) => sum + x.count, 0)
  if (total === 0) return null
  return (
    <div className="slide__typebar">
      <div className="slide__typebar-track" aria-hidden="true">
        {items.map((it, i) => (
          <span
            key={i}
            className={`slide__typebar-seg slide__typebar-seg--${it.type}`}
            style={{ width: `${(it.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="slide__typebar-legend">
        {items.map((it, i) => (
          <li key={i} className="slide__typebar-legend-item">
            <span
              className={`slide__typebar-dot slide__typebar-dot--${it.type}`}
              aria-hidden="true"
            />
            <span className="slide__typebar-legend-count">{it.count}</span>
            <span className="slide__typebar-legend-type">{it.type}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function OwnersSlide({
  step,
  total,
  named,
  totalRows,
}: {
  step: number
  total: number
  named: OwnerEntry[]
  totalRows: number
}) {
  const blank = totalRows - named.length
  return (
    <div className="slide">
      <span className="slide__eyebrow">{stepEyebrow(step, total, 'team')}</span>
      <h2 className="slide__headline">Who owns this dictionary</h2>
      <p className="slide__sub">
        {named.length > 0
          ? `${named.length} contributor${named.length === 1 ? '' : 's'} maintain${
              named.length === 1 ? 's' : ''
            } the workbook live.`
          : 'No contributors are listed yet.'}
        {blank > 0 && (
          <span className="slide__sub-meta">
            {blank} unfilled row{blank === 1 ? '' : 's'}
          </span>
        )}
      </p>
      {named.length > 0 && (
        <ul className="slide__owner-cards">
          {named.map((o, i) => (
            <li key={i} className="slide__owner-card">
              <div className="slide__owner-avatar" aria-hidden="true">
                {(o.name[0] ?? '?').toUpperCase()}
              </div>
              <div className="slide__owner-text">
                <div className="slide__owner-name">{o.name}</div>
                <div className="slide__owner-role">
                  {o.role || 'no role assigned'}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function stepEyebrow(step: number, total: number, label?: string): string {
  const tag = `Step ${String(step).padStart(2, '0')} of ${String(total).padStart(2, '0')}`
  return label ? `${tag} · ${label}` : tag
}

function ConceptSlide({
  step,
  total,
  sample,
}: {
  step: number
  total: number
  sample: { table: string; name: string; raw: string; type: string }
}) {
  const parts: { value: string; label: string; desc: string }[] = [
    { value: sample.table, label: 'table', desc: 'the source table' },
    { value: sample.name, label: 'name', desc: 'canonical name' },
    { value: sample.raw, label: 'raw', desc: "partner's label" },
    { value: sample.type, label: 'type', desc: 'expected shape' },
  ]
  return (
    <div className="slide">
      <span className="slide__eyebrow">{stepEyebrow(step, total, 'concept')}</span>
      <h2 className="slide__headline">Anatomy of a row</h2>
      <p className="slide__sub">
        Every row maps a column from the source feed to a typed, named field.
      </p>
      <div className="slide__anatomy">
        <div className="slide__anatomy-row">
          {parts.map((p, i) => (
            <div key={i} className="slide__anatomy-col">
              <div className="slide__anatomy-value">{p.value}</div>
              <div className="slide__anatomy-arrow" aria-hidden="true">↑</div>
              <div className="slide__anatomy-label">{p.label}</div>
              <div className="slide__anatomy-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TablesOverviewSlide({
  step,
  total,
  tables,
}: {
  step: number
  total: number
  tables: {
    name: string
    columnCount: number
    description: string
    typeBreakdown: TypeBreakdown[]
    complete: number
  }[]
}) {
  return (
    <div className="slide">
      <span className="slide__eyebrow">
        {stepEyebrow(step, total, 'tables')}
      </span>
      <h2 className="slide__headline">
        {tables.length} table{tables.length === 1 ? '' : 's'} in the workbook
      </h2>
      <p className="slide__sub">
        Each one describes a different shape of data. The counts on each card
        are pulled live from the workbook.
      </p>
      <div className="slide__table-cards">
        {tables.map((t) => (
          <div key={t.name} className="slide__table-card">
            <div className="slide__table-card-name">{t.name}</div>
            <div className="slide__table-card-count">
              {t.columnCount} column{t.columnCount === 1 ? '' : 's'} ·{' '}
              {t.complete}/{t.columnCount} complete
            </div>
            <div className="slide__table-card-desc">{t.description}</div>
            {t.typeBreakdown.length > 0 && (
              <div className="slide__table-card-types">
                {t.typeBreakdown.map((b, i) => (
                  <span
                    key={i}
                    className={`slide__type-chip slide__type-chip--${b.type}`}
                  >
                    <span className="slide__type-chip-count">{b.count}</span>
                    <span className="slide__type-chip-type">{b.type}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TableSlide({
  step,
  total,
  tableName,
  description,
  columns,
  typeBreakdown,
  complete,
}: {
  step: number
  total: number
  tableName: string
  description: string
  columns: SchemaColumn[]
  typeBreakdown: TypeBreakdown[]
  complete: number
}) {
  return (
    <div className="slide">
      <span className="slide__eyebrow">
        {stepEyebrow(step, total, 'table')}
      </span>
      <h2 className="slide__headline">{tableName}</h2>
      <p className="slide__sub">
        {description}{' '}
        <span className="slide__sub-meta">
          {columns.length} column{columns.length === 1 ? '' : 's'} ·{' '}
          {complete}/{columns.length} complete
        </span>
      </p>
      {typeBreakdown.length > 0 && (
        <div className="slide__table-types">
          {typeBreakdown.map((b, i) => (
            <span
              key={i}
              className={`slide__type-chip slide__type-chip--${b.type}`}
            >
              <span className="slide__type-chip-count">{b.count}</span>
              <span className="slide__type-chip-type">{b.type}</span>
            </span>
          ))}
        </div>
      )}
      <div className="slide__schema-list-wrap">
        <div className="slide__schema-head">
          <span>name</span>
          <span aria-hidden="true" />
          <span>raw</span>
          <span>type</span>
        </div>
        <ul className="slide__schema-list">
          {columns.map((c, i) => (
            <li key={i} className="slide__schema-row">
              <span className="slide__schema-name">{c.name || '—'}</span>
              <span className="slide__schema-arrow" aria-hidden="true">
                ←
              </span>
              <span className="slide__schema-raw">{c.raw || '—'}</span>
              <span className="slide__schema-type">{c.type || '—'}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

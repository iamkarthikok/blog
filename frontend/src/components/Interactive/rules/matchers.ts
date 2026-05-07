/**
 * Reusable markdown matchers shared across multiple rule files.
 * Anything specific to a single rule file lives inline in that file.
 */

import type { CheckFailure } from './engine'

/** A pipe-table separator line — `| --- | --- |` and friends. */
export function isTableSeparator(line: string): boolean {
  return /^\s*\|[\s|:-]+\|\s*$/.test(line)
}

/** Yield every data row in every pipe-table in the document. Skips
 *  the header row (above the separator) and the separator itself. */
export function* tableDataRows(
  lines: string[],
): Generator<{ line: number; cells: string[] }> {
  let inBody = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (isTableSeparator(line)) {
      inBody = true
      continue
    }
    if (!line.trim().startsWith('|')) {
      inBody = false
      continue
    }
    if (inBody) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      yield { line: i, cells }
    }
  }
}

/** Flag any line containing en-dash, em-dash, or smart quotes. */
export function matchCanonicalChars(lines: string[]): CheckFailure[] {
  const out: CheckFailure[] = []
  const re = /[–—""'']/
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      out.push({
        line: i,
        reason:
          'Line uses non-canonical punctuation (en-dash, em-dash, or smart quote).',
      })
    }
  }
  return out
}

/** Flag any pipe-table data row that has at least one empty cell. */
export function matchTableCellsFilled(lines: string[]): CheckFailure[] {
  const out: CheckFailure[] = []
  for (const { line, cells } of tableDataRows(lines)) {
    const empty = cells.filter((c) => c === '').length
    if (empty > 0) {
      out.push({
        line,
        reason: `Row has ${empty} empty cell${empty === 1 ? '' : 's'}.`,
      })
    }
  }
  return out
}

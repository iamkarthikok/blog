/**
 * Rule engine — types and the runner that scores a markdown document
 * against a rule file. The `match` function on each Check is the
 * extension point: it scans markdown lines and returns line-anchored
 * failures. Checks without a `match` are documentation-only.
 */

export type DocIssue = {
  /** 0-indexed line in the markdown that triggered the failure. */
  line: number
  /** Plain-language reason the line failed the check. */
  reason: string
  /** Concrete suggested fix the platform could apply. */
  suggestion: string
}

export type CheckCase = {
  input: string
  result: 'pass' | 'fail'
  reason?: string
}

/**
 * One per-line failure produced by a Check's `match` function. The
 * `suggestion` defaults to the Check's `suggestion` field — only set
 * it on the failure when the fix needs to mention the matched value
 * (e.g. "Pad to `09:02`").
 */
export type CheckFailure = {
  line: number
  reason: string
  suggestion?: string
}

export type Check = {
  id: string
  name: string
  description: string
  /** Default fix text shown alongside every failure of this check. */
  suggestion: string
  /** Illustrative pass/fail examples shown in the rule's detail view. */
  cases: CheckCase[]
  /**
   * Optional matcher run against the lines of a document's markdown.
   * Each returned `CheckFailure` becomes an inline annotation, with
   * the check's `suggestion` filled in unless the failure overrides
   * it. If `match` is omitted, the check is documentation-only — it
   * shows up in the rule file detail but doesn't contribute to
   * scoring.
   */
  match?: (lines: string[]) => CheckFailure[]
}

export type RuleFile = {
  id: string
  filename: string
  summary: string
  updated: string
  status: 'active' | 'draft'
  checks: Check[]
}

export type RuleResult = {
  passed: number
  total: number
  issues: DocIssue[]
}

/** Run the rule file's match-equipped checks against a document's markdown. */
export function runRuleFile(rule: RuleFile, markdown: string): RuleResult {
  const lines = markdown.split('\n')
  const applicable = rule.checks.filter((c) => c.match)
  const issues: DocIssue[] = []
  let passed = 0
  for (const check of applicable) {
    const failures = check.match!(lines)
    if (failures.length === 0) {
      passed += 1
    } else {
      for (const f of failures) {
        issues.push({
          line: f.line,
          reason: f.reason,
          suggestion: f.suggestion ?? check.suggestion,
        })
      }
    }
  }
  return { passed, total: applicable.length, issues }
}

export function scoreOf(d: { passed: number; total: number }): number {
  return d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0
}

export function tierOf(score: number): 'good' | 'ok' | 'low' {
  if (score >= 85) return 'good'
  if (score >= 70) return 'ok'
  return 'low'
}

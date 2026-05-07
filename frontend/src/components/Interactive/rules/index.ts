/**
 * Rule files + the engine that runs them, in one walkable directory.
 *
 *   engine.ts     types · runRuleFile · scoreOf · tierOf
 *   matchers.ts   reusable markdown matchers (canonical chars, table cells)
 *   client1.ts    Client1.rules
 *   client2.ts    Client2.rules
 *   jira.ts       jira.rule
 *   teams.ts      teams.rule
 *   gdocs.ts      gdocs.rule
 *   local.ts      local.rule
 *
 * Add a new rule file: drop it in this directory and append to RULES below.
 */

import type { RuleFile } from './engine'
import { client1 } from './client1'
import { client2 } from './client2'
import { jira } from './jira'
import { teams } from './teams'
import { gdocs } from './gdocs'
import { local } from './local'

export const RULES: RuleFile[] = [client1, client2, jira, teams, gdocs, local]

export type {
  CheckCase,
  Check,
  CheckFailure,
  DocIssue,
  RuleFile,
  RuleResult,
} from './engine'
export { runRuleFile, scoreOf, tierOf } from './engine'

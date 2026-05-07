import type { RuleFile } from './engine'

export const local: RuleFile = {
  id: 'local',
  filename: 'local.rule',
  summary:
    'File checks for documents living next to the code in the local repo.',
  updated: '5d',
  status: 'active',
  checks: [
    {
      id: 'local-extension',
      name: 'file.extension',
      description:
        'File extension is one of: .md, .mdx, .txt. Other formats need a different parser.',
      suggestion: 'Save the file with `.md`, `.mdx`, or `.txt`.',
      cases: [
        { input: '"README.md"', result: 'pass' },
        {
          input: '"config.json"',
          result: 'fail',
          reason: 'unsupported extension',
        },
      ],
    },
    {
      id: 'local-frontmatter',
      name: 'file.has_frontmatter',
      description:
        'Markdown files start with a `---` frontmatter block declaring slug, title, and date.',
      suggestion: 'Prepend a `---` block with `slug`, `title`, and `date`.',
      cases: [
        { input: '"---\\nslug: foo\\n---\\n# Foo"', result: 'pass' },
        {
          input: '"# Foo (no frontmatter)"',
          result: 'fail',
          reason: 'frontmatter missing',
        },
      ],
      match: (lines) => {
        if (lines[0]?.trim() === '---') return []
        return [
          {
            line: 0,
            reason:
              'File starts with content directly — no frontmatter declared.',
          },
        ]
      },
    },
    {
      id: 'local-naming',
      name: 'filename.kebab_case',
      description:
        'File names are lowercase kebab-case so they sort and link consistently.',
      suggestion: 'Rename the file to lowercase kebab-case (e.g. `sheets-qc.md`).',
      cases: [
        { input: '"sheets-qc.md"', result: 'pass' },
        {
          input: '"SheetsQC.md"',
          result: 'fail',
          reason: 'PascalCase, not kebab',
        },
      ],
    },
    {
      id: 'local-has-h1',
      name: 'doc.has_h1',
      description:
        'File body contains a top-level heading after the frontmatter.',
      suggestion: 'Add a `# Title` line after the frontmatter.',
      cases: [
        { input: '"# Title\\n…"', result: 'pass' },
        {
          input: '"## Subtitle\\n…"',
          result: 'fail',
          reason: 'no H1, only H2',
        },
      ],
      match: (lines) => {
        if (lines.some((l) => /^#\s/.test(l))) return []
        return [
          {
            line: 0,
            reason: 'No H1 heading found.',
          },
        ]
      },
    },
  ],
}

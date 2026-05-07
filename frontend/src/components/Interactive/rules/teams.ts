import type { CheckFailure, RuleFile } from './engine'

export const teams: RuleFile = {
  id: 'teams',
  filename: 'teams.rule',
  summary:
    'Format checks on Microsoft Teams threads ingested into the index.',
  updated: '12h',
  status: 'active',
  checks: [
    {
      id: 'teams-channel-prefix',
      name: 'channel.has_prefix',
      description: 'Channels are referenced with a leading #.',
      suggestion: 'Prefix the channel name with `#`.',
      cases: [
        { input: '"#data-pipeline"', result: 'pass' },
        {
          input: '"data-pipeline"',
          result: 'fail',
          reason: 'missing leading "#"',
        },
      ],
      match: (lines) => {
        const titleIdx = lines.findIndex((l) => /^#\s/.test(l))
        if (titleIdx < 0) return []
        const rest = lines[titleIdx].replace(/^#\s+/, '')
        if (rest.startsWith('#')) return []
        return [
          {
            line: titleIdx,
            reason: 'Channel reference is missing the leading `#`.',
          },
        ]
      },
    },
    {
      id: 'teams-message-author',
      name: 'message.has_author',
      description:
        "Every message has a non-empty author. Anonymous messages can't be threaded back to a person for follow-up.",
      suggestion: 'Attribute the message to a non-empty author.',
      cases: [
        { input: '{ who: "Alice", text: "ack" }', result: 'pass' },
        {
          input: '{ who: "", text: "ack" }',
          result: 'fail',
          reason: 'author empty',
        },
      ],
    },
    {
      id: 'teams-message-text',
      name: 'message.has_text',
      description: "Every message has body text — emoji-only doesn't count.",
      suggestion: 'Add body text to the message; emoji-only messages get dropped.',
      cases: [
        { input: '"looking now"', result: 'pass' },
        { input: '""', result: 'fail', reason: 'empty body' },
      ],
    },
    {
      id: 'teams-timestamp-format',
      name: 'timestamp.format',
      description:
        'Timestamps are HH:MM in 24-hour notation, matching the source feed.',
      suggestion: 'Pad single-digit hours with a leading zero (`HH:MM`).',
      cases: [
        { input: '"09:42"', result: 'pass' },
        { input: '"9:42 am"', result: 'fail', reason: 'wrong format' },
      ],
      match: (lines) => {
        const out: CheckFailure[] = []
        const re = /(?<![\d:])(\d):(\d{2})\b/g
        for (let i = 0; i < lines.length; i++) {
          let m
          while ((m = re.exec(lines[i])) !== null) {
            const padded = m[1].padStart(2, '0')
            out.push({
              line: i,
              reason: `Timestamp \`${m[1]}:${m[2]}\` lacks a leading zero — teams.rule expects HH:MM.`,
              suggestion: `Pad to \`${padded}:${m[2]}\`.`,
            })
          }
        }
        return out
      },
    },
    {
      id: 'teams-no-link-only',
      name: 'message.no_link_only',
      description:
        "A message can't be just a URL with no surrounding context — strip-it-and-paste isn't enough for downstream readers.",
      suggestion: 'Add context around the URL — what it is and why it matters.',
      cases: [
        { input: '"PR is up: https://…"', result: 'pass' },
        {
          input: '"https://example.com"',
          result: 'fail',
          reason: 'link with no context',
        },
      ],
    },
  ],
}

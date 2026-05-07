---
slug: sheets-qc
title: Applying a Guardrail
date: 2026-05-03
type: showcase
tags: code, project, interactive
summary: Basic rule features — client-scoped rule files and a live annotated-markdown report — applied to a Google Sheets workbook.
---

There were 2 initial goals for this section of the project: 
1) Ensure there was value from our existing corpus of documentation  
2) Quantify that value 

In order to accomplish these goals, I met with team members from multiple different departments to create rule sets that would provide the most information for a given situation and allow us to understand what was happening within a given document. 



```demo:spreadsheet
```

Above is a spreadsheet. It has editable fields that can be interacted with in order to validate agains the rules in the report below. 

By being able to both set and visualize rules within our documents, we were able to rapidly find and QC any outstanding issues. 

```demo:report
```

The two rule files, briefly:

- **Client1.rules** — strict typing on the schema, ISO dates (`YYYY-MM-DD`) on the change log, every note has a source, and a minimum length on note text. Owners must have a recognized role.
- **Client2.rules** — clean raw mappings (every column has one, all uppercase), unique `(table, name)` pairs, US dates (`MM/DD/YYYY`) on the change log, and every note must have body text.

The workbook above is intentionally messy — empty cells, mixed date formats, a duplicate column, an unknown role, lowercase raw mappings. The same workbook will look "passing" to one client and "failing" to the other depending on which rule file is active.

# Manual test cases

Read this before you write test cases for the owner to run by hand in the browser. One file per sprint,
`docs/testing/sprint-<n>-manual-test-cases.md`, holds every case of that sprint.

The layout follows the test case fields of ISO/IEC/IEEE 29119-3 (test documentation): identifier, objective,
preconditions, inputs, steps, expected results, postconditions, environment and traceability. Fields that a case
doesn't need stay out, as the common templates advise.

## The file

1. **Header.** Sprint, release, the stories covered, the branch or commit to test, and the date written.
2. **Before you start.** Everything every case needs once: how to run the app, the accounts and roles (one
   browser profile per role), seed data, how to switch language, desktop and phone widths, and SQL to look up
   ids. Cases don't repeat it.
3. **Summary table.** One row per case, used as the run sheet:

   | ID | Title | Story / AC | Priority | Result | Notes |
   |---|---|---|---|---|---|
   | S8-INV-01 | Set stock on a variant row | E6.3 / AC53 | P1 | ☐ Pass ☐ Fail ☐ Blocked | |

4. **Cases, grouped by feature** (A, B, C, ...), happy path first, then edge and negative cases.

## A case

```markdown
### S8-INV-01 Set stock on a variant row
- **Story / AC:** E6.3 / AC53
- **Priority:** P1 (must pass for sign-off) | P2 (should) | P3 (nice to check)
- **Role and device:** Owner, desktop 1280 px (or phone 375 px)
- **Preconditions:** a keepsake with 3 variants, all at stock 0.
- **Test data:** keepsake "Swiss Card Classic", variant "Red / Small".

| # | Step | Expected result |
|---|---|---|
| 1 | Open the keepsake, go to Variants. | Each row has a quantity box showing 0. |
| 2 | Type 5 in Red / Small and leave the box. | The box shows 5; no error. |
| 3 | Reload the page. | Red / Small still shows 5; the others show 0. |

- **Postconditions:** Red / Small has 5 in stock (later cases use it).
- **Result:** ☐ Pass ☐ Fail ☐ Blocked. Actual result, if failed:
```

## Rules

- **IDs** are `S<sprint>-<FEATURE>-<nn>` (for example `S8-PICKUP-03`). An ID never changes once the owner has
  run the file. A cut case keeps its ID and says "Removed".
- **One case checks one thing.** Its title says the behaviour, not the screen ("Stock below Reserved is refused",
  not "Inventory page").
- **One action per step, and each step has an observable expected result:** text on the screen, a toast, a
  value after reload, a network request, or a database row. Quote UI text exactly as the screen shows it, in
  English. Write "Expected" in concrete terms, never "works" or "looks right".
- **Traceability.** Every AC of the sprint's stories has at least one case, and the summary table shows the
  story and AC. A case with no AC says what it guards ("design decision 25").
- **Negative and edge cases** follow the happy path in each group: refusals, empty states, permissions (a role
  that may not do it), German, phone width, two tabs, reload, double click.
- **Data** comes from the seed or the case's own setup steps. A setup that writes to the database by hand is
  allowed only when the UI can't reach the state yet, and says so.
- **Priority:** P1 cases block the release sign-off. Mark at most a third of the cases P1.
- **Plain words.** The owner runs the file without the code open. Write through `technical-writing` and `unslop`.

## Sources

- ISO/IEC/IEEE 29119-3:2021, *Software and systems engineering, Software testing, Part 3: Test documentation*
  (clause 8, test case specification).
- Field summaries: tessl.io "test case anatomy reference"; TestLodge "Test case templates" (2026); Katalon
  "Manual test case template".

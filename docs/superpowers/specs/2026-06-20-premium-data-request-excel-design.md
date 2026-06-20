# Premium Data-Request Spreadsheet — Design

**Date:** 2026-06-20
**Status:** approved (design)

## Goal
Replace the raw, unstyled Excel data-request export (which "looks like a default export") with a clean, branded, **no-nonsense-but-designed** workbook — best-in-class *for a spreadsheet*, not a web app. A finance/HR/revenue-cycle reader should find it clear and trustworthy; it should never embarrass us next to the application. Driven entirely by the single canonical field list, and it must not break.

## Honest bar
A spreadsheet cannot and will not look like the web app — it's a grid of cells. The realistic ceiling is a clean, branded, deliberately-designed worksheet (think the data template a top consulting/finance firm sends a CFO). The premium *impression* is carried by the already-premium builder page + a designed cover tab; the data tab just needs to be clean, organized, and locked-down.

## Non-goals (explicitly out of scope)
- **Auto-load** (parsing the returned file back into the calculator) — cut; too fragile.
- The **web intake form** — leave as-is.
- The **data-request builder page** — keep; it's already premium.
- **Measure's** before/after data request — separate; may adopt this pattern later.

## Canonical field model
- `client/src/lib/dataRequestFields.ts` remains the single source of truth (already drives the builder page).
- Add an **`owner`** to each field: `'Finance' | 'HR' | 'Revenue Cycle' | 'Operations' | 'Clinical' | 'General'`, derived from the existing freeform `who` text. Used to group the sheet by who fills each number (matches the confirmed reality: the request is forwarded across departments).
- No new duplicate field lists.

## The workbook (ExcelJS)
Switch the generator from SheetJS (`xlsx`, which **cannot style cells** — the root cause of the ugly grid) to **ExcelJS** (fills, fonts, borders, merged cells, column widths/row heights, number formats, data validation, sheet protection, frozen panes, hidden columns).

**Tab 1 — "Start Here" (cover):** branded color block; "ABRIDGE" wordmark as styled coral text (no image-asset dependency); title "Data Request · {Setting}"; one-line purpose; a 3-step "how this works"; the list of areas being modeled. This is the premium face.

**Tab 2 — "Your Numbers":**
- Frozen header row. Visible columns: **Field · What it is · Example · Your Value**. Hidden columns: `owner`, `fieldId` (future-proofing; not used for parse-back now).
- **Grouped by owner**: a styled section band per owner ("FINANCE", "HR", "REVENUE CYCLE", …) — coral/dark band, white bold text, merged across the row width.
- Each field row: field name **bold**, description in muted gray, example in light italic, and the **"Your Value" cell highlighted** (soft fill) with type-appropriate **data validation** (whole number / percent / currency). That cell is the **only unlocked cell**.
- **Sheet protection on** — everything locked except Your Value cells, so the structure can't be mangled.
- Column widths sized to content (no cut-off descriptions); generous row heights; on-brand coral accent + clean sans font.

## Reliability ("don't break")
- Generation is a pure function of (setting, selected driver ids) → workbook. No external state.
- Add a vitest test that builds the workbook for **every** care setting + a representative driver set and asserts it returns a non-empty buffer without throwing — so a bad field config can't ship a corrupt file.

## Files touched
- `client/src/lib/dataRequestFields.ts` — add `owner` per field.
- `client/src/lib/dataRequestExcel.ts` — rewrite on ExcelJS (same exported `generateDataRequestExcel(setting, driverIds, orgName?)` signature so the builder is untouched).
- `client/src/__tests__/dataRequestExcel.test.ts` — new build/guard test.
- `package.json` — add `exceljs`.
- `DataRequestBuilder.tsx` — unchanged.

# PDF Layout Guidelines

How to author and review pages in our `@react-pdf/renderer` PDFs (Nursing,
Outpatient, ED, Inpatient, Forecast, Measure, Explore) so we stop shipping
broken layouts: footer collisions, orphan bullets, page count drift.

These rules exist because layout regressions don't show up in the snapshot
test — the snapshot only checks the React tree, not the rendered geometry.
Every rule below was driven by an actual bug we shipped.

---

## 1. Page chrome contract

Every page in every PDF must obey this contract:

| Token | Value | Why |
|---|---|---|
| `page.padding` (top/left/right) | 54 | Standard margin |
| `page.paddingBottom` | **72** | Must be ≥ `footer.bottom + footer height + 24pt clearance` |
| `footer.position` | `absolute` with `bottom: 24` | Pinned to physical page bottom |
| `footer.height` | ~24pt (border 1 + paddingTop 8 + text ~14 + line-height) | Don't grow this without bumping `paddingBottom` |
| `<View style={styles.footer} fixed>` | `fixed` prop required | Footer must repeat on every wrapped page |

**Math check:** `paddingBottom (72) − footer.bottom (24) − footer height (~24) = ~24pt visual buffer`. Anything less and content collides with the footer text.

If you change any of these numbers, change them all together and re-eyeball every page.

---

## 2. Wrap-safe primitives

When a `<Page wrap>` paginates content, react-pdf will break a `<View>` or
`<Text>` anywhere unless told otherwise. Treat these as **atomic units that
must not split mid-element**:

- Single-bullet rows (`MethodologyLine`, summary group rows)
- Driver cards, callouts, KPI tiles
- Headline + first body line of any section
- Closing tail (last 1–2 bullets + disclosure paragraph)

Wrap each in `<View wrap={false}>`. Example:

```tsx
const MethodologyLine = ({ text }: { text: string }) => (
  <View wrap={false}>
    <Text style={...}>{`• ${text}`}</Text>
  </View>
);
```

---

## 3. Orphan protection

Use `minPresenceAhead={N}` on section headers so the header doesn't land at
the bottom of a page with its body on the next one. Pick `N` ≈ enough room
for the header + 2 lines of body (~60pt for our standard subsection
headers).

```tsx
<Text style={styles.subSectionHeader} minPresenceAhead={60}>Methodology</Text>
```

For closing sequences (last bullet + disclaimer), wrap them in a single
`<View wrap={false}>` so they break together as one block.

---

## 4. Forbidden patterns

- ❌ `paddingBottom < 70` on any page that contains a `fixed` footer
- ❌ `<View style={{ flex: 1 }}>` as a direct child of `<Page wrap>` without an explicit height — flex sizing confuses pagination
- ❌ Repeating the same calculations in two places (driver value here, methodology footnote there) — derive both from the same input field on `NursingPDFInput`
- ❌ Adding a new bullet/paragraph to a wrap-enabled page without re-running the visual review (rule 6)

---

## 5. Snapshot test is necessary, not sufficient

Our snapshot tests (`client/src/__tests__/nursingPdfSnapshot.test.tsx`,
etc.) catch:
- Page count changes
- React tree structure changes
- Text-content drift

They do **not** catch:
- Footer collisions
- Orphan content / bad page breaks
- Missing fonts
- Off-screen content

**Update the snapshot only after you've eyeballed the rendered PDF (rule 6).**

---

## 6. Manual visual review checklist

Before merging any change to a PDF component, generate the PDF locally and
flip through every page:

1. **Footer clearance** — bottom-most visible content has at least 24pt of
   whitespace above the footer text.
2. **Footer present on every page** — including all wrapped pages.
3. **Page count footer** — "Page X of Y" math is correct (cover excluded).
4. **No orphans** — no page has just 1–2 lines of content above the footer.
5. **No widows** — no section header is the last line on its page.
6. **All bullets readable** — no half-line cut off at the page edge.
7. **Tables/cards intact** — no card or table row split across pages unless
   wrap-safe.
8. **Data fixture covers max content** — re-run with all drivers enabled,
   long org names, and the largest realistic numbers, since that's the
   layout most likely to overflow.

Flag the PR with "PDF visually reviewed: yes" in the description.

---

## 7. When you change PDF copy

Adding or changing text in a PDF section can push content past the safe
area even if the snapshot still passes. After any copy change to a wrap-
enabled page:

1. Re-run the snapshot test (`-u` if intentional).
2. Generate the PDF and re-do the rule 6 checklist.
3. If a new bullet pushes content close to the footer, either:
   - Tighten copy elsewhere on the same page, or
   - Move the new content to a dedicated page, or
   - Wrap related closing content in `<View wrap={false}>` so it migrates
     together to the next page.

---

## 8. Test fixture rules

The snapshot test fixture (e.g., `nursingPdfSnapshot.test.tsx`) must:

- Enable every optional driver (`hapi.enabled = true`, `falls.enabled = true`, etc.)
- Use a representative org name length
- Use realistic dollar amounts that exercise the `fmtCurrency` branches (`>= 1M`, `>= 1K`, raw)
- Include a non-zero `implementationFee`

Any new optional driver must be added to the fixture in the same PR that
introduces the driver.

---

## 9. Files governed by these rules

- `client/src/components/explore/NursingValueAssessmentPDF.tsx`
- `client/src/components/explore/ExplorePDFExport.tsx`
- `client/src/components/pdf/PDFCoverPage.tsx`
- Any future `*PDF*.tsx` files

If you add a new PDF component, mirror the page-chrome contract from
section 1 and reference this doc in the file header.

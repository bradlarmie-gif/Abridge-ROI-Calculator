# PDF Premium Review — the pass we run BEFORE Brad sees it

The automated suites catch **mechanical** defects (overflow, page bleed, clipped
text, wrong numbers, dropped pages). They are blind to **judgment**: redundant,
confusing, no soul, sparse, not graphic enough, not premium. Those are exactly
the notes Brad kept having to give. This doc closes that loop: it's the rubric a
critical pass grades every tool PDF against **before it is shown to Brad**, so he
is not the review loop.

## The three layers

**Layer A — automated, every change** (`npm run layout:smoke` + `npx vitest run`):
overflow, wrapped/squished headers, clipped inputs, PDF page count, page bleed,
`NaN`; and reconciliation tests (every displayed number ties to the engine).

**Layer B — automated heuristic** (in `layout:smoke`): a **sparse-page** check.
For each body PDF page, measure the dead gap between the last content block and
the footer; flag pages that are mostly empty (the "half-empty, not dense" note).
Covers and the pitch page are exempt (intentionally airy).

**Layer C — adversarial visual critique, run by the author before handoff.**
Render every page to PNG, hand a *fresh* critic the images + this rubric, get a
ranked punch-list, fix all Blocker/Major items, then show Brad. This is the part
that catches taste. **Discipline: the author runs Layer C on their own draft.**

Contact sheet for a 10-second human glance: `npm run pdf:contact` (all pages,
one montage).

## The rubric (grade each page, most-severe first)

1. **Redundancy.** Is any number, idea, or viz shown twice across the document
   without adding information? (The pages 3+4 duplication was this.) Remove or
   merge.
2. **Coherent story.** Read the copy cold, page to page. Does it read as ONE
   narrative grounded in the customer's reality (a health system that accumulated
   tools for good reasons), or as disconnected transactional beats? Does each
   page hand off to the next? Flag anything that feels like a calculator label.
3. **Soul / craft.** Does the page look deliberately composed — real hierarchy,
   editorial voice, a clear path for the eye — or templated and flat? Would a
   great designer sign it?
4. **Density & spacing.** Any large dead whitespace on a body page (roughly >25%
   empty)? Anything cramped or colliding? Does the page earn its length? (Covers
   / pitch may be airy on purpose.)
5. **Graphic for the detail.** Is quantitative content a purposeful, bespoke viz
   that *teaches*, or a bare list/table where a chart would say more? Does every
   chart earn its space — would removing it lose insight, or is it decoration?
6. **Every element earns its place.** Remove-test: if deleting an element loses
   no meaning, cut it (vestigial ticks, redundant labels, filler).
7. **Brand.** Cream page, coral reserved for money/actions, Abridge display face
   for headlines and numbers, and it matches the other three tool PDFs. No
   off-brand fonts or colors.
8. **Copy / legal tripwires.** No em dashes. No causal/guarantee claims
   ("guarantees", "ensures", "will increase"). Plain consultative English — no
   buzzwords, hip fragments, or meta-commentary.

## The critic prompt (paste, with the rendered page images)

> You are a skeptical premium design + copy critic reviewing an Abridge sales
> PDF, page by page, from the rendered images. Hold it to the bar of a
> best-in-class editorial report — better than Salesforce and Airtable. Grade
> every page against this rubric: redundancy; coherent story grounded in a health
> system's reality; soul/craft; density & spacing (flag dead whitespace and
> collisions); graphic-for-the-detail (does each chart teach, or is a list where
> a chart should be); every element earns its place; brand consistency; copy/legal
> tripwires (no em dashes, no guarantees, plain English). Return a ranked
> punch-list (Blocker / Major / Minor), each with the page, the exact problem,
> and a concrete fix. Be adversarial and specific; do not praise. If a page is
> genuinely clean, say so in one line and move on.

## The discipline

Anything Layer C flags that is objective and repeatable gets promoted into Layer
A or B so it can never recur. The author does not hand a PDF to Brad until Layer
C is clean. That is how Brad stops being the reviewer.

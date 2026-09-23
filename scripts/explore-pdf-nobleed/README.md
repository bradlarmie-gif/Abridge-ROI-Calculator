# Explore PDF no-bleed fuzz

Renders every driver on/off combination of the editorial value-model PDF and asserts no page bleed, no orphan pages, synthesis reconciles.

Run (dev server must be up at :5199, or set PDF_FUZZ_BASE):
```
node scripts/explore-pdf-nobleed/fuzz.mjs
```

Fixtures (`combos.json`, 528 combos) are checked in. Regenerate them only if drivers/PDF-data change.

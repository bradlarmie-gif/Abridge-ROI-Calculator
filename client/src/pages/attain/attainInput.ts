/**
 * The one refined text/date input skin for every Attain form field (Align and
 * Plan). The visual skin (hairline warm-gray border, white ground, near-black
 * text, muted placeholder, coral focus ring, radius) lives in the `.attain-input`
 * class in index.css; the sizing stays here so every field is the same height
 * and padding. `.attain-date` additionally strips the default browser date
 * chrome and swaps in a muted calendar affordance that turns coral on hover, so
 * a native date field reads like the app's own control rather than a raw
 * browser picker.
 */
export const attainTextInput = "attain-input h-9 w-full px-3 text-sm";
export const attainDateInput = "attain-input attain-date h-9 w-full px-3 text-sm";

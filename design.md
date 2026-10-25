# Design: Market Stand

The app's visual direction, chosen from four mood boards on Oct 18, 2026. The PDF is [`mood-board.pdf`](mood-board.pdf): the Market Stand board and its parts kit. The other three directions (Nutrition Label, Steady Band, Riso Plate) are on the design canvas: https://claude.ai/artifact/V38mFsW4g8mbLcTaHCNZaA (private to the owner).

**The idea:** your week of food, laid out like a market stall. Fresh produce colors, kraft paper, and nutrient tags that look like produce stickers. It should feel fresh, tactile, friendly and seasonal, never clinical or judgmental.

## Color

| Token | Hex | Use |
|---|---|---|
| `celery` | `#EEF2E4` | Light tint inside cards (summary tiles); was the page background |
| `paper` | `#FBFCF7` | Cards and panels |
| `soil` | `#1F2A1C` | Main text, value bars, dark message background |
| `faded` | `#687063` | Grayed-out rows, e.g. days that don't count (4.7:1 on the detail panel) |
| `carrot` | `#D9773A` | Over a range or limit (bars, cells, chips with soil text, 4.7:1) |
| `muted` | `#4A5545` | Secondary text, hints |
| `leaf` | `#2E6B3F` | Primary buttons, active nav, links, "in range" |
| `tomato` | `#C8402A` | Form errors only |
| `lemon` | `#F2C94C` | "To go" / below a minimum, highlights, stickers |
| `kraft` | `#C9A27A` | Signature panels, sticker variety, image backgrounds |
| `kraft-tint` | `#E9DCC8` | Page background on every page (muted 5.8:1, leaf 4.7:1, soil 11:1) |
| `line` | `#DDE5CF` | Dividers and card borders |
| `track` | `#E1E8D6` | Empty part of a bar |
| `band` | `#B9D3A8` | The target range on a bar |
| `field` | `#B8C4A8` | Input borders |

Checked contrast (WCAG AA needs 4.5:1 for body text, 3:1 for large text and UI):

| Pair | Ratio |
|---|---|
| soil on paper / celery | 14.5 / 13.1 |
| muted on paper / celery | 7.6 / 6.9 |
| leaf on paper / celery | 6.2 / 5.6 |
| white on leaf | 6.4 |
| white on tomato | 5.0 |
| tomato on paper (error text) | 4.8 |
| soil on lemon | 9.4 |
| soil on kraft | 6.4 |

Rules: lemon and kraft never carry white text. Tomato is for form errors only. Bars and status use lemon (under a range), leaf (in range) and carrot (over a range or limit). The trio passes the dataviz palette checker for colorblind separation (worst pair ΔE 12.1), and every chip says its status in words. Going *over* a minimum (more fiber, more vitamin C) stays leaf.

## Type

- **Headings:** Bricolage Grotesque, 800 (500 for small accents).
- **Everything else:** Atkinson Hyperlegible, 400 and 700. It was designed for legibility, so 0/O and 1/l stay distinct in numbers.
- **Scale (px):** 40 page titles · 28 section titles · 20 card titles · 16 body · 14 secondary · 12 labels. A 64 px display size is only for the welcome screen.
- Uppercase labels: 12 px, 700, letter-spacing 0.08em, in leaf.

## Space, shape, icons

- **Spacing:** 4, 8, 12, 16, 24, 32 px. Lay out groups with flex or grid plus `gap`.
- **Radius:** 10 px fields, 18 px cards, pill (999 px) buttons and chips.
- **Icons:** simple stroke icons, 1.75 px stroke, rounded caps. No emoji.
- **Touch targets:** at least 44 px tall.

## Components

- **Navigation:** wordmark on the left, then Today · Log · Last 7 days · Targets as pills. The current page is a leaf pill with white text and `aria-current="page"`. On phones the same four tabs move to a bottom bar.
- **Buttons:** primary (leaf pill, Bricolage 800), secondary (soil outline pill), quiet (underlined leaf text). Keyboard focus is a two-ring outline: paper, then soil.
- **Form field:** label (700, 15 px) → optional hint (muted, 13 px; used for "why we ask") → input (48 px tall, 10 px radius, field-colored border, white) → error. An error turns the border tomato, adds an icon and a message that says what to do ("Enter calories as a number, like 120."), and never clears what was typed. One column, always.
- **Status chips:** `To go` (lemon), `In range` (leaf), `Over by …` (carrot, soil text), `Not enough data` (dashed outline). The chip text always states the status, so color is never the only signal.
- **Nutrient bar:** track, then the target range as a band with soil tick marks at its edges (outlined in paper so they show on any fill), then a full-height fill for the value: lemon below the range, leaf within it, carrot above it. Going over a minimum stays leaf. The chip and the line under it ("62 g a day · target 90–120 g") always say it in words.
- **Info button (ⓘ):** a round 28 px button with `aria-label="About the protein range"` and `aria-expanded`. It opens a small paper popover with a soil border and a kraft offset shadow, and closes on Escape or a click outside.
- **Produce stickers:** pill or oval tags with a thin inner ring, slightly rotated (−3° to 3°). Used for "what it adds" tags and quick-add foods. Uppercase in tags, sentence case on quick-add buttons ("+ Banana").
- **Messages:** an undo toast (soil background, lemon "Undo"); success notes (light leaf `#DCE8D0`); attention notes (light lemon `#FBEFC4`) such as "Thursday looks incomplete".
- **Empty states:** a question ("What did you eat today?"), one line on what to do, and quick-add stickers. Never a blank page.

## Imagery

Flat, cut-paper produce illustrations on kraft, used sparingly: the welcome screen, empty states, and maybe the quick-add foods. They're generated with Codex (`$imagegen`) and saved as static files in `public/images/`, so the app never calls an API. Base prompt:

> Flat cut-paper illustration of [food], simple shapes with slightly torn paper edges, top-down, centered, soft drop shadow, plain kraft-paper background (#C9A27A), colors limited to leaf green #2E6B3F, tomato red #C8402A, lemon yellow #F2C94C and off-white #FBFCF7, no text.

## Voice

Plain, warm and specific. Say what happened and what to do next. Don't judge food or people.

- "Added black beans" with "Undo", not "Success!"
- "28 g to go", not "You failed to meet your protein goal"
- "Thursday looks incomplete (780 kcal logged)", not "Missing data"
- "Enter calories as a number, like 120.", not "Invalid input"

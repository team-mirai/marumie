# Team Mirai — Design System

**チームみらい** (Team Mirai) is Japan's youngest national political party. The party was formed in 2025 and won seats in the House of Councillors (参議院) election that year. Its leader is **Takahiro Anno** (安野貴博), an AI engineer turned politician. The brand is built around technology-forward, transparent, optimistic civic engagement — the campaign tagline is:

> **未来のために。今できることを、今すぐに。**
> *"For the future. What we can do now — do it now."*

The party's signature visual is its small "card-stack" logo: a slightly-tilted white card lettered with **チーム / みらい** and underlined in teal, with a teal duplicate offset behind it.

---

## Products covered by this system

The Figma source maps to a single product surface in two layouts:

1. **Marketing / party website** — `team-mir.ai`
   - Mobile (500px): `/web/frame` in Figma — the canonical mobile homepage
   - Desktop (1512px, MacBook Pro 14): `/webUI_0131/MacBook-Pro-14---1`
   - Campaign landing variants in `/2025`, `/2025-2`, `/2025-3_1222`, `/0116`, `/0208`, `/202604`
2. **OGP / social cards** — `/OGP` in Figma. Square / 16:9 hero cards used for Twitter, Facebook etc. Shares the same logo + headline treatment.

Both products use exactly the same component vocabulary; the desktop view simply adds a fixed left column (nav) and a fixed right column (social rail + voting clock). There is no separate "app" product.

## Source materials

- **Figma file** (mounted as a virtual filesystem): `web2.fig` — 12 pages, 590 frames. Key pages:
  - `/web` — current mobile homepage (production reference)
  - `/webUI_0131` — current desktop layout
  - `/OGP` — share / social cards
  - `/2025`, `/2025-2`, `/2025-3_1222` — campaign work-in-progress
  - `/0116`, `/0208`, `/202604` — newer iterations and policy pages
  - `/component` — a Frame containing some shared components (cards, links, icons; figma originals were Lucide-named)
- **Public domain reference**: `team-mir.ai`
- **Fonts uploaded**: Noto Sans (every condensation × every weight × Italic), Poppins (full family). The full set is kept under `uploads/`. Only the actively-referenced cuts are copied into `fonts/`.

---

## Index

```
README.md              ← you are here
SKILL.md               ← Agent-Skill manifest (Claude Code compatible)
colors_and_type.css    ← all tokens (colors, fonts, scale, spacing, shadow, radii)
fonts/                 ← TTFs actually referenced by colors_and_type.css
assets/                ← logos, hero photography, raw brand imagery
preview/               ← design-system review cards (rendered on the Design System tab)
ui_kits/
  marketing-site/      ← 1512-wide marketing site recreation
slides/                ← (intentionally empty — no deck template was provided)
```

---

## CONTENT FUNDAMENTALS

Team Mirai's copy is **Japanese-first, action-oriented, and earnest**. It is not snarky, not slangy, not corporate. It reads like a serious civic-tech project written by people who genuinely want to change things, not like a campaign poster.

### Voice & tone

- **First-person plural is "チームみらい"**, not "私たち". The party refers to itself by name at every opportunity. Example: *チームみらいは、社会保険料を引き下げ…* ("Team Mirai will lower social-insurance premiums…").
- **Calls to action are imperative + polite (です/ます form).** Buttons read 「応援する」 ("Support [us]"), 「投票に行こう！」 ("Let's go vote!"), 「JOIN US!」. Never imperative-rude (〜しろ) and never overly humble (〜くださいませ).
- **Specific over vague.** Headlines name a concrete deliverable: 「2026年衆院選 チームみらい公約」, 「達成！100日プラン成果報告」 — never abstract slogans like "A better future".
- **Numbers are foregrounded.** The Facts section drops huge digits — `3,813,750 票` / `33,181 人` / `2,508 件` / `263 自治体` — paired with one short Japanese label. No filler verbs.
- **Bilingual section labels.** Section headers pair an English short-form label (`Facts`, `Vision`, `Policy`, `JOIN US!`) above a Japanese sub-line in teal (`数字で見るチームみらい`). The English label is decorative; the Japanese line is the actual heading.

### Casing & punctuation

- Japanese full-width punctuation throughout: 「」 for quotes, 。 for periods, 、 for commas, ！ for emphasis.
- English labels are sentence- or title-cased (`Facts`, `Join Us!`), not UPPER unless the figma source uses upper (some Lexend Exa labels do).
- Dates use `YYYY.MM.DD` with periods, not slashes — `2026.04.11`, `2025.12.11`.
- Day-of-week appears as a single full-width character in a coloured circle: `日` in red, `水` in dark grey. This is a strong, repeating motif on every vote-date appearance.

### What you'll never see

- **Emoji** are not part of the brand voice. Phosphor icons (regular weight) and the day-of-week character badges do the work. (The party does occasionally use the X/YouTube/LINE logos in their official brand colours in the social rail — those are not "emoji" in the brand sense.)
- **Gradients** as text fills or decorative backgrounds. The one exception is the teal gradient hero card (`assets/logo-gradient.png`) used as an OGP background.
- **Hashtags** in headings. Sometimes appear inside YouTube video titles (`#山田えり`) but never in party copy.
- **Exclamation-stacking** (`!!!`) and ALL CAPS YELLING.

### Sample copy — copy this style

> **見出し例** (Headline)
> 「未来のために。今できることを、今すぐに。」
>
> **CTA**
> 「応援する（党員・サポーター・寄付）」
> 「投票に行こう！」
> 「JOIN US!」
>
> **Body**
> 「チームみらいは、社会保険料を引き下げ、働く人の手取りが増える未来を実現します。」
>
> **Stat caption**
> 「2026年衆院選・比例代表での得票数」

---

## VISUAL FOUNDATIONS

### Colour

One brand colour, one neutral, two accents. That's it.

| Role | Hex | Note |
|------|-----|------|
| **Mirai Teal** | `#30BCA7` | the only brand colour — buttons, underlines, fills, badges |
| Teal hover | `#089781` | strong-text-on-white version; section labels |
| Teal deep | `#0F8472` | pressed / dense data |
| Teal soft | `#64D8C6` | illustration accent, mint underlines under headlines |
| Teal 200 | `#BCECD3` | hairlines on coloured backgrounds |
| Teal 100 | `#E2F6F3` | **signature mint section background** — the most-used non-white fill (1.2k uses in Figma) |
| Yellow | `#F7F741` | rare highlight pill ("手ぶらでもOK") and emphasis highlight |
| Red | `#E63946` | day-of-week 日-circle badge, urgency |
| Black | `#000000` | type, 1px borders. True black, not soft black. |
| Greys | `#F8F8F8 → #CCC → #333` | a five-step neutral ramp; never tinted |

There is **no** blue, no purple, no orange. The mint teal does all heavy lifting.

### Type

- **Japanese display**: Hiragino Kaku Gothic Std (W6 / W7 / W8) — the de-facto macOS web font. Falls back to Noto Sans / Noto Sans JP — both bundled.
- **Japanese body**: Hiragino Kaku Gothic ProN W3 → W6.
- **Latin / numerics**: Poppins SemiBold or Bold (replacing the Montserrat / Lexend Deca pairings in figma — same geometric-grotesque feel, free, ships in this system).
- Body always tracks generously (`letter-spacing: 0.04em–0.1em`) and line-heights generously (`line-height: 1.8` is the dominant body lh). Japanese display sets are tight (`line-height: 1.2–1.4`) for big stacked statements.
- **Display underlines** are a signature: a thin teal (`--tm-teal-soft`) line sits **below** display copy with a small gap (~6px). Use `.tm-mint-underline`. The line is decorative, not a marker swipe behind the glyphs. **Yellow is not used as an underline.**

### Spacing & layout

- 4px base; common stops are 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Mobile gutters are 24–32 px. The mobile canvas is **500px** in figma (NOT 375 or 390); this is wider than iPhone 16 but matches how the actual site renders.
- Desktop is a **fixed-rail layout**: left rail ≈ 316 px of vertical nav, central content column ≈ 700 px, right rail of social icons + 80 px vote-date badge. The middle column is *not* full-bleed.
- Card grids use generous 16–24 px gaps. Items are rarely edge-to-edge.

### Backgrounds & imagery

- White is the dominant canvas.
- **Mint** (`--tm-teal-100`) is the second canvas — used for whole-section breaks (about, support, manifesto teaser). Approximately every other section alternates white ↔ mint on the homepage.
- **Photography** is real, warm, candid. Indoor natural light, soft greens (vegetation through windows), people smiling at laptops or speaking. No stock; no AI-generated images. Faces are always genuine, not retouched-glossy.
- **Hand-drawn illustrations**: none. The brand favours photography + the logo card-stack motif + flat monoline icons (Phosphor).
- **No repeating patterns or textures.** Solid fills only.
- **One subtle gradient exists**: the OGP hero `assets/logo-gradient.png` (teal → soft-teal). It is not used elsewhere.

### Borders, radii, shadows

- **The default border is `1px solid #000`.** Buttons, cards, frames, social-icon outlines — all use it. No 0.5px hairlines, no soft greys for borders.
- **Pill** (`border-radius: 9999px`) is the signature shape — every CTA, every link button, every input. Pills with a hard black 1px outline are the most-used component.
- Card corners on photo / video tiles: **4–8px** small radius. Never large.
- Logo card uses **no rounding**. The slight tilt and the teal duplicate "stack" are **baked into `assets/logo.png`** — you place that file, you never recreate it. The brand guideline explicitly forbids: rotation, off-palette colours, transparency, drop shadows, transforms, off-brand backgrounds, isolation-area violations, and modifying internal elements (see `preview/logo-donts.html` / `assets/logo-guidelines-donts.png`).
- **Shadow** is rare. When present it's a soft `0 8px 24px rgba(0,0,0,0.08)` on photo / video cards. No coloured shadows, no neumorphic glows.

### Hover & press states

- **Pill buttons** on hover: fill swaps from white→teal (text from black→white), or teal→teal-hover (deep). Border stays black.
- **Links** on hover: colour shifts to `--tm-teal-hover`, optional 1px teal underline appears. No opacity tricks.
- **Press** state: fill darkens to `--tm-teal-deep`; no scale-shrink. The brand reads as honest / steady, not bouncy.
- Focus visible: 2px solid `--tm-teal` ring at 2px offset.

### Animation

- Animations are functional, not decorative.
- **Hover transitions**: `120–200ms ease-out` on colour, border, opacity. That's it.
- No bounces, no parallax, no spring-physics card-flips. The brand reads as a serious civic-tech party, not a SaaS product launch.

### Transparency & blur

- Translucency is rarely used. The right-rail social icons sit on a transparent strip over the body; the page header on scroll keeps a solid white fill with a 1px hairline divider — **no backdrop-blur**, no glass.

### Layout fixities

- Two fixed rails on desktop:
  - Left: vertical nav + logo, scrolls with page (sticky, not fixed).
  - Right: vote-clock card + social rail (sticky).
- Bottom-of-viewport "応援する" CTA on mobile is a fixed pill that stays glued to bottom-center.

---

## ICONOGRAPHY

The brand uses **[Phosphor Icons](https://phosphoricons.com/)** — *regular* weight — as its icon system. (The figma originals were Lucide-named: `lucide-arrow-right`, `lucide-house`, `lucide-vote`, `lucide-hospital`, `lucide-heart-plus`, `lucide-baby`, `lucide-microscope`, `lucide-atom`, `lucide-shield-plus`, `lucide-undo-2`, `lucide-loader`, `lucide-landmark`, `lucide-heart-handshake`, `lucide-square-arrow-out-up-right`. Map these 1:1 to their Phosphor equivalents — `ph-arrow-right`, `ph-house`, `ph-check-square`, `ph-first-aid-kit`, `ph-heartbeat`, `ph-baby`, `ph-microscope`, `ph-atom`, `ph-shield-check`, `ph-arrow-u-up-left`, `ph-circle-notch`, `ph-bank`, `ph-handshake`, `ph-arrow-square-out`.)

**Usage rules**

- **Regular** weight is canonical (≈1.5px stroke — matches the brand's 1.5px thick-border token). Use `bold` only for emphasis. Never `duotone` or `fill`.
- Render icons in `currentColor`. They sit inline with text and inherit `--tm-fg` or `--tm-teal-hover` depending on context.
- Icon-only buttons get a 24×24 hit area on mobile, 20×20 on desktop, always inside a 40-min hit target.
- Arrows in CTAs sit on the **right** edge of pill buttons (`ph-arrow-right` or a small custom `>` chevron — both appear in figma; the chevron is more common on dense list rows).
- **Day-of-week** is set as a single full-width character (`日 月 火 水 木 金 土`) in a tinted circle — `日` is red `#E63946`, weekdays are dark-grey `#1F2937`. This is not an icon font; it's typography in a `border-radius: 50%` chip. Always inline with date numerics: `2.8 [日] 投開票`.
- **Social platform logos** appear in their *brand* colours when standing alone (YouTube red, X black, LINE green, etc.) — see Figma `/external-shared/Platform*`. When small / inactive they go to outlined-mono.
- **Emoji are not used.** The closest the brand comes is the 「◯ / ✕」 ASCII-glyph marks on the brand-correctness sheet.

Phosphor is on CDN — link `https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css` and use `<i class="ph ph-house"></i>` markup. Add `bold/style.css` for the heavier weight if needed. We do not ship a local sprite.

**Substitution flag**: Production uses `Hiragino Kaku Gothic` (Apple system font, not freely redistributable) and `Montserrat` / `Lexend Deca` / `Roboto Flex` / `SF Pro`. This system substitutes:

| Production | This system | Why |
|------------|-------------|-----|
| Hiragino Kaku Gothic | Noto Sans + Noto Sans JP fallback | Hiragino is macOS-only |
| Montserrat | Poppins | Not provided; Poppins ships and is the closest geometric-grotesque |
| Lexend Deca / Exa | Poppins | Same reason |
| SF Pro / SF Compact | Noto Sans | Apple-only |

If pixel-perfect production rendering matters, swap `--tm-font-jp` to Hiragino-only and load Montserrat/Lexend from Google Fonts.

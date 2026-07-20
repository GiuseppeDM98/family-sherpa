---
name: FamilySherpa
description: The calm ledger that carries a family's mental load.
colors:
  ink: "oklch(0.145 0 0)"
  surface: "oklch(0.994 0.005 75)"
  primary: "oklch(0.205 0 0)"
  muted-foreground: "oklch(0.556 0.007 75)"
  muted-surface: "oklch(0.967 0.008 75)"
  border-hairline: "oklch(0.921 0.007 75)"
  brand-navy: "#0f172a"
  warning: "#b45309"
  warning-dark: "#fbbf24"
  destructive: "oklch(0.577 0.245 27.325)"
  chart-1: "#2a78d6"
  chart-2: "#008300"
  chart-3: "#e87ba4"
  chart-4: "#eda100"
  chart-5: "#1baf7a"
  chart-6: "#eb6834"
  chart-7: "#4a3aa7"
  chart-8: "#e34948"
  chart-9: "#1499c2"
  chart-10: "#8a5cc4"
  chart-11: "#c74d99"
  chart-12: "#6d6459"
typography:
  heading:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
spacing:
  sm: "12px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-destructive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.destructive}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
---

# Design System: FamilySherpa

## 1. Overview

**Creative North Star: "The Calm Ledger"**

FamilySherpa is a quiet, trustworthy record of a household's obligations — bollo, revisione, TARI, bills, medicine schedules — kept so that no one has to keep them in their head. The visual system exists to make that offloading feel like *relief*, not like another dashboard to manage. Surfaces are paper-plain — a **warm off-white** in light mode and a warm near-black in dark, with ink-black type and hairline borders. The neutral ramp carries only a *sub-perceptual* warm tint (~0.006 chroma, hue 75) toward the brand's warmth — enough to feel like a calm companion rather than a clinical portal, never enough to read as a nameable colour (it stays well below the chroma that turns into "AI cream"). So when a *nameable* colour does appear (an amber "due soon", a red "overdue", a category-tinted chip, a chart hue) it still *means* something. Warmth is carried by tone, copy, and generous touch targets — the two-partner household using this in stolen phone moments should feel a steady companion looking after them, never a bureaucratic form or a growth-metrics console.

The system is deliberately restrained so foresight can lead. The Home dashboard, the deadline timelines, the medicine checklist — each surfaces *what's coming* more loudly than *what happened*, and the chrome gets out of the way so it can. Density is comfortable, not tight: this is a calm utility, not a power tool, and legibility for tired, distracted, mixed-age users wins over information density.

This system explicitly rejects the four things FamilySherpa exists to replace: the **cold government/bank portal** (sterile, form-heavy, stressful), the **childish "family app"** (cartoon mascots, pastel bubbles, toy-rounded UI that trivializes real responsibilities), the **loud SaaS dashboard** (gradient hero-metrics, glassmorphism, neon accents), and the **cluttered do-everything app** (feature soup where every screen competes for attention).

**Key Characteristics:**
- Warm near-neutral surfaces (a whisper of warm chroma, not chroma-0); nameable color reserved for meaning (warnings, errors, category, data).
- Single typeface (Inter) across the whole product — no display/body split.
- Flat by default: depth comes from hairline rings and tonal fills, not shadows.
- Mobile-first: a bottom tab bar on phones, a left rail on desktop.
- Warm without childish — reassurance from tone and space, never from mascots or toy shapes.

## 2. Colors

A near-monochrome neutral system where color is a signal, never decoration.

### Primary
- **Ink** (`oklch(0.145 0 0)`, near-black): the foreground for all body text and the darkest surface in dark mode. The default "voice" of the interface.
- **Primary Action** (`oklch(0.205 0 0)`, charcoal-black): fills the default (primary) button and marks the active nav item. In dark mode this inverts to near-white (`oklch(0.922 0 0)`). It is the one high-contrast commitment on an otherwise quiet surface.

### Secondary
- **Muted Surface** (`oklch(0.97 0 0)`, faint gray): the second neutral layer — secondary buttons, muted panels, card-footer fills, hover states. Slightly recessed from the pure-white content surface.
- **Muted Foreground** (`oklch(0.556 0 0)`): secondary text — descriptions, inactive nav labels, timestamps. Passes as body-adjacent, never as primary reading text.

### Tertiary
- **Warning Amber** (`--warning`: `#b45309` light / `#fbbf24` dark): the single warmth accent, used *only* for "in scadenza"/"in scadenza a breve" — a due-soon deadline's date text, an expiring-medicine badge. It is the interface raising a gentle hand, not an alarm. It is a **semantic token**, not a raw Tailwind `amber-*` class: the light value is deepened to `amber-700` so it clears WCAG AA (≥4.5:1) as small text on white — the brighter `amber-500`/`amber-600` it replaced only reached ~3.2:1 — and the dark value lifts to `amber-400` to stay legible on the near-black surface. Never reintroduce a bare `text-amber-500`/`border-amber-500`; go through `text-warning`/`border-warning` so contrast and dark mode stay controlled in one place.
- **Chart Palette** (`#2a78d6` blue → `#008300` green → `#e87ba4` magenta → `#eda100` yellow → `#1baf7a` aqua → `#eb6834` orange → `#4a3aa7` violet → `#e34948` red): a CVD-validated categorical set (validated with `scripts/validate_palette.js`) filling `--chart-1..8`. Assigned to deadline categories in a **fixed order that never cycles** (`src/lib/deadline-labels.ts`): bollo→blue, bolletta→green, medico→magenta, and so on. Beyond charts, this same fixed hue also softly tints the **deadline category chip** (`CategoryBadge`, `src/components/deadlines/category-badge.tsx`): a ~15% `color-mix` fill + a stronger border, label text left at ink/near-white contrast — so a category is decodable by hue at a glance. This is the one sanctioned place category color leaves data-viz. Each of the 12 categories owns a **distinct** slot (`--chart-1..12`, extended from the original 8 so no two categories ever share a hue in the deadline list); the label always backs the colour up, so a chip is never colour-only.

### Neutral
- **Surface** (`oklch(0.994 0.005 75)`, warm off-white / `oklch(0.155 0.006 75)` warm near-black dark): the base background and card fill. Warmed a hair off pure white/black toward the brand's warmth; ink text stays chroma-0 for crisp legibility.
- **Hairline Border** (`oklch(0.921 0.007 75)` / `oklch(1 0 0 / 10%)` dark): every divider, input stroke, and nav edge. Depth is drawn with these, not with shadow.
- **Brand Navy** (`#0f172a`, `slate-900`): the app *chrome* color only — PWA `theme_color`, `background_color`, and iOS status bar. It anchors the installed-app frame; it is **not** a UI surface or accent token inside the app.
- **Destructive** (`oklch(0.577 0.245 27.325)`, red): errors and overdue ("scaduta") deadlines. Rendered as a *tinted* fill (`destructive/10`) on buttons, not a solid slab — even the error voice stays calm.

### Named Rules
**The Meaning-Only Color Rule.** The resting interface is *near* chroma 0: surfaces carry only a sub-perceptual warm tint (~0.006 chroma) for cohesion — never a nameable colour, and ink text stays chroma-0. Every *nameable* hue that appears must carry information — amber = attention soon, red = overdue/error, a category hue = a specific deadline category (on its chip and in charts alike). Colour for decoration is forbidden; if a colour can't name what it means, it doesn't belong.

**The One Navy Rule.** `#0f172a` lives in the app manifest and status bar and nowhere else. It is the frame around the window, never paint inside it. Do not reach for it as a UI accent.

## 3. Typography

**Display Font:** — (none; the system uses no display face)
**Body Font:** Inter (with `system-ui, sans-serif` fallback)
**Label Font:** Inter (same family, smaller and slightly heavier)

**Character:** One well-tuned humanist sans carries everything — headings, buttons, labels, body, and tabular data. There is no display/body pairing because a product in a task doesn't need one; a single family read at consistent sizes is calmer and more legible than contrast for its own sake. The scale is a **fixed rem scale, not fluid** — headings never shrink in a sidebar.

### Hierarchy
- **Heading / Card Title** (`500`, `1rem`, line-height `1.375`): section and card titles (`font-heading`, which resolves to Inter). The most prominent text on most screens; foresight lives here.
- **Body** (`400`, `0.875rem`, line-height `1.5`): the default reading and data size. Keep prose to 65–75ch; tables and dense lists may run denser.
- **Label / Nav** (`500`, `0.75rem`): nav labels, badges, metadata, and small UI text. On mobile the nav label sits at `text-xs` under its icon.

### Named Rules
**The One Family Rule.** Inter does all the work. Adding a second typeface — a serif for "warmth", a display face for a hero — is prohibited; warmth comes from tone and spacing, and a product UI reads best in one voice.

**The No-Display Rule.** No fluid `clamp()` headings, no oversized hero type. Users view at a consistent DPI in a task; a heading that grows to fill the viewport is shouting, which this system never does.

## 4. Elevation

**Flat by default.** This system does not use a drop-shadow vocabulary. Depth is conveyed two ways: a **hairline ring** (`ring-1 ring-foreground/10`) around cards, and **tonal layering** — a card footer sits on `bg-muted/50` above a `border-t`, a muted panel recedes from the pure-white content surface. The only "elevation" event is **focus**: interactive elements gain a `ring-3 ring-ring/50` halo, and buttons nudge down `1px` (`active:translate-y-px`) on press. Motion sits at ~150–250ms and conveys state, never choreography — no orchestrated page-load sequences on a surface people open mid-task.

### Named Rules
**The Hairline-Not-Shadow Rule.** Separation is drawn with a 1px ring or border and a tonal fill, never a box-shadow. If a surface needs to feel lifted, deepen the tonal step or the ring opacity — do not add a shadow. A drop shadow here reads as a foreign SaaS card.

**The Flat-At-Rest Rule.** Surfaces are flat until the user touches them. Elevation-like feedback (the focus ring, the press nudge) is a *response to state*, not a resting decoration.

## 5. Components

Buttons, cards and inputs should feel **soft and reassuring**: quiet, hairline-edged surfaces with comfortable touch targets that recede so the content leads. Nothing shouts; the tool disappears into the task.

### Buttons
- **Shape:** gently rounded (`rounded-lg`, 10px). Compact by default — `h-8` (32px) with `px-2.5` (10px).
- **Primary:** charcoal-black fill (`bg-primary`), near-white text; the one high-contrast element on a quiet screen.
- **Hover / Focus:** hover softens the fill to `primary/80`; focus-visible draws `border-ring` + a `ring-3 ring-ring/50` halo; press nudges down 1px.
- **Secondary / Outline / Ghost:** outline is a hairline border on the surface; secondary rides the muted layer; ghost is transparent until hover fills it with muted. Same shape and height as primary — consistent affordance across the surface.
- **Destructive:** a *tinted* variant (`bg-destructive/10 text-destructive`), never a solid red slab. Even a delete stays calm.

### Cards / Containers
- **Corner Style:** `rounded-xl` (14px) — a touch softer than buttons and inputs, so containers read as gentle frames.
- **Background:** `bg-card` (pure white / near-black).
- **Shadow Strategy:** none — a `ring-1 ring-foreground/10` hairline (see Elevation).
- **Border / Footer:** a card footer sits on `bg-muted/50` above a `border-t`, tonally recessed. Content is `overflow-hidden` so images clip to the corner radius.
- **Internal Padding:** driven by `--card-spacing` (16px default, 12px for `size="sm"`).

### Inputs / Fields
- **Style:** `h-8` (32px), `rounded-lg` (10px), hairline `border-input`, transparent background.
- **Focus:** border shifts to `border-ring` with a `ring-3 ring-ring/50` halo — the same focus language as buttons.
- **Error / Disabled:** invalid state draws a `destructive` border + tinted ring; disabled drops to 50% opacity with a muted fill.
- **Placeholder:** `text-muted-foreground` — but never rely on it as a label; keep contrast honest.

### Navigation
- **Structure:** responsive and structural — a **fixed bottom tab bar** on phones (`border-t`, icons over `text-xs` labels), becoming a **left rail** on desktop (`md:w-56`, `border-r`, icon beside `text-sm` label). Lucide icons throughout.
- **States:** active = `text-primary` (mobile) / `bg-accent` fill (desktop) with `aria-current="page"`; inactive = `text-muted-foreground` lifting to `text-foreground` on hover.

## 6. Do's and Don'ts

### Do:
- **Do** keep resting surfaces at *near* chroma 0 (only the sub-perceptual warm tint); introduce a nameable hue only when it names something (amber = due soon, red = overdue, a fixed category hue = a category on its chip or chart).
- **Do** draw separation with a 1px ring/border plus a tonal fill (`bg-muted/50`) — never a drop shadow.
- **Do** set every type element in Inter; carry hierarchy with size and weight (`500` for headings/labels, `400` for body), not with a second face.
- **Do** lead each screen with foresight — what's coming due, the cash-flow peak, the next dose — above logs of what already happened.
- **Do** keep the amber and red voices gentle (tinted fills, hairline borders); reassure, don't alarm.
- **Do** assign chart colors in the fixed category order from `src/lib/deadline-labels.ts`; never cycle or reassign hues per render.
- **Do** honor `prefers-reduced-motion` and keep transitions at 150–250ms conveying state only.

### Don't:
- **Don't** build a **cold government/bank portal**: no dense, sterile, form-heavy layouts; capture is one tap, then the app gets out of the way.
- **Don't** turn warm into **childish**: no cartoon mascots, pastel bubbles, or toy-rounded "family app" shapes. The stakes are real; the UI stays grown-up.
- **Don't** ship a **loud SaaS dashboard**: no gradient hero-metrics, no glassmorphism, no neon accents, no `background-clip: text` gradient headings.
- **Don't** become a **cluttered do-everything app**: don't let screens compete for attention; one clear primary task per screen.
- **Don't** use `#0f172a` (brand navy) as a UI accent or surface — it is app chrome (manifest/status bar) only.
- **Don't** add box-shadows, `border-left`/`border-right` colored side-stripes, or fluid `clamp()` hero type.
- **Don't** use muted gray for primary reading text; body copy stays at ink contrast.

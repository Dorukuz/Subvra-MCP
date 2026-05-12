# Subvra Design System

## Brand Register

### Typography
- **Primary**: Geist Sans (clean grotesk) — used intentionally per brand, not as a default fallback. Modular type scale (major third, 1.25 ratio) with strong hierarchy contrast.
- **Secondary**: Geist Mono — used strictly for telemetry, credit counts, device resolutions, and code/technical contexts. Never for body text.
- **Scale**: xs (0.75rem) / sm (0.875rem) / base (1rem) / lg (1.25rem) / xl (1.563rem) / 2xl (1.953rem) / 3xl (2.441rem) / 4xl (3.052rem) / 5xl (3.815rem)
- **OpenType**: tabular-nums for data tables and credit counts, text-wrap: balance for headings
- **Brand override note**: Geist is the intentional brand choice for Subvra. This is not a generic-default situation — it aligns with the technical minimalism brand identity. Exception documented per Impeccable typography reference.

### Color
- **Space**: OKLCH throughout — perceptually uniform, verified contrast
- **Primary**: Deep blue, hue 250 — not a reflex default but a deliberate brand anchor for infra-trust positioning
- **Neutrals**: Tinted toward hue 250 (chroma 0.004–0.012) — never pure gray
- **Semantic**: Emerald (hue 160) strictly for positive/live/secure states. Danger (hue 25) for errors. Warning (hue 80) for cautions.
- **60-30-10**: Slate neutrals (60%) / Foreground text + borders (30%) / Primary blue accent (10%)
- **Dark mode**: Not inverted — depth from surface lightness (3-step: 12%/16%/20%/24% lightness). Same hue/chroma, only lightness varies. Body text weight reduced (light-on-dark reads heavier).
- **Contrast**: All text meets WCAG AA (4.5:1 body, 3:1 large text). Placeholder text verified.

### Spatial
- **Base unit**: 4pt (0.25rem)
- **Scale**: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96px
- **Layout**: max-w-6xl (1152px) for marketing, max-w-4xl (896px) for dashboard content
- **Cards**: One clear card level — no nesting. Hierarchy within cards via spacing and typography, not nested containers.
- **Touch targets**: 44px minimum (h-10/h-12 buttons with min-w-[44px])

### Motion
- **Easing**: ease-out-expo `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, ease-in for exits
- **Durations**: 100ms instant / 200ms fast / 300ms normal / 500ms slow
- **Banned**: bounce, elastic, spring easing — per Impeccable motion-design reference
- **Reduced motion**: `prefers-reduced-motion: reduce` disables all animation/transition. Not optional.
- **Micro-interactions only**: float, fade, slide, hover lift. No attention-seeking animation.

### Interaction
- **States**: 8 states designed for every interactive element (default, hover, focus, active, disabled, loading, error, success)
- **Focus**: `:focus-visible` only — 2px primary-500 outline, 2px offset
- **Forms**: Visible labels always. Placeholders are hints, not labels. Validate on blur.
- **Loading**: Skeleton screens over spinners where possible. Optimistic updates for low-stakes actions.

### Surfaces & Elevation
- **Light**: White (surface-1) / Slight tint (surface-2) / Deeper tint (surface-3)
- **Dark**: 16% (surface-1) / 20% (surface-2) / 24% (surface-3)
- **Shadows**: Brand-tinted (not pure black), 3-step (sm/md/lg). Shadows for light mode only — dark mode uses surface lightness for depth.
- **Borders**: slate-200 light / slate-800 dark. 1px. Never heavy.

### Motifs
- `hero-grid`: Subtle dotted grid background (radial-gradient dots, 24px spacing)
- `hero-gradient`: Radial gradient from primary-50 tint, centered, soft
- **No**: purple-to-blue AI gradients, neon glow, floating spheres, glassmorphism stacking

## Anti-Pattern Overrides
- **Inter/Geist as default**: Acknowledged but intentional. Mitigated via modular scale, mono accent, OKLCH neutrals, and imagegen composition rules.
- **Card-heavy layouts**: Intentional for dashboard, but strictly one level. No nested cards. Marketing sections use spacing/typography for grouping.

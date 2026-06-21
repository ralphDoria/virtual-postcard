# v2 Brainstorm — Modifications

Status: **brainstorming only, no code changes yet.**

Three requested changes, each with goal / current state / approaches / recommendation /
open questions / files touched.

---

## 1. Mobile-first vertical layout — envelope in the middle

### Goal
The target user views this on an **iPhone browser** (tall, portrait). The composition
must be optimized for vertical resolution, with the envelope sitting in the **middle**
of the screen rather than clinging to the very bottom.

### Current state
- `.envelope-wrap` is anchored to `bottom: 0` and only peeks up (`PEEK = 0.42`).
- On a tall iPhone screen this leaves a large empty band of sky above and pins the
  action to the bottom edge — awkward and not "centered."
- The postcard stack is already centered (`place-items: center`), sized in `vw`
  (`min(86vw, 380px)`), which can overflow short/landscape but is fine portrait.

### Interpretations to confirm (see open questions)
- **(A)** Envelope rests **vertically centered**, peeking happens around screen
  middle; the opening/stack reveal happens at eye level.
- **(B)** Keep the "slide up from the bottom" entrance, but have it **settle higher**
  (centered) instead of staying at the bottom edge.
- **(C)** Just rebalance whitespace so the sky/greeting occupies the top third and the
  envelope the middle third, with breathing room below.

These aren't mutually exclusive — (B)+(C) together is likely what's wanted: envelope
slides up *from* the bottom (nice entrance) and *settles* centered.

### Approaches
- Switch envelope positioning from `bottom`-anchored to **center-anchored**:
  `top: 50%; transform: translate(-50%, -50%)`, then animate the *entrance* with a `y`
  transform from `+100%` (off-screen bottom) to `0` (its centered rest position). This
  preserves the "slides up from below" feel but lands it in the middle.
- Use **`dvh`/`svh`/`lvh`** units (already partly used) consistently so iOS Safari's
  collapsing toolbar doesn't crop or shift the centered envelope.
- Size everything off the **smaller of width/height** and clamp, so the layout holds
  on small phones (SE) and large (Pro Max) without overflow. Consider a single
  `--unit` based on `min(1vw, …)` or a container query.
- Re-tune `PEEK`: if the envelope is centered, "peek" matters less; the swipe-up hint
  can sit just above a fully-visible (or mostly-visible) envelope.
- Vertical rhythm: greeting in the **top ~35%**, envelope centered ~50%, swipe hint
  below it. When opened, the stack occupies the centered safe area with the same
  vertical center so the transition feels continuous (envelope → stack in place).

### Recommendation
Center-anchor the envelope and the stack on the **same vertical midpoint**, animate the
envelope entrance as a `y` slide from below into that center. Drive all sizing from
`min(vw, vh)`-style clamps + `dvh`. This satisfies "in the middle" while keeping the
slide-up entrance.

### Files
`src/components/Envelope.jsx`, `src/components/experience.css`
(`.envelope-wrap`, `.stack`, `.stage`), `index.css` (`.stage` height units).

---

## 2. True cursive tracing, later led by the plane

### Goal
"Happy Father's Day" is **traced out in cursive as if being written** — a pen/stroke
drawing on, letter-connected. **Later**, a plane icon **leads the stroke** so it looks
like the airplane's contrail is drawing the words (skywriting).

### Current state
- Letters are individual `<span>`s that **fade + rise** in with a stagger. It reads as
  "appearing," not "being drawn." The plane flies on a separate straight contrail that
  is **not** aligned to the letterforms.

### The core problem: where does the stroke path come from?
A real "writing" effect needs a path that follows the **centerline of the pen stroke**
(one continuous line through the letters), not the *outline* of a font.

| Option | How | Look | Plane-friendly? | Cost |
|---|---|---|---|---|
| **A. Hand-authored single-stroke SVG** | Trace the phrase over a cursive font in Figma/Inkscape as one continuous open path | Best — true handwriting | ✅ one continuous path = perfect plane trail | One-time manual; redo if text changes |
| B. Font outline → stroke-draw (opentype.js) | Extract glyph outlines, animate dashoffset | Outlines get "inked" (double lines around letters) — reads as tracing an outline, not writing | ❌ plane would ride an outline | Low, automatic |
| C. Single-line / Hershey script font | Render engraving font to path | Centerline strokes ✓ but letters often **not connected** | ⚠️ plane jumps between letters | Medium; few good cursive single-line fonts |
| D. Pre-made handwriting SVG + vivus.js | Drop in an existing asset, library animates draw | Good if asset is good | ✅ if path is continuous | Depends on asset |

### Recommended technique (Option A)
Because the phrase is **fixed**, author **one continuous SVG path** (skywriting-style,
including a graceful swoop down to the second line) and animate it:

1. **Draw the stroke** with the classic dash trick:
   - `pathLength="1"`, `stroke-dasharray: 1`, animate `stroke-dashoffset: 1 → 0`.
   - Drive with Framer `useMotionValue` progress (or CSS keyframes).
2. **Plane leads the stroke** — two solid options, both synced to the *same* progress:
   - **CSS `offset-path`** (cleanest): `offset-path: path('<same d>')`,
     animate `offset-distance: 0% → 100%`, `offset-rotate: auto` (auto-tangent rotation
     so the plane banks along the curve). Supported in iOS Safari 16+.
   - **JS sampling**: `const pt = pathEl.getPointAtLength(p * len)` to place the plane;
     derive heading from a second nearby sample. More control, more code.
3. **Sync**: one progress value (0→1) drives both the dashoffset and the plane's
   `offset-distance`, same duration + easing → the plane always sits at the **leading
   tip** of the drawn line. Add a soft, fading "smoke" stroke just behind the tip for
   the contrail puff.
4. Keep the literal text string in `content.js` as the `aria-label`/visually-hidden
   fallback for accessibility and in case the path is regenerated.

### Phasing ("later, led by the plane")
- **Phase 1 (now-ish):** ship the stroke-draw with the plane on it.
- The "later" can simply mean: first attempts can validate the *draw* with a dummy
  straight path + plane, then swap in the hand-authored cursive `d` once it's traced.
  The animation code doesn't change when the path is swapped — only the `d` string.

### Risks / notes
- Multi-line on narrow screens: bake the line break + connecting swoop **into the path**
  so it scales as one unit (use `viewBox` + `preserveAspectRatio`, size by width).
- iOS `offset-path` support is fine on 16+; if we must support older, fall back to JS
  `getPointAtLength` sampling.
- Tangent jitter at sharp cusps — smooth the authored path; avoid hard corners.

### Files
`src/components/SkyIntro.jsx` (replace span-stagger with SVG path + plane-on-path),
`src/components/experience.css` (`.greeting`, `.contrail`, `.plane`),
new asset: e.g. `src/assets/greeting-path.js` (exports the `d` string) so the path is
modular like the rest of the content.

---

## 3. Bidirectional carousel — card goes off the top *and around to the back*

### Goal
Swiping a card off the top should look like it **lifts off the top, arcs over, and
tucks around to the back** of the stack (not just fly straight up and vanish). The user
can swipe **up or down**, making it a **carousel** (loop both directions).

### Current state
- Swipe **up only**. The top card flies straight up off-screen, then we reorder it to
  the back where it fades back in. It "teleports," it doesn't visibly go *around*.

### Mental models
| Model | Idea | "Over-the-top-to-back" | Bidirectional | Card readability |
|---|---|---|---|---|
| **A. 3D drum / Rolodex** | Cards on a cylinder: `rotateX(θ) translateZ(R)`, rotate the drum one step per swipe | ✅ free & physically correct; z-order automatic via real 3D | ✅ free (rotate either way) | Neighbors are tilted; front card readable if radius tuned |
| **B. Scripted per-card arc** | Keep cards flat; animate the moving card along an arc (`y` up + `scale` down + `rotateX`), flip `z-index` at the apex | ✅ but hand-tuned | ✅ with mirrored keyframes | Flat & crisp (better) |
| C. Current straight-fly | fly off, reinsert | ❌ teleports | needs work | n/a |

### Approach A — 3D drum (recommended for authenticity)
- Container: `perspective: ~1200px`, `transform-style: preserve-3d`.
- Each card: angle `θ = (rank - active) * step`, transform
  `rotateX(θ) translateZ(R)`; front card at `θ=0` faces the user flat.
- Swipe up → animate `active += 1` (drum rolls so the front card rotates up and over
  the top to the back). Swipe down → `active -= 1` (reverse).
- **Pros:** the "around to the back" motion and correct depth-sorting come *for free*;
  bidirectional is symmetric; infinite loop is natural.
- **Cons:** to keep the front card perfectly flat & legible, limit `step` (e.g. 18–24°)
  and show only ~2–3 neighbors; far cards fade out. Tune `R` so tilt reads as a stack,
  not a fanned wheel.

### Approach B — scripted arc (recommended if we want cards dead-flat)
- Keep the flat-stack presentation; on commit, animate the moving card with a keyframed
  variant: `y: 0 → -40% (lift)`, `scale: 1 → 0.86`, `rotateX: 0 → 35°`, and **flip
  `z-index` to the back at the arc apex** so it passes *behind*. Remaining cards spring
  forward one rank.
- Mirror the keyframes for swipe-down (card comes from behind, over the top, to front).
- **Pros:** front card stays crisp; full control of the arc shape.
- **Cons:** more bookkeeping; must manually manage z-index flip timing and the
  incoming/outgoing pair on down-swipes.

### Gesture handling (both approaches)
- `drag="y"` with constraints both directions; in `onDragEnd` decide by **sign** of
  `offset.y` + `velocity.y`:
  - up (`offset.y < -COMMIT` or fast up) → advance (card → back).
  - down (`offset.y > COMMIT` or fast down) → reverse (back card → front).
  - otherwise → spring back.
- Preserve **tap-to-zoom**: keep a movement threshold so a tap (small delta) opens the
  zoom and a drag does not. Only the settled front card is interactive.
- Disable input during the in-flight transition to avoid double-advances.

### Loop semantics
- Order stays a rotating array; up = rotate left, down = rotate right. Endless both
  ways (as established earlier — the message card is just part of the rotation).

### Recommendation
Prototype **A (3D drum)** first — it gives the "off the top and around the back" arc and
bidirectional looping almost for free, which is exactly the described feel. If the
neighbor-tilt hurts collage readability, fall back to **B** (flat cards + scripted arc).

### Files
`src/components/PostcardStack.jsx` (order rotation both ways, gesture direction,
drum vs. scripted transforms, z-handling), `src/components/experience.css`
(`.stack`, `.stack__slot`, perspective), possibly `Postcard.jsx` (no change expected).

---

## Open questions
1. **Envelope "in the middle":** vertically centered *resting* position (still sliding
   up from the bottom as the entrance)? Or literally centered with a different entrance?
2. **Cursive phrase:** is "Happy Father's Day" final/fixed? (Hand-authored path is
   phrase-specific; changing text means re-tracing the path.)
3. **Carousel card style:** OK with neighbor cards being slightly **tilted** (3D drum
   look), or do you want all cards kept **flat** (scripted-arc approach)?
4. **Swipe direction mapping:** up = "next/older"? down = "previous/newer"? (Pick the
   mental model so the loop direction feels right.)

## Suggested build order
1. (#1) Re-center layout — small, unblocks visual tuning of everything else.
2. (#3) Bidirectional drum carousel — most interaction value, independent of the sky.
3. (#2) Cursive path trace + plane-on-path — highest craft; swap the `d` string in last.

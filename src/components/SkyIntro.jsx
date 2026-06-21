import { useLayoutEffect, useRef } from 'react'
import { animate, useMotionValue } from 'framer-motion'
// Each word of "Happy Father's Day" as a single-stroke centerline path.
// To change the lettering, replace these .svg files (one continuous <path> each).
import word1 from '../assets/happy-fathers-day-1.svg?raw'
import word2 from '../assets/happy-fathers-day-2.svg?raw'
import word3 from '../assets/happy-fathers-day-3.svg?raw'

const WORDS = [word1, word2, word3]

// Timing knobs
const WRITE_DURATION = 4.6 // seconds to write all three words
const ENVELOPE_AFTER_WORD = 1 // 0-based: start the envelope once this word finishes
const STROKE_PX = 3 // on-screen stroke thickness (kept uniform across words)

export default function SkyIntro({ greeting, onAlmostDone }) {
  const containerRef = useRef(null)
  const line0 = useRef(null)
  const line1 = useRef(null)
  const line2 = useRef(null)
  const planeRef = useRef(null)
  const firedRef = useRef(false)
  const progress = useMotionValue(0)

  useLayoutEffect(() => {
    const container = containerRef.current
    const lines = [line0.current, line1.current, line2.current]
    const paths = lines.map((l) => l && l.querySelector('path'))
    const svgs = lines.map((l) => l && l.querySelector('svg'))
    if (!container || paths.some((p) => !p)) return

    // 1) tighten each viewBox to its ink so the stacked lines pack nicely
    const pad = 18
    paths.forEach((path, i) => {
      const bb = path.getBBox()
      svgs[i].setAttribute(
        'viewBox',
        `${bb.x - pad} ${bb.y - pad} ${bb.width + pad * 2} ${bb.height + pad * 2}`,
      )
    })

    // 2) prep each stroke as "undrawn"
    const lens = paths.map((p) => p.getTotalLength())
    paths.forEach((p, i) => {
      p.style.strokeDasharray = `${lens[i]}`
      p.style.strokeDashoffset = `${lens[i]}`
    })

    // 3) cache screen mapping so we can place the (HTML) plane over the SVGs
    const crect = container.getBoundingClientRect()
    const ctms = paths.map((p) => p.getScreenCTM())
    const pts = svgs.map((s) => s.createSVGPoint())

    // keep on-screen thickness uniform: stroke-width is in user units, and each
    // word has its own viewBox->screen scale (ctm.a), so divide by that scale.
    paths.forEach((p, i) => {
      p.style.strokeWidth = `${STROKE_PX / ctms[i].a}`
    })
    const pointAt = (i, l) => {
      const p = paths[i].getPointAtLength(l)
      pts[i].x = p.x
      pts[i].y = p.y
      const s = pts[i].matrixTransform(ctms[i])
      return { x: s.x - crect.left, y: s.y - crect.top }
    }
    const starts = paths.map((_, i) => pointAt(i, 0))
    const ends = paths.map((_, i) => pointAt(i, lens[i]))

    // 4) build a virtual timeline weighted by ON-SCREEN length so every word
    //    (and glide) traces at a constant screen speed regardless of its scale.
    const scales = ctms.map((m) => m.a) // screen px per user unit, per word
    const dist2 = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
    const segs = []
    let acc = 0
    for (let i = 0; i < paths.length; i++) {
      const weight = lens[i] * scales[i] // word's on-screen length
      segs.push({ type: 'draw', i, start: acc, len: lens[i], weight })
      acc += weight
      if (i < paths.length - 1) {
        const glide = dist2(ends[i], starts[i + 1]) // screen distance between lines
        segs.push({ type: 'fly', from: i, to: i + 1, start: acc, weight: glide })
        acc += glide
      }
    }
    const total = acc

    // fire the envelope exactly when the chosen word finishes drawing
    const triggerSeg = segs.find(
      (s) => s.type === 'draw' && s.i === ENVELOPE_AFTER_WORD,
    )
    const fireAt = (triggerSeg.start + triggerSeg.weight) / total

    const place = (x, y, deg) => {
      planeRef.current.style.transform = `translate(${x}px, ${y}px) rotate(${deg}deg)`
    }
    const heading = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI

    const render = (p) => {
      const dist = p * total

      // draw state for every word from its own progress
      paths.forEach((path, i) => {
        const seg = segs.find((s) => s.type === 'draw' && s.i === i)
        const f = clamp((dist - seg.start) / seg.weight, 0, 1)
        path.style.strokeDashoffset = `${lens[i] * (1 - f)}`
      })

      // plane position
      const seg = segs.find((s) => dist >= s.start && dist <= s.start + s.weight) ||
        segs[segs.length - 1]
      if (seg.type === 'draw') {
        const f = clamp((dist - seg.start) / seg.weight, 0, 1)
        const l = f * seg.len
        const here = pointAt(seg.i, l)
        const ahead = pointAt(seg.i, Math.min(seg.len, l + 2))
        place(here.x, here.y, heading(here, ahead))
      } else {
        const t = clamp((dist - seg.start) / seg.weight, 0, 1)
        const a = ends[seg.from]
        const b = starts[seg.to]
        const x = a.x + (b.x - a.x) * t
        const y = a.y + (b.y - a.y) * t
        place(x, y, heading(a, b))
      }
    }

    // place plane at the very start before animating
    render(0)

    const controls = animate(progress, 1, {
      duration: WRITE_DURATION,
      ease: 'linear', // constant pen speed across the whole sequence
    })
    const unsub = progress.on('change', (p) => {
      render(p)
      if (!firedRef.current && p >= fireAt) {
        firedRef.current = true
        onAlmostDone?.()
      }
    })

    return () => {
      controls.stop()
      unsub()
    }
  }, [progress, onAlmostDone])

  return (
    <div className="sky fill" aria-label={greeting}>
      {/* drifting clouds for ambiance */}
      <div className="cloud cloud--a" />
      <div className="cloud cloud--b" />
      <div className="cloud cloud--c" />

      <div className="sky__writing" ref={containerRef}>
        <div
          className="greeting-line"
          ref={line0}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: WORDS[0] }}
        />
        <div
          className="greeting-line"
          ref={line1}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: WORDS[1] }}
        />
        <div
          className="greeting-line"
          ref={line2}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: WORDS[2] }}
        />

        <div className="plane" ref={planeRef} aria-hidden="true">
          <PlaneIcon />
        </div>
      </div>
    </div>
  )
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

function PlaneIcon() {
  // points to the right (angle 0 = travelling +x)
  return (
    <svg viewBox="0 0 64 64" width="38" height="38" aria-hidden="true">
      <path
        d="M4 30 L58 6 L46 32 L58 58 Z M46 32 L18 32"
        fill="#ffffff"
        stroke="#cfe9ff"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

import { useLayoutEffect, useRef } from 'react'
import { animate, useMotionValue } from 'framer-motion'
// Precomputed uniform-arc-length traces (see scripts/build-greeting.mjs).
// Each word: { viewBox, polyD, points: [x0,y0,x1,y1,...] } sampled evenly by
// true distance, so the browser does no path math during the animation.
import words from '../data/greeting-traced.js'

// Timing knobs
const WRITE_DURATION = 30 // seconds to write all three words
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

  // keep the latest callback in a ref so this setup effect runs once (on mount)
  const onAlmostDoneRef = useRef(onAlmostDone)
  onAlmostDoneRef.current = onAlmostDone

  useLayoutEffect(() => {
    const container = containerRef.current
    const lines = [line0.current, line1.current, line2.current]
    const paths = lines.map((l) => l && l.querySelector('path'))
    const svgs = lines.map((l) => l && l.querySelector('svg'))
    if (!container || paths.some((p) => !p)) return

    // one-time layout reads
    const crect = container.getBoundingClientRect()
    const ctms = paths.map((p) => p.getScreenCTM())
    const pts = svgs.map((s) => s.createSVGPoint())
    const scales = ctms.map((m) => m.a) // screen px per user unit, per word
    const lens = paths.map((p) => p.getTotalLength()) // polyline = true length

    paths.forEach((p, i) => {
      p.style.strokeWidth = `${STROKE_PX / scales[i]}`
      p.style.strokeDasharray = `${lens[i]}`
      p.style.strokeDashoffset = `${lens[i]}`
    })

    // map a uniform point (user coords) to container px
    const toScreen = (i, ux, uy) => {
      pts[i].x = ux
      pts[i].y = uy
      const s = pts[i].matrixTransform(ctms[i])
      return { x: s.x - crect.left, y: s.y - crect.top }
    }
    // point on word i at fraction f (0..1) — O(1) lookup into the uniform table
    const screenAt = (i, f) => {
      const P = words[i].points
      const n = P.length / 2
      const idx = clamp(f, 0, 1) * (n - 1)
      const k = Math.min(Math.floor(idx), n - 2)
      const t = idx - k
      const x = P[k * 2] + (P[(k + 1) * 2] - P[k * 2]) * t
      const y = P[k * 2 + 1] + (P[(k + 1) * 2 + 1] - P[k * 2 + 1]) * t
      return toScreen(i, x, y)
    }
    const starts = paths.map((_, i) => screenAt(i, 0))
    const ends = paths.map((_, i) => screenAt(i, 1))

    // timeline weighted by on-screen length -> constant screen speed everywhere
    const dist2 = (a, b) => Math.hypot(b.x - a.x, b.y - a.y)
    const segs = []
    let acc = 0
    for (let i = 0; i < paths.length; i++) {
      const weight = lens[i] * scales[i]
      segs.push({ type: 'draw', i, start: acc, weight })
      acc += weight
      if (i < paths.length - 1) {
        const glide = dist2(ends[i], starts[i + 1])
        segs.push({ type: 'fly', from: i, to: i + 1, start: acc, weight: glide })
        acc += glide
      }
    }
    const total = acc

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

      // reveal each word up to its own progress
      paths.forEach((path, i) => {
        const seg = segs.find((s) => s.type === 'draw' && s.i === i)
        const f = clamp((dist - seg.start) / seg.weight, 0, 1)
        path.style.strokeDashoffset = `${lens[i] * (1 - f)}`
      })

      // plane position
      const seg =
        segs.find((s) => dist >= s.start && dist <= s.start + s.weight) ||
        segs[segs.length - 1]
      if (seg.type === 'draw') {
        const f = clamp((dist - seg.start) / seg.weight, 0, 1)
        const here = screenAt(seg.i, f)
        const ahead = screenAt(seg.i, Math.min(1, f + 0.004))
        place(here.x, here.y, heading(here, ahead))
      } else {
        const t = clamp((dist - seg.start) / seg.weight, 0, 1)
        const a = ends[seg.from]
        const b = starts[seg.to]
        place(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, heading(a, b))
      }
    }

    render(0)

    const controls = animate(progress, 1, {
      duration: WRITE_DURATION,
      ease: 'linear', // constant pen speed across the whole sequence
    })
    const unsub = progress.on('change', (p) => {
      render(p)
      if (!firedRef.current && p >= fireAt) {
        firedRef.current = true
        onAlmostDoneRef.current?.()
      }
    })

    return () => {
      controls.stop()
      unsub()
    }
    // build-once: progress is stable; callback read via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress])

  return (
    <div className="sky fill" aria-label={greeting}>
      {/* drifting clouds for ambiance */}
      <div className="cloud cloud--a" />
      <div className="cloud cloud--b" />
      <div className="cloud cloud--c" />

      <div className="sky__writing" ref={containerRef}>
        {[line0, line1, line2].map((ref, i) => (
          <div className="greeting-line" ref={ref} key={i}>
            <svg viewBox={words[i].viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <path d={words[i].polyD} fill="none" />
            </svg>
          </div>
        ))}

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

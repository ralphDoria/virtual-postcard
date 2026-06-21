import { useLayoutEffect, useRef } from 'react'
import { animate, useMotionValue } from 'framer-motion'
import {
  sampleUser,
  angleDeg,
  lerpPt,
  rayExitDistance,
  polylineLength,
} from './trace-utils.js'

const OFFSCREEN_MARGIN = 90 // px past the viewport edge before the plane "stops"

/**
 * Traces ONE word and flies its plane in/out — fully self-contained.
 *
 * Timeline (all at the same on-screen `rate`, px/sec):
 *   entrance  plane flies in from off-screen along `entranceDir` to the start
 *   draw      plane traces the stroke; the ink reveals behind it
 *   exit      plane continues off-screen along `exitDir`, then stops
 *
 * `onComplete` fires once, when the DRAW finishes (the word is fully written).
 */
export default function TracedWord({
  word,
  rate,
  entranceDir,
  exitDir,
  planeRotation = 0,
  planeSrc,
  strokePx = 3,
  startDelay = 0,
  onComplete,
}) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const pathRef = useRef(null)
  const planeRef = useRef(null)
  const progress = useMotionValue(0)
  const doneRef = useRef(false)

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useLayoutEffect(() => {
    const path = pathRef.current
    const wrap = wrapRef.current
    const plane = planeRef.current
    const svg = svgRef.current
    if (!path || !wrap || !plane || !svg) return

    const ctm = path.getScreenCTM()
    const rect = wrap.getBoundingClientRect()
    const scale = ctm.a

    // Reveal the stroke GEOMETRICALLY by rebuilding the path `d` up to the
    // current point, instead of using stroke-dash. WebKit/iOS mis-scales dash
    // length and dash normalization (pathLength) on scaled SVGs, which tiled the
    // stroke into multiple dashes. A growing polyline draws from one end on
    // every engine. `tokens` is one "M.." / "L.." command per point.
    path.style.strokeWidth = `${strokePx / scale}`
    const tokens = word.polyD.match(/[ML][^ML]*/g) || []
    path.setAttribute('d', '') // start with nothing drawn

    // user coords -> px relative to this word's wrapper
    const sp = svg.createSVGPoint()
    const toLocal = (u) => {
      sp.x = u.x
      sp.y = u.y
      const s = sp.matrixTransform(ctm)
      return { x: s.x - rect.left, y: s.y - rect.top }
    }
    const at = (f) => toLocal(sampleUser(word.points, f))
    const startLocal = at(0)
    const endLocal = at(1)

    // viewport bounds expressed in this wrapper's local coords
    const box = {
      minX: -rect.left - OFFSCREEN_MARGIN,
      minY: -rect.top - OFFSCREEN_MARGIN,
      maxX: window.innerWidth - rect.left + OFFSCREEN_MARGIN,
      maxY: window.innerHeight - rect.top + OFFSCREEN_MARGIN,
    }
    const back = { x: -entranceDir.x, y: -entranceDir.y }
    const entranceDist = rayExitDistance(startLocal, back, box)
    const exitDist = rayExitDistance(endLocal, exitDir, box)
    const entranceStart = {
      x: startLocal.x - entranceDir.x * entranceDist,
      y: startLocal.y - entranceDir.y * entranceDist,
    }
    const exitEnd = {
      x: endLocal.x + exitDir.x * exitDist,
      y: endLocal.y + exitDir.y * exitDist,
    }

    const wEnter = entranceDist
    // on-screen stroke length from the precomputed data (not getTotalLength,
    // which WebKit reports inconsistently) so the draw speed is correct too
    const wDraw = polylineLength(word.points) * scale
    const wExit = exitDist
    const total = wEnter + wDraw + wExit
    const duration = total / rate

    const enterDeg = angleDeg(entranceDir.x, entranceDir.y)
    const exitDeg = angleDeg(exitDir.x, exitDir.y)
    const place = (p, deg) => {
      plane.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${
        deg + planeRotation
      }deg)`
    }

    // Only rewrite the DOM `d` when the drawn point index changes, and append
    // incrementally — avoids re-slicing/joining and re-parsing the whole path
    // string every frame (the plane still moves every frame; that's cheap).
    const lastIdx = tokens.length - 1
    let drawnK = -1
    let drawnD = ''
    const drawTo = (k) => {
      if (k === drawnK) return
      if (k < drawnK) {
        drawnD = tokens.slice(0, k + 1).join('')
      } else {
        for (let j = drawnK + 1; j <= k; j++) drawnD += tokens[j]
      }
      drawnK = k
      path.setAttribute('d', drawnD)
    }

    const render = (pr) => {
      const d = pr * total
      if (d < wEnter) {
        // entrance — no ink yet
        if (drawnK !== -1) {
          drawnK = -1
          drawnD = ''
          path.setAttribute('d', '')
        }
        place(lerpPt(entranceStart, startLocal, wEnter ? d / wEnter : 1), enterDeg)
      } else if (d < wEnter + wDraw) {
        // drawing — grow the polyline up to the current point
        const f = (d - wEnter) / wDraw
        drawTo(Math.floor(f * lastIdx))
        const here = at(f)
        const ahead = at(Math.min(1, f + 0.01))
        place(here, angleDeg(ahead.x - here.x, ahead.y - here.y))
      } else {
        // exit — stroke fully drawn
        if (drawnK !== lastIdx) {
          drawnD = word.polyD
          drawnK = lastIdx
          path.setAttribute('d', word.polyD)
        }
        if (!doneRef.current) {
          doneRef.current = true
          onCompleteRef.current?.()
        }
        place(lerpPt(endLocal, exitEnd, wExit ? (d - wEnter - wDraw) / wExit : 1), exitDeg)
      }
    }

    render(0)
    const controls = animate(progress, 1, {
      duration,
      ease: 'linear',
      delay: startDelay,
    })
    const unsub = progress.on('change', render)

    return () => {
      controls.stop()
      unsub()
    }
    // build-once; props are stable for the life of the intro
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress])

  return (
    <div className="greeting-line" ref={wrapRef}>
      <svg
        ref={svgRef}
        viewBox={word.viewBox}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <path ref={pathRef} d={word.polyD} fill="none" />
      </svg>
      <img ref={planeRef} className="plane" src={planeSrc} alt="" draggable="false" />
    </div>
  )
}

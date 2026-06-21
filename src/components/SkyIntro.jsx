import { useRef } from 'react'
import TracedWord from './TracedWord.jsx'
import { normalize, polylineLength } from './trace-utils.js'
import words from '../data/greeting-traced.js'
import planeSrc from '../assets/plane-topdown-removebg.png'

// Timing / look knobs
const WRITE_DURATION = 10 // seconds for the LONGEST word to be written
const STAGGER = 1 // seconds between each plane starting
const STROKE_PX = 3 // on-screen stroke thickness
const PLANE_ROTATION = 90 // plane art points "up"; headings are 0deg = +x
const ENTRANCE_DIR = normalize(1, 0) // all planes fly in from the left
const EXIT_DIR = normalize(1, -0.6) // all planes climb away up-and-right

// CSS sets .sky__writing width to min(82vw, 400px); mirror it so we can size
// the shared speed before the words mount (planes start off-screen anyway).
const displayWidth = () =>
  Math.min((typeof window !== 'undefined' ? window.innerWidth : 400) * 0.82, 400)

export default function SkyIntro({ greeting, onAlmostDone }) {
  const onAlmostDoneRef = useRef(onAlmostDone)
  onAlmostDoneRef.current = onAlmostDone
  const done = useRef(new Set())

  // constant speed for every plane: rate (px/sec) from the longest word, so the
  // longest takes WRITE_DURATION to write and the rest finish sooner.
  const w = displayWidth()
  const screenLens = words.map((word) => {
    const vbWidth = parseFloat(word.viewBox.split(' ')[2]) || 1
    return (w * polylineLength(word.points)) / vbWidth
  })
  const rate = Math.max(...screenLens) / WRITE_DURATION

  const handleComplete = (i) => {
    done.current.add(i)
    if (done.current.size >= words.length) onAlmostDoneRef.current?.()
  }

  return (
    <div className="sky fill" aria-label={greeting}>
      {/* drifting clouds for ambiance */}
      <div className="cloud cloud--a" />
      <div className="cloud cloud--b" />
      <div className="cloud cloud--c" />

      <div className="sky__writing">
        {words.map((word, i) => (
          <TracedWord
            key={i}
            word={word}
            rate={rate}
            entranceDir={ENTRANCE_DIR}
            exitDir={EXIT_DIR}
            planeRotation={PLANE_ROTATION}
            planeSrc={planeSrc}
            strokePx={STROKE_PX}
            startDelay={i * STAGGER}
            onComplete={() => handleComplete(i)}
          />
        ))}
      </div>
    </div>
  )
}

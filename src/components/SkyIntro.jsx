import { useEffect, useRef } from 'react'
import TracedWord from './TracedWord.jsx'
import { normalize, polylineLength } from './trace-utils.js'
import words from '../data/greeting-traced.js'
import planeSrc from '../assets/plane-topdown-removebg.png'
import propellerSrc from '../assets/propellor-aircraft.mp3'

// Timing / look knobs
const WRITE_DURATION = 10 // seconds for the LONGEST word to be written
const STAGGER = 1 // seconds between each plane starting
const STROKE_PX = 3 // on-screen stroke thickness
const PLANE_ROTATION = 90 // plane art points "up"; headings are 0deg = +x
const ENTRANCE_DIR = normalize(1, 0) // all planes fly in from the left
const EXIT_DIR = normalize(1, -0.6) // all planes climb away up-and-right
const PROPELLER_VOLUME = 0.9 // per-plane propeller loudness (0..1)
const AUDIO_LEAD = 1 // seconds to start each propeller BEFORE its plane

// CSS sets .sky__writing width to min(82vw, 400px); mirror it so we can size
// the shared speed before the words mount (planes start off-screen anyway).
const displayWidth = () =>
  Math.min((typeof window !== 'undefined' ? window.innerWidth : 400) * 0.82, 400)

export default function SkyIntro({ greeting, onAlmostDone }) {
  const onAlmostDoneRef = useRef(onAlmostDone)
  onAlmostDoneRef.current = onAlmostDone
  const done = useRef(new Set())
  const audiosRef = useRef([])

  // one looping propeller per plane, started at that plane's staggered time
  // (we mount only after the tap-to-begin gate, so playback is unlocked)
  useEffect(() => {
    const audios = words.map(() => {
      const a = new Audio(propellerSrc)
      a.loop = false // play once, not on repeat
      a.volume = PROPELLER_VOLUME
      return a
    })
    audiosRef.current = audios
    const timers = audios.map((a, i) =>
      setTimeout(
        () => a.play().catch(() => {}),
        Math.max(0, i * STAGGER - AUDIO_LEAD) * 1000,
      ),
    )
    return () => {
      timers.forEach(clearTimeout)
      audios.forEach((a) => a.pause())
      audiosRef.current = []
    }
  }, [])

  // fade a single plane's propeller out as it finishes writing
  const fadeOut = (audio) => {
    if (!audio) return
    const id = setInterval(() => {
      audio.volume = Math.max(0, audio.volume - 0.08)
      if (audio.volume <= 0.001) {
        clearInterval(id)
        audio.pause()
      }
    }, 40)
  }

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
    fadeOut(audiosRef.current[i]) // this plane's propeller fades as it finishes
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

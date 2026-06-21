import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import content from './data/content.js'
import SkyIntro from './components/SkyIntro.jsx'
import Envelope from './components/Envelope.jsx'
import PostcardStack from './components/PostcardStack.jsx'
import './components/experience.css'

export default function App() {
  // Phases:
  //  0. Tap-to-begin gate — the tap starts the sequence AND unlocks audio.
  //  1. SkyIntro writes the greeting (planes trace in parallel).
  //  2. The envelope mounts once the writing finishes.
  //  3. Once the user swipes the envelope open, the postcard stack appears.
  const [started, setStarted] = useState(false)
  const [showEnvelope, setShowEnvelope] = useState(false)
  const [opened, setOpened] = useState(false)

  return (
    <div className="stage">
      {/* sky + drifting clouds are always live, including under the gate */}
      <Clouds />

      {!started && <StartGate onStart={() => setStarted(true)} />}

      {started && (
        <>
          <SkyIntro
            greeting={content.intro.greeting}
            onAlmostDone={() => setShowEnvelope(true)}
          />

          {showEnvelope && (
            <Envelope hint={content.envelope.hint} onOpen={() => setOpened(true)} />
          )}

          <AnimatePresence>
            {opened && <PostcardStack key="stack" postcards={content.postcards} />}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

function Clouds() {
  return (
    <div className="clouds fill" aria-hidden="true">
      <div className="cloud cloud--a" />
      <div className="cloud cloud--b" />
      <div className="cloud cloud--c" />
    </div>
  )
}

function StartGate({ onStart }) {
  return (
    <button className="start-gate" onClick={onStart} aria-label="Tap to begin">
      <span className="start-gate__text">Tap to begin</span>
    </button>
  )
}

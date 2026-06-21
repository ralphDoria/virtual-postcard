import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import content from './data/content.js'
import SkyIntro from './components/SkyIntro.jsx'
import Envelope from './components/Envelope.jsx'
import PostcardStack from './components/PostcardStack.jsx'
import './components/experience.css'

export default function App() {
  // Overlapping phases:
  //  1. SkyIntro always renders the sky + writes the greeting.
  //  2. The envelope mounts BEFORE the writing fully finishes (overlap), so
  //     the sequence never feels slow.
  //  3. Once the user swipes the envelope open, the postcard stack appears.
  const [showEnvelope, setShowEnvelope] = useState(false)
  const [opened, setOpened] = useState(false)

  return (
    <div className="stage">
      <SkyIntro
        greeting={content.intro.greeting}
        // Fires a little before the writing fully completes -> overlap.
        onAlmostDone={() => setShowEnvelope(true)}
      />

      {showEnvelope && (
        <Envelope
          hint={content.envelope.hint}
          onOpen={() => setOpened(true)}
        />
      )}

      <AnimatePresence>
        {opened && (
          <PostcardStack key="stack" postcards={content.postcards} />
        )}
      </AnimatePresence>
    </div>
  )
}

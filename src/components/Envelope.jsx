import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'

const vh = () => (typeof window !== 'undefined' ? window.innerHeight : 900)

// Release thresholds
const OPEN_FRACTION = 0.5 // dragged at least halfway to center -> open
const FLICK_VELOCITY = -500 // a fast upward flick also opens
const FLAP_MS = 420 // flap-open duration before the stack slides out

export default function Envelope({ hint, onOpen }) {
  const [opened, setOpened] = useState(false)
  const [dragging, setDragging] = useState(false)

  // y = offset from the grid-centered position.
  //   0      -> centered (middle of screen)
  //   peekY  -> half-peeking at the bottom edge
  const peekY = vh() * 0.5
  const y = useMotionValue(vh() * 1.1) // start fully below the screen
  const flapRotate = useMotionValue(0)
  const openedRef = useRef(false)

  // entrance: slide up to the half-peek resting position
  useEffect(() => {
    const controls = animate(y, peekY, {
      type: 'spring',
      stiffness: 90,
      damping: 18,
      delay: 0.1,
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = () => {
    if (openedRef.current) return
    openedRef.current = true
    setOpened(true)
    animate(y, 0, { type: 'spring', stiffness: 120, damping: 20 })
    animate(flapRotate, -170, { duration: FLAP_MS / 1000, ease: 'easeOut' })
    // let the flap finish, then slide the stack out
    setTimeout(() => onOpen?.(), FLAP_MS + 120)
  }

  const handleDragEnd = (_e, info) => {
    setDragging(false)
    if (openedRef.current) return
    const pulledFarEnough = y.get() <= peekY * (1 - OPEN_FRACTION)
    if (pulledFarEnough || info.velocity.y < FLICK_VELOCITY) {
      open()
    } else {
      animate(y, peekY, { type: 'spring', stiffness: 400, damping: 32 })
    }
  }

  return (
    <div className="envelope-center">
      <motion.div
        className="envelope-wrap"
        style={{ y }}
        drag={opened ? false : 'y'}
        dragConstraints={{ top: 0, bottom: peekY }}
        dragElastic={{ top: 0.04, bottom: 0.12 }}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
      >
        {!opened && (
          <motion.div
            className="envelope__hint"
            initial={{ opacity: 0 }}
            animate={{
              opacity: dragging ? 0 : [0, 0.9, 0.4, 0.9],
              y: dragging ? -4 : [6, 0, 6, 0],
            }}
            transition={{
              duration: 2.4,
              repeat: dragging ? 0 : Infinity,
              delay: 0.6,
            }}
          >
            <span className="envelope__hint-arrow">↑</span>
            {hint}
          </motion.div>
        )}

        <div className="envelope">
          {/* back of envelope */}
          <div className="envelope__back" />
          {/* front pocket with the V-cut */}
          <div className="envelope__pocket" />
          {/* the flap that opens automatically once centered */}
          <motion.div className="envelope__flap" style={{ rotateX: flapRotate }} />
        </div>
      </motion.div>
    </div>
  )
}

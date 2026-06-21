import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion'
import Postcard from './Postcard.jsx'

const MAX_VISIBLE = 3 // how many cards show depth behind the front one
const DEPTH_Y = -14 // px each deeper card shifts up
const DEPTH_SCALE = 0.05 // scale lost per depth step
const SWIPE_COMMIT = 60 // px to count as a swipe
const ARC_DURATION = 0.5 // seconds for a card to arc over the top
const SPRING = { type: 'spring', stiffness: 260, damping: 30 }

// resting transform for a card at a given depth in the stack
function presentation(rank, total) {
  const depth = Math.min(rank, MAX_VISIBLE)
  return {
    y: depth * DEPTH_Y,
    scale: 1 - depth * DEPTH_SCALE,
    zIndex: total - rank,
  }
}

export default function PostcardStack({ postcards }) {
  // order = card ids; index 0 is the front of the stack.
  const [order, setOrder] = useState(() => postcards.map((p) => p.id))
  const [moving, setMoving] = useState(null) // { id, dir: 'up' | 'down' }
  const [zoom, setZoom] = useState(null)

  const byId = Object.fromEntries(postcards.map((p) => [p.id, p]))

  // up = advance (front card arcs over the top to the back)
  // down = reverse (back card arcs over the top to the front)
  const swipe = (dir) => {
    if (moving) return
    if (dir === 'up') {
      const id = order[0]
      setOrder((o) => [...o.slice(1), o[0]])
      setMoving({ id, dir: 'up' })
    } else {
      const id = order[order.length - 1]
      setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)])
      setMoving({ id, dir: 'down' })
    }
  }

  return (
    <motion.div
      className="stack-layer fill"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="stack">
        {order.map((id, rank) => (
          <StackCard
            key={id}
            card={byId[id]}
            rank={rank}
            total={order.length}
            mover={moving?.id === id}
            dir={moving?.dir}
            locked={!!moving}
            onArcDone={() => setMoving(null)}
            onSwipe={swipe}
            onZoomPhoto={(photo) => setZoom(photo)}
          />
        ))}
      </div>

      <div className="stack__hint">Swipe up or down</div>

      <AnimatePresence>
        {zoom && <PhotoZoom photo={zoom} onClose={() => setZoom(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}

function StackCard({
  card,
  rank,
  total,
  mover,
  dir,
  locked,
  onArcDone,
  onSwipe,
  onZoomPhoto,
}) {
  const isTop = rank === 0
  const y = useMotionValue(0)
  const scale = useMotionValue(1)
  const [zIndex, setZIndex] = useState(total - rank)
  const [dragging, setDragging] = useState(false)
  const inited = useRef(false)

  const pres = presentation(rank, total)

  // settle into the stack on first render, then spring to the new depth as the
  // rank changes (skipped while this card is the one arcing over the top)
  useEffect(() => {
    if (mover) return
    if (!inited.current) {
      inited.current = true
      y.set(pres.y)
      scale.set(pres.scale)
      setZIndex(pres.zIndex)
      return
    }
    setZIndex(pres.zIndex)
    const cy = animate(y, pres.y, SPRING)
    const cs = animate(scale, pres.scale, SPRING)
    return () => {
      cy.stop()
      cs.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rank, mover])

  // the moving card arcs up over the top, then settles at its new depth
  useEffect(() => {
    if (!mover) return
    const lift = -window.innerHeight * 0.42
    const opts = { duration: ARC_DURATION, times: [0, 0.5, 1], ease: 'easeInOut' }
    setZIndex(total + 5) // ride above the stack during the arc
    const cy = animate(y, [y.get(), lift, pres.y], opts)
    const cs = animate(scale, [scale.get(), 1.02, pres.scale], opts)
    // when advancing, drop behind the stack at the apex so it tucks to the back
    const zt =
      dir === 'up'
        ? setTimeout(() => setZIndex(pres.zIndex), ARC_DURATION * 500)
        : null
    cy.then(() => {
      setZIndex(pres.zIndex)
      onArcDone()
    })
    return () => {
      cy.stop()
      cs.stop()
      if (zt) clearTimeout(zt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mover])

  const handleDragEnd = (_e, info) => {
    setDragging(false)
    if (info.offset.y < -SWIPE_COMMIT || info.velocity.y < -500) {
      onSwipe('up')
    } else if (info.offset.y > SWIPE_COMMIT || info.velocity.y > 500) {
      onSwipe('down')
    } else {
      animate(y, pres.y, { type: 'spring', stiffness: 500, damping: 35 })
    }
  }

  return (
    <motion.div
      className="stack__card"
      style={{ y, scale, zIndex }}
      drag={isTop && !locked ? 'y' : false}
      dragConstraints={{ top: -160, bottom: 160 }}
      dragElastic={0.5}
      onDragStart={() => setDragging(true)}
      onDragEnd={handleDragEnd}
    >
      <Postcard
        card={card}
        interactive={isTop && !dragging && !locked}
        onZoomPhoto={onZoomPhoto}
      />
    </motion.div>
  )
}

function PhotoZoom({ photo, onClose }) {
  return (
    <motion.div
      className="zoom"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="zoom__frame"
        initial={{ scale: 0.85, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        {photo.src ? (
          <img className="zoom__img" src={photo.src} alt={photo.alt || ''} />
        ) : (
          <div className="zoom__img zoom__placeholder" />
        )}
        {photo.caption && <div className="zoom__caption">{photo.caption}</div>}
        <button className="zoom__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </motion.div>
    </motion.div>
  )
}

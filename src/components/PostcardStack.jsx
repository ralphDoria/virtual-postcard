import { useEffect, useState } from 'react'
import {
  motion,
  useMotionValue,
  animate,
  AnimatePresence,
} from 'framer-motion'
import Postcard from './Postcard.jsx'

const MAX_VISIBLE = 4 // how many cards show depth behind the top one
const SWIPE_COMMIT = 70 // px upward to count as a swipe

export default function PostcardStack({ postcards }) {
  // order = array of card ids, index 0 is the top of the stack.
  const [order, setOrder] = useState(() => postcards.map((p) => p.id))
  const [flyingId, setFlyingId] = useState(null)
  const [zoom, setZoom] = useState(null) // a photo object when zoomed

  const byId = Object.fromEntries(postcards.map((p) => [p.id, p]))

  const sendTopToBack = () => {
    const topId = order[0]
    setFlyingId(topId)
    // after the fly-up finishes, rotate it to the bottom
    setTimeout(() => {
      setOrder((o) => [...o.slice(1), o[0]])
      setFlyingId(null)
    }, 340)
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
            isFlying={flyingId === id}
            onCommit={sendTopToBack}
            onZoomPhoto={(photo) => setZoom(photo)}
          />
        ))}
      </div>

      <div className="stack__hint">Swipe a card up</div>

      <AnimatePresence>
        {zoom && (
          <PhotoZoom photo={zoom} onClose={() => setZoom(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function StackCard({ card, rank, total, isFlying, onCommit, onZoomPhoto }) {
  const isTop = rank === 0
  const y = useMotionValue(0) // swipe / fly transform
  const [dragging, setDragging] = useState(false)

  // fly the top card up and away when committed
  useEffect(() => {
    if (isFlying && isTop) {
      animate(y, -window.innerHeight * 1.1, { duration: 0.34, ease: 'easeIn' })
    }
  }, [isFlying, isTop, y])

  // when a card stops being the top one, reset its swipe transform
  useEffect(() => {
    if (!isTop) y.set(0)
  }, [isTop, y])

  // depth presentation: deeper cards sit slightly up + smaller behind the top
  const depth = Math.min(rank, MAX_VISIBLE)
  const presentation = {
    scale: 1 - depth * 0.05,
    y: depth * -14,
    opacity: rank > MAX_VISIBLE ? 0 : 1,
  }

  const handleDragEnd = (_e, info) => {
    setDragging(false)
    if (info.offset.y < -SWIPE_COMMIT || info.velocity.y < -400) {
      onCommit()
    } else {
      animate(y, 0, { type: 'spring', stiffness: 500, damping: 35 })
    }
  }

  return (
    <motion.div
      className="stack__slot"
      style={{ zIndex: total - rank }}
      animate={presentation}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
    >
      <motion.div
        className="stack__swipe"
        style={{ y }}
        drag={isTop && !isFlying ? 'y' : false}
        dragConstraints={{ top: -window.innerHeight, bottom: 0 }}
        dragElastic={{ top: 0.6, bottom: 0.05 }}
        onDragStart={() => setDragging(true)}
        onDrag={(_e, info) => y.set(Math.min(0, info.offset.y))}
        onDragEnd={handleDragEnd}
      >
        <Postcard
          card={card}
          interactive={isTop && !dragging}
          onZoomPhoto={onZoomPhoto}
        />
      </motion.div>
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
